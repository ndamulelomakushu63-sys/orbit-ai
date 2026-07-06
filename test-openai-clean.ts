import './src/services/env-sanitizer';

function inspectOpenAiKey() {
  const key = process.env.OPENAI_API_KEY || "";
  console.log("Length:", key.length);
  console.log("Starts with:", key.substring(0, 15));
  console.log("Ends with:", key.substring(key.length - 15));
  
  // Inspect code points of characters to make sure there are no control characters or hidden whitespaces
  const firstChars = [];
  for (let i = 0; i < Math.min(10, key.length); i++) {
    firstChars.push({ char: key[i], code: key.charCodeAt(i) });
  }
  console.log("First 10 chars:", firstChars);

  const lastChars = [];
  for (let i = Math.max(0, key.length - 10); i < key.length; i++) {
    lastChars.push({ char: key[i], code: key.charCodeAt(i) });
  }
  console.log("Last 10 chars:", lastChars);
}

inspectOpenAiKey();
