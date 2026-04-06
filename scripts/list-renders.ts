import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
  }
});

async function run() {
  const Bucket = 'remotionlambda-useast1-5hg2s7ajg0';
  const renderId = process.argv[2] || '95b7gjzj7x';
  try {
    const data = await s3.send(new ListObjectsV2Command({
      Bucket,
      Prefix: `renders/${renderId}/`
    }));
    if (data.Contents?.length) {
        console.log("Success! Render found in S3.");
        console.log("Objects:", data.Contents.map(c => c.Key));
        // Find MP4 if it exists
        const mp4 = data.Contents.find(c => c.Key?.endsWith('.mp4'));
        if (mp4) {
            console.log("MP4 URL:", `https://${Bucket}.s3.us-east-1.amazonaws.com/${mp4.Key}`);
        }
    } else {
        console.log("No objects found with prefix 'renders/95b7gjzj7x/'.");
    }
  } catch (err: any) {
    console.error("S3 Error:", err.message);
  }
}
run();
