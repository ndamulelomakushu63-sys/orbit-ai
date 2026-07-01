import fs from "fs";
import path from "path";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const files: { path: string; content: string }[] = [];
    
    async function walk(dir: string) {
      const list = await fs.promises.readdir(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = await fs.promises.stat(fullPath);
        
        if (
          file === "node_modules" ||
          file === "dist" ||
          file === ".git" ||
          file === ".aistudio" ||
          file === "package-lock.json" ||
          file === ".env"
        ) {
          continue;
        }
        
        if (stat.isDirectory()) {
          await walk(fullPath);
        } else {
          try {
            const ext = path.extname(file).toLowerCase();
            const textExtensions = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".rules", ".html", ".js"];
            
            if (textExtensions.includes(ext)) {
              const content = await fs.promises.readFile(fullPath, "utf-8");
              const relativePath = path.relative(process.cwd(), fullPath);
              files.push({
                path: relativePath,
                content
              });
            }
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    }
    
    await walk(process.cwd());
    return res.status(200).json({ files });
  } catch (err: any) {
    console.error("Error collecting workspace files in Vercel API:", err);
    return res.status(500).json({ error: "Failed to collect files", details: err.message });
  }
}
