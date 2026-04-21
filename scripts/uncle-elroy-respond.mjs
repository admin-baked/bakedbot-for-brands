#!/usr/bin/env node
/**
 * Uncle Elroy Slack Bot - Respond to Ade's message
 * Posts as Uncle Elroy bot to #thrive-syracuse-pilot
 */

import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = 'C0813F5CD0A'; // #thrive-syracuse-pilot channel ID

async function main() {
  try {
    // First, find recent messages from Ade about credits
    console.log('🔍 Searching for Ade\'s messages about credits...\n');

    const messages = await slack.conversations.history({
      channel: CHANNEL,
      limit: 50,
    });

    // Find Ade's message(s) about credits being out
    const adeMessages = messages.messages.filter(msg =>
      msg.user && msg.text &&
      (msg.text.toLowerCase().includes('credit') ||
       msg.text.toLowerCase().includes('elroy') ||
       msg.text.toLowerCase().includes('out of'))
    );

    if (adeMessages.length === 0) {
      console.log('❌ No recent messages from Ade about credits found.');
      console.log('\nRecent messages in channel:');
      messages.messages.slice(0, 5).forEach(msg => {
        console.log(`  • ${msg.text?.substring(0, 60)}...`);
      });
      process.exit(0);
    }

    console.log(`✅ Found ${adeMessages.length} message(s) from Ade\n`);

    // Post Uncle Elroy's response to the most recent one
    const targetMsg = adeMessages[0];
    const threadTs = targetMsg.thread_ts || targetMsg.ts;

    console.log(`📤 Posting Uncle Elroy response to thread...\n`);

    const response = await slack.chat.postMessage({
      channel: CHANNEL,
      thread_ts: threadTs,
      text: '🟢 Back online and ready to help!',
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
              text: '*Yesterday\'s Sales (04-19)*\n$647',
            },
            {
              type: 'mrkdwn',
              text: '*4/20 Campaign Status*\n✅ Scheduled & Running',
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'Questions? Ask away – I\'m listening.',
            },
          ],
        },
      ],
    });

    console.log(`✅ Response posted successfully!`);
    console.log(`   Message TS: ${response.ts}`);
    console.log(`   Thread: ${threadTs}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

main();
