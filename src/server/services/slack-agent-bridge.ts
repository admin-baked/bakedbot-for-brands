import { logger } from '@/lib/logger';
import { slackService, SlackService } from './communications/slack';
import { runAgentCore } from '@/server/agents/agent-runner';

// ---------------------------------------------------------------------------
// Agent keyword → persona ID routing map
// ---------------------------------------------------------------------------
const KEYWORD_MAP: Array<{ keywords: string[]; personaId: string }> = [
    { keywords: ['leo', 'coo', 'operations', 'ops'], personaId: 'leo' },
    { keywords: ['linus', 'cto', 'tech', 'build', 'code', 'deploy', 'bug', 'error'], personaId: 'linus' },
    { keywords: ['jack', 'cro', 'revenue', 'sales', 'pipeline', 'deal'], personaId: 'jack' },
    { keywords: ['glenda', 'cmo', 'brand', 'marketing'], personaId: 'glenda' },
    { keywords: ['ezal', 'intel', 'competitive', 'lookout', 'competitor'], personaId: 'ezal' },
    { keywords: ['craig', 'social', 'campaign', 'post', 'content'], personaId: 'craig' },
    { keywords: ['pops', 'analytics', 'data', 'report', 'metrics'], personaId: 'pops' },
    { keywords: ['smokey', 'products', 'menu', 'inventory', 'strains'], personaId: 'smokey' },
    { keywords: ['parker', 'loyalty', 'customers', 'retention', 'email'], personaId: 'mrs_parker' },
    { keywords: ['deebo', 'compliance', 'legal', 'regulation'], personaId: 'deebo' },
    { keywords: ['mike', 'finance', 'profitability', 'margins', 'tax', 'cfo'], personaId: 'money_mike' },
    { keywords: ['bigworm', 'research', 'market'], personaId: 'bigworm' },
    { keywords: ['day_day', 'dayday', 'growth', 'acquisition', 'leads'], personaId: 'day_day' },
    { keywords: ['felisha', 'fulfillment', 'delivery', 'driver'], personaId: 'felisha' },
];

