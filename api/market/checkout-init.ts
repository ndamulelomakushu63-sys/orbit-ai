import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

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
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Server configuration error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for privileged checkout operations.");
  }
  return createClient(supabaseUrl, supabaseKey);
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

    // 2. Authoritative Price & Inventory Verification from Database (Never trust client prices)
    let calculatedSubtotal = 0;
    const verifiedItems: any[] = [];
    const orderId = `order-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const orderNumber = `ORB-${Math.floor(10000 + Math.random() * 90000)}`;

    for (const item of items) {
      const productId = item.productId;
      const variantName = item.variantName || null;
      const requestedQty = Math.max(1, parseInt(item.quantity, 10) || 1);

      // Fetch official product from database
      const { data: dbProduct, error: prodErr } = await supabase
        .from('market_products')
        .select('id, name, price, brand_id, brand_name, stock_quantity, is_published, in_stock')
        .eq('id', productId)
        .single();

      if (prodErr || !dbProduct) {
        return res.status(400).json({ error: `Product with ID ${productId} not found` });
      }

      if (!dbProduct.is_published) {
        return res.status(400).json({ error: `Product '${dbProduct.name}' is currently unavailable for purchase` });
      }

      let authoritativeUnitPrice = Number(dbProduct.price);
      let availableStock = dbProduct.stock_quantity;

      // Check variant if applicable
      if (variantName) {
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
      }

      if (availableStock < requestedQty) {
        return res.status(400).json({ 
          error: `Insufficient stock for '${dbProduct.name}${variantName ? ` (${variantName})` : ''}'. Available: ${availableStock}, Requested: ${requestedQty}` 
        });
      }

      const itemTotal = Number((authoritativeUnitPrice * requestedQty).toFixed(2));
      calculatedSubtotal += itemTotal;

      verifiedItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        order_id: orderId,
        product_id: dbProduct.id,
        brand_id: dbProduct.brand_id,
        seller_id: item.sellerId || null,
        product_name: dbProduct.name,
        brand_name: dbProduct.brand_name,
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

    // 3. Persist Order in Supabase in Pending Payment State
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
      console.error("[Market Checkout Vercel] Order creation error:", orderError);
      return res.status(500).json({ error: "Failed to persist market order", details: orderError.message });
    }

    // Insert Order Items
    if (verifiedItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('market_order_items')
        .upsert(verifiedItems);
      if (itemsError) {
        console.warn("[Market Checkout Vercel] Order items insertion warning:", itemsError);
      }
    }

    // 4. Construct Secure PayFast Parameters
    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE;

    if (!merchantId || !merchantKey) {
      return res.status(500).json({ error: "Server payment configuration error: PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY environment variables are required." });
    }

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
      order: {
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
      },
      subtotal: calculatedSubtotal,
      deliveryFee,
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
