import crypto from "crypto";

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { userId, plan, email, name, businessId } = req.body || {};
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

    const merchantId = process.env.PAYFAST_MERCHANT_ID || "10000100";
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY || "46f0z5809up2u";
    const passphrase = process.env.PAYFAST_PASSPHRASE;

    console.log("[PayFast Config Debug] PAYFAST_MERCHANT_ID read:", merchantId ? `${merchantId.substring(0, 4)}*** (length: ${merchantId.length})` : "NOT_SET");
    console.log("[PayFast Config Debug] PAYFAST_MERCHANT_KEY read:", merchantKey ? `${merchantKey.substring(0, 4)}*** (length: ${merchantKey.length})` : "NOT_SET");
    console.log("[PayFast Config Debug] PAYFAST_PASSPHRASE exists:", passphrase ? "YES" : "NO");

    const host = req.headers.host;
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const origin = process.env.APP_URL || `${protocol}://${host}`;

    let returnUrl = `${origin}?payment_success=true`;
    let cancelUrl = `${origin}?payment_cancelled=true`;
    if (plan === "business-registration" && businessId) {
      returnUrl += `&plan=business-registration&business_id=${businessId}`;
      cancelUrl += `&plan=business-registration&business_id=${businessId}`;
    }
    const notifyUrl = `${origin}/api/payfast/notify`;

    let amount = "99.99";
    let itemName = "Orbit AI Pro Monthly";
    if (plan === "Yearly" || plan === "Annually") {
      amount = "1188.00";
      itemName = "Orbit AI Pro Yearly";
    } else if (plan === "business-registration") {
      amount = "159.00";
      itemName = "Orbit AI Business Registration";
    }

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

    if (plan === "business-registration" && businessId) {
      data.custom_str2 = businessId;
    }

    console.log("=== PAYFAST PAYLOAD LOG (checkout.ts) ===");
    console.log("email_address:", data.email_address);
    console.log("amount:", data.amount);
    console.log("item_name:", data.item_name);
    console.log("merchant_id:", data.merchant_id);
    console.log("return_url:", data.return_url);
    console.log("cancel_url:", data.cancel_url);
    console.log("notify_url:", data.notify_url);
    console.log("===========================");

    const { pfParamString, signature } = generatePayfastSignature(data, passphrase);

    console.log("[PayFast Checkout] Built pfParamString:", pfParamString.replace(merchantKey, "MASKED"));
    console.log("[PayFast Checkout] Generated Signature:", signature);

    const queryParts: string[] = [];
    for (const key in data) {
      if (data.hasOwnProperty(key) && data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== "") {
        const val = String(data[key]).trim();
        queryParts.push(`${key}=${encodeURIComponent(val).replace(/%20/g, "+")}`);
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
