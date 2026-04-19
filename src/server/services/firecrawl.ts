
import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getRTRVRClient } from './rtrvr/client';
import { executeAgentTask, extractFromUrl } from './rtrvr/agent';
import type { AgentResult } from './rtrvr/agent';

/**
 * BakedBot Discovery Service (Singleton)
 *
 * Fallback chain for discoverUrl():
 *   1. Firecrawl  — best quality, JS rendering, structured JSON (paid, credits-based)
 *   2. Jina AI    — free (20 RPM no key / 100 RPM with JINA_API_KEY), clean markdown + metadata
 *   3. RTRVR      — browser automation agent (RTRVR_API_KEY required)
 *
 * Capabilities:
 * - Discovery: Get markdown/HTML from a URL (Firecrawl → Jina AI → RTRVR)
 * - Search: Find pages matching a query (Firecrawl → RTRVR fallback)
 * - Map: Crawl a site to find links (Firecrawl → RTRVR fallback)
 * - Extract: LLM-based structured data extraction (Firecrawl → RTRVR fallback)
 * - Agent: Autonomous multi-page research via Firecrawl /agent (Spark models)
 */
// Minimum credits to keep in reserve before routing to Jina instead of Firecrawl.
// Override via FIRECRAWL_CREDIT_RESERVE env var (default 300).
const CREDIT_RESERVE = parseInt(process.env.FIRECRAWL_CREDIT_RESERVE ?? '300', 10);
// How long to cache the credit balance check (ms). Avoids hammering the billing API.
const CREDIT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export class DiscoveryService {
    private app: FirecrawlApp | null = null;
    private readonly apiKey: string | null = null;
    private static instance: DiscoveryService;

    // In-memory credit cache — shared across requests within the same server process.
    private creditCache: { remaining: number; fetchedAt: number } | null = null;

    private constructor() {
        const firecrawlKey = process.env.FIRECRAWL_API_KEY;
        const rtrvrKey = process.env.RTRVR_API_KEY;
        const jinaKey = process.env.JINA_API_KEY;

        if (firecrawlKey) {
            this.apiKey = firecrawlKey;
            this.app = new FirecrawlApp({ apiKey: firecrawlKey });
        }

        logger.info('[Discovery] Service initialized', {
            firecrawlAvailable: !!this.app,
            jinaAvailable: true, // always available; key optional (100 RPM with key, 20 without)
            jinaKeyConfigured: !!jinaKey,
            rtrvrAvailable: this.isRTRVRAvailable(),
            rtrvrKeyLength: rtrvrKey?.length || 0,
            creditReserve: CREDIT_RESERVE,
        });
    }

    public static getInstance(): DiscoveryService {
        if (!DiscoveryService.instance) {
            DiscoveryService.instance = new DiscoveryService();
        }
        return DiscoveryService.instance;
    }

    public isConfigured(): boolean {
        return true; // Jina AI is always available as fallback
    }

    private isFirecrawlAvailable(): boolean {
        return !!this.app;
    }

    private isRTRVRAvailable(): boolean {
        return getRTRVRClient().isAvailable();
    }

    /**
     * Returns remaining Firecrawl credits (cached 10 min).
     * Returns Infinity when key is not configured so callers don't need to guard.
     */
    public async getRemainingCredits(): Promise<number> {
        if (!this.apiKey) return Infinity;
        const now = Date.now();
        if (this.creditCache && now - this.creditCache.fetchedAt < CREDIT_CACHE_TTL_MS) {
            return this.creditCache.remaining;
        }
        try {
            const res = await fetch('https://api.firecrawl.dev/v2/team/credit-usage', {
                headers: { Authorization: `Bearer ${this.apiKey}` },
                signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { data?: { remainingCredits?: number } };
            const remaining = data.data?.remainingCredits ?? 0;
            this.creditCache = { remaining, fetchedAt: now };
            logger.info('[Discovery] Firecrawl credit check', { remaining, reserve: CREDIT_RESERVE });
            return remaining;
        } catch (err: any) {
            logger.warn('[Discovery] Credit check failed — assuming budgeted', { error: err.message });
            return this.creditCache?.remaining ?? 0;
        }
    }

    /**
     * Returns false when Firecrawl is available but below the credit reserve threshold.
     * Use this before expensive bulk operations to decide whether to skip Firecrawl.
     */
    public async hasCreditBudget(needed = 1): Promise<boolean> {
        if (!this.isFirecrawlAvailable()) return false;
        const remaining = await this.getRemainingCredits();
        const ok = remaining >= CREDIT_RESERVE + needed;
        if (!ok) {
            logger.warn('[Discovery] Firecrawl credit budget exhausted — routing to Jina', {
                remaining, reserve: CREDIT_RESERVE, needed,
            });
        }
        return ok;
    }

    /**
     * Jina AI Reader fallback
     * Free tier: 20 RPM (no key) or 100 RPM (JINA_API_KEY set)
     * Returns title + description + clean markdown — no API key required.
     */
    private async discoverViaJina(url: string): Promise<{ success: true; markdown: string; metadata: { title?: string; description?: string } }> {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
        };
        const jinaKey = process.env.JINA_API_KEY;
        if (jinaKey) {
            headers['Authorization'] = `Bearer ${jinaKey}`;
        }

        const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
            headers,
            signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
            throw new Error(`Jina AI returned ${res.status}: ${res.statusText}`);
        }

        const data = await res.json() as any;
        if (data.code !== 200 || !data.data) {
            throw new Error(`Jina AI error: ${data.status || JSON.stringify(data)}`);
        }

        logger.info('[Discovery] Jina AI discoverUrl succeeded', {
            url,
            title: data.data.title,
            contentChars: (data.data.content || '').length,
            tokens: data.data.usage?.tokens,
        });

        return {
            success: true,
            markdown: data.data.content || '',
            metadata: {
                title: data.data.title || undefined,
                description: data.data.description || undefined,
            },
        };
    }

    /**
     * Extract content from RTRVR agent result
     */
    private extractRTRVRContent(data: AgentResult | undefined): string {
        if (!data) return '';
        if (typeof data.result === 'string') return data.result;
        if (data.output?.length) {
            const textOut = data.output.find(o => o.type === 'text');
            if (textOut) return String(textOut.content);
            const jsonOut = data.output.find(o => o.type === 'json');
            if (jsonOut) return typeof jsonOut.content === 'string' ? jsonOut.content : JSON.stringify(jsonOut.content);
        }
        return JSON.stringify(data.result ?? '');
    }

    /**
     * Basic Discovery: Get content from a URL
     *
     * Priority order:
     *   1. Firecrawl — best quality, JS rendering, structured JSON (primary)
     *   2. Jina AI   — free (20 RPM no key / 100 RPM with JINA_API_KEY), clean markdown (fallback)
     *   3. RTRVR     — browser automation for JS-heavy / age-gated pages (last resort)
     */
    public async discoverUrl(url: string, formats: ('markdown' | 'html' | 'rawHtml' | 'screenshot')[] = ['markdown']) {
        let firecrawlFallback: any = null;

        // ── 1. Firecrawl (primary — JS rendering, best quality) ───────────────
        if (await this.hasCreditBudget()) {
            try {
                const response = await this.app!.scrape(url, { formats }) as any;
                if (!response.success) throw new Error(`Firecrawl failed: ${response.error}`);
                if ((response.markdown || '').trim().length >= 700) {
                    logger.info('[Discovery] discoverUrl succeeded via Firecrawl', { url });
                    return response;
                }
                firecrawlFallback = response;
                logger.warn('[Discovery] Firecrawl returned thin content, trying Jina AI', {
                    url,
                    chars: (response.markdown || '').length,
                });
            } catch (error: any) {
                logger.warn('[Discovery] Firecrawl failed, trying Jina AI', { url, error: error.message });
            }
        }

        // ── 2. Jina AI (free, clean markdown) ────────────────────────────────
        try {
            logger.info('[Discovery] Using Jina AI fallback for discoverUrl', { url });
            const result = await this.discoverViaJina(url);
            if (firecrawlFallback && result.markdown.length <= (firecrawlFallback.markdown || '').length) {
                return firecrawlFallback;
            }
            if (result.markdown.trim().length >= 200) {
                return result;
            }
            logger.warn('[Discovery] Jina AI returned thin content, trying RTRVR', {
                url,
                chars: result.markdown.length,
            });
        } catch (jinaError: any) {
            logger.warn('[Discovery] Jina AI failed, trying RTRVR', { url, error: jinaError.message });
        }

        // ── 3. RTRVR (browser automation — JS-heavy / age-gated pages) ───────
        if (this.isRTRVRAvailable()) {
            try {
                logger.info('[Discovery] Using RTRVR fallback for discoverUrl', { url });
                const res = await extractFromUrl(
                    url,
                    'Extract the full page content as clean readable markdown text. Also extract: the page title (from <title> tag or og:title), and a description (prefer meta description, fall back to og:description, then the first meaningful paragraph from the page body).',
                    {
                        type: 'object',
                        properties: {
                            markdown:    { type: 'string', description: 'Full page content as markdown' },
                            title:       { type: 'string', description: 'Page <title> or og:title' },
                            description: { type: 'string', description: 'Meta description, og:description, or first paragraph' },
                        }
                    }
                );
                if (res.success) {
                    const result = res.data?.result as any;
                    const markdown = typeof result?.markdown === 'string'
                        ? result.markdown
                        : this.extractRTRVRContent(res.data);
                    const title       = typeof result?.title       === 'string' ? result.title       : undefined;
                    const description = typeof result?.description === 'string' ? result.description : undefined;
                    if (firecrawlFallback && markdown.length <= (firecrawlFallback.markdown || '').length) {
                        return firecrawlFallback;
                    }
                    return { success: true, markdown, metadata: { title, description } };
                }
                logger.warn('[Discovery] RTRVR failed', { url, error: res.error });
            } catch (rtrvrError: any) {
                logger.warn('[Discovery] RTRVR threw', { url, error: rtrvrError.message });
            }
        }

        if (firecrawlFallback) {
            logger.info('[Discovery] Returning thin Firecrawl result after all fallbacks failed', { url });
            return firecrawlFallback;
        }

        throw new Error('discoverUrl failed: Firecrawl, Jina AI, and RTRVR all unavailable or errored');
    }

    /**
     * Advanced Discovery with Actions (Reference: Cloud-only feature)
     * useful for age gates, clicking buttons, etc.
     * Falls back to RTRVR if Firecrawl is unavailable
     */
    public async discoverWithActions(url: string, actions: any[]) {
        if (await this.hasCreditBudget()) {
            try {
                // @ts-ignore - Actions are supported in API but strictly typed in some SDK versions
                const response = await this.app!.scrape(url, {
                    formats: ['markdown'],
                    actions: actions
                }) as any;

                if (!response.success) {
                    throw new Error(`Discovery action failed: ${response.error}`);
                }

                logger.info('[Discovery] discoverWithActions succeeded via Firecrawl', { url });
                return response;
            } catch (error: any) {
                logger.warn('[Discovery] Firecrawl discoverWithActions failed, trying RTRVR fallback', { url, error: error.message });
                if (!this.isRTRVRAvailable()) {
                    console.error('[Discovery] Action retrieval error:', error);
                    throw error;
                }
            }
        } else if (!this.isRTRVRAvailable()) {
            throw new Error('Discovery not configured (neither Firecrawl nor RTRVR available)');
        }

        // RTRVR fallback: convert actions to natural language instruction
        logger.info('[Discovery] Using RTRVR fallback for discoverWithActions', { url, actionCount: actions.length });
        const actionDescription = actions
            .map((a: any) => {
                if (a.type === 'click') return `Click on element matching: ${a.selector}`;
                if (a.type === 'scroll') return `Scroll ${a.direction || 'down'} by ${a.amount || 'to bottom'}`;
                if (a.type === 'type') return `Type text: "${a.text}"`;
                if (a.type === 'wait') return `Wait ${a.milliseconds}ms`;
                return `Execute action: ${JSON.stringify(a)}`;
            })
            .join('; ');

        const res = await executeAgentTask({
            input: `Go to this page and perform these actions in order: ${actionDescription}. Then extract the main content as markdown.`,
            urls: [url],
            verbosity: 'final'
        });

        if (!res.success || !res.data) {
            throw new Error(`RTRVR fallback failed: ${res.error}`);
        }

        const content = this.extractRTRVRContent(res.data);
        return { success: true, markdown: content };
    }

    /**
     * Search the web (Discovery Search)
     * Falls back to RTRVR if Firecrawl is unavailable
     */
    public async search(query: string) {
        if (await this.hasCreditBudget()) {
            try {
                const response = await this.app!.search(query) as any;
                logger.info('[Discovery] Search raw response received', { query, keys: Object.keys(response) });

                // Handle different SDK response shapes
                const data = response.data || response.web || (response.success ? response : null);

                if (!data && !response.success) {
                    const errMsg = response.error || JSON.stringify(response);
                    throw new Error(`Discovery search failed: ${errMsg}`);
                }

                logger.info('[Discovery] search succeeded via Firecrawl', { query, resultCount: Array.isArray(data) ? data.length : 0 });
                return data || [];
            } catch (error: any) {
                logger.warn('[Discovery] Firecrawl search failed, trying RTRVR fallback', { query, error: error.message });
                if (!this.isRTRVRAvailable()) {
                    logger.error('[Discovery] Search error — no fallback available', { query, error: (error as any).message });
                    throw error;
                }
            }
        } else if (!this.isRTRVRAvailable()) {
            throw new Error('Discovery not configured (neither Firecrawl nor RTRVR available)');
        }

        // RTRVR fallback
        logger.info('[Discovery] Using RTRVR fallback for search', { query });
        const res = await executeAgentTask({
            input: `Search the web for: "${query}". Return results as a JSON array with objects containing: title (string), url (string), and snippet (string).`,
            schema: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        url: { type: 'string' },
                        snippet: { type: 'string' }
                    },
                    required: ['title', 'url']
                }
            },
            verbosity: 'final'
        });

        if (!res.success || !res.data?.result) {
            throw new Error(`RTRVR search fallback failed: ${res.error}`);
        }

        const results = res.data.result;
        return Array.isArray(results) ? results : [];
    }

    /**
     * Map a website (Discovery)
     * Falls back to RTRVR if Firecrawl is unavailable
     */
    public async mapSite(url: string) {
        if (await this.hasCreditBudget(5)) {
            try {
                // @ts-ignore - mapUrl exists in API but may not be in SDK types
                const response = await this.app!.mapUrl(url) as any;

                if (!response.success) {
                    throw new Error(`Discovery map failed: ${response.error}`);
                }

                logger.info('[Discovery] mapSite succeeded via Firecrawl', { url });
                return response;
            } catch (error: any) {
                logger.warn('[Discovery] Firecrawl mapSite failed, trying RTRVR fallback', { url, error: error.message });
                if (!this.isRTRVRAvailable()) {
                    logger.error('[Discovery] Map error — no fallback available', { url, error: (error as any).message });
                    throw error;
                }
            }
        } else if (!this.isRTRVRAvailable()) {
            throw new Error('Discovery not configured (neither Firecrawl nor RTRVR available)');
        }

        // RTRVR fallback
        logger.info('[Discovery] Using RTRVR fallback for mapSite', { url });
        const res = await executeAgentTask({
            input: `Visit this website and find all internal links/URLs. Return as JSON array of strings with the full URLs.`,
            urls: [url],
            schema: {
                type: 'array',
                items: { type: 'string' }
            },
            verbosity: 'final'
        });

        if (!res.success || !res.data?.result) {
            throw new Error(`RTRVR mapSite fallback failed: ${res.error}`);
        }

        const links = res.data.result;
        return { success: true, links: Array.isArray(links) ? links : [] };
    }

    /**
     * Extract structured data from a URL using LLM
     * Falls back to RTRVR if Firecrawl is unavailable
     */
    public async extractData(url: string, schema: z.ZodSchema<any>) {
        if (this.isFirecrawlAvailable()) {
            try {
                // Updated to use the correct object format for JSON extraction
                // Reference: debug-json-obj.ts success
                logger.info('[Discovery] Extracting structured data via Firecrawl', { url });
                const response = await this.app!.scrape(url, {
                    formats: ['json'],
                    jsonOptions: {
                        schema: schema,
                        prompt: "Extract structured data from the page content matching the schema."
                    }
                } as any) as any;

                // If response has json property, it's successful (SDK behavior verify)
                if ((response as any).json || response.data?.json) {
                    logger.info('[Discovery] extractData succeeded via Firecrawl', { url });
                    return (response as any).json || response.data?.json;
                }

                if (!response.success) {
                    const errMsg = response.error || JSON.stringify(response);
                    throw new Error(`Discovery extraction failed: ${errMsg}`);
                }

                logger.info('[Discovery] extractData succeeded via Firecrawl', { url });
                // Return the parsed JSON from the response
                return response.json || response.data?.json || response.data;
            } catch (error: any) {
                logger.warn('[Discovery] Firecrawl extractData failed, trying RTRVR fallback', { url, error: error.message });
                if (!this.isRTRVRAvailable()) {
                    logger.error('[Discovery] Extract error — no fallback available', { url, error: (error as any).message });
                    throw error;
                }
            }
        } else if (!this.isRTRVRAvailable()) {
            throw new Error('Discovery not configured (neither Firecrawl nor RTRVR available)');
        }

        // RTRVR fallback
        logger.info('[Discovery] Using RTRVR fallback for extractData', { url });
        const schemaStr = schema._def?.description || JSON.stringify(schema);
        const res = await extractFromUrl(
            url,
            `Extract structured data from the page matching this schema: ${schemaStr}. Return data as JSON object.`,
            {
                type: 'object',
                properties: { data: { type: 'object' } }
            }
        );

        if (!res.success || !res.data) {
            throw new Error(`RTRVR extractData fallback failed: ${res.error}`);
        }

        const extracted = res.data.result as any;
        return extracted?.data || extracted || {};
    }

    /**
     * Autonomous AI Agent — open-ended research across multiple pages
     *
     * Uses Firecrawl's /agent endpoint (Spark models). Does NOT require known URLs —
     * the agent searches, navigates, and extracts on its own.
     *
     * Submits an async job and polls until complete or timeout.
     * Returns the agent's full answer as a string.
     */
    public async runAgent(prompt: string, timeoutMs = 90_000): Promise<{ success: true; data: string } | { success: false; error: string }> {
        if (!this.apiKey) {
            return { success: false, error: 'FIRECRAWL_API_KEY not configured' };
        }
        // Agent jobs are expensive (multi-page research). Require 10 credits above reserve.
        if (!(await this.hasCreditBudget(10))) {
            return { success: false, error: 'Firecrawl credit budget exhausted — skipping agent job' };
        }

        const authHeader = `Bearer ${this.apiKey}`;

        try {
            const submitRes = await fetch('https://api.firecrawl.dev/v1/agent', {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
                signal: AbortSignal.timeout(30_000),
            });

            if (!submitRes.ok) {
                const errText = await submitRes.text();
                return { success: false, error: `Agent submit failed: ${submitRes.status} ${errText}` };
            }

            const { jobId } = await submitRes.json() as { jobId: string };
            logger.info('[Discovery] Firecrawl agent job submitted', { jobId, promptLength: prompt.length });

            const deadline = Date.now() + timeoutMs;
            let firstPoll = true;
            while (Date.now() < deadline) {
                if (!firstPoll) await new Promise(r => setTimeout(r, 3_000));
                firstPoll = false;

                const pollRes = await fetch(`https://api.firecrawl.dev/v1/agent/${jobId}`, {
                    headers: { 'Authorization': authHeader },
                    signal: AbortSignal.timeout(15_000),
                });

                // Fail fast on terminal 4xx (job not found, unauthorized); retry on 5xx / 429
                if (!pollRes.ok) {
                    if (pollRes.status >= 400 && pollRes.status < 500 && pollRes.status !== 429) {
                        return { success: false, error: `Agent poll failed with ${pollRes.status}` };
                    }
                    continue;
                }

                const job = await pollRes.json() as any;
                if (job.status === 'completed') {
                    const data = job.result ?? job.data ?? job.answer ?? JSON.stringify(job);
                    logger.info('[Discovery] Firecrawl agent completed', { jobId });
                    return { success: true, data: typeof data === 'string' ? data : JSON.stringify(data) };
                }
                if (job.status === 'failed') {
                    return { success: false, error: `Agent job failed: ${job.error ?? 'unknown'}` };
                }
            }

            return { success: false, error: `Agent job timed out after ${timeoutMs / 1000}s` };
        } catch (error: any) {
            logger.error('[Discovery] runAgent threw', { error: error.message });
            return { success: false, error: error.message };
        }
    }
}

export const discovery = DiscoveryService.getInstance();
