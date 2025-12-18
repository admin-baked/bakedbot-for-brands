/**
 * TypeScript types for Ezal Lite Snapshots
 * Cheap competitive intelligence using Website Content Crawler
 */

// ============== Snapshot Types ==============

export interface EzalSnapshot {
    id: string;
    competitorId: string;
    competitorName: string;
    url: string;
    scrapedAt: Date;
    expiresAt: Date;  // scrapedAt + 30 days

    // Extracted data (regex-based, no LLM)
    priceRange: {
        min: number;
        max: number;
        median: number;
        count: number;
    };
    promoCount: number;
    promoSignals: string[];  // ["20% off", "BOGO", etc.]
    categorySignals: string[];  // ["flower", "vape", "edible", etc.]

    // Cost tracking
    costCents: number;
    proxyType: 'none' | 'datacenter' | 'residential';

    // Status
    freshness: 'fresh' | 'stale';
    status: 'success' | 'partial' | 'failed';
    errorMessage?: string;

    // Content hash for diff detection
    contentHash: string;
}

// ============== Competitor Types ==============

export interface EzalCompetitor {
    id: string;
    name: string;
    url: string;
    state: string;
    city?: string;

    // Crawl history
    needsResidentialProxy: boolean;
    lastCrawlAt?: Date;
    lastSuccessAt?: Date;
    consecutiveFailures: number;

    // User association (for free tier)
    addedBy?: string;
    tier: 'free' | 'paid';

    createdAt: Date;
}

// ============== Crawl Input Types ==============

export interface WebsiteContentCrawlerInput {
    startUrls: { url: string }[];

    // HARD LIMITS (cost governors)
    maxCrawlPages: number;  // 1 for Lite
    maxCrawlDepth: number;  // 0 for Lite
    maxResults: number;     // 1 for Lite

    // SPEED + COST CONTROLS
    blockMedia: boolean;
    saveHtml: boolean;
    saveFiles: boolean;
    saveScreenshots: boolean;
    saveMarkdown: boolean;
    htmlTransformer: 'readableText' | 'none';

    // RELIABILITY
    crawlerType: 'playwright:adaptive' | 'cheerio' | 'playwright:firefox';
    dynamicContentWaitSecs: number;
    requestTimeoutSecs: number;
    maxRequestRetries: number;

    // CLEANUP
    removeCookieWarnings: boolean;
    removeElementsCssSelector?: string;

    // ETHICS
    respectRobotsTxtFile: boolean;

    // PROXY
    proxyConfiguration?: {
        useApifyProxy: boolean;
        apifyProxyGroups?: string[];  // 'RESIDENTIAL' for residential
    };
}

// ============== Crawl Output Types ==============

export interface WebsiteCrawlerResult {
    url: string;
    loadedUrl?: string;
    text?: string;
    markdown?: string;
    html?: string;
    screenshotUrl?: string;
    crawledAt: string;
    metadata?: {
        title?: string;
        description?: string;
        canonicalUrl?: string;
    };
}

// ============== Run Types ==============

export interface EzalLiteRun {
    id: string;
    apifyRunId: string;
    competitorId: string;
    competitorUrl: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    proxyType: 'none' | 'datacenter' | 'residential';
    startedAt: Date;
    completedAt?: Date;
    costCents?: number;
    errorMessage?: string;
}

// ============== Cache Configuration ==============

export const EZAL_LITE_CONFIG = {
    // Cache duration in days
    cacheDurationDays: 30,

    // Cost thresholds in cents
    maxCostCentsPerSnapshot: 15,
    targetCostCentsPerSnapshot: 10,

    // Proxy configuration
    proxyLadder: ['none', 'datacenter', 'residential'] as const,

    // Rate limits
    maxFreeSnapshotsPerUser: 1,
    maxSnapshotsPerDay: 100,

    // Apify actor
    actorId: 'apify/website-content-crawler',
};

// ============== Extraction Patterns ==============

export const EXTRACTION_PATTERNS = {
    // Price patterns
    prices: /\$\d+(?:\.\d{2})?/g,

    // Promo patterns
    promos: /((\d+)%\s*off|bogo|buy\s*\d+\s*get\s*\d+|deal|discount|sale|special|promo)/gi,

    // Category keywords
    categories: [
        'flower', 'bud', 'nug',
        'vape', 'cartridge', 'cart', 'pen',
        'edible', 'gummy', 'chocolate', 'brownie',
        'concentrate', 'wax', 'shatter', 'rosin', 'dab',
        'pre-roll', 'preroll', 'joint', 'blunt',
        'topical', 'lotion', 'cream', 'balm',
        'tincture', 'oil', 'drops'
    ],
};
