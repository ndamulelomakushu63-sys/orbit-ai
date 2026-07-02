import crypto from "crypto";
import { supabase } from "../../src/services/supabase";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    console.log("=== PAYFAST ITN WEBHOOK RECEIVED (SERVERLESS) ===");
    console.log("ITN Body:", req.body);

    const pfData = { ...req.body };
    const pfSignature = pfData.signature;
    delete pfData.signature;

    // 1. Signature Verification (regenerate signature without URL-encoding, skip blank/undefined keys)
    let pfParamString = "";
    for (const key in pfData) {
      if (pfData.hasOwnProperty(key) && pfData[key] !== undefined && pfData[key] !== null && pfData[key] !== "") {
        pfParamString += `${key}=${String(pfData[key]).trim()}&`;
      }
    }
    pfParamString = pfParamString.slice(0, -1);

    const passphrase = process.env.PAYFAST_PASSPHRASE;
    if (passphrase) {
      pfParamString += `&passphrase=${passphrase.trim()}`;
    }

    const calculatedSignature = crypto.createHash("md5").update(pfParamString).digest("hex");

    if (calculatedSignature !== pfSignature) {
      console.error("[PayFast ITN] Signature Mismatch! Calculated:", calculatedSignature, "Received:", pfSignature);
      return res.status(400).send("Signature verification failed");
    }

    console.log("[PayFast ITN] Signature Verification Succeeded!");

    // 2. Validate against PayFast server (Postback)
    const isSandbox = pfData.merchant_id === "10000100" || String(process.env.PAYFAST_MERCHANT_ID) === "10000100" || !process.env.PAYFAST_MERCHANT_ID;
    const validateUrl = isSandbox 
      ? "https://sandbox.payfast.co.za/eng/query/validate" 
      : "https://www.payfast.co.za/eng/query/validate";

    const searchParams = new URLSearchParams();
    for (const key in req.body) {
      searchParams.append(key, req.body[key]);
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

    // 3. Process complete/successful transaction
    const userId = pfData.m_payment_id;
    const plan = pfData.custom_str1 || "Monthly";
    const paymentStatus = pfData.payment_status;
    const pfPaymentId = pfData.pf_payment_id;
    const amountGross = Number(pfData.amount_gross || 0);

    if (paymentStatus === "COMPLETE") {
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
    } else {
      console.log(`[PayFast ITN] Payment received but status is: ${paymentStatus}. Leaving plan as is.`);
    }

    return res.status(200).send("OK");
  } catch (error: any) {
    console.error("[PayFast ITN] Internal Webhook Error:", error);
    return res.status(500).send("Internal webhook error");
  }
}
