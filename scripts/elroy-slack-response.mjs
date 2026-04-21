#!/usr/bin/env node
/**
 * Uncle Elroy Slack Response
 * Fetch Elroy's bot token from Secret Manager and respond to Ade
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { WebClient } from '@slack/web-api';

const secretClient = new SecretManagerServiceClient();
const projectId = 'studio-567050101-bc6e8';
const CHANNEL = 'C0813F5CD0A'; // #thrive-syracuse-pilot

async function getSecret(secretId) {
  try {
    const name = secretClient.secretVersionPath(projectId, secretId, 'latest');
    const [version] = await secretClient.accessSecretVersion({ name });
    return version.payload.data.toString();
  } catch (error) {
    console.error(`Error fetching secret ${secretId}:`, error.message);
    throw error;
  }
}

async function main() {
  try {
    // Fetch Elroy's bot token
    console.log('🔑 Fetching Uncle Elroy bot token...');
    const elroyToken = await getSecret('SLACK_ELROY_BOT_TOKEN');
    console.log('✅ Token retrieved\n');

    const slack = new WebClient(elroyToken);

    // Find Ade's recent messages about credits
    console.log('🔍 Searching for Ade\'s messages in #thrive-syracuse-pilot...\n');
    const history = await slack.conversations.history({
      channel: CHANNEL,
      limit: 50,
    });

    const adeMessages = history.messages.filter(msg =>
      msg.user && msg.text &&
      (msg.text.toLowerCase().includes('credit') ||
       msg.text.toLowerCase().includes('out of') ||
       msg.text.toLowerCase().includes('elroy'))
    );

    if (adeMessages.length === 0) {
      console.log('❌ No messages found about credits.');
      console.log('Recent messages:');
      history.messages.slice(0, 3).forEach(msg => {
        console.log(`  • ${msg.text?.substring(0, 70)}...`);
      });
      process.exit(0);
    }

    // Post to the most recent thread
    const targetMsg = adeMessages[0];
    const threadTs = targetMsg.thread_ts || targetMsg.ts;

    console.log(`📤 Posting Uncle Elroy response to thread...\n`);
    console.log(`Target message: "${targetMsg.text.substring(0, 60)}..."`);
    console.log(`Thread TS: ${threadTs}\n`);

    const response = await slack.chat.postMessage({
      channel: CHANNEL,
      thread_ts: threadTs,
      text: '🟢 Back online and ready!',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🟢 *Uncle Elroy is back online!*\n\nClaude API credits have been reloaded. I\'m ready to serve Thrive Syracuse.',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: '*Yesterday\'s Sales (04-19)*\n💰 $647',
            },
            {
              type: 'mrkdwn',
              text: '*4/20 Campaign*\n✅ Scheduled & Running',
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '<@' + targetMsg.user + '> — Questions? Let\'s talk.',
            },
          ],
        },
      ],
    });

    console.log(`✅ Response posted successfully!`);
    console.log(`   Message URL: slack.com/archives/${CHANNEL}/p${response.ts.replace('.', '')}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

main();
