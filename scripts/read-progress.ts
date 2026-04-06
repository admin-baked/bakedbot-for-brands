import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
  }
});

async function run() {
  const Bucket = 'remotionlambda-useast1-5hg2s7ajg0';
  const renderId = '95b7gjzj7x';
  try {
    const data = await s3.send(new GetObjectCommand({
      Bucket,
      Key: `renders/${renderId}/progress.json`
    }));
    const body = await data.Body?.transformToString();
    console.log("Progress JSON:", body);
  } catch (err: any) {
    console.error("S3 Error:", err.message);
  }
}
run();
