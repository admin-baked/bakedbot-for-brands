
import { WebClient } from '@slack/web-api';
import { logger } from '@/lib/logger';

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
}

export const slackService = new SlackService();
