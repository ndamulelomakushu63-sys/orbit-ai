import crypto from "crypto";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { userId, plan, email, name } = req.body || {};
    if (!userId || !plan) {
      console.error("[PayFast Checkout] Missing required fields:", { userId, plan });
      return res.status(400).json({ error: "userId and plan are required fields" });
    }

    // Email validation
    let emailAddress = email;
    if (emailAddress) {
      emailAddress = String(emailAddress).trim();
    }

    const isInvalidEmail = (val: any) => {
      if (!val || typeof val !== "string") return true;
      const trimmed = val.trim().toLowerCase();
      return (
        trimmed === "" ||
        trimmed === "null" ||
        trimmed === "undefined" ||
        trimmed.includes("null") ||
        trimmed.includes("undefined") ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      );
    };

    if (isInvalidEmail(emailAddress)) {
      console.error("[PayFast Checkout] Invalid email encountered:", emailAddress);
      return res.status(400).json({ error: "Please verify your email before purchasing." });
    }

    // 1. Log and verify Merchant ID and Merchant Key are being read correctly from Environment Variables
    const merchantId = process.env.PAYFAST_MERCHANT_ID || "10000100";
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY || "46f0z5809up2u";
    const passphrase = process.env.PAYFAST_PASSPHRASE;

    console.log("[PayFast Config Debug] PAYFAST_MERCHANT_ID read:", merchantId ? `${merchantId.substring(0, 4)}*** (length: ${merchantId.length})` : "NOT_SET");
    console.log("[PayFast Config Debug] PAYFAST_MERCHANT_KEY read:", merchantKey ? `${merchantKey.substring(0, 4)}*** (length: ${merchantKey.length})` : "NOT_SET");
    console.log("[PayFast Config Debug] PAYFAST_PASSPHRASE exists:", passphrase ? "YES" : "NO");

    const host = req.headers.host;
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const origin = process.env.APP_URL || `${protocol}://${host}`;

    const returnUrl = `${origin}?payment_success=true`;
    const cancelUrl = `${origin}?payment_cancelled=true`;
    const notifyUrl = `${origin}/api/payfast/notify`;

    const amount = plan === "Yearly" || plan === "Annually" ? "1188.00" : "99.99";
    const itemName = plan === "Yearly" || plan === "Annually" 
      ? "Orbit AI Pro Yearly" 
      : "Orbit AI Pro Monthly";

    // Split name into first and last
    const nameParts = (name || "Orbit AI User").split(" ");
    const nameFirst = nameParts[0] || "Orbit";
    const nameLast = nameParts.slice(1).join(" ") || "User";

    const data: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      name_first: nameFirst,
      name_last: nameLast,
      email_address: emailAddress,
      m_payment_id: userId,
      amount: amount,
      item_name: itemName,
      custom_str1: plan
    };

    // 5. Log the exact payload being sent to PayFast (excluding Merchant Key) so we can inspect:
    console.log("=== PAYFAST PAYLOAD LOG (checkout.ts) ===");
    console.log("email_address:", data.email_address);
    console.log("amount:", data.amount);
    console.log("item_name:", data.item_name);
    console.log("merchant_id:", data.merchant_id);
    console.log("return_url:", data.return_url);
    console.log("cancel_url:", data.cancel_url);
    console.log("notify_url:", data.notify_url);
    console.log("===========================");

    // Construct parameter string for MD5 signature (no URL encoding, empty params excluded)
    let pfParamString = "";
    for (const key in data) {
      if (data.hasOwnProperty(key) && data[key] !== undefined && data[key] !== null && data[key] !== "") {
        pfParamString += `${key}=${String(data[key]).trim()}&`;
      }
    }
    pfParamString = pfParamString.slice(0, -1);

    if (passphrase) {
      pfParamString += `&passphrase=${passphrase.trim()}`;
    }

    console.log("[PayFast Checkout] Built pfParamString (excluding passphrase):", pfParamString.replace(merchantKey, "MASKED"));

    // Generate MD5 signature
    const signature = crypto.createHash("md5").update(pfParamString).digest("hex");

    // Build redirect URL with URL-encoded parameters (RFC 3986 style encoding)
    const queryParts: string[] = [];
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        queryParts.push(`${key}=${encodeURIComponent(data[key])}`);
      }
    }
    queryParts.push(`signature=${signature}`);
    const queryString = queryParts.join("&");

    const isSandbox = merchantId === "10000100" || process.env.PAYFAST_SANDBOX === "true";
    const checkoutBaseUrl = isSandbox 
      ? "https://sandbox.payfast.co.za/eng/process" 
      : "https://www.payfast.co.za/eng/process";

    const checkoutUrl = `${checkoutBaseUrl}?${queryString}`;

    console.log(`[PayFast Checkout] Initiated for User: ${userId}, Plan: ${plan}, Sandbox: ${isSandbox}`);
    console.log(`[PayFast Checkout] Redirect URL: ${checkoutUrl}`);

    return res.status(200).json({ checkoutUrl });
  } catch (error: any) {
    console.error("[PayFast Checkout Error] Exact server failure stack:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to initiate PayFast checkout session due to server error" 
    });
  }
}
