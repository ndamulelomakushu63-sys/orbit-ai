import '../src/services/env-sanitizer.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const cleanPrompt = prompt.trim();
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(cleanPrompt);

    // High quality AI image generation via Pollinations AI (Flux model)
    const generatedUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;

    return res.status(200).json({
      success: true,
      url: generatedUrl,
      prompt: cleanPrompt
    });
  } catch (error: any) {
    console.error("AI Image Generation Vercel API Error:", error);
    return res.status(500).json({
      error: error.message || "An error occurred during image generation."
    });
  }
}
