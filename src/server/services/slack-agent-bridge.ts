import { logger } from '@/lib/logger';
import { slackService, elroySlackService, linusSlackService, martySlackService, SlackService } from './communications/slack';
import { runAgentCore } from '@/server/agents/agent-runner';
import { runLinus } from '@/server/agents/linus';
import { runMarty } from '@/server/agents/marty';
import { runElroy } from '@/server/agents/elroy';
import { runDayDay } from '@/server/agents/dayday';
import { callGLM } from '@/ai/glm';
import { requestContext } from '@/lib/request-context';
import { archiveSlackMessage, archiveSlackResponse } from './slack-response-archive';
import { recordResponseFeedback } from './response-feedback';
import { detectSlackResponseIssues } from './slack-response-quality';
import { sanitizeForPrompt } from '@/server/security';
import {
    detectRiskyAction,
    createApprovalRequest,
    formatApprovalBlocks,
    setApprovalMessageTs,
} from './slack-approval';
import type { DecodedIdToken } from 'firebase-admin/auth';
import {
    SLACK_ELROY_APP_ID,
    SLACK_LINUS_APP_ID,
    SLACK_MARTY_APP_ID,
    detectAgent,
    extractMentions,
    getSlackGLMSynthesisTask,
    isGreeting,
    isMartyShortAcknowledgment,
    stripBotMention,
} from './slack-agent-routing';

// Org ID for Letta memory lookups in the Slack/Linus path
const BAKEDBOT_INTERNAL_ORG = 'org_bakedbot_internal';

// Image MIME types accepted by Claude's vision API — used to filter Slack attachments
const CLAUDE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;

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

// Greeting detector — short messages that are just saying hi. Compiled once.
const LINUS_GREETING_SYSTEM_PROMPT = 'You are Linus, CTO of BakedBot — the Agentic Commerce OS for cannabis. You are responding in Slack. Keep it warm, brief (1–2 sentences), and on-brand. Match the energy of the greeting. No tools, no code, no markdown headers.';
const MARTY_GREETING_SYSTEM_PROMPT = 'You are Marty Benjamins, AI CEO of BakedBot — the Agentic Commerce OS for cannabis. You are responding in Slack to a bare greeting. Keep it warm, brief (2–3 sentences), confident, and action-oriented. Do NOT volunteer pipeline, CRM, revenue, or accomplishment metrics unless the user explicitly asks for status. Offer one or two high-leverage next moves such as reviewing pipeline, checking the inbox, or pushing outbound. No markdown headers.';
const MARTY_ACKNOWLEDGMENT_SYSTEM_PROMPT = 'You are Marty Benjamins, AI CEO of BakedBot — the Agentic Commerce OS for cannabis. The user sent a short acknowledgment in Slack. Keep it conversational, brief (1–2 sentences), and forward-moving. Confirm alignment, suggest the next concrete move, and do NOT escalate, mention auth/tool issues, or volunteer metrics unless the user explicitly asks. No markdown headers.';
const ELROY_GREETING_SYSTEM_PROMPT = 'You are Uncle Elroy, the store operations manager at Thrive Syracuse dispensary. You are responding in Slack. Keep it warm, friendly, brief (1–2 sentences), and helpful. Match the energy of the greeting. No tools, no data lookups, no markdown headers.';

