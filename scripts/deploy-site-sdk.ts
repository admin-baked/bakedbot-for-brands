import { bundle } from '@remotion/bundler';
import { deploySite } from '@remotion/lambda';
import path from 'path';

async function run() {
  const REGION = 'us-east-1';
  const BUCKET = 'remotionlambda-useast1-5hg2s7ajg0';
  const SITE_NAME = 'bakedbot-creative';

  console.log('🚀 Starting SDK-based Site Deployment...');
  
  const entryPoint = path.resolve('./src/remotion/index.ts');
  console.log(`📦 Bundling entry point: ${entryPoint}`);
  
  const bundleLocation = await bundle({
    entryPoint: entryPoint,
  });
  console.log(`✅ Bundle created: ${bundleLocation}`);

  console.log(`🛰️ Deploying site '${SITE_NAME}' to bucket '${BUCKET}' in region '${REGION}'...`);
  
  try {
    const { siteName, bucketName } = await deploySite({
      bucketName: BUCKET,
      entryPoint: entryPoint,
      region: REGION,
      siteName: SITE_NAME,
      options: {
        onBundleProgress: (p) => console.log(`📦 Bundle: ${Math.round(p * 100)}%`),
        onUploadProgress: (p) => console.log(`📤 Upload: ${Math.round(p * 100)}%`),
      }
    });

    console.log(`✨ Success! Site '${siteName}' is now live in bucket '${bucketName}'.`);
  } catch (err: any) {
    console.error('❌ SDK Deployment Failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
