import AdmZip from "adm-zip";
import path from "path";
import fs from "fs";

async function createZip() {
  try {
    console.log("Starting ZIP generation...");
    const zip = new AdmZip();
    const distPath = path.join(process.cwd(), "dist");

    if (!fs.existsSync(distPath)) {
      console.error("Error: 'dist' folder does not exist. Please run npm run build first.");
      process.exit(1);
    }

    // Read the contents of the dist folder
    const files = fs.readdirSync(distPath);

    for (const file of files) {
      // Exclude server-side files because they are not needed for static hosting on Netlify
      if (file === "server.cjs" || file === "server.cjs.map") {
        console.log(`Skipping server-side file: ${file}`);
        continue;
      }

      const fullPath = path.join(distPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        console.log(`Adding directory: ${file}`);
        zip.addLocalFolder(fullPath, file);
      } else {
        console.log(`Adding file: ${file}`);
        zip.addLocalFile(fullPath, "");
      }
    }

    const zipPath = path.join(process.cwd(), "orbit-ai.zip");
    zip.writeZip(zipPath);
    console.log(`Successfully created ZIP archive at: ${zipPath}`);
  } catch (error) {
    console.error("Failed to generate ZIP file:", error);
    process.exit(1);
  }
}

createZip();
