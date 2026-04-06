import { 
  S3Client, 
  PutObjectCommand, 
  ListObjectsV2Command, 
  DeleteObjectsCommand 
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

async function run() {
  const REGION = 'us-east-1';
  const bucketName = 'remotionlambda-useast1-5hg2s7ajg0';
  const siteName = 'bakedbot-creative';
  const s3Prefix = `sites/${siteName}/`;

  const s3 = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
    }
  });

  console.log(`🧹 Cleaning up existing assets in s3://${bucketName}/${s3Prefix}...`);
  const listedObjects = await s3.send(new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: s3Prefix,
  }));

  if (listedObjects.Contents && listedObjects.Contents.length > 0) {
    const deleteParams = {
      Bucket: bucketName,
      Delete: { Objects: listedObjects.Contents.map(({ Key }) => ({ Key })) },
    };
    await s3.send(new DeleteObjectsCommand(deleteParams));
    console.log(`✅ Cleared ${listedObjects.Contents.length} objects.`);
  }

  console.log('🚀 Starting MANUAL Site Deployment...');
  
  const distFolder = path.resolve('./dist/remotion');
  if (!fs.existsSync(distFolder)) {
    throw new Error('❌ dist/remotion does not exist. Run scripts/bundle-site.ts first.');
  }
  console.log(`📦 Using bundle from: ${distFolder}`);
  
  // Continue with upload logic using the existing s3 client initialized above
  async function uploadDir(dir: string, s3Prefix: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        await uploadDir(fullPath, `${s3Prefix}${file}/`);
      } else {
        const key = `${s3Prefix}${file}`;
        const body = fs.readFileSync(fullPath);
        
        let contentType = 'application/octet-stream';
        if (file.endsWith('.html')) contentType = 'text/html';
        if (file.endsWith('.js')) contentType = 'text/javascript';
        if (file.endsWith('.css')) contentType = 'text/css';
        if (file.endsWith('.json')) contentType = 'application/json';

        console.log(`📤 Uploading: ${key}`);
        await s3.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
        }));
      }
    }
  }

  console.log(`🛰️ Uploading bundle to s3://${bucketName}/${s3Prefix}...`);
  await uploadDir(distFolder, s3Prefix);

  console.log('✨ Manual Deployment Complete! Site is now sync\'d in S3.');
}

run().catch((err) => {
  console.error('❌ Manual Deployment Failed:', err);
  process.exit(1);
});
