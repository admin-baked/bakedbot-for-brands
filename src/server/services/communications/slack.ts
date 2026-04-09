
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
    elroy:       { emoji: '🏪', role: 'Uncle Elroy · Store Ops' },
};

export class SlackService {
    private client: WebClient | null = null;
    private missingTokenWarningLogged = false;

    constructor(token?: string) {
        const t = token ?? process.env.SLACK_BOT_TOKEN;
        if (t) this.client = new WebClient(t);
    }

    private getClient(action: string): WebClient | null {
        if (this.client) {
            return this.client;
        }

        if (!this.missingTokenWarningLogged) {
            logger.warn('[Slack] Missing SLACK_BOT_TOKEN; Slack operations will be skipped', {
                action,
            });
            this.missingTokenWarningLogged = true;
        }

        return null;
    }

    async postMessage(channel: string, text: string, blocks?: any[]): Promise<any> {
        const client = this.getClient('postMessage');
        if (!client) {
             return { sent: false, error: 'No Token' };
        }

        try {
            const result = await client.chat.postMessage({
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
        const client = this.getClient('postInThread');
        if (!client) {
            return { sent: false, error: 'No Token' };
        }

        try {
            const result = await client.chat.postMessage({
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
        const client = this.getClient('listChannels');
        if (!client) return [];

        const channels: any[] = [];
        let cursor: string | undefined;

        try {
            // Paginate up to 500 channels so internal channels (e.g. #linus-deployments)
            // are never missed when the workspace has more than 100 channels.
            do {
                const result = await client.conversations.list({
                    types: 'public_channel,private_channel',
                    limit: 200,
                    cursor,
                });
                for (const c of result.channels ?? []) {
                    channels.push({ id: c.id, name: c.name, is_private: c.is_private });
                }
                cursor = result.response_metadata?.next_cursor || undefined;
            } while (cursor && channels.length < 500);

            return channels;
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
        const client = this.getClient('createChannel');
        if (!client) {
            return null;
        }

        try {
            const result = await client.conversations.create({
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
        const client = this.getClient('setChannelTopic');
        if (!client) {
            return;
        }

        try {
            await client.conversations.setTopic({
                channel: channelId,
                topic
            });
        } catch (e: any) {
            logger.error(`[Slack] Set topic failed: ${e.message}`);
        }
    }

    async joinChannel(channelId: string): Promise<void> {
        const client = this.getClient('joinChannel');
        if (!client) {
            return;
        }

        try {
            await client.conversations.join({
                channel: channelId
            });
        } catch (e: any) {
            // Already a member is not an error
            if (!e.message.includes('already_in_channel')) {
                logger.error(`[Slack] Join channel failed: ${e.message}`);
            }
        }
    }

    async updateMessage(channel: string, ts: string, text: string, blocks?: any[]): Promise<any> {
        const client = this.getClient('updateMessage');
        if (!client) {
            return { sent: false, error: 'No Token' };
        }

        try {
            const result = await client.chat.update({
                channel,
                ts,
                text,
                blocks
            });
            return { sent: true, ts: result.ts, channel: result.channel };
        } catch (e: any) {
            logger.error(`[Slack] Update message failed: ${e.message}`);
            return { sent: false, error: e.message };
        }
    }

    async authTest(): Promise<{ bot_id?: string; app_id?: string; user_id?: string; team?: string; url?: string } | null> {
        const client = this.getClient('authTest');
        if (!client) return null;
        try {
            const result = await client.auth.test();
            return {
                bot_id: result.bot_id,
                app_id: (result as any).app_id,
                user_id: result.user_id,
                team: result.team as string | undefined,
                url: result.url,
            };
        } catch (e: any) {
            logger.warn(`[Slack] auth.test failed: ${e.message}`);
            return null;
        }
    }

    /**
     * Fetch the message history for a thread or DM conversation.
     * - Thread replies: pass the parent message ts as threadTs
     * - DM history: pass the DM channel ID (starts with 'D'); threadTs ignored
     * Returns messages oldest-first, capped at `limit`.
     */
    async getConversationHistory(
        channel: string,
        threadTs?: string,
        limit = 15,
    ): Promise<Array<{ user: string; text: string; ts: string; isBot: boolean }>> {
        const client = this.getClient('getConversationHistory');
        if (!client) return [];

        try {
            let messages: any[];
            if (threadTs) {
                // Threaded reply — fetch the full thread
                const result = await client.conversations.replies({
                    channel,
                    ts: threadTs,
                    limit,
                });
                messages = result.messages ?? [];
            } else {
                // DM or channel — fetch recent history
                const result = await client.conversations.history({
                    channel,
                    limit,
                });
                messages = (result.messages ?? []).reverse(); // oldest-first
            }

            return messages.map((m: any) => ({
                user: m.user ?? m.username ?? (m.bot_id ? 'BakedBot' : 'unknown'),
                text: (m.text ?? '').trim(),
                ts: m.ts ?? '',
                isBot: !!m.bot_id,
            }));
        } catch (e: any) {
            logger.warn(`[Slack] getConversationHistory failed for ${channel}: ${e.message}`);
            return [];
        }
    }

    /**
     * Get channel info by ID. Returns the channel name (needed for agent routing
     * since Slack Events API does not include channel_name in event payloads).
     */
    async getChannelInfo(channelId: string): Promise<{ id: string; name: string } | null> {
        const client = this.getClient('getChannelInfo');
        if (!client) {
            return null;
        }

        try {
            const result = await client.conversations.info({ channel: channelId });
            if (result.channel) {
                return {
                    id: result.channel.id || channelId,
                    name: result.channel.name || '',
                };
            }
            return null;
        } catch (e: any) {
            // DMs and some private channels may fail — non-fatal
            logger.warn(`[Slack] getChannelInfo failed for ${channelId}: ${e.message}`);
            return null;
        }
    }

    async getUserInfo(slackUserId: string): Promise<{ id: string; name: string; email: string } | null> {
        const client = this.getClient('getUserInfo');
        if (!client) {
            return null;
        }

        try {
            const result = await client.users.info({
                user: slackUserId
            });

            if (!result.user) {
                return null;
            }

            const user = result.user;
            return {
                id: user.id || slackUserId,
                name: user.real_name || user.name || slackUserId,
                email: user.profile?.email || ''
            };
        } catch (e: any) {
            logger.error(`[Slack] Get user info failed: ${e.message}`);
            return null;
        }
    }

    /**
     * Convert markdown to Slack mrkdwn format.
     * Slack does not render ## headers or pipe tables natively — convert them.
     */
    static toSlackMrkdwn(text: string): string {
        // Convert markdown tables to plain-text key:value lines
        text = text.replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (_match, header, rows) => {
            const headers = header.split('|').map((h: string) => h.trim()).filter(Boolean);
            const rowLines = rows.trim().split('\n').map((row: string) => {
                const cells = row.split('|').map((c: string) => c.trim()).filter(Boolean);
                return cells.map((cell: string, i: number) => `*${headers[i] ?? ''}:* ${cell}`).join('  ·  ');
            });
            return rowLines.join('\n');
        });

        // Convert ## / # headers to Slack bold
        text = text.replace(/^#{1,3}\s+(.+)$/gm, '*$1*');

        // Convert **bold** to Slack *bold*
        text = text.replace(/\*\*(.+?)\*\*/g, '*$1*');

        // Remove horizontal rules
        text = text.replace(/^---+$/gm, '');

        // Collapse excessive blank lines
        text = text.replace(/\n{3,}/g, '\n\n');

        return text.trim();
    }

    static formatAgentResponse(content: string, personaId: string): any[] {
        const meta = PERSONA_META[personaId] ?? PERSONA_META['puff'];
        const agentLabel = `${meta.emoji} ${meta.role}`;

        // Convert markdown to Slack-native mrkdwn (tables → lists, ## → bold, etc.)
        const slackContent = SlackService.toSlackMrkdwn(content);

        // Split long content into ≤3000-char sections (Slack block text limit)
        const chunks: string[] = [];
        let remaining = slackContent;
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

// Uncle Elroy — dedicated bot token for Thrive Syracuse store ops persona.
// Uses SLACK_ELROY_BOT_TOKEN if set; falls back to shared token so the app
// still works before the secret is provisioned.
export const elroySlackService = new SlackService(
    process.env.SLACK_ELROY_BOT_TOKEN || process.env.SLACK_BOT_TOKEN
);

// Linus CTO App — dedicated bot token for the Linus CTO Slack app.
// DMs opened with the Linus bot can only be replied to by the Linus bot token.
// Falls back to shared token before the secret is provisioned.
// Uses || (not ??) so empty-string secrets (bad version, unset) still fall back.
export const linusSlackService = new SlackService(
    process.env.SLACK_LINUS_BOT_TOKEN || process.env.SLACK_BOT_TOKEN
);

// Marty Benjamins — dedicated bot token for the CEO Slack app.
// Falls back to shared token before the secret is provisioned.
export const martySlackService = new SlackService(
    process.env.SLACK_MARTY_BOT_TOKEN || process.env.SLACK_BOT_TOKEN
);
