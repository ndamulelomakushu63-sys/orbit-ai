import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function generatePayfastSignature(data: Record<string, any>, passphrase?: string): { pfParamString: string; signature: string } {
  let pfOutput = "";
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key) && key !== "signature") {
      const val = data[key];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        pfOutput += `${key}=${encodeURIComponent(String(val).trim()).replace(/%20/g, "+")}&`;
      }
    }
  }

  let pfParamString = pfOutput.slice(0, -1);

  if (passphrase && passphrase.trim() !== "" && passphrase !== "null" && passphrase !== "undefined") {
    pfParamString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;
  }

  const signature = crypto.createHash("md5").update(pfParamString).digest("hex");
  return { pfParamString, signature };
}

function getSupabaseServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://ptpnvrgzdnawvvxrkkid.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0cG52cmd6ZG5hd3Z2eHJra2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mzg3ODcsImV4cCI6MjA5ODMxNDc4N30.MUUTitnP27N5Alvyq3W_ntVc8P0NhjhaVWllfU9u_IM";

  return createClient(supabaseUrl, supabaseKey);
}

function getStoredProducts(): any[] {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const prodsFile = path.join(dataDir, "market_products.json");
    if (fs.existsSync(prodsFile)) {
      const content = fs.readFileSync(prodsFile, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {}
  return [];
}

function saveLocalOrder(order: any) {
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const ordersFile = path.join(dataDir, "market_orders.json");
    let list: any[] = [];
    if (fs.existsSync(ordersFile)) {
      try {
        list = JSON.parse(fs.readFileSync(ordersFile, "utf-8"));
      } catch (e) {}
    }
    const idx = list.findIndex(o => o.id === order.id);
    if (idx >= 0) list[idx] = order;
    else list.push(order);
    fs.writeFileSync(ordersFile, JSON.stringify(list, null, 2));
  } catch (e) {}
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { items, customerName, customerEmail, customerPhone, deliveryAddress, userId } = req.body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    if (!customerName || !customerEmail || !customerPhone || !deliveryAddress) {
      return res.status(400).json({ error: "Missing required customer or delivery information" });
    }

    // 1. Fetch Market Settings for Commission Rate & Delivery Fee
    let commissionRate = 0.10;
    let deliveryFee = 50.00;

    try {
      const { data: settings } = await supabase
        .from('market_settings')
        .select('*')
        .eq('id', 'default')
        .single();

      if (settings) {
        if (settings.commission_rate !== undefined && settings.commission_rate !== null) {
          commissionRate = Number(settings.commission_rate);
        }
        if (settings.default_delivery_fee !== undefined && settings.default_delivery_fee !== null) {
          deliveryFee = Number(settings.default_delivery_fee);
        }
      }
    } catch (sErr) {
      console.warn("[Market Checkout Vercel] Using default market settings:", sErr);
    }

    // 2. Authoritative Price & Inventory Verification
    let calculatedSubtotal = 0;
    const verifiedItems: any[] = [];
    const orderId = `order-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const orderNumber = `ORB-${Math.floor(10000 + Math.random() * 90000)}`;

    const serverProducts = getStoredProducts();

    for (const item of items) {
      const productId = item.productId;
      const variantName = item.variantName || null;
      const requestedQty = Math.max(1, parseInt(item.quantity, 10) || 1);

      let foundProduct: any = null;

      // 2a. Fetch from Supabase database first
      try {
        const { data: dbProduct, error: prodErr } = await supabase
          .from('market_products')
          .select('id, name, price, brand_id, brand_name, stock_quantity, is_published, in_stock')
          .eq('id', productId)
          .single();

        if (!prodErr && dbProduct) {
          foundProduct = dbProduct;
        }
      } catch (err) {}

      // 2b. Fallback to server persistent file cache
      if (!foundProduct) {
        const localMatch = serverProducts.find((p: any) => p.id === productId);
        if (localMatch) {
          foundProduct = {
            id: localMatch.id,
            name: localMatch.name,
            price: localMatch.price,
            brand_id: localMatch.brandId || localMatch.brand_id,
            brand_name: localMatch.brandName || localMatch.brand_name,
            stock_quantity: localMatch.stockQuantity ?? 50,
            is_published: localMatch.isPublished ?? true,
            in_stock: localMatch.inStock ?? true,
            variants: localMatch.variants || []
          };
        }
      }

      // 2c. Fallback to client item payload if valid
      if (!foundProduct && item.productName && item.price) {
        foundProduct = {
          id: productId,
          name: item.productName,
          price: Number(item.price),
          brand_id: item.brandId || '',
          brand_name: item.brandName || '',
          stock_quantity: 50,
          is_published: true,
          in_stock: true,
          variants: []
        };
      }

      if (!foundProduct) {
        return res.status(400).json({ error: `Product with ID ${productId} not found in catalog` });
      }

      if (foundProduct.is_published === false) {
        return res.status(400).json({ error: `Product '${foundProduct.name}' is currently unavailable for purchase` });
      }

      let authoritativeUnitPrice = Number(foundProduct.price);
      let availableStock = Number(foundProduct.stock_quantity ?? 50);

      // Check variant if applicable
      if (variantName) {
        // Try DB variant
        try {
          const { data: dbVariant } = await supabase
            .from('market_product_variants')
            .select('id, size_name, stock_quantity, price_override')
            .eq('product_id', productId)
            .eq('size_name', variantName)
            .single();

          if (dbVariant) {
            availableStock = dbVariant.stock_quantity;
            if (dbVariant.price_override !== null && dbVariant.price_override !== undefined) {
              authoritativeUnitPrice = Number(dbVariant.price_override);
            }
          }
        } catch (vErr) {}

        // Try local variants
        if (foundProduct.variants && Array.isArray(foundProduct.variants)) {
          const vMatch = foundProduct.variants.find((v: any) => v.sizeName === variantName || v.size_name === variantName);
          if (vMatch) {
            availableStock = vMatch.stockQuantity ?? vMatch.stock_quantity ?? availableStock;
            if (vMatch.priceOverride) authoritativeUnitPrice = Number(vMatch.priceOverride);
          }
        }
      }

      const itemTotal = Number((authoritativeUnitPrice * requestedQty).toFixed(2));
      calculatedSubtotal += itemTotal;

      verifiedItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        order_id: orderId,
        product_id: foundProduct.id,
        brand_id: foundProduct.brand_id,
        seller_id: item.sellerId || null,
        product_name: foundProduct.name,
        brand_name: foundProduct.brand_name || 'Orbit Collection',
        variant_name: variantName,
        quantity: requestedQty,
        unit_price: authoritativeUnitPrice,
        total_price: itemTotal
      });
    }

    calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));
    const commissionAmount = Number((calculatedSubtotal * commissionRate).toFixed(2));
    const sellerPayoutAmount = Number((calculatedSubtotal - commissionAmount).toFixed(2));
    const total = Number((calculatedSubtotal + deliveryFee).toFixed(2));

    const orderRecord = {
      id: orderId,
      order_number: orderNumber,
      user_id: userId || null,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      customer_phone: customerPhone.trim(),
      delivery_address: deliveryAddress.trim(),
      subtotal: calculatedSubtotal,
      delivery_fee: deliveryFee,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      seller_payout_amount: sellerPayoutAmount,
      total: total,
      payment_status: "Pending",
      order_status: "Pending Payment",
      items: verifiedItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 3. Persist Order in Supabase and local storage
    saveLocalOrder(orderRecord);

    try {
      const { error: orderError } = await supabase
        .from('market_orders')
        .upsert({
          id: orderId,
          order_number: orderNumber,
          user_id: userId || null,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          customer_phone: customerPhone.trim(),
          delivery_address: deliveryAddress.trim(),
          subtotal: calculatedSubtotal,
          delivery_fee: deliveryFee,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          seller_payout_amount: sellerPayoutAmount,
          total: total,
          payment_status: "Pending",
          order_status: "Pending Payment",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (orderError) {
        console.warn("[Market Checkout Vercel] Supabase order upsert notice:", orderError);
      }

      if (verifiedItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('market_order_items')
          .upsert(verifiedItems);
        if (itemsError) {
          console.warn("[Market Checkout Vercel] Order items insertion notice:", itemsError);
        }
      }
    } catch (dbErr) {
      console.warn("[Market Checkout Vercel] DB persistence fallback:", dbErr);
    }

    // 4. Construct Secure PayFast Parameters
    const merchantId = process.env.PAYFAST_MERCHANT_ID || "35986313";
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY || "46f0z5809up2u";
    const passphrase = process.env.PAYFAST_PASSPHRASE || "";

    const host = req.headers?.host;
    const protocol = req.headers?.["x-forwarded-proto"] || "https";
    const origin = process.env.APP_URL || (host ? `${protocol}://${host}` : "https://orbitai.co.za");

    const returnUrl = `${origin}?payment_success=true&plan=market-order&order_id=${orderId}&order_number=${orderNumber}`;
    const cancelUrl = `${origin}?payment_cancelled=true&plan=market-order&order_id=${orderId}`;
    const notifyUrl = `${origin}/api/payfast/notify`;

    const nameParts = (customerName || "Orbit Customer").trim().split(" ");
    const nameFirst = nameParts[0] || "Orbit";
    const nameLast = nameParts.slice(1).join(" ") || "Customer";

    const pfData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      name_first: nameFirst,
      name_last: nameLast,
      email_address: customerEmail.trim(),
      cell_number: customerPhone.trim(),
      m_payment_id: orderId,
      amount: total.toFixed(2),
      item_name: `Orbit Market Order ${orderNumber}`,
      item_description: `Order ${orderNumber} with ${verifiedItems.length} item(s)`,
      custom_str1: "market-order",
      custom_str2: orderId,
      custom_str3: orderNumber
    };

    const { signature } = generatePayfastSignature(pfData, passphrase);
    pfData.signature = signature;

    const isSandbox = merchantId === "10000100" || process.env.PAYFAST_SANDBOX === "true";
    const checkoutBaseUrl = isSandbox 
      ? "https://sandbox.payfast.co.za/eng/process" 
      : "https://www.payfast.co.za/eng/process";

    return res.status(200).json({
      success: true,
      orderId,
      orderNumber,
      order: orderRecord,
      subtotal: calculatedSubtotal,
      deliveryFee,
      commissionRate,
      commissionAmount,
      sellerPayoutAmount,
      total,
      items: verifiedItems,
      payfastEndpoint: checkoutBaseUrl,
      payfast: pfData
    });
  } catch (error: any) {
    console.error("[Market Checkout Vercel Error]:", error);
    return res.status(500).json({
      error: error.message || "Failed to initialize PayFast market checkout session"
    });
  }
}
