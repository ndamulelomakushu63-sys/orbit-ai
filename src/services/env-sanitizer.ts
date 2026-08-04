/**
 * Utility to sanitize environment variables that may have been concatenated
 * into a single line or assigned to process.env.GROQ_API_KEY because of a
 * newline injection issue in the container/hosting environment.
 */

export function sanitizeEnv() {
  if (typeof process === 'undefined' || !process || !process.env) {
    return;
  }

  const rawKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (!rawKey) return;

  const knownKeys = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'PAYFAST_MERCHANT_ID',
    'PAYFAST_MERCHANT_KEY',
    'PAYFAST_PASSPHRASE',
    'GEMINI_API_KEY'
  ];

  // Find all keys that are present in the rawKey
  const matches: { key: string; index: number }[] = [];
  for (const k of knownKeys) {
    const searchStr = `${k}=`;
    const idx = rawKey.indexOf(searchStr);
    if (idx !== -1) {
      matches.push({ key: k, index: idx });
    }
  }

  // Sort matches by index ascending
  matches.sort((a, b) => a.index - b.index);

  if (matches.length === 0) {
    // If no other keys are embedded, clean quotes and trailing spaces/newlines
    const cleaned = rawKey.replace(/^["']|["']$/g, '').trim();
    if (process.env.GROQ_API_KEY) process.env.GROQ_API_KEY = cleaned;
    if (process.env.GROK_API_KEY) process.env.GROK_API_KEY = cleaned;
    if (process.env.XAI_API_KEY) process.env.XAI_API_KEY = cleaned;
    return;
  }

  const groqValue = rawKey.substring(0, matches[0].index).replace(/^["']|["']$/g, '').trim();
  if (process.env.GROQ_API_KEY) process.env.GROQ_API_KEY = groqValue;
  if (process.env.GROK_API_KEY) process.env.GROK_API_KEY = groqValue;
  if (process.env.XAI_API_KEY) process.env.XAI_API_KEY = groqValue;

  // Now, parse each match
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    
    // The value starts after "KEY_NAME="
    const valStartIdx = current.index + current.key.length + 1;
    // The value ends at the start of the next key, or the end of the string
    const valEndIdx = next ? next.index : rawKey.length;
    
    let value = rawKey.substring(valStartIdx, valEndIdx);
    // Clean up quotes and trim whitespace
    value = value.replace(/^["']|["']$/g, '').trim();
    
    // Set it in process.env!
    process.env[current.key] = value;
  }
  
  console.log("[SanitizeEnv] Environment variables sanitized successfully:", {
    GROQ_API_KEY: process.env.GROQ_API_KEY ? `${process.env.GROQ_API_KEY.substring(0, 15)}...` : 'not-set',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'is-set' : 'not-set',
    PAYFAST_MERCHANT_KEY: process.env.PAYFAST_MERCHANT_KEY ? 'is-set' : 'not-set'
  });
}

// Run immediately upon import to ensure early sanitization
try {
  sanitizeEnv();
} catch (err) {
  console.error("Error in env-sanitizer automatic run:", err);
}
