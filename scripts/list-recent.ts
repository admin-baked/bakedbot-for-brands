import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function run() {
  const s3 = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
    }
  });

  const res = await s3.send(new ListObjectsV2Command({
    Bucket: 'remotionlambda-useast1-5hg2s7ajg0',
  }));

  const sorted = (res.Contents || []).sort((a, b) => b.LastModified!.getTime() - a.LastModified!.getTime());
  console.log('🕒 Most recent 5 objects:');
  sorted.slice(0, 20).forEach(o => console.log(`${o.LastModified?.toISOString()} - ${o.Key}`));
}

run().catch(console.error);
