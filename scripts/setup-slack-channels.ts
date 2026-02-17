/**
 * Slack Channel Auto-Setup Script
 * Creates dedicated channels for each agent with topics and ensures bot is a member
 *
 * Usage: npx ts-node scripts/setup-slack-channels.ts
 */

import { slackService } from '@/server/services/communications/slack';

interface AgentChannel {
    channel: string;
    personaId: string;
    topic: string;
}

// 14 dedicated agent channels aligned to CHANNEL_MAP routing
const AGENT_CHANNELS: AgentChannel[] = [
    {
        channel: 'leo-coo',
        personaId: 'leo',
        topic: 'Leo — COO · Ask about operations, logistics, and business continuity'
    },
    {
        channel: 'linus-cto',
        personaId: 'linus',
        topic: 'Linus — CTO · Ask about code, builds, deploys, and technical bugs'
    },
    {
        channel: 'jack-cro',
        personaId: 'jack',
        topic: 'Jack — CRO · Ask about revenue, sales pipeline, and deals'
    },
    {
        channel: 'glenda-cmo',
        personaId: 'glenda',
        topic: 'Glenda — CMO · Ask about brand, marketing strategy, and campaigns'
    },
    {
        channel: 'ezal-intel',
        personaId: 'ezal',
        topic: 'Ezal — Lookout · Ask about competitor pricing, menu changes, and market intel'
    },
    {
        channel: 'craig-social',
        personaId: 'craig',
        topic: 'Craig — Marketer · Ask about social posts, campaign content, and copy'
    },
    {
        channel: 'pops-analytics',
        personaId: 'pops',
        topic: 'Pops — Analyst · Ask about data, reports, and performance metrics'
    },
    {
        channel: 'smokey-menu',
        personaId: 'smokey',
        topic: 'Smokey — Budtender · Ask about products, inventory, and strains'
    },
    {
        channel: 'parker-loyalty',
        personaId: 'mrs_parker',
        topic: 'Mrs. Parker — Loyalty · Ask about loyalty programs, customers, and retention'
    },
    {
        channel: 'deebo-compliance',
        personaId: 'deebo',
        topic: 'Deebo — Compliance · Ask about regulations, legal, and compliance'
    },
    {
        channel: 'mike-cfo',
        personaId: 'money_mike',
        topic: 'Money Mike — CFO · Ask about finance, margins, profitability, and taxes'
    },
    {
        channel: 'bigworm-research',
        personaId: 'bigworm',
        topic: 'Big Worm — Researcher · Ask about market research and industry trends'
    },
    {
        channel: 'day-day-growth',
        personaId: 'day_day',
        topic: 'Day Day — Growth · Ask about customer acquisition, leads, and growth'
    },
    {
        channel: 'felisha-ops',
        personaId: 'felisha',
        topic: 'Felisha — Ops · Ask about fulfillment, delivery, and driver coordination'
    }
];

async function setupChannels() {
    console.log('\n🚀 Starting Slack channel setup...\n');

    const results: Array<{
        channel: string;
        status: 'created' | 'skipped' | 'error';
        message: string;
    }> = [];

    for (const { channel, personaId, topic } of AGENT_CHANNELS) {
        console.log(`📍 Processing #${channel}...`);

        try {
            // Check if channel already exists
            const existing = await slackService.findChannelByName(channel);

            if (!existing) {
                // Create new channel
                const created = await slackService.createChannel(channel);
                if (created) {
                    // Set topic
                    await slackService.setChannelTopic(created.id, topic);
                    // Join channel
                    await slackService.joinChannel(created.id);
                    results.push({
                        channel,
                        status: 'created',
                        message: `✅ Created`
                    });
                    console.log(`   ✅ Created and joined`);
                } else {
                    results.push({
                        channel,
                        status: 'error',
                        message: `❌ Failed to create`
                    });
                    console.log(`   ❌ Failed to create`);
                }
            } else {
                // Channel exists, update topic and ensure bot is a member
                await slackService.setChannelTopic(existing.id, topic);
                await slackService.joinChannel(existing.id);
                results.push({
                    channel,
                    status: 'skipped',
                    message: `⏭️ Already exists`
                });
                console.log(`   ⏭️ Already exists, updated topic and ensured bot is member`);
            }
        } catch (error: any) {
            results.push({
                channel,
                status: 'error',
                message: `❌ Error: ${error.message}`
            });
            console.log(`   ❌ Error: ${error.message}`);
        }
    }

    // Print summary table
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60) + '\n');

    const created = results.filter(r => r.status === 'created').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;

    console.log(`📊 Total channels: ${AGENT_CHANNELS.length}`);
    console.log(`✅ Created: ${created}`);
    console.log(`⏭️ Skipped (already exist): ${skipped}`);
    console.log(`❌ Errors: ${errors}\n`);

    // Print detailed results
    console.log('Channel Details:');
    console.log('-'.repeat(60));
    results.forEach(r => {
        const padded = r.channel.padEnd(20);
        console.log(`${padded} ${r.message}`);
    });

    console.log('\n' + '='.repeat(60));

    if (errors === 0) {
        console.log('✨ All channels processed successfully!\n');
        process.exit(0);
    } else {
        console.log(`⚠️ ${errors} channel(s) encountered errors. Check logs above.\n`);
        process.exit(1);
    }
}

// Run setup
setupChannels().catch((error: any) => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
});
