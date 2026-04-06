import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
  }
});

async function run() {
  console.log("Verifying Key ID:", process.env.REMOTION_AWS_ACCESS_KEY_ID);
  try {
    const data = await s3.send(new ListBucketsCommand({}));
    console.log("Success! Buckets found:", data.Buckets?.length);
    console.log("Bucket Names:", data.Buckets?.map(b => b.Name));
  } catch (err: any) {
    console.error("AWS Diagnostic Error:", err.name, err.message);
  }
}
run();
