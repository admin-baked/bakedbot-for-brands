
import { WebClient } from '@slack/web-api';
import { logger } from '@/lib/logger';

// Persona display metadata for Block Kit formatting
export const PERSONA_META: Record<string, { emoji: string; role: string }> = {
    leo:         { emoji: '🦁', role: 'COO · Operations' },
    linus:       { emoji: '🖥️', role: 'CTO · Technology' },
    jack:        { emoji: '💰', role: 'CRO · Revenue' },
    glenda:      { emoji: '🌟', role: 'CMO · Marketing' },
    ezal:        { emoji: '👀', role: 'Lookout · Competitive Intel' },
    craig:       { emoji: '📱', role: 'Marketer · Campaigns' },
    pops:        { emoji: '📊', role: 'Analyst · Data' },
    smokey:      { emoji: '🌿', role: 'Budtender · Products' },
    mrs_parker:  { emoji: '💌', role: 'Mrs. Parker · Loyalty' },
    deebo:       { emoji: '⚖️', role: 'Enforcer · Compliance' },
    money_mike:  { emoji: '💵', role: 'CFO · Profitability' },
    bigworm:     { emoji: '🔬', role: 'Researcher · Insights' },
    day_day:     { emoji: '📈', role: 'Growth · Acquisition' },
    felisha:     { emoji: '🗂️', role: 'Ops · Fulfillment' },
    puff:        { emoji: '🤖', role: 'BakedBot AI' },
};

export class SlackService {
    private client: WebClient | null = null;

    constructor() {
        if (process.env.SLACK_BOT_TOKEN) {
            this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
        } else {
            logger.warn('[Slack] Missing SLACK_BOT_TOKEN');
        }
    }

    async postMessage(channel: string, text: string, blocks?: any[]): Promise<any> {
        if (!this.client) {
             logger.warn('[Slack] Message skipped (No Token): ' + text);
             return { sent: false, error: 'No Token' };
        }

        try {
            const result = await this.client.chat.postMessage({
                channel,
                text,
                blocks
            });
            return { sent: true, ts: result.ts, channel: result.channel };
        } catch (e: any) {
            logger.error(`[Slack] Post failed: ${e.message}`);
            return { sent: false, error: e.message };
        }
    }

    async postInThread(channel: string, threadTs: string, text: string, blocks?: any[]): Promise<any> {
        if (!this.client) {
            logger.warn('[Slack] Thread reply skipped (No Token)');
            return { sent: false, error: 'No Token' };
        }

        try {
            const result = await this.client.chat.postMessage({
                channel,
                thread_ts: threadTs,
                text,
                blocks
            });
            return { sent: true, ts: result.ts, channel: result.channel };
        } catch (e: any) {
            logger.error(`[Slack] Thread post failed: ${e.message}`);
            return { sent: false, error: e.message };
        }
    }

    async listChannels(): Promise<any[]> {
        if (!this.client) return [];

        try {
            const result = await this.client.conversations.list({ types: 'public_channel,private_channel', limit: 100 });
            return result.channels?.map(c => ({
                id: c.id,
                name: c.name,
                is_private: c.is_private
            })) || [];
        } catch (e: any) {
             logger.error(`[Slack] List channels failed: ${e.message}`);
             return [];
        }
    }

    async findChannelByName(name: string): Promise<{ id: string; name: string } | null> {
        try {
            const channels = await this.listChannels();
            const channel = channels.find(c => c.name === name);
            return channel ? { id: channel.id, name: channel.name } : null;
        } catch (e: any) {
            logger.error(`[Slack] Find channel failed: ${e.message}`);
            return null;
        }
    }

    async createChannel(name: string): Promise<{ id: string; name: string } | null> {
        if (!this.client) {
            logger.warn('[Slack] Create channel skipped (No Token)');
            return null;
        }

        try {
            const result = await this.client.conversations.create({
                name,
                is_private: false
            });
            if (result.channel?.id && result.channel?.name) {
                return { id: result.channel.id, name: result.channel.name };
            }
            return null;
        } catch (e: any) {
            // Channel already exists returns error, which is fine for idempotent operation
            if (e.message.includes('name_taken')) {
                logger.info(`[Slack] Channel ${name} already exists`);
            } else {
                logger.error(`[Slack] Create channel failed: ${e.message}`);
            }
            return null;
        }
    }

    async setChannelTopic(channelId: string, topic: string): Promise<void> {
        if (!this.client) {
            logger.warn('[Slack] Set topic skipped (No Token)');
            return;
        }

        try {
            await this.client.conversations.setTopic({
                channel: channelId,
                topic
            });
        } catch (e: any) {
            logger.error(`[Slack] Set topic failed: ${e.message}`);
        }
    }

    async joinChannel(channelId: string): Promise<void> {
        if (!this.client) {
            logger.warn('[Slack] Join channel skipped (No Token)');
            return;
        }

        try {
            await this.client.conversations.join({
                channel: channelId
            });
        } catch (e: any) {
            // Already a member is not an error
            if (!e.message.includes('already_in_channel')) {
                logger.error(`[Slack] Join channel failed: ${e.message}`);
            }
        }
    }

    static formatAgentResponse(content: string, personaId: string): any[] {
        const meta = PERSONA_META[personaId] ?? PERSONA_META['puff'];
        const agentLabel = `${meta.emoji} ${meta.role}`;

        // Split long content into ≤3000-char sections (Slack block text limit)
        const chunks: string[] = [];
        let remaining = content;
        while (remaining.length > 3000) {
            // Try to break at a paragraph boundary
            const breakAt = remaining.lastIndexOf('\n\n', 3000);
            const cutAt = breakAt > 500 ? breakAt : 3000;
            chunks.push(remaining.slice(0, cutAt).trim());
            remaining = remaining.slice(cutAt).trim();
        }
        if (remaining.length > 0) chunks.push(remaining);

        const textBlocks = chunks.map(chunk => ({
            type: 'section',
            text: { type: 'mrkdwn', text: chunk }
        }));

        return [
            {
                type: 'header',
                text: { type: 'plain_text', text: agentLabel, emoji: true }
            },
            { type: 'divider' },
            ...textBlocks,
            {
                type: 'context',
                elements: [{ type: 'mrkdwn', text: 'Powered by *BakedBot AI* · via Slack' }]
            }
        ];
    }
}

export const slackService = new SlackService();
