/**
 * Reddit Tools — Public JSON API (no authentication required)
 *
 * Uses Reddit's public JSON API (reddit.com/*.json) to fetch posts, comments,
 * and search results. No API key or OAuth needed. Rate limit: ~60 req/min.
 *
 * Agents: Ezal (competitive intel), Day Day (SEO trends), Craig (campaign research)
 */

import { logger } from '@/lib/logger';

const REDDIT_BASE = 'https://www.reddit.com';
const USER_AGENT = 'BakedBot:1.0 (cannabis commerce AI platform)';
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

// ============================================================================
// TYPES
// ============================================================================

export interface RedditPost {
    id: string;
    title: string;
    subreddit: string;
    author: string;
    score: number;
    upvoteRatio: number;
    numComments: number;
    selftext: string;
    url: string;
    permalink: string;
    createdUtc: number;
    flair: string | null;
    isText: boolean;
}

export interface RedditComment {
    author: string;
    body: string;
    score: number;
    replies: RedditComment[];
}

export interface RedditSearchResult {
    success: boolean;
    query: string;
    subreddit?: string;
    posts: RedditPost[];
    error?: string;
}

export interface RedditPostDetail {
    success: boolean;
    post: RedditPost | null;
    comments: RedditComment[];
    error?: string;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

async function redditFetch(url: string): Promise<any> {
    const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
        throw new Error(`Reddit API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

function parsePost(child: any): RedditPost {
    const d = child.data;
    return {
        id: d.id ?? '',
        title: d.title ?? '',
        subreddit: d.subreddit ?? '',
        author: d.author ?? '[deleted]',
        score: d.score ?? 0,
        upvoteRatio: d.upvote_ratio ?? 0,
        numComments: d.num_comments ?? 0,
        selftext: (d.selftext ?? '').slice(0, 500), // truncate for context budget
        url: d.url ?? '',
        permalink: d.permalink ?? '',
        createdUtc: d.created_utc ?? 0,
        flair: d.link_flair_text ?? null,
        isText: d.is_self ?? false,
    };
}

function parseComments(children: any[], depth = 0): RedditComment[] {
    if (depth > 2) return []; // limit nesting depth
    return children
        .filter((c: any) => c.kind === 't1')
        .slice(0, 10)
        .map((c: any) => ({
            author: c.data.author ?? '[deleted]',
            body: (c.data.body ?? '').slice(0, 300),
            score: c.data.score ?? 0,
            replies: c.data.replies?.data?.children
                ? parseComments(c.data.replies.data.children, depth + 1)
                : [],
        }));
}

function formatPost(p: RedditPost): string {
    const age = Math.round((Date.now() / 1000 - p.createdUtc) / 86400);
    return `**[${p.title}](https://reddit.com${p.permalink})**
r/${p.subreddit} | ↑${p.score} | 💬${p.numComments} | ${age}d ago | u/${p.author}${p.flair ? ` | [${p.flair}]` : ''}
${p.selftext ? p.selftext.slice(0, 200) + (p.selftext.length > 200 ? '…' : '') : ''}`;
}

// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================

/**
 * Search Reddit (all or within a subreddit).
 * Cannabis prefix is NOT auto-injected — callers control the query.
 */
export async function redditSearch(
    query: string,
    subreddit?: string,
    sort: 'relevance' | 'hot' | 'top' | 'new' = 'relevance',
    limit: number = DEFAULT_LIMIT,
): Promise<string> {
    const cap = Math.min(limit, MAX_LIMIT);
    const params = new URLSearchParams({ q: query, sort, limit: String(cap), restrict_sr: subreddit ? '1' : '0' });
    const path = subreddit
        ? `/r/${subreddit}/search.json?${params}`
        : `/search.json?${params}`;

    logger.info(`[RedditTools] search: ${path}`);

    try {
        const data = await redditFetch(`${REDDIT_BASE}${path}`);
        const posts: RedditPost[] = (data.data?.children ?? []).map(parsePost);

        if (posts.length === 0) {
            return `No Reddit posts found for "${query}"${subreddit ? ` in r/${subreddit}` : ''}.`;
        }

        const header = subreddit
            ? `Reddit search in r/${subreddit} for "${query}" (${posts.length} results):`
            : `Reddit search for "${query}" (${posts.length} results):`;

        return `${header}\n\n` + posts.map(formatPost).join('\n\n---\n\n');
    } catch (e: any) {
        logger.error(`[RedditTools] search error`, { error: e.message });
        return `Reddit search failed: ${e.message}`;
    }
}

/**
 * Browse hot/top/new/rising posts in a subreddit.
 */
export async function redditBrowseSubreddit(
    subreddit: string,
    category: 'hot' | 'top' | 'new' | 'rising' = 'hot',
    timeFilter: 'day' | 'week' | 'month' | 'year' | 'all' = 'week',
    limit: number = DEFAULT_LIMIT,
): Promise<string> {
    const cap = Math.min(limit, MAX_LIMIT);
    const params = new URLSearchParams({ limit: String(cap) });
    if (category === 'top') params.set('t', timeFilter);

    const url = `${REDDIT_BASE}/r/${subreddit}/${category}.json?${params}`;
    logger.info(`[RedditTools] browse: ${url}`);

    try {
        const data = await redditFetch(url);
        const posts: RedditPost[] = (data.data?.children ?? []).map(parsePost);

        if (posts.length === 0) {
            return `No posts found in r/${subreddit} (${category}).`;
        }

        return `r/${subreddit} — ${category}${category === 'top' ? ` (${timeFilter})` : ''} (${posts.length} posts):\n\n`
            + posts.map(formatPost).join('\n\n---\n\n');
    } catch (e: any) {
        logger.error(`[RedditTools] browse error`, { error: e.message, subreddit });
        return `Failed to browse r/${subreddit}: ${e.message}`;
    }
}

/**
 * Read a full post with top comments.
 * permalink format: /r/subreddit/comments/id/title/
 */
export async function redditGetPost(permalink: string): Promise<string> {
    const clean = permalink.startsWith('/') ? permalink : `/${permalink}`;
    const url = `${REDDIT_BASE}${clean}.json?limit=25&sort=top`;

    logger.info(`[RedditTools] getPost: ${url}`);

    try {
        const data = await redditFetch(url);
        if (!Array.isArray(data) || data.length < 1) {
            return `Could not load post at ${permalink}`;
        }

        const postChild = data[0]?.data?.children?.[0];
        if (!postChild) return `Post not found: ${permalink}`;

        const post = parsePost(postChild);
        const commentChildren = data[1]?.data?.children ?? [];
        const comments = parseComments(commentChildren);

        let out = formatPost(post);
        if (post.selftext) out += `\n\n**Full text:**\n${post.selftext}`;

        if (comments.length > 0) {
            out += `\n\n**Top comments:**\n`;
            out += comments.map(c =>
                `**u/${c.author}** (↑${c.score}): ${c.body}`
                + (c.replies.length > 0
                    ? '\n  ' + c.replies.slice(0, 3).map(r => `↳ **u/${r.author}**: ${r.body}`).join('\n  ')
                    : '')
            ).join('\n\n');
        }

        return out;
    } catch (e: any) {
        logger.error(`[RedditTools] getPost error`, { error: e.message, permalink });
        return `Failed to load post: ${e.message}`;
    }
}
