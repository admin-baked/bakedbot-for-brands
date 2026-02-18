import { logger } from '@/lib/logger';
import { slackService, SlackService } from './communications/slack';
import { runAgentCore } from '@/server/agents/agent-runner';
import { archiveSlackResponse } from './slack-response-archive';
import {
    detectRiskyAction,
    createApprovalRequest,
    formatApprovalBlocks,
    setApprovalMessageTs,
} from './slack-approval';
import type { DecodedIdToken } from 'firebase-admin/auth';

// System-level identity injected for Slack requests.
// Slack messages are already authenticated via HMAC-SHA256 signature,
// so we bypass Firebase Auth and run as super_user.
const SLACK_SYSTEM_USER: DecodedIdToken = {
    uid: 'slack-system',
    sub: 'slack-system',
    aud: 'bakedbot',
    auth_time: 0,
    exp: 9_999_999_999,
    iat: 0,
    iss: 'bakedbot-slack',
    firebase: { identities: {}, sign_in_provider: 'custom' } as any,
    // Custom claims — grants full super_user access
    role: 'super_user',
    orgId: 'org_bakedbot_internal',
} as unknown as DecodedIdToken;

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
 * Extract all Slack user ID mentions from text (as <@USERID> tokens).
 * Returns the user IDs without the < @ > wrapping.
 */
export function extractMentions(text: string): string[] {
    const matches = Array.from(text.matchAll(/<@([A-Z0-9]+)>/g));
    return matches.map(m => m[1]);
}

/**
 * Resolve Slack user IDs to readable context (name, email, BakedBot role).
 * Returns a formatted context string for agent enrichment.
 */
export async function resolveMentions(userIds: string[], requestorSlackId: string): Promise<string> {
    if (userIds.length === 0) {
        return '';
    }

    const contextLines: string[] = [];

    for (const userId of userIds) {
        // Skip the requestor (don't include self-mentions)
        if (userId === requestorSlackId) {
            continue;
        }

        try {
            // Get Slack user profile
            const profile = await slackService.getUserInfo(userId);
            if (!profile) {
                logger.warn(`[SlackBridge] Could not resolve user ${userId}`);
                continue;
            }

            let context = `• @${profile.name}`;
            if (profile.email) {
                context += ` (${profile.email})`;
            }

            contextLines.push(context);
        } catch (err: any) {
            logger.warn(`[SlackBridge] Failed to resolve mention for ${userId}: ${err.message}`);
        }
    }

    if (contextLines.length === 0) {
        return '';
    }

    return `**Team members mentioned:**\n${contextLines.join('\n')}`;
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

        // 2. Extract and resolve user mentions for context enrichment
        const mentionedUserIds = extractMentions(text);
        let enrichmentContext = '';
        if (mentionedUserIds.length > 0) {
            enrichmentContext = await resolveMentions(mentionedUserIds, slackUserId);
            logger.info(`[SlackBridge] Resolved ${mentionedUserIds.length} mentions`);
        }

        // 3. Enrich prompt with team context if mentions were found
        const enrichedText = enrichmentContext
            ? `${cleanText}\n\n[Team Context]\n${enrichmentContext}`
            : cleanText;

        logger.info(`[SlackBridge] Processing from ${slackUserId} in ${channel}: "${cleanText.slice(0, 80)}"`);

        // 4. Detect which agent to route to
        const personaId = detectAgent(cleanText, channelName, isDm);
        logger.info(`[SlackBridge] Routing to persona: ${personaId}`);

        // For public channel messages (not @mentions, not DMs), only respond if a
        // specific agent keyword was found. Avoids replying to every channel message.
        if (isChannelMsg && personaId === 'puff') {
            logger.info('[SlackBridge] Channel message with no agent keyword — skipping');
            return;
        }

        // 5. Post a "thinking" indicator so user gets immediate feedback
        const thinkingResult = await slackService.postInThread(channel, threadTs, `_${getPersonaName(personaId)} is thinking..._`);
        if (!thinkingResult.sent) {
            logger.error(`[SlackBridge] Failed to post thinking message: ${thinkingResult.error} — check SLACK_BOT_TOKEN and bot channel membership`);
        }

        // 6. Run the agent with enriched text (includes team context) and system user
        // (avoids requireUser() cookie lookup in async context)
        const result = await runAgentCore(enrichedText, personaId, {}, SLACK_SYSTEM_USER);

        if (!result.content) {
            logger.warn('[SlackBridge] Agent returned empty content');
            await slackService.postInThread(
                channel, threadTs,
                'Sorry, I had trouble generating a response. Please try again.'
            );
            return;
        }

        // 7. Check if action is risky and requires approval
        const risk = detectRiskyAction(result.content, result.toolCalls);
        if (risk.isRisky) {
            logger.info('[SlackBridge] High-risk action detected, requesting approval', {
                personaId,
                riskReason: risk.riskReason,
            });

            // Create approval request in Firestore
            const approvalId = await createApprovalRequest({
                agentId: personaId,
                agentName: getPersonaName(personaId),
                tool: 'agent_response',
                args: { content: result.content },
                userRequest: cleanText,
                agentResponse: result.content,
                riskReason: risk.riskReason || 'High-risk action detected',
                slackChannel: channel,
                slackThreadTs: threadTs,
                requestedBy: slackUserId,
            });

            // Format and post approval request
            const approvalBlocks = formatApprovalBlocks(
                getPersonaName(personaId),
                cleanText,
                result.content,
                risk.riskReason || 'High-risk action detected',
                approvalId
            );

            const approvalResult = await slackService.postInThread(
                channel,
                threadTs,
                '⚠️ Approval Required',
                approvalBlocks
            );

            // Store the message ts for later updates (approve/reject)
            if (approvalResult.sent && approvalResult.ts) {
                await setApprovalMessageTs(approvalId, approvalResult.ts);
            }

            // Archive that an approval was requested (not the full response)
            archiveSlackResponse({
                timestamp: new Date(),
                slackUserId,
                channel,
                channelName: '',
                threadTs,
                userMessage: cleanText,
                agent: personaId,
                agentName: getPersonaName(personaId),
                agentResponse: `[APPROVAL REQUESTED] ${risk.riskReason}`,
                responseLength: 0,
                isDm,
                isChannelMsg,
                requestType: 'approval_required',
                date: new Date().toISOString().split('T')[0],
                month: new Date().toISOString().split('T')[0].slice(0, 7),
            }).catch((err) => logger.warn(`[SlackBridge] Archive failed: ${err}`));

            return;
        }

        // 8. Format as Slack Block Kit and post
        const blocks = SlackService.formatAgentResponse(result.content, personaId);
        const fallbackText = `${getPersonaName(personaId)}: ${result.content.slice(0, 200)}`;

        await slackService.postInThread(channel, threadTs, fallbackText, blocks);

        // 9. Archive response for audit trail
        const requestType = isDm ? 'dm' : isChannelMsg ? 'channel' : 'mention';
        archiveSlackResponse({
            timestamp: new Date(),
            slackUserId,
            channel,
            channelName: '',
            threadTs,
            userMessage: cleanText,
            agent: personaId,
            agentName: getPersonaName(personaId),
            agentResponse: result.content,
            responseLength: result.content.length,
            isDm,
            isChannelMsg,
            requestType,
            date: new Date().toISOString().split('T')[0],
            month: new Date().toISOString().split('T')[0].slice(0, 7),
        }).catch((err) => logger.warn(`[SlackBridge] Archive failed: ${err}`));

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

        const result = await runAgentCore(prompt, 'mrs_parker', {}, SLACK_SYSTEM_USER);

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
