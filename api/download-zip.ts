import fs from "fs";
import path from "path";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const zipPath = path.join(process.cwd(), "orbit-ai.zip");
    if (fs.existsSync(zipPath)) {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=orbit-ai.zip");
      const fileStream = fs.createReadStream(zipPath);
      return fileStream.pipe(res);
    } else {
      res.setHeader("Content-Type", "text/html");
      return res.status(404).send(`
        <html>
          <head><title>ZIP Not Ready</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1>ZIP Archive is not ready yet</h1>
            <p>The build or zipping process might still be running, or you need to build the applet first.</p>
            <button onclick="window.location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; border-radius: 4px; background: #2563eb; color: white; border: none;">Check Again</button>
          </body>
        </html>
      `);
    }
  } catch (error: any) {
    console.error("Failed to download ZIP:", error);
    return res.status(500).send(`Error downloading ZIP: ${error.message}`);
  }
}
