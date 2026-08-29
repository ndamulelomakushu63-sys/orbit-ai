import crypto from "crypto";

export interface PayFastData {
  merchant_id: string;
  merchant_key: string;
  return_url?: string;
  cancel_url?: string;
  notify_url?: string;
  name_first?: string;
  name_last?: string;
  email_address?: string;
  cell_number?: string;
  m_payment_id?: string;
  amount: string;
  item_name: string;
  item_description?: string;
  custom_str1?: string;
  custom_str2?: string;
  custom_str3?: string;
  custom_str4?: string;
  custom_str5?: string;
  custom_int1?: string;
  custom_int2?: string;
  [key: string]: any;
}

/**
 * Generates the official PayFast MD5 signature adhering strictly to PayFast specifications:
 * 1. Iterates through all data keys excluding 'signature'
 * 2. Trims whitespace and strips empty/undefined values
 * 3. Encodes parameter names and values replacing %20 with '+'
 * 4. Appends passphrase if provided
 * 5. Calculates MD5 hash
 */
export function generatePayFastSignature(
  data: Record<string, any>,
  passphrase?: string
): { pfParamString: string; signature: string } {
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

/**
 * Validates a received PayFast ITN signature against calculated hash
 */
export function verifyPayFastSignature(
  receivedData: Record<string, any>,
  receivedSignature: string,
  passphrase?: string
): boolean {
  if (!receivedSignature) return false;
  const { signature: calculated } = generatePayFastSignature(receivedData, passphrase);
  return calculated.toLowerCase() === receivedSignature.trim().toLowerCase();
}

/**
 * Validates the origin of the ITN notification by making a server postback to PayFast
 */
export async function verifyPayFastSource(
  rawBody: Record<string, any>,
  isSandbox: boolean = false
): Promise<boolean> {
  const validateUrl = isSandbox
    ? "https://sandbox.payfast.co.za/eng/query/validate"
    : "https://www.payfast.co.za/eng/query/validate";

  const searchParams = new URLSearchParams();
  for (const key in rawBody) {
    if (Object.prototype.hasOwnProperty.call(rawBody, key)) {
      searchParams.append(key, String(rawBody[key]));
    }
  }

  const response = await fetch(validateUrl, {
    method: "POST",
    body: searchParams,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  const resultText = (await response.text()).trim();
  return resultText === "VALID";
}
