for (const key of Object.keys(process.env)) {
  if (key.includes("KEY") || key.includes("API") || key.includes("SECRET") || key.includes("URL")) {
    console.log(`${key}:`, JSON.stringify(process.env[key]));
  }
}
