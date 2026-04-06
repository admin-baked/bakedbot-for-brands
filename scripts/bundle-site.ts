import { bundle } from "@remotion/bundler";
import path from "path";
import fs from "fs";

async function run() {
  const entryPoint = path.resolve(process.cwd(), "src/remotion/index.ts");
  const outDir = path.resolve(process.cwd(), "dist/remotion");

  console.log(`📦 Bundling Remotion site: ${entryPoint}`);
  console.log(`📂 Output directory: ${outDir}`);

  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  try {
    const bundleLocation = await bundle({
      entryPoint,
      outDir,
      publicPath: "./", // Ensure paths are relative for S3 subfolders
      webpackConfig: (config) => config,
    });

    console.log(`✅ Success! Bundle created at: ${bundleLocation}`);
    
    // List files to verify
    const files = fs.readdirSync(outDir);
    console.log("📄 Bundle files:", files);
  } catch (err: any) {
    console.error("💥 Bundling Error:", err.message);
    process.exit(1);
  }
}

run();
