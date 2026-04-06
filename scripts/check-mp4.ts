import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

async function run() {
  const REGION = 'us-east-1';
  const BUCKET = 'remotionlambda-useast1-5hg2s7ajg0';
  const renderId = 'iv04a5s';
  const key = `renders/${renderId}/out.mp4`;

  console.log(`🔍 Checking for final video asset: s3://${BUCKET}/${key}`);
  
  const s3 = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
    }
  });

  try {
    const res = await s3.send(new HeadObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));
    
    console.log('✅ Success! Video asset found.');
    console.log(`📏 Size: ${(res.ContentLength! / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🔗 URL: https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`);
  } catch (err: any) {
    if (err.name === 'NotFound') {
      console.log('❌ Video asset NOT found yet. The render may still be in progress.');
    } else {
      console.error('💥 S3 Error:', err.message);
    }
  }
}

run().catch(console.error);
