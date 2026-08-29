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
    throw new Error("Server configuration error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for privileged webhook operations.");
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
    console.log("=== PAYFAST ITN WEBHOOK RECEIVED (VERCEL SERVERLESS) ===");
    console.log("ITN Body:", req.body);

    const pfData = { ...req.body };
    const pfSignature = pfData.signature;

    if (!pfSignature) {
      console.error("[PayFast ITN] Missing signature in notification payload");
      return res.status(400).send("Missing signature");
    }

    // 1. Signature Verification using official PayFast MD5 algorithm & Passphrase
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    const { calculatedSignature } = { calculatedSignature: generatePayfastSignature(pfData, passphrase).signature };

    if (calculatedSignature.toLowerCase() !== String(pfSignature).trim().toLowerCase()) {
      console.error("[PayFast ITN] Signature Mismatch! Calculated:", calculatedSignature, "Received:", pfSignature);
      return res.status(400).send("Signature verification failed");
    }

    console.log("[PayFast ITN] Signature Verification Succeeded!");

    // 2. Validate against PayFast server (Postback)
    const isSandbox = pfData.merchant_id === "10000100" || String(process.env.PAYFAST_MERCHANT_ID) === "10000100" || process.env.PAYFAST_SANDBOX === "true";
    const validateUrl = isSandbox 
      ? "https://sandbox.payfast.co.za/eng/query/validate" 
      : "https://www.payfast.co.za/eng/query/validate";

    const searchParams = new URLSearchParams();
    for (const key in req.body) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        searchParams.append(key, String(req.body[key]));
      }
    }

    console.log(`[PayFast ITN] Verifying source with postback to: ${validateUrl}`);
    const pfResponse = await fetch(validateUrl, {
      method: "POST",
      body: searchParams,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    const pfResultText = (await pfResponse.text()).trim();
    if (pfResultText !== "VALID") {
      console.error("[PayFast ITN] Source Validation Failed! Server response:", pfResultText);
      return res.status(400).send("Source validation failed");
    }

    console.log("[PayFast ITN] Source Validation Succeeded (VALID)!");

    // 3. Extract notification parameters
    const userId = pfData.m_payment_id;
    const plan = pfData.custom_str1 || "Monthly";
    const paymentStatus = pfData.payment_status;
    const pfPaymentId = pfData.pf_payment_id;
    const amountGross = Number(pfData.amount_gross || 0);
    const amountFee = Number(pfData.amount_fee || 0);
    const amountNet = Number(pfData.amount_net || (amountGross - amountFee));

    // ROUTE A: BUSINESS REGISTRATION FLOW
    if (plan === "business-registration") {
      const businessId = pfData.custom_str2;
      console.log(`[PayFast ITN] Processing Business Registration payment for ${businessId}...`);

      const { data: reg, error: regError } = await supabase
        .from('business_registrations')
        .select('*')
        .eq('id', businessId)
        .single();

      if (regError || !reg) {
        console.error(`[PayFast ITN] Registration not found for ID: ${businessId}:`, regError);
        return res.status(404).send("Registration not found");
      }

      let extra: any = { 
        website: null, 
        facebook: null, 
        instagram: null, 
        userId: null, 
        province: null,
        villageSuburb: null,
        openingHours: null,
        startingPrice: null,
        specials: null,
        latitude: null,
        longitude: null
      };
      try {
        if (reg.additional_notes) {
          extra = JSON.parse(reg.additional_notes);
        }
      } catch (e) {
        console.warn(`[PayFast ITN] Error parsing additional_notes JSON for ${businessId}:`, e);
      }

      const newBusiness = {
        id: reg.id,
        name: reg.business_name,
        owner_name: reg.owner_name,
        description: reg.description,
        category: reg.category,
        town_city: reg.town_city,
        physical_address: reg.physical_address,
        village_suburb: reg.village_suburb || extra.villageSuburb || null,
        phone_number: reg.phone_number,
        whatsapp_number: reg.whatsapp_number,
        email: reg.email,
        opening_hours: extra.openingHours || "Mon - Fri: 08:00 - 17:00",
        starting_price: extra.startingPrice || null,
        social_media_links: {
          website: extra.website || null,
          facebook: extra.facebook || null,
          instagram: extra.instagram || null
        },
        photos: [],
        specials: extra.specials ? [extra.specials] : [],
        is_public: false,
        is_paid: true,
        payment_status: "Paid",
        status: "Pending",
        user_id: extra.userId || null,
        province: extra.province || null,
        preferred_contact_time: reg.preferred_visit_date || null,
        created_at: new Date().toISOString(),
        payment_id: pfPaymentId || null,
        payment_reference: pfData.m_payment_id || null,
        amount_paid: amountGross || 159.00,
        payment_date: new Date().toISOString(),
        latitude: extra.latitude !== undefined && extra.latitude !== null ? Number(extra.latitude) : null,
        longitude: extra.longitude !== undefined && extra.longitude !== null ? Number(extra.longitude) : null,
        rating: 5.0,
        popularity: 0
      };

      const { error: insertError } = await supabase
        .from('businesses')
        .upsert(newBusiness);

      if (insertError) {
        console.error("[PayFast ITN] Error inserting business in Supabase:", insertError);
        throw insertError;
      }

      const { error: updateRegError } = await supabase
        .from('business_registrations')
        .update({
          is_paid: true,
          status: "approved"
        })
        .eq('id', businessId);

      if (updateRegError) {
        console.warn("[PayFast ITN] Error updating business_registrations status:", updateRegError);
      }

      console.log(`[PayFast ITN] Business ${businessId} successfully saved and approved!`);
      return res.status(200).send("OK");
    }

    // ROUTE B: ORBIT MARKET ORDER FLOW
    else if (plan === "market-order" || userId?.startsWith("order-") || pfData.custom_str1 === "market-order") {
      const orderId = pfData.custom_str2 || pfData.custom_str3 || userId;
      console.log(`[PayFast ITN] Processing Market Order payment for Order Ref: ${orderId}...`);

      // 1. Fetch existing order from Supabase
      const { data: order, error: orderFetchErr } = await supabase
        .from('market_orders')
        .select('*')
        .or(`id.eq.${orderId},order_number.eq.${orderId}`)
        .single();

      if (orderFetchErr || !order) {
        console.error(`[PayFast ITN] Market order ${orderId} not found in Supabase:`, orderFetchErr);
        return res.status(404).send("Order not found");
      }

      // Idempotency: Prevent duplicate processing if already paid
      if (order.payment_status === "Paid") {
        console.log(`[PayFast ITN] Order ${order.id} was already marked as Paid. Duplicate notification ignored.`);
        return res.status(200).send("OK");
      }

      // Verify payment amount matches stored database order total (tolerance: 0.05)
      const expectedTotal = Number(order.total);
      if (Math.abs(expectedTotal - amountGross) > 0.05) {
        console.error(`[PayFast ITN] Market Order Amount Mismatch! Expected: R${expectedTotal}, Received: R${amountGross}`);
        
        await supabase.from('market_payments').insert({
          id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          order_id: order.id,
          payment_provider: 'PayFast',
          pf_payment_id: pfPaymentId || null,
          amount_gross: amountGross,
          amount_fee: amountFee,
          amount_net: amountNet,
          status: 'Amount Mismatch',
          signature_valid: true,
          raw_response: pfData,
          created_at: new Date().toISOString()
        });

        return res.status(400).send("Payment amount mismatch");
      }

      // Record in market_payments audit ledger
      const { error: payAuditErr } = await supabase
        .from('market_payments')
        .insert({
          id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          order_id: order.id,
          payment_provider: 'PayFast',
          pf_payment_id: pfPaymentId || null,
          amount_gross: amountGross,
          amount_fee: amountFee,
          amount_net: amountNet,
          status: paymentStatus === 'COMPLETE' ? 'Paid' : paymentStatus,
          signature_valid: true,
          raw_response: pfData,
          verified_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (payAuditErr) {
        console.warn("[PayFast ITN] Notice recording market_payments audit record:", payAuditErr);
      }

      if (paymentStatus === "COMPLETE") {
        // Mark Order as Paid and Processing
        const { error: orderError } = await supabase
          .from('market_orders')
          .update({
            payment_status: "Paid",
            order_status: "Processing",
            payment_id: String(pfPaymentId || `PF-${Date.now()}`),
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (orderError) {
          console.error("[PayFast ITN] Error updating market order status in Supabase:", orderError);
          throw orderError;
        }

        // Deduct inventory ONLY upon verified COMPLETE payment
        const { data: orderItems, error: itemsErr } = await supabase
          .from('market_order_items')
          .select('*')
          .eq('order_id', order.id);

        if (!itemsErr && orderItems && orderItems.length > 0) {
          for (const item of orderItems) {
            // Deduct variant stock if applicable
            if (item.variant_name) {
              const { data: variant } = await supabase
                .from('market_product_variants')
                .select('id, stock_quantity')
                .eq('product_id', item.product_id)
                .eq('size_name', item.variant_name)
                .single();

              if (variant) {
                const newVariantStock = Math.max(0, (variant.stock_quantity || 0) - item.quantity);
                await supabase
                  .from('market_product_variants')
                  .update({ stock_quantity: newVariantStock })
                  .eq('id', variant.id);
              }
            }

            // Deduct overall product stock
            const { data: product } = await supabase
              .from('market_products')
              .select('id, stock_quantity')
              .eq('id', item.product_id)
              .single();

            if (product) {
              const newProductStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
              await supabase
                .from('market_products')
                .update({ 
                  stock_quantity: newProductStock,
                  in_stock: newProductStock > 0
                })
                .eq('id', product.id);
            }
          }
        }

        console.log(`[PayFast ITN] Market order ${order.id} verified, stock deducted, status set to Processing!`);
      } else {
        console.log(`[PayFast ITN] Market payment status is ${paymentStatus}. Updating order payment status.`);
        await supabase
          .from('market_orders')
          .update({
            payment_status: paymentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);
      }

      return res.status(200).send("OK");
    }

    // ROUTE C: ORBIT PRO SUBSCRIPTION FLOW
    else if (paymentStatus === "COMPLETE") {
      console.log(`[PayFast ITN] Payment is COMPLETE. Upgrading user ${userId} to PRO...`);
      
      const startDate = new Date().toISOString();
      const isYearly = plan === "Yearly" || plan === "Annually";
      const durationDays = isYearly ? 365 : 30;
      const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      // Upgrade profile in Supabase
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          plan: "Pro",
          subscription_status: isYearly ? "pro_yearly" : "pro_monthly",
          subscription_start_date: startDate,
          subscription_end_date: endDate,
          cancelled_at: null,
          refund_requested: false,
          refund_request_date: null
        })
        .eq("id", userId);

      if (profileError) {
        console.error("[PayFast ITN] Error upgrading user profile in Supabase:", profileError);
        throw profileError;
      }

      // Record subscription log in Supabase
      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert({
          id: `pf-${pfPaymentId || Date.now()}`,
          user_id: userId,
          plan: isYearly ? "Yearly" : "Monthly",
          amount: amountGross || (isYearly ? 1188.00 : 99.99),
          status: "Active",
          renewal_date: endDate,
          created_at: startDate
        });

      if (subError) {
        console.error("[PayFast ITN] Error recording subscription record in Supabase:", subError);
        throw subError;
      }

      console.log(`[PayFast ITN] User ${userId} successfully upgraded to PRO!`);
      return res.status(200).send("OK");
    } else {
      console.log(`[PayFast ITN] Payment received but status is: ${paymentStatus}. Leaving state as is.`);
      return res.status(200).send("OK");
    }
  } catch (error: any) {
    console.error("[PayFast ITN Internal Webhook Error]:", error);
    return res.status(500).send("Internal webhook error");
  }
}
