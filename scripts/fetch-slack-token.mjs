#!/usr/bin/env node
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const projectId = 'bakedbot-prod';

async function getSecret(secretId) {
  try {
    const name = client.secretVersionPath(projectId, secretId, 'latest');
    const [version] = await client.accessSecretVersion({ name });
    const secret = version.payload.data.toString();
    console.log(secret);
  } catch (error) {
    console.error(`Error fetching ${secretId}:`, error.message);
    process.exit(1);
  }
}

getSecret('SLACK_BOT_TOKEN');