const MEETING_CONFIRM_RE = /^(confirmed?|yes|yep|yup|yeah|i('?m|\s+am)\s+(confirmed|coming|there|ready)|on\s+my\s+way|will\s+be\s+there|good\s+to\s+go|all\s+set)\s*[.!]?\s*$/i;
function isMeetingConfirmation(text: string): boolean {
    return text.length <= 40 && MEETING_CONFIRM_RE.test(text.trim());
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

function getSlackFeedbackOrgId(personaId: string): string | null {
    if (personaId === 'elroy') return 'org_thrive_syracuse';
    return BAKEDBOT_INTERNAL_ORG;
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

function buildInitialSlackStatus(personaId: string, cleanText: string): string {
    const personaName = getPersonaName(personaId);
    const lower = cleanText.toLowerCase();

    if (personaId === 'linus') {
        const isToolMode = linusNeedsTools(cleanText);
        if (!isToolMode) {
             if (isGreeting(lower)) {
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

    if (personaId === 'marty') {
        if (isGreeting(lower)) {
            return `_${personaName} is typing..._`;
        }
        if (/\b(email|inbox|gmail|mail|unread|draft|reply)\b/.test(lower)) {
            return `_${personaName} is checking the CEO inbox..._`;
        }
        if (/\b(calendar|schedule|meeting|appointment|slot|free|busy|book)\b/.test(lower)) {
            return `_${personaName} is checking the calendar..._`;
        }
        if (/\b(outreach|lead|dispensary|dispensaries|prospect|contact\s*form)\b/.test(lower)) {
            return `_${personaName} is working on outreach..._`;
        }
        if (/\b(linkedin|post|connect|connection|bizdev|business\s*dev)\b/.test(lower)) {
            return `_${personaName} is working LinkedIn..._`;
        }
        if (/\b(mrr|revenue|arr|pipeline|customer|churn|sales)\b/.test(lower)) {
            return `_${personaName} is pulling the numbers..._`;
        }
        if (/\b(delegate|assign|tell|ask)\s+(linus|leo|jack|glenda|ezal|craig|smokey|deebo)\b/.test(lower)) {
            return `_${personaName} is delegating to the team..._`;
        }
        return `_${personaName} is on it — reviewing and pulling the right data..._`;
    }

    if (personaId === 'elroy') {
        if (isGreeting(lower)) {
            return `_${personaName} is typing..._`;
        }
        if (/\b(customer|at.risk|win.?back|outreach|retention)\b/.test(lower)) {
            return `_${personaName} is pulling customer data..._`;
        }
        if (/\b(sale|revenue|transaction|ticket|sold)\b/.test(lower)) {
            return `_${personaName} is checking today's sales..._`;
        }
        if (/\b(menu|inventory|stock|product|flower|edible|vape)\b/.test(lower)) {
            return `_${personaName} is checking the menu..._`;
        }
        if (/\b(competitor|flnnstoned|deal|pricing|market)\b/.test(lower)) {
            return `_${personaName} is pulling competitor intel..._`;
        }
        return `_${personaName} is on it — checking the store data..._`;
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
    messageTs?: string;     // The ts of the incoming message
    channelName?: string;   // Optional: resolved channel name for routing
    isDm?: boolean;         // true if this is a direct message
    isChannelMsg?: boolean; // true if this is a public channel message (not @mention, not DM)
    isThreadReply?: boolean; // true if this is a reply within a thread (has parent ts)
    files?: any[];          // Optional: Slack file objects from the message
    appId?: string;         // Slack api_app_id — used to route DMs to the correct agent app
}

export async function processSlackMessage(ctx: SlackMessageContext): Promise<void> {
    const { text, slackUserId, channel, threadTs, messageTs, channelName = '', isDm = false, isChannelMsg = false, isThreadReply = false, files = [], appId = '' } = ctx;

    try {
        // 1. Strip bot mention and clean up text
        const cleanText = stripBotMention(text);

        if (!cleanText) {
            logger.info('[SlackBridge] Empty message after stripping mention, skipping');
            return;
        }

        // Archive inbound message for audit trail
        const inboundRequestType = isThreadReply ? 'thread' : isDm ? 'dm' : isChannelMsg ? 'channel' : 'mention';
        archiveSlackMessage({
            timestamp: new Date(),
            slackUserId,
            channel,
            channelName: channelName || '',
            threadTs,
            messageTs,
            userMessage: cleanText,
            rawText: text,
            isDm,
            isChannelMsg,
            requestType: inboundRequestType,
            date: new Date().toISOString().split('T')[0],
            month: new Date().toISOString().split('T')[0].slice(0, 7),
        }).catch((err) => logger.warn(`[SlackBridge] Inbound archive failed: ${err}`));

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
            // detectAgent handles channel-prefix routing (e.g. #linus-cto → linus)
            const threadAgent = detectAgent('', channelName || '', false);
            if (threadAgent !== 'puff') {
                personaId = threadAgent;
                logger.info(`[SlackBridge] Thread reply in dedicated channel ${channelName} — routing to ${personaId}`);
            } else {
                personaId = 'leo';
                logger.info('[SlackBridge] Thread reply without keyword — routing to Leo (default thread handler)');
            }
        }

        // 5. Post a "thinking" indicator so user gets immediate feedback.
        const activeSlack = selectSlackService(personaId, appId);

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
            marty:  120_000,  // 2 min — CEO fast path (Groq-first tier chain)
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
        const isDayDay = personaId === 'day_day';
        const willUseLinusTools = isLinus && linusNeedsTools(enrichedText);
        const botToken = process.env.SLACK_BOT_TOKEN;
        const linusBotToken = process.env.SLACK_LINUS_BOT_TOKEN;
        const elroyBotToken = process.env.SLACK_ELROY_BOT_TOKEN;
        const imageFiles = files.filter((f: any) => /^image\//.test(f.mimetype || '')).slice(0, 3);

        // Always fetch context (history for everyone; Letta for Linus) concurrently with image downloads
        const [historyMessages, lettaSnippets, rawImages] = await Promise.all([
            // Thread/DM history (fetch 30; will drop the current msg which is last)
            // Use the persona's own bot token — DMs opened with the Linus/Elroy bot
            // are invisible to the shared bot token.
            (isThreadReply || isDm)
                ? activeSlack.getConversationHistory(channel, isThreadReply ? threadTs : undefined, 30).catch(() => [])
                : Promise.resolve([] as Awaited<ReturnType<typeof slackService.getConversationHistory>>),

            // Letta long-term memory (Linus only) — cached in Redis for 30s to avoid
            // duplicate embedding lookups on rapid-fire Slack messages
            isLinus ? (async () => {
                try {
                    const { getCached: getRedisCache, setCached: setRedisCache, CachePrefix: CP, CacheTTL: CT } = await import('@/lib/cache');
                    const lettaCacheKey = `linus:${enrichedText.substring(0, 60).replace(/[^a-zA-Z0-9]/g, '_')}`;
                    const cachedLetta = await getRedisCache<string[]>(CP.LETTA_SLACK, lettaCacheKey);
                    if (cachedLetta) return cachedLetta;

                    const { memoryBridgeService } = await import('@/server/services/letta/memory-bridge');
                    const memResults = await memoryBridgeService.unifiedSearch(
                        BAKEDBOT_INTERNAL_ORG,
                        enrichedText,
                        { includeFirestore: false, includeLetta: true, limit: 3 },
                    );
                    const results = memResults.lettaResults.slice(0, 3);
                    setRedisCache(CP.LETTA_SLACK, lettaCacheKey, results, CT.LETTA_SLACK).catch(() => {});
                    return results;
                } catch {
                    return [];
                }
            })() : Promise.resolve([]),

            // Image downloads for vision-capable agents (Linus + Elroy)
            ((isLinus || isElroy) && (linusBotToken || botToken || elroyBotToken) && imageFiles.length > 0)
                ? Promise.all(imageFiles.map(async (f: any) => {
                    // Normalize MIME type — Slack may include parameters like "; charset=utf-8"
                    const rawMime = String(f.mimetype || '');
                    const normalizedMime = rawMime.split(';')[0].trim();
                    if (!(CLAUDE_IMAGE_TYPES as readonly string[]).includes(normalizedMime)) {
                        logger.warn(`[SlackBridge] Skipping image with unsupported MIME type: ${rawMime} (normalized: ${normalizedMime})`);
                        return null;
                    }
                    const downloadToken = isElroy
                        ? (elroyBotToken || botToken)
                        : isLinus
                            ? (linusBotToken || botToken)
                            : botToken;
                    // Prefer url_private_download (force-download) over url_private (may redirect to browser auth)
                    const downloadUrl = f.url_private_download || f.url_private;
                    if (!downloadUrl) {
                        logger.warn(`[SlackBridge] No download URL for image: ${f.name}`);
                        return null;
                    }
                    try {
                        const res = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${downloadToken}` } });
                        if (!res.ok) {
                            logger.warn(`[SlackBridge] Image download failed (${res.status}): ${f.name} url=${downloadUrl}`);
                            return null;
                        }
                        // Reject non-image responses (HTML auth/error pages served by Slack on token failure)
                        const rawContentType = res.headers.get('content-type') || '';
                        if (!rawContentType.startsWith('image/')) {
                            logger.warn(`[SlackBridge] Unexpected content-type "${rawContentType}" for image ${f.name} — likely auth failure, skipping`);
                            return null;
                        }
                        // Use actual content-type from HTTP response, not Slack metadata.
                        // iOS screenshots are often reported as image/jpeg by Slack but downloaded
                        // as image/heic — passing mismatched MIME to Claude causes "Could not process image".
                        const actualMime = rawContentType.split(';')[0].trim();
                        if (!(CLAUDE_IMAGE_TYPES as readonly string[]).includes(actualMime)) {
                            logger.warn(`[SlackBridge] Unsupported actual content-type "${actualMime}" (Slack reported: ${normalizedMime}) for ${f.name} — skipping`);
                            return null;
                        }
                        const buf = Buffer.from(await res.arrayBuffer());
                        if (buf.length < 500) {
                            logger.warn(`[SlackBridge] Image too small (${buf.length}b), skipping: ${f.name}`);
                            return null;
                        }
                        if (buf.length > 4 * 1024 * 1024) {
                            logger.warn(`[SlackBridge] Image too large (${buf.length}b), skipping: ${f.name}`);
                            return null;
                        }
                        logger.info(`[SlackBridge] Downloaded image for vision: ${f.name} (${buf.length}b) agent=${isElroy ? 'elroy' : 'linus'} mime=${actualMime}`);
                        return { data: buf.toString('base64'), mimeType: actualMime };
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

            // Linus greeting fast path — skip the full tool pipeline for simple hellos.
            // Uses lightweight callGLM (no tools, single round-trip) for sub-second replies.
            if (isLinus && isGreeting(cleanText)) {
                logger.info('[SlackBridge] Linus greeting fast path', { cleanText });
                const greetingPrompt = contextPrefix
                    ? `${contextPrefix}\nUser: ${cleanText}`
                    : cleanText;
                const greetingContent = await callGLM({
                    systemPrompt: LINUS_GREETING_SYSTEM_PROMPT,
                    userMessage: greetingPrompt,
                    maxTokens: 150,
                    temperature: 0.7,
                });
                result = { content: greetingContent || "What's good! How can I help? 🤙", toolCalls: [] };
            } else if (isLinus) {
                // Full Linus pipeline — GLM-5 for text, Claude for vision.
                // maxIterations=3 for conversational (no tools expected), 8 for tool-requiring.
                const linusProgress = makeThrottledProgress(channel, workingMessageTs, activeSlack);

                const linusResult = await Promise.race([
                    runLinus({
                        prompt: fullPrompt,
                        maxIterations: willUseLinusTools ? 8 : 3,
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
            } else if (personaId === 'marty' && isMeetingConfirmation(cleanText)) {
                // Meeting confirmation fast path — mark upcoming bookings as confirmed
                logger.info('[SlackBridge] Marty meeting confirmation fast path', { cleanText });
                try {
                    const { getAdminFirestore } = await import('@/firebase/admin');
                    const { Timestamp: FsTimestamp } = await import('firebase-admin/firestore');
                    const db = getAdminFirestore();
                    const now = new Date();
                    const soon = new Date(now.getTime() + 35 * 60 * 1000);
                    const snap = await db.collection('meeting_bookings')
                        .where('profileSlug', '==', 'martez')
                        .where('status', '==', 'confirmed')
                        .where('startAt', '>=', FsTimestamp.fromDate(now))
                        .where('startAt', '<=', FsTimestamp.fromDate(soon))
                        .limit(3).get();

                    if (!snap.empty) {
                        const names: string[] = [];
                        for (const doc of snap.docs) {
                            await doc.ref.update({ ceoConfirmed: true, ceoConfirmedAt: FsTimestamp.now() });
                            names.push(doc.data().externalName || 'upcoming meeting');
                        }
                        result = { content: `Got it — you're confirmed for: ${names.join(', ')}. I'll have everything ready. 💪`, toolCalls: [] };
                    } else {
                        result = { content: "No upcoming meetings in the next 30 minutes to confirm. You're all clear!", toolCalls: [] };
                    }
                } catch (e) {
                    logger.error('[SlackBridge] Meeting confirmation failed', { error: String(e) });
                    result = { content: "Confirmed! I'll make sure everything is set.", toolCalls: [] };
                }
            } else if (personaId === 'marty' && isMartyShortAcknowledgment(cleanText)) {
                // Marty short-ack fast path — stay conversational and keep momentum.
                logger.info('[SlackBridge] Marty acknowledgment fast path', { cleanText });
                const ackPrompt = contextPrefix
                    ? `${contextPrefix}\nUser: ${cleanText}`
                    : cleanText;
                const ackContent = await callGLM({
                    systemPrompt: MARTY_ACKNOWLEDGMENT_SYSTEM_PROMPT,
                    userMessage: ackPrompt,
                    maxTokens: 120,
                    temperature: 0.6,
                });
                result = { content: ackContent || "Aligned. I'll keep the pressure on the right growth moves — want pipeline, inbox, or outbound next?", toolCalls: [] };
            } else if (personaId === 'marty' && isGreeting(cleanText)) {
                // Marty greeting fast path — warm CEO energy without dumping metrics on hello.
                logger.info('[SlackBridge] Marty greeting fast path', { cleanText });
                const greetingPrompt = contextPrefix
                    ? `${contextPrefix}\nUser: ${cleanText}`
                    : cleanText;
                const greetingContent = await callGLM({
                    systemPrompt: MARTY_GREETING_SYSTEM_PROMPT,
                    userMessage: greetingPrompt,
                    maxTokens: 200,
                    temperature: 0.7,
                });
                result = { content: greetingContent || "What's good! Marty Benjamins here — ready to move the needle. What do you need? 🚀", toolCalls: [] };
            } else if (personaId === 'marty') {
                // Marty Benjamins — CEO agent, direct Claude call (bypasses harness/Gemini planning)
                const martyProgress = makeThrottledProgress(channel, workingMessageTs, activeSlack);

                const martyResult = await Promise.race([
                    runMarty({
                        prompt: fullPrompt,
                        maxIterations: 4,
                        context: { userId: SLACK_SYSTEM_USER.uid, orgId: (SLACK_SYSTEM_USER as any).orgId || 'org_bakedbot_internal' },
                        progressCallback: martyProgress,
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error(`Marty CEO timeout after ${Math.floor(agentTimeoutMs / 1000)} seconds`)), agentTimeoutMs)
                    ),
                ]);

                result = { content: martyResult.content, toolCalls: martyResult.toolExecutions };
            } else if (isElroy && isGreeting(cleanText)) {
                // Elroy greeting fast path — lightweight GLM, no tools
                logger.info('[SlackBridge] Elroy greeting fast path', { cleanText });
                const greetingPrompt = contextPrefix
                    ? `${contextPrefix}\nUser: ${cleanText}`
                    : cleanText;
                const greetingContent = await callGLM({
                    systemPrompt: ELROY_GREETING_SYSTEM_PROMPT,
                    userMessage: greetingPrompt,
                    maxTokens: 150,
                    temperature: 0.7,
                });
                result = { content: greetingContent || "Hey there! Uncle Elroy here — what can I help you with today? ✌️", toolCalls: [] };
            } else if (isElroy) {
                // Uncle Elroy — store ops agent for Thrive Syracuse, always uses Claude tools
                const elroyProgress = makeThrottledProgress(channel, workingMessageTs, elroySlackService);
                let elroyCheckInTimer: NodeJS.Timeout | null = setTimeout(() => {
                    sendOrUpdateThreadMessage('Still working on it — I will share what I find shortly.').catch(() => {});
                    elroyCheckInTimer = null;
                }, 45_000);

                const elroyResult = await Promise.race([
                    runElroy({
                        prompt: fullPrompt,
                        maxIterations: 5,
                        context: { userId: SLACK_SYSTEM_USER.uid },
                        images: downloaded.length > 0 ? downloaded : undefined,
                        progressCallback: elroyProgress,
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error(`Uncle Elroy timeout after ${Math.floor(agentTimeoutMs / 1000)} seconds`)), agentTimeoutMs)
                    ),
                ]).finally(() => {
                    if (elroyCheckInTimer) {
                        clearTimeout(elroyCheckInTimer);
                        elroyCheckInTimer = null;
                    }
                });
                result = { content: elroyResult.content, toolCalls: elroyResult.toolExecutions };
            } else if (isDayDay) {
                // Day Day — Growth & SEO agent, always uses tools (GSC, GA4, content creation)
                const daydayProgress = makeThrottledProgress(channel, workingMessageTs, activeSlack);
                let daydayCheckInTimer: NodeJS.Timeout | null = setTimeout(() => {
                    sendOrUpdateThreadMessage('Still working on it — Day Day is pulling the data now.').catch(() => {});
                    daydayCheckInTimer = null;
                }, 45_000);

                const daydayResult = await Promise.race([
                    runDayDay({
                        prompt: fullPrompt,
                        maxIterations: 5,
                        context: { userId: SLACK_SYSTEM_USER.uid },
                        images: downloaded.length > 0 ? downloaded : undefined,
                        progressCallback: daydayProgress,
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error(`Day Day timeout after ${Math.floor(agentTimeoutMs / 1000)} seconds`)), agentTimeoutMs)
                    ),
                ]).finally(() => {
                    if (daydayCheckInTimer) {
                        clearTimeout(daydayCheckInTimer);
                        daydayCheckInTimer = null;
                    }
                });
                result = { content: daydayResult.content, toolCalls: daydayResult.toolExecutions };
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
            const isTimeout = /timeout/i.test(agentErr.message);
            if (isElroy && /Uncle Elroy timeout/i.test(agentErr.message)) {
                await sendOrUpdateThreadMessage(
                    'I hit a timeout while researching. I can retry with a faster lookup and report back, or you can share any DNS/registrar clues you already have. Want me to keep going?'
                );
            }
            recordResponseFeedback({
                agentName: personaId,
                rating: 'negative',
                source: 'slack_incident',
                orgId: getSlackFeedbackOrgId(personaId),
                messageId: workingMessageTs || null,
                conversationId: threadTs,
                channel,
                comment: `${getPersonaName(personaId)} failed to execute in Slack.`,
                reason: isTimeout ? 'timeout' : 'execution_error',
                userMessage: cleanText,
                agentResponse: agentErr.message,
                metadata: { isDm, isChannelMsg, appId },
            }).catch((err) => logger.warn(`[SlackBridge] Feedback write failed: ${err}`));
            if (!isElroy || !/Uncle Elroy timeout/i.test(agentErr.message)) {
                await sendOrUpdateThreadMessage(
                    `⚠️ ${getPersonaName(personaId)} encountered an issue: ${agentErr.message}. The team has been notified.`
                );
            }
            return;
        }

        if (!result?.content) {
            logger.warn('[SlackBridge] Agent returned empty or undefined content', { personaId, hasResult: !!result });
            recordResponseFeedback({
                agentName: personaId,
                rating: 'negative',
                source: 'slack_incident',
                orgId: getSlackFeedbackOrgId(personaId),
                messageId: workingMessageTs || null,
                conversationId: threadTs,
                channel,
                comment: `${getPersonaName(personaId)} returned an empty Slack response.`,
                reason: 'empty_response',
                userMessage: cleanText,
                agentResponse: '',
                metadata: { isDm, isChannelMsg, appId },
            }).catch((err) => logger.warn(`[SlackBridge] Feedback write failed: ${err}`));
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
                channelName: channelName || '',
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
        // Normalize markdown bold (**text**) to Slack mrkdwn bold (*text*) — models trained on
        // markdown frequently use double asterisks regardless of prompt instructions.
        const cleanContent = result.content
            .replace(personaPrefixRe, '')
            .replace(/\*\*([^*]+)\*\*/g, '*$1*')
            .trim();
        const blocks = SlackService.formatAgentResponse(cleanContent, personaId);
        const fallbackText = `${personaName}: ${cleanContent.slice(0, 200)}`;

        await sendOrUpdateThreadMessage(fallbackText, blocks);

        // 10. Archive response for audit trail
        const requestType = isDm ? 'dm' : isChannelMsg ? 'channel' : 'mention';
        const toolNames = Array.isArray(result.toolCalls)
            ? result.toolCalls.map((tool: any) => tool?.toolName || tool?.name || tool?.tool || 'unknown')
            : undefined;
        archiveSlackResponse({
            timestamp: new Date(),
            slackUserId,
            channel,
            channelName: channelName || '',
            threadTs,
            userMessage: cleanText,
            agent: personaId,
            agentName: personaName,
            agentResponse: cleanContent,
            responseLength: cleanContent.length,
            toolCalls: toolNames,
            isDm,
            isChannelMsg,
            requestType,
            date: new Date().toISOString().split('T')[0],
            month: new Date().toISOString().split('T')[0].slice(0, 7),
        }).catch((err) => logger.warn(`[SlackBridge] Archive failed: ${err}`));

        const slackQualityIssues = detectSlackResponseIssues(personaId, {
            userMessage: cleanText,
            agentResponse: cleanContent,
        });
        if (slackQualityIssues.length > 0) {
            recordResponseFeedback({
                agentName: personaId,
                rating: 'negative',
                source: 'slack_auto',
                orgId: getSlackFeedbackOrgId(personaId),
                messageId: workingMessageTs || null,
                conversationId: threadTs,
                channel,
                comment: slackQualityIssues.map(issue => issue.summary).join(' | '),
                reason: slackQualityIssues.map(issue => issue.key).join(','),
                userMessage: cleanText,
                agentResponse: cleanContent,
                metadata: {
                    isDm,
                    isChannelMsg,
                    appId,
                    issueKeys: slackQualityIssues.map(issue => issue.key),
                    proposedFixes: slackQualityIssues.map(issue => issue.proposedFix),
                },
            }).catch((err) => logger.warn(`[SlackBridge] Feedback write failed: ${err}`));
        }

        logger.info(`[SlackBridge] Replied successfully to ${slackUserId} with ${personaId}`);

    } catch (err: any) {
        logger.error(`[SlackBridge] Failed to process message: ${err.message}`, err);
        try {
            await selectSlackService('', appId).postInThread(
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
/**
 * Pick the correct SlackService instance for the incoming Slack app.
 * Each dedicated app (Elroy, Linus) has its own bot token so it can post
 * to DMs that were opened with that app's bot user.
 */
function selectSlackService(personaId: string, appId: string): SlackService {
    if (personaId === 'marty' || (SLACK_MARTY_APP_ID && appId === SLACK_MARTY_APP_ID)) return martySlackService;
    if (personaId === 'elroy' || (SLACK_ELROY_APP_ID && appId === SLACK_ELROY_APP_ID)) return elroySlackService;
    if (SLACK_LINUS_APP_ID && appId === SLACK_LINUS_APP_ID) return linusSlackService;
    return slackService;
}

function makeThrottledProgress(
    channel: string,
    workingMessageTs: string | undefined,
    service: SlackService = slackService,
): ((msg: string) => Promise<void>) | undefined {
    if (!workingMessageTs) return undefined;
    let lastSentAt = 0;
    return async (msg: string) => {
        const now = Date.now();
        if (now - lastSentAt < 1000) return;
        lastSentAt = now;
        await service.updateMessage(channel, workingMessageTs, msg).catch(() => {});
    };
}

function getPersonaName(personaId: string): string {
    const names: Record<string, string> = {
        marty: 'Marty Benjamins', leo: 'Leo', linus: 'Linus', jack: 'Jack', glenda: 'Glenda',
        ezal: 'Ezal', craig: 'Craig', pops: 'Pops', smokey: 'Smokey',
        mrs_parker: 'Mrs. Parker', deebo: 'Deebo', money_mike: 'Money Mike',
        bigworm: 'Big Worm', day_day: 'Day Day', felisha: 'Felisha', puff: 'BakedBot',
        elroy: 'Uncle Elroy',
    };
    return names[personaId] ?? 'BakedBot';
}
