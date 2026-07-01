import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const zip = new AdmZip();
    const rootPath = process.cwd();

    const pathsToInclude = [
      "src",
      "public",
      "assets",
      "package.json",
      "tsconfig.json",
      "vite.config.ts",
      "server.ts",
      "index.html",
      "metadata.json",
      ".env.example",
      ".gitignore"
    ];

    for (const item of pathsToInclude) {
      const fullPath = path.join(rootPath, item);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          zip.addLocalFolder(fullPath, item);
        } else {
          zip.addLocalFile(fullPath, "");
        }
      }
    }

    const buffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=orbit-ai-project.zip");
    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error("Failed to generate project ZIP on Vercel:", error);
    return res.status(500).send(`Failed to generate ZIP: ${error.message}`);
  }
}
