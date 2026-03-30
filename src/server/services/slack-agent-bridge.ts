import { logger } from '@/lib/logger';
import { slackService, elroySlackService, SlackService } from './communications/slack';
import { runAgentCore } from '@/server/agents/agent-runner';
import { runLinus } from '@/server/agents/linus';
import { runElroy } from '@/server/agents/elroy';
import { requestContext } from '@/lib/request-context';
import { archiveSlackResponse } from './slack-response-archive';
import { sanitizeForPrompt } from '@/server/security';
import {
    detectRiskyAction,
    createApprovalRequest,
    formatApprovalBlocks,
    setApprovalMessageTs,
} from './slack-approval';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { AITextTaskClass } from '@/types/ai-routing';

// Org ID for Letta memory lookups in the Slack/Linus path
const BAKEDBOT_INTERNAL_ORG = 'org_bakedbot_internal';

// Image MIME types accepted by Claude's vision API — used to filter Slack attachments
const CLAUDE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;

// Dedicated Slack App IDs — read once at module init, not on every message.
const SLACK_LINUS_APP_ID = process.env.SLACK_LINUS_APP_ID;
const SLACK_ELROY_APP_ID = process.env.SLACK_ELROY_APP_ID;

// ---------------------------------------------------------------------------
// Linus tool classifier — determines if a message warrants agentic tool-calling
// (vs. GLM synthesis for simple conversational replies). Module-level so regexes
// are compiled once, not recreated per message.
// ---------------------------------------------------------------------------
const LINUS_TOOL_PATTERNS = [
    // Bug / error diagnosis — includes plurals (errors, bugs, crashes)
    /\b(fix|bugs?|broken|errors?|crash(es|ing)?|failing|fail(ed|s)?|debug|trace|diagnose)\b/,
    // Actions on the repo / infra
    /\b(run|execute|check|test|build|deploy|push|commit|merge|revert)\b/,
    // Read/find with a target noun — handles plurals (files, functions, routes, logs)
    /\b(read|open|show|find|search|look|grep|locate|list|load)\b.{0,40}\b(files?|codes?|functions?|class(es)?|routes?|components?|errors?|logs?)\b/,
    // Write/modify with a target noun — handles plurals
    /\b(write|edit|update|change|modify|add|remove|delete|refactor|rename)\b.{0,40}\b(files?|codes?|functions?|class(es)?|routes?|components?)\b/,
    // Infra / tooling keywords (god.?mode = alias for super powers)
    /\b(git|npm|gcloud|firebase|super.?power|god.?mode|scripts?|crons?|index(es)?|schema|secret|migration)\b/,
    // Repo-level review / health / memory queries
    /\b(review|the\s+repo|codebase|letta|memory|what.s.broken|health|status)\b/,
    // Explicit shell commands or backtick code
    /npm\s+run|git\s+(log|diff|status|push|pull|commit|blame)|`/,
    // Web search / scraping / browsing requests
    /\b(search\s+(the\s+)?web|google|look\s+up|browse|scrape|firecrawl|web\s+search)\b/,
    // Super power execution
    /\b(super\s*power|god\s*mode|run\s+script|execute\s+script|audit.?(index|schema|cost|consistency)|seed.?test|fix.?build)\b/,
    // Production monitoring / builds
    /\b(build\s+monitor|production\s+logs?|recent\s+builds?|last\s+build|deployment\s+status)\b/,
    // Explicit file paths — requires a path separator or .agent/ to avoid matching bare words
    /\.agent\/|(?:src|scripts|public|app|components|server|lib)\/\S+/,
    // File with extension — must include a slash or be a known config file name to avoid false positives
    /\b\w[\w-]*\.(ts|tsx|md|json|yaml|yml|sh)\b/,
];

function linusNeedsTools(text: string): boolean {
    const lower = text.toLowerCase();
    return LINUS_TOOL_PATTERNS.some(p => p.test(lower));
}

export function getSlackGLMSynthesisTask(personaId: string): AITextTaskClass {
    return personaId === 'linus' ? 'strategic' : 'standard';
}

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
    { keywords: ['linus', 'cto', 'tech', 'build', 'code', 'deploy', 'bug', 'error', 'fix', 'broken', 'timeout', 'slow', 'latency'], personaId: 'linus' },
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
    { keywords: ['elroy', 'uncle elroy', 'store ops', 'thrive'], personaId: 'elroy' },
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
    { prefix: 'thrive-syracuse', personaId: 'elroy' },
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
 * Convert Slack file objects to agent attachment format.
 * Extracts file name, size, and type for agent processing.
 */
export function convertSlackFilesToAttachments(slackFiles: any[]): any[] {
    if (!slackFiles || !slackFiles.length) {
        return [];
    }

    return slackFiles.map(file => ({
        name: file.name || file.title || 'attachment',
        type: file.mimetype || file.filetype || 'application/octet-stream',
        size: file.size || 0,
        url: file.url_private || file.permalink || '',
        // Note: base64 encoding would require downloading the file via Slack API
        // For now, we pass the file metadata and URL for agent context
    }));
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
 *
 * Priority order:
 *   1. Explicit agent NAME in text (e.g., "linus", "leo", "pops") — highest confidence
 *   2. Dedicated channel prefix (e.g., #linus-cto always routes to Linus)
 *   3. Generic keyword match in text (e.g., "data", "code", "email") — lowest
 *   4. Default: Leo for DMs, puff for general channels
 *
 * Channels like #linus-cto are "dedicated" — messages there should always reach
 * the named agent unless the user explicitly mentions a different agent by name.
 */
export function detectAgent(text: string, channelName: string, isDm: boolean, appId?: string): string {
    const lower = text.toLowerCase();

    // Dedicated Slack Apps — route by api_app_id before any keyword matching.
    // Set SLACK_LINUS_APP_ID / SLACK_ELROY_APP_ID to each app's api_app_id in secrets.
    if (SLACK_LINUS_APP_ID && appId && appId === SLACK_LINUS_APP_ID) {
        logger.info(`[SlackBridge] detectAgent → Tier0(linus app_id) → linus | appId="${appId}"`);
        return 'linus';
    }
    if (SLACK_ELROY_APP_ID && appId && appId === SLACK_ELROY_APP_ID) {
        logger.info(`[SlackBridge] detectAgent → Tier0(elroy app_id) → elroy | appId="${appId}"`);
        return 'elroy';
    }

    // Linus-specific meta/runtime questions often arrive in DMs without an
    // explicit "linus" keyword. Route them to CTO instead of the default DM agent.
    if (/\b(what|which)\s+model\b|\bmodel\s+are\s+you\s+using\b|\bwhat\s+are\s+you\s+running\s+on\b/i.test(lower)) {
        logger.info(`[SlackBridge] detectAgent → Tier0(runtime question) → linus | channel="${channelName}"`);
        return 'linus';
    }

    // Agent names that count as an explicit invocation (not generic keywords)
    const EXPLICIT_NAMES = [
        'leo', 'linus', 'jack', 'glenda', 'ezal', 'craig',
        'pops', 'smokey', 'parker', 'deebo', 'mike', 'bigworm',
        'day_day', 'dayday', 'felisha', 'elroy',
    ];

    // 1. Check for explicit agent name in text (highest priority)
    for (const { keywords, personaId } of KEYWORD_MAP) {
        if (keywords.some(kw => EXPLICIT_NAMES.includes(kw) && lower.includes(kw))) {
            logger.info(`[SlackBridge] detectAgent → Tier1(explicit name) → ${personaId} | channel="${channelName}"`);
            return personaId;
        }
    }

    // 2. Dedicated channel prefix (e.g., #linus-cto → linus)
    const channelLower = (channelName || '').toLowerCase();
    for (const { prefix, personaId } of CHANNEL_MAP) {
        if (channelLower.startsWith(prefix)) {
            logger.info(`[SlackBridge] detectAgent → Tier2(channel prefix "${prefix}") → ${personaId} | channel="${channelName}"`);
            return personaId;
        }
    }

    // 3. Generic keyword match (lower priority — only if no channel match)
    const GENERIC_KEYWORDS = [
        'operations', 'ops', 'tech', 'build', 'code', 'deploy', 'bug', 'error', 'fix', 'broken', 'timeout', 'slow', 'latency',
        'revenue', 'sales', 'pipeline', 'deal', 'brand', 'marketing',
        'intel', 'competitive', 'lookout', 'competitor', 'social', 'campaign',
        'post', 'content', 'analytics', 'data', 'report', 'metrics',
        'products', 'menu', 'inventory', 'strains', 'loyalty', 'customers',
        'retention', 'email', 'compliance', 'legal', 'regulation',
        'finance', 'profitability', 'margins', 'tax', 'research', 'market',
        'growth', 'acquisition', 'leads', 'fulfillment', 'delivery', 'driver',
    ];

    for (const { keywords, personaId } of KEYWORD_MAP) {
        const matchedKw = keywords.find(kw => GENERIC_KEYWORDS.includes(kw) && lower.includes(kw));
        if (matchedKw) {
            logger.info(`[SlackBridge] detectAgent → Tier3(keyword "${matchedKw}") → ${personaId} | channel="${channelName}"`);
            return personaId;
        }
    }

    // 4. Default: Linus for DMs (Linus CTO App is the primary DM entry point),
    //    puff for general channels. Users can still reach other agents by name in DMs.
    const defaultAgent = isDm ? 'linus' : 'puff';
    logger.info(`[SlackBridge] detectAgent → Tier4(default) → ${defaultAgent} | channel="${channelName}" isDm=${isDm}`);
    return defaultAgent;
}

function buildInitialSlackStatus(personaId: string, cleanText: string): string {
    const personaName = getPersonaName(personaId);
    const lower = cleanText.toLowerCase();

    if (personaId === 'linus') {
        const isToolMode = linusNeedsTools(cleanText);
        if (!isToolMode) {
             if (/^(hello|hi|hey|morning|gm|thanks|ty|what's up)/.test(lower)) {
                 return `_${personaName} is typing..._`;
             }
             return `_${personaName} is reading the conversation..._`;
        }

        if (/\b(what|which)\s+model\b|\bmodel\s+are\s+you\s+using\b/.test(lower)) {
            return `_${personaName} is on it: checking the current runtime and reply path..._`;
        }

        if (/\b(fix|bug|broken|error|timeout|timed out|slow|latency|build|deploy|test)\b/.test(lower)) {
            return `_${personaName} is on it: tracing the failing path and lining up the safest fix..._`;
        }

        return `_${personaName} is on it: reviewing the request and pulling the right tools..._`;
    }

    return `_${personaName} is thinking..._`;
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
    isThreadReply?: boolean; // true if this is a reply within a thread (has parent ts)
    files?: any[];          // Optional: Slack file objects from the message
    appId?: string;         // Slack api_app_id — used to route DMs to the correct agent app
}

export async function processSlackMessage(ctx: SlackMessageContext): Promise<void> {
    const { text, slackUserId, channel, threadTs, channelName = '', isDm = false, isChannelMsg = false, isThreadReply = false, files = [], appId = '' } = ctx;

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
        let personaId = detectAgent(cleanText, channelName, isDm, appId);
        logger.info(`[SlackBridge] Routing to persona: ${personaId}`);

        // For public channel messages (not @mentions, not DMs), only respond if a
        // specific agent keyword was found OR if this is a thread reply (conversation continuation).
        if (isChannelMsg && personaId === 'puff' && !isThreadReply) {
            logger.info('[SlackBridge] Channel message with no agent keyword and not a thread reply — skipping');
            return;
        }

        // For thread replies without a specific agent keyword, check if we're in a
        // dedicated channel (e.g., #linus-cto) and route to that agent. Otherwise default to Leo.
        if (isThreadReply && personaId === 'puff') {
            const channelLower = (channelName || '').toLowerCase();
            let threadAgent = '';
            for (const { prefix, personaId: chPersona } of CHANNEL_MAP) {
                if (channelLower.startsWith(prefix)) {
                    threadAgent = chPersona;
                    break;
                }
            }
            if (threadAgent) {
                personaId = threadAgent;
                logger.info(`[SlackBridge] Thread reply in dedicated channel ${channelName} — routing to ${personaId}`);
            } else {
                personaId = 'leo';
                logger.info('[SlackBridge] Thread reply without keyword — routing to Leo (default thread handler)');
            }
        }

        // 5. Post a "thinking" indicator so user gets immediate feedback.
        // Uncle Elroy uses his own bot token so he appears as a distinct Slack user.
        const activeSlack = personaId === 'elroy' ? elroySlackService : slackService;

        const thinkingResult = await activeSlack.postInThread(
            channel,
            threadTs,
            buildInitialSlackStatus(personaId, cleanText),
        );
        if (!thinkingResult.sent) {
            logger.error(`[SlackBridge] Failed to post thinking message: ${thinkingResult.error} — check bot token and channel membership`);
        }
        const workingMessageTs = thinkingResult.sent ? thinkingResult.ts : undefined;

        const sendOrUpdateThreadMessage = async (text: string, blocks?: any[]) => {
            if (workingMessageTs) {
                const updateResult = await activeSlack.updateMessage(channel, workingMessageTs, text, blocks);
                if (updateResult.sent) {
                    return updateResult;
                }

                logger.warn('[SlackBridge] Failed to update working message, posting a fresh thread reply instead', {
                    channel,
                    threadTs,
                    workingMessageTs,
                    error: updateResult.error,
                });
            }

            return activeSlack.postInThread(channel, threadTs, text, blocks);
        };

        // 6. Convert Slack files to agent attachments if present
        const attachments = files.length > 0 ? convertSlackFilesToAttachments(files) : undefined;
        if (attachments) {
            logger.info(`[SlackBridge] Processing ${files.length} file(s): ${files.map((f: any) => f.name || f.title).join(', ')}`);
        }

        // 7. Run the agent with enriched text (includes team context), attachments, and system user
        // (avoids requireUser() cookie lookup in async context)
        //
        // Linus routing (cost control):
        //   - Tool-requiring messages → Linus tool runner (GLM-5 for text, Claude for vision)
        //   - Simple conversational messages → GLM synthesis
        // All other agents use GLM synthesis path.
        const AGENT_TIMEOUTS = {
            linus:  180_000,  // 3 min — GLM-5 / Claude tool-calling with up to 8 iterations
            leo:   120_000,   // 2 min — COO operations may chain multiple tools
            jack:  120_000,   // 2 min — CRO revenue analysis
            glenda: 120_000,  // 2 min — CMO strategy
            elroy:  60_000,   // 1 min — store ops data lookup, max 5 tool iterations
        } satisfies Partial<Record<string, number>>;
        const agentTimeoutMs = AGENT_TIMEOUTS[personaId as keyof typeof AGENT_TIMEOUTS] ?? 55_000;
        // Context variables
        let linusImages: Array<{ data: string; mimeType: string }> | undefined;
        let contextPrefix = '';

        const isLinus = personaId === 'linus';
        const isElroy = personaId === 'elroy';
        const willUseLinusTools = isLinus && linusNeedsTools(enrichedText);
        const botToken = process.env.SLACK_BOT_TOKEN;
        const imageFiles = files.filter((f: any) => /^image\//.test(f.mimetype || '')).slice(0, 3);

        // Always fetch context (history for everyone; Letta for Linus) concurrently with image downloads
        const [historyMessages, lettaSnippets, rawImages] = await Promise.all([
            // Thread/DM history (fetch 30; will drop the current msg which is last)
            (isThreadReply || isDm)
                ? slackService.getConversationHistory(channel, isThreadReply ? threadTs : undefined, 30).catch(() => [])
                : Promise.resolve([] as Awaited<ReturnType<typeof slackService.getConversationHistory>>),

            // Letta long-term memory (Linus only)
            isLinus ? (async () => {
                try {
                    const { memoryBridgeService } = await import('@/server/services/letta/memory-bridge');
                    const memResults = await memoryBridgeService.unifiedSearch(
                        BAKEDBOT_INTERNAL_ORG,
                        enrichedText,
                        { includeFirestore: false, includeLetta: true, limit: 3 },
                    );
                    return memResults.lettaResults.slice(0, 3);
                } catch {
                    return [];
                }
            })() : Promise.resolve([]),

            // Image downloads (Linus only, when tools/vision needed).
            // Vision still routes through Claude, so only pass Claude-supported formats.
            (isLinus && botToken && imageFiles.length > 0)
                ? Promise.all(imageFiles.map(async (f: any) => {
                    if (!(CLAUDE_IMAGE_TYPES as readonly string[]).includes(f.mimetype)) {
                        logger.warn(`[SlackBridge] Skipping image with unsupported MIME type: ${f.mimetype}`);
                        return null;
                    }
                    try {
                        const res = await fetch(f.url_private, { headers: { Authorization: `Bearer ${botToken}` } });
                        if (!res.ok) {
                            logger.warn(`[SlackBridge] Image download failed (${res.status}): ${f.name}`);
                            return null;
                        }
                        const buf = Buffer.from(await res.arrayBuffer());
                        // Guard: < 500 bytes means we got a redirect page / 404 HTML, not a real image
                        if (buf.length < 500) {
                            logger.warn(`[SlackBridge] Image too small (${buf.length}b), skipping: ${f.name}`);
                            return null;
                        }
                        logger.info(`[SlackBridge] Downloaded image for Linus vision: ${f.name} (${buf.length} bytes)`);
                        return { data: buf.toString('base64'), mimeType: f.mimetype as string };
                    } catch (imgErr: any) {
                        logger.warn(`[SlackBridge] Failed to download image ${f.name}: ${imgErr.message}`);
                        return null;
                    }
                }))
                : Promise.resolve([] as Array<{ data: string; mimeType: string } | null>),
        ]);

        const downloaded = rawImages.filter((r): r is { data: string; mimeType: string } => r !== null);
        if (downloaded.length > 0) linusImages = downloaded;

        // Build context prefix
        const contextParts: string[] = [];
        const personaName = getPersonaName(personaId);
        // Compiled once — used to strip redundant "Name: " prefixes from both history and result
        const personaPrefixRe = new RegExp(`^${personaName}:\\s*`, 'i');
        const historyToShow = historyMessages
            .slice(0, -1) // drop current msg (last entry)
            .filter(m => !m.isBot || !m.text.startsWith('⚠️')); // drop bot error messages
        if (historyToShow.length > 0) {
            const lines = historyToShow.map(m => {
                const who = m.isBot ? personaName : `User<${m.user}>`;
                // Strip any existing "Name: " prefix that was added in a previous formatting pass
                const text = m.isBot ? m.text.replace(personaPrefixRe, '').trim() : m.text;
                return `${who}: ${text}`;
            });
            contextParts.push(`[SLACK CONVERSATION HISTORY]\n${lines.join('\n')}`);
            logger.info(`[SlackBridge] Injecting ${historyToShow.length} history messages for ${personaId}`);
        }
        if (lettaSnippets.length > 0) {
            const sanitized = lettaSnippets.map(s => `- ${sanitizeForPrompt(String(s), 300)}`).join('\n');
            contextParts.push(`[AGENT MEMORY]\nRelevant context from organizational memory:\n${sanitized}`);
            logger.info(`[SlackBridge] Injecting ${lettaSnippets.length} Letta memory snippets for ${personaId}`);
        }
        if (contextParts.length > 0) contextPrefix = contextParts.join('\n\n') + '\n\n';

        let result;
        try {
            // Prepend the fetched history and memory to the current message
            const fullPrompt = contextPrefix + enrichedText;

            // Linus: tool-requiring messages OR image attachments → Linus tool runner.
            // Text-only Slack tool runs now prefer GLM-5; image-backed runs stay on Claude vision.
            // Simple conversational messages → GLM synthesis.
            // All other agents use GLM synthesis path.
            if (willUseLinusTools || linusImages) {
                // Progress callback: update the working Slack message with each tool Linus uses
                // so users know he's actively working on their request (not silently hung).
                const linusProgress = makeThrottledProgress(channel, workingMessageTs);

                const linusResult = await Promise.race([
                    runLinus({
                        prompt: fullPrompt,
                        maxIterations: 8,
                        toolMode: 'slack',
                        context: { userId: SLACK_SYSTEM_USER.uid },
                        images: linusImages,
                        progressCallback: linusProgress,
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error(`Linus timeout after ${Math.floor(agentTimeoutMs / 1000)} seconds`)), agentTimeoutMs)
                    ),
                ]);

                result = { content: linusResult.content, toolCalls: linusResult.toolExecutions };
            } else if (isElroy) {
                // Uncle Elroy — store ops agent for Thrive Syracuse, always uses Claude tools
                const elroyProgress = makeThrottledProgress(channel, workingMessageTs);

                const elroyResult = await Promise.race([
                    runElroy({
                        prompt: fullPrompt,
                        maxIterations: 5,
                        context: { userId: SLACK_SYSTEM_USER.uid },
                        progressCallback: elroyProgress,
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error(`Uncle Elroy timeout after ${Math.floor(agentTimeoutMs / 1000)} seconds`)), agentTimeoutMs)
                    ),
                ]);
                result = { content: elroyResult.content, toolCalls: elroyResult.toolExecutions };
            } else {
                // GLM path — conversational replies, other agents
                const extraOptions = { ...(attachments ? { attachments } : {}), source: 'slack' };
                result = await requestContext.run(
                    { useGLMSynthesis: true, glmTask: getSlackGLMSynthesisTask(personaId) },
                    () => Promise.race([
                        runAgentCore(fullPrompt, personaId, extraOptions, SLACK_SYSTEM_USER),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error(`Agent response timeout after ${Math.floor(agentTimeoutMs / 1000)} seconds`)), agentTimeoutMs)
                        ),
                    ])
                ) as any;
            }
        } catch (agentErr: any) {
            logger.error('[SlackBridge] Agent execution error:', agentErr.message);
            await sendOrUpdateThreadMessage(
                `⚠️ ${getPersonaName(personaId)} encountered an issue: ${agentErr.message}. The team has been notified.`
            );
            return;
        }

        if (!result.content) {
            logger.warn('[SlackBridge] Agent returned empty content');
            await sendOrUpdateThreadMessage(
                `Sorry, ${getPersonaName(personaId)} had trouble generating a response. Please try again.`
            );
            return;
        }

        // 8. Check if action is risky and requires approval
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

            const approvalResult = await sendOrUpdateThreadMessage(
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

        // 9. Format as Slack Block Kit and post.
        // Strip any leading "Name: " prefix the LLM may have added — we prepend it ourselves.
        const cleanContent = result.content.replace(personaPrefixRe, '').trim();
        const blocks = SlackService.formatAgentResponse(cleanContent, personaId);
        const fallbackText = `${personaName}: ${cleanContent.slice(0, 200)}`;

        await sendOrUpdateThreadMessage(fallbackText, blocks);

        // 10. Archive response for audit trail
        const requestType = isDm ? 'dm' : isChannelMsg ? 'channel' : 'mention';
        archiveSlackResponse({
            timestamp: new Date(),
            slackUserId,
            channel,
            channelName: '',
            threadTs,
            userMessage: cleanText,
            agent: personaId,
            agentName: personaName,
            agentResponse: cleanContent,
            responseLength: cleanContent.length,
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

/**
 * Create a throttled Slack message update callback (max 1 update/sec).
 * Used by tool-calling agents to post live progress to the working message.
 */
function makeThrottledProgress(
    channel: string,
    workingMessageTs: string | undefined,
): ((msg: string) => Promise<void>) | undefined {
    if (!workingMessageTs) return undefined;
    let lastSentAt = 0;
    return async (msg: string) => {
        const now = Date.now();
        if (now - lastSentAt < 1000) return;
        lastSentAt = now;
        await slackService.updateMessage(channel, workingMessageTs, msg).catch(() => {});
    };
}

function getPersonaName(personaId: string): string {
    const names: Record<string, string> = {
        leo: 'Leo', linus: 'Linus', jack: 'Jack', glenda: 'Glenda',
        ezal: 'Ezal', craig: 'Craig', pops: 'Pops', smokey: 'Smokey',
        mrs_parker: 'Mrs. Parker', deebo: 'Deebo', money_mike: 'Money Mike',
        bigworm: 'Big Worm', day_day: 'Day Day', felisha: 'Felisha', puff: 'BakedBot',
        elroy: 'Uncle Elroy',
    };
    return names[personaId] ?? 'BakedBot';
}
