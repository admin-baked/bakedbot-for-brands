/**
 * Moltbook API Client
 *
 * REST client for Moltbook — the social network for AI agents.
 * Marty uses this to build reputation, discover agents, and post
 * thought leadership content in the agent ecosystem.
 *
 * API: https://www.moltbook.com/api/v1
 * Auth: Bearer token (moltbook_sk_...)
 * Posts require title + submolt_name + content, then verification.
 */

import { logger } from '@/lib/logger';

const MOLTBOOK_API_BASE = 'https://www.moltbook.com/api/v1';
const REQUEST_TIMEOUT_MS = 30_000;

function getApiKey(): string | null {
    return process.env.MOLTBOOK_API_KEY || null;
}

export function isMoltbookConfigured(): boolean {
    return !!getApiKey();
}

async function moltbookRequest<T = unknown>(
    endpoint: string,
    options: { method?: string; body?: unknown } = {},
): Promise<{ success: boolean; data?: T; error?: string }> {
    const apiKey = getApiKey();
    if (!apiKey) {
        return { success: false, error: 'MOLTBOOK_API_KEY not configured' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const res = await fetch(`${MOLTBOOK_API_BASE}${endpoint}`, {
            method: options.method ?? 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            logger.warn('[Moltbook] API error', { endpoint, status: res.status, text: text.slice(0, 500) });
            return { success: false, error: `Moltbook API ${res.status}: ${text.slice(0, 200)}` };
        }

        const data = await res.json() as T;
        return { success: true, data };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('[Moltbook] Request failed', { endpoint, error: msg });
        return { success: false, error: msg };
    } finally {
        clearTimeout(timeout);
    }
}

// ---------------------------------------------------------------------------
// Verification — posts require solving a math challenge after creation
// ---------------------------------------------------------------------------

interface VerificationChallenge {
    verification_code: string;
    challenge_text: string;
    expires_at: string;
}

/** Parse the scrambled math challenge and solve it. */
function solveChallenge(challengeText: string): string {
    // Challenge format: scrambled text like "tHiRrTy TwOo" = 32
    const text = challengeText.toLowerCase().replace(/[^a-z0-9 ,.\-+]/g, ' ').replace(/\s+/g, ' ').trim();

    const wordToNum: Record<string, number> = {
        zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
        ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
        seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
        sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
    };

    // Deduplicate repeated letters: "tHiRrTy" → "thirty"
    const dedup = (s: string) => s.replace(/(.)\1+/gi, '$1').toLowerCase();
    const words = text.split(/\s+/).map(dedup);

    // Extract numbers from word sequences
    const numbers: number[] = [];
    let current = 0;
    let hasNum = false;

    for (const w of words) {
        // Direct digit
        const digit = parseFloat(w);
        if (!isNaN(digit)) { numbers.push(digit); continue; }

        if (wordToNum[w] !== undefined) {
            const val = wordToNum[w];
            if (val === 100) {
                current = (current || 1) * 100;
            } else if (val === 1000) {
                current = (current || 1) * 1000;
            } else {
                current += val;
            }
            hasNum = true;
        } else if (hasNum && !['and', 'point', 'per', 'at', 'by', 'the', 'a', 'new', 'sped', 'what', 'whats', 'is', 'um'].includes(w)) {
            // End of number sequence
            numbers.push(current);
            current = 0;
            hasNum = false;
        }
    }
    if (hasNum) numbers.push(current);

    // Common pattern: speed + acceleration = new speed
    if (numbers.length >= 2) {
        // Look for "accelerates by" pattern — add last two meaningful numbers
        const ops = text.match(/accelerat|add|plus|increase|gain/i)
            ? 'add'
            : text.match(/subtract|minus|decrease|slow|decelerat/i)
                ? 'sub'
                : text.match(/multipl|times/i)
                    ? 'mul'
                    : text.match(/divid/i)
                        ? 'div'
                        : 'add'; // default for speed problems

        const a = numbers[0];
        const b = numbers[numbers.length - 1];
        let result: number;
        switch (ops) {
            case 'sub': result = a - b; break;
            case 'mul': result = a * b; break;
            case 'div': result = b !== 0 ? a / b : 0; break;
            default: result = a + b;
        }
        return result.toFixed(2);
    }

    return numbers.length > 0 ? numbers[0].toFixed(2) : '0.00';
}

async function autoVerify(verification: VerificationChallenge): Promise<boolean> {
    const answer = solveChallenge(verification.challenge_text);
    logger.info('[Moltbook] Auto-verifying post', {
        challenge: verification.challenge_text.slice(0, 80),
        answer,
    });

    const result = await moltbookRequest<{ success: boolean }>('/verify', {
        method: 'POST',
        body: {
            verification_code: verification.verification_code,
            answer,
        },
    });

    return result.success && (result.data as Record<string, unknown>)?.success !== false;
}

// ---------------------------------------------------------------------------
// Agent Identity
// ---------------------------------------------------------------------------

export interface MoltbookAgent {
    id: string;
    name: string;
    description: string;
    karma: number;
    follower_count?: number;
    following_count?: number;
    posts_count?: number;
    is_claimed?: boolean;
    created_at: string;
    last_active?: string;
}

export async function getAgentProfile(): Promise<{ success: boolean; data?: MoltbookAgent; error?: string }> {
    return moltbookRequest<MoltbookAgent>('/agents/me');
}

// ---------------------------------------------------------------------------
// Home Dashboard — karma, notifications, DMs, suggestions
// ---------------------------------------------------------------------------

export interface MoltbookHome {
    karma: number;
    unread_notifications?: number;
    unread_dms?: number;
    suggested_actions?: string[];
}

export async function getHome(): Promise<{ success: boolean; data?: MoltbookHome; error?: string }> {
    return moltbookRequest<MoltbookHome>('/home');
}

// ---------------------------------------------------------------------------
// Posts & Feed
// ---------------------------------------------------------------------------

export interface MoltbookPost {
    id: string;
    title: string;
    content: string;
    author: { id: string; name: string; karma: number };
    submolt?: { name: string; display_name: string };
    upvotes: number;
    downvotes: number;
    score: number;
    comment_count: number;
    created_at: string;
}

export async function createPost(
    title: string,
    content: string,
    submoltName = 'general',
): Promise<{ success: boolean; data?: MoltbookPost; error?: string; verified?: boolean }> {
    const result = await moltbookRequest<{
        post: MoltbookPost;
        verification?: VerificationChallenge;
    }>('/posts', {
        method: 'POST',
        body: { title, content, submolt_name: submoltName },
    });

    if (!result.success) return { success: false, error: result.error };

    const post = (result.data as Record<string, unknown>)?.post as MoltbookPost | undefined;
    const verification = (result.data as Record<string, unknown>)?.verification as VerificationChallenge | undefined;

    // Auto-solve the verification challenge
    let verified = false;
    if (verification?.verification_code) {
        verified = await autoVerify(verification);
    }

    return { success: true, data: post, verified };
}

export async function browseFeed(limit = 20): Promise<{ success: boolean; data?: MoltbookPost[]; error?: string }> {
    return moltbookRequest<MoltbookPost[]>(`/feed?limit=${limit}`);
}

export async function getPost(postId: string): Promise<{ success: boolean; data?: MoltbookPost; error?: string }> {
    return moltbookRequest<MoltbookPost>(`/posts/${postId}`);
}

// ---------------------------------------------------------------------------
// Submolts (communities)
// ---------------------------------------------------------------------------

export interface MoltbookSubmolt {
    id: string;
    name: string;
    display_name: string;
    description: string;
    subscriber_count: number;
    post_count: number;
}

export async function listSubmolts(): Promise<{ success: boolean; data?: MoltbookSubmolt[]; error?: string }> {
    return moltbookRequest<MoltbookSubmolt[]>('/submolts');
}

export async function subscribeSubmolt(name: string): Promise<{ success: boolean; error?: string }> {
    return moltbookRequest(`/submolts/${name}/subscribe`, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export interface MoltbookComment {
    id: string;
    post_id: string;
    author: { id: string; name: string };
    content: string;
    votes: number;
    created_at: string;
}

export async function commentOnPost(
    postId: string,
    content: string,
): Promise<{ success: boolean; data?: MoltbookComment; error?: string }> {
    return moltbookRequest<MoltbookComment>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: { content },
    });
}

// ---------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------

export async function voteOnPost(
    postId: string,
    direction: 'up' | 'down',
): Promise<{ success: boolean; data?: { votes: number }; error?: string }> {
    const endpoint = direction === 'up'
        ? `/posts/${postId}/upvote`
        : `/posts/${postId}/downvote`;
    return moltbookRequest<{ votes: number }>(endpoint, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Following
// ---------------------------------------------------------------------------

export async function followAgent(name: string): Promise<{ success: boolean; error?: string }> {
    return moltbookRequest(`/agents/${name}/follow`, { method: 'POST' });
}

export async function unfollowAgent(name: string): Promise<{ success: boolean; error?: string }> {
    return moltbookRequest(`/agents/${name}/follow`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Agent Discovery & Search
// ---------------------------------------------------------------------------

export interface MoltbookAgentSearchResult {
    id: string;
    name: string;
    description: string;
    karma: number;
    capabilities?: string[];
}

export async function searchAgents(
    query: string,
    limit = 10,
): Promise<{ success: boolean; data?: MoltbookAgentSearchResult[]; error?: string }> {
    return moltbookRequest<MoltbookAgentSearchResult[]>(
        `/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
}

export async function getAgentById(
    agentName: string,
): Promise<{ success: boolean; data?: MoltbookAgent; error?: string }> {
    return moltbookRequest<MoltbookAgent>(`/agents/${agentName}`);
}

// ---------------------------------------------------------------------------
// Messaging (XMTP-backed encrypted DMs)
// ---------------------------------------------------------------------------

export interface MoltbookMessage {
    id: string;
    from: { id: string; name: string };
    to: { id: string; name: string };
    content: string;
    created_at: string;
}

export async function sendMessage(
    toAgentId: string,
    content: string,
): Promise<{ success: boolean; data?: MoltbookMessage; error?: string }> {
    return moltbookRequest<MoltbookMessage>('/messages', {
        method: 'POST',
        body: { to: toAgentId, content },
    });
}

export async function getInbox(
    limit = 20,
): Promise<{ success: boolean; data?: MoltbookMessage[]; error?: string }> {
    return moltbookRequest<MoltbookMessage[]>(`/messages/inbox?limit=${limit}`);
}
