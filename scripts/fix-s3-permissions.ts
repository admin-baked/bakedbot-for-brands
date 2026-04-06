import { S3Client, PutBucketPolicyCommand } from '@aws-sdk/client-s3';

const BUCKET_NAME = 'remotionlambda-useast1-5hg2s7ajg0';
const REGION = 'us-east-1';

async function fixPermissions() {
  const s3Client = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY || '',
    },
  });

  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadForRemotionSites',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${BUCKET_NAME}/sites/*`],
      },
    ],
  };

  console.log(`🛰️ Applying Public Read Policy to s3://${BUCKET_NAME}/sites/*...`);

  try {
    const command = new PutBucketPolicyCommand({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(policy),
    });

    await s3Client.send(command);
    console.log('✨ Bucket Policy Applied Successfully!');
  } catch (error: any) {
    console.error('❌ Failed to apply Bucket Policy:', error.message);
    if (error.name === 'AccessDenied') {
      console.log('⚠️ Please ensure "Block Public Access" is disabled for this bucket in the AWS Console.');
    }
    throw error;
  }
}

fixPermissions().catch((err) => {
    console.error('❌ Error in fix-s3-permissions:', err);
    process.exit(1);
});
