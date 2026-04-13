const { WebClient } = require('@slack/web-api');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function postAuditToSlack() {
  const token = process.env.SLACK_ELROY_BOT_TOKEN || process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error('❌ No Slack token found in .env.local');
    return;
  }

  const client = new WebClient(token);
  const channelName = 'thrive-syracuse-pilot';
  
  console.log(`Searching for channel: #${channelName}...`);
  
  try {
    const result = await client.conversations.list({
      types: 'public_channel,private_channel',
      limit: 1000
    });
    
    const channel = result.channels.find(c => c.name === channelName);
    
    if (!channel) {
      console.error(`❌ Could not find channel #${channelName}`);
      return;
    }

    console.log(`Found channel: ${channel.id}. Posting audit results...`);

    const auditSummary = `
*Inventory Asset Audit - Thrive Syracuse* 🏪

We have completed the inventory valuation audit. The reported *$144,000* discrepancy was caused by hardcoded placeholder data in the "Working Capital" dashboard ($100k inventory placeholder).

*Results Highlights:*
• *Actual Inventory Cost*: *$37,110.55* (Wholesale Assets)
• *Potential Retail Revenue*: *$132,094.08*
• *Data Integrity*: 430 SKUs with cost synced; 803 SKUs missing cost.
• *Anomaly Detected*: _High Peaks - Pre Roll 2pk_ has a *$200 unit cost* error in Alleaves (inflating value by ~$3.8k).

*System Updates:*
✅ Dashboard placeholders replaced with real-time POS synced data.
✅ Working Capital now reflects actual assets vs placeholders.
✅ Improved margin estimation logic using real 280E COGS data.

*Next Steps:*
1. Remediate missing cost fields for the 803 SKUs in Alleaves to improve asset accuracy.
2. Correct the unit cost for _High Peaks_ pre-rolls in Alleaves.
`.trim();

    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🦁 Leo COO · Operations Audit', emoji: true }
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: auditSummary }
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: 'Powered by *BakedBot AI* · Audit Complete' }]
      }
    ];

    const postResult = await client.chat.postMessage({
      channel: channel.id,
      text: 'Inventory Asset Audit Results',
      blocks
    });
    
    if (postResult.ok) {
      console.log(`✅ Message posted to #${channelName} (TS: ${postResult.ts})`);
    } else {
      console.error(`❌ Failed to post message: ${postResult.error}`);
    }
  } catch (error) {
    console.error(`❌ Error Posting to Slack: ${error.message}`);
  }
}

postAuditToSlack().catch(console.error);
