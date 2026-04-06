import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const BUCKET_NAME = 'remotionlambda-useast1-5hg2s7ajg0';
const REGION = 'us-east-1';

async function listSites() {
  const s3Client = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY || '',
    },
  });

  console.log(`Listing s3://${BUCKET_NAME}/sites/...`);

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: 'sites/',
  });

  const response = await s3Client.send(command);
  
  if (!response.Contents || response.Contents.length === 0) {
    console.log('No objects found.');
    return;
  }

  response.Contents.forEach((item) => {
    console.log(`- ${item.Key} (${item.Size} bytes)`);
  });
}

listSites().catch(console.error);