// Channel name prefix → persona ID
const CHANNEL_MAP: Array<{ prefix: string; personaId: string }> = [
    { prefix: 'linus', personaId: 'linus' },
    { prefix: 'leo', personaId: 'leo' },
    { prefix: 'jack', personaId: 'jack' },
    { prefix: 'glenda', personaId: 'glenda' },
    { prefix: 'ezal', personaId: 'ezal' },
    { prefix: 'craig', personaId: 'craig' },
    { prefix: 'intel', personaId: 'ezal' },
    { prefix: 'cto', personaId: 'linus' },
    { prefix: 'coo', personaId: 'leo' },
    { prefix: 'cro', personaId: 'jack' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip <@BOTID> mention tokens from Slack message text.
 */
export function stripBotMention(text: string): string {
    return text.replace(/<@[A-Z0-9]+>/g, '').trim();
}

/**
 * Detect which agent persona to use based on message content and channel name.
 * Priority: explicit name in message > channel prefix > default.
 */
export function detectAgent(text: string, channelName: string, isDm: boolean): string {
    const lower = text.toLowerCase();

    // 1. Check message text for explicit agent keywords
    for (const { keywords, personaId } of KEYWORD_MAP) {
        if (keywords.some(kw => lower.includes(kw))) {
            return personaId;
        }
    }

    // 2. Check channel name prefix
    const channelLower = (channelName || '').toLowerCase();
    for (const { prefix, personaId } of CHANNEL_MAP) {
        if (channelLower.startsWith(prefix)) {
            return personaId;
        }
    }

    // 3. Default: Leo for DMs (trusted direct channel), puff for general channels
    return isDm ? 'leo' : 'puff';
}

// ---------------------------------------------------------------------------
// Main bridge function
// ---------------------------------------------------------------------------

export interface SlackMessageContext {
    text: string;
    slackUserId: string;
    channel: string;
    threadTs: string;       // The ts of the parent message (or the message itself)
    channelName?: string;   // Optional: resolved channel name for routing
    isDm?: boolean;         // true if this is a direct message
    isChannelMsg?: boolean; // true if this is a public channel message (not @mention, not DM)
}

export async function processSlackMessage(ctx: SlackMessageContext): Promise<void> {
    const { text, slackUserId, channel, threadTs, channelName = '', isDm = false, isChannelMsg = false } = ctx;

    try {
        // 1. Strip bot mention and clean up text
        const cleanText = stripBotMention(text);

        if (!cleanText) {
            logger.info('[SlackBridge] Empty message after stripping mention, skipping');
            return;
        }

        logger.info(`[SlackBridge] Processing from ${slackUserId} in ${channel}: "${cleanText.slice(0, 80)}"`);

        // 2. Detect which agent to route to
        const personaId = detectAgent(cleanText, channelName, isDm);
        logger.info(`[SlackBridge] Routing to persona: ${personaId}`);

        // For public channel messages (not @mentions, not DMs), only respond if a
        // specific agent keyword was found. Avoids replying to every channel message.
        if (isChannelMsg && personaId === 'puff') {
            logger.info('[SlackBridge] Channel message with no agent keyword — skipping');
            return;
        }

        // 3. Post a "thinking" indicator so user gets immediate feedback
        await slackService.postInThread(channel, threadTs, `_${getPersonaName(personaId)} is thinking..._`);

        // 4. Run the agent
        const result = await runAgentCore(cleanText, personaId, {}, null);

        if (!result.content) {
            logger.warn('[SlackBridge] Agent returned empty content');
            await slackService.postInThread(
                channel, threadTs,
                'Sorry, I had trouble generating a response. Please try again.'
            );
            return;
        }

        // 5. Format as Slack Block Kit and post
        const blocks = SlackService.formatAgentResponse(result.content, personaId);
        const fallbackText = `${getPersonaName(personaId)}: ${result.content.slice(0, 200)}`;

        await slackService.postInThread(channel, threadTs, fallbackText, blocks);

        logger.info(`[SlackBridge] Replied successfully to ${slackUserId} with ${personaId}`);

    } catch (err: any) {
        logger.error(`[SlackBridge] Failed to process message: ${err.message}`, err);
        try {
            await slackService.postInThread(
                channel, threadTs,
                'I ran into an issue processing your request. The team has been notified.'
            );
        } catch {
            // Best effort — don't throw
        }
    }
}

// ---------------------------------------------------------------------------
// Welcome new channel members — called on member_joined_channel events
// ---------------------------------------------------------------------------

export async function welcomeNewMember(slackUserId: string, channel: string): Promise<void> {
    try {
        logger.info(`[SlackBridge] Welcoming new member ${slackUserId} in ${channel}`);

        const prompt = `A new team member just joined — their Slack ID is <@${slackUserId}>.
Welcome them warmly by name, introduce yourself as Mrs. Parker from the BakedBot team,
and let them know you and the rest of the agent squad (Leo, Linus, Jack, Ezal, Craig, and others)
are here to help with cannabis marketing, loyalty programs, competitive intelligence, and more.
Keep it friendly, brief, and genuine.`;

        const result = await runAgentCore(prompt, 'mrs_parker', {}, null);

        if (result.content) {
            const blocks = SlackService.formatAgentResponse(result.content, 'mrs_parker');
            const fallback = `Mrs. Parker: ${result.content.slice(0, 200)}`;
            await slackService.postMessage(channel, fallback, blocks);
        }
    } catch (err: any) {
        logger.error(`[SlackBridge] welcomeNewMember failed: ${err.message}`);
    }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function getPersonaName(personaId: string): string {
    const names: Record<string, string> = {
        leo: 'Leo', linus: 'Linus', jack: 'Jack', glenda: 'Glenda',
        ezal: 'Ezal', craig: 'Craig', pops: 'Pops', smokey: 'Smokey',
        mrs_parker: 'Mrs. Parker', deebo: 'Deebo', money_mike: 'Money Mike',
        bigworm: 'Big Worm', day_day: 'Day Day', felisha: 'Felisha', puff: 'BakedBot',
    };
    return names[personaId] ?? 'BakedBot';
}
