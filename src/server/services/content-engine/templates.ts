/**
 * Content Engine — Template Registry
 *
 * Defines programmatic content templates that generate blog posts from live data.
 * Templates are code-defined (version-controlled) not Firestore-stored.
 */

import type { BlogCategory, BlogContentType } from '@/types/blog';

// ============================================================================
// Template Types
// ============================================================================

export interface ContentTemplate {
    id: string;
    name: string;
    category: BlogCategory;
    contentType: BlogContentType;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on_change';
    /** Day of week for weekly templates (0=Sunday, 1=Monday, etc.) */
    dayOfWeek?: number;
    /** Day of month for monthly templates (1-28) */
    dayOfMonth?: number;
    /** Specific dates for quarterly templates (month-day, e.g., '01-05' for Jan 5) */
    quarterlyDates?: string[];
    dataSource: 'ezal' | 'pops' | 'money_mike' | 'deebo' | 'smokey' | 'combined';
    promptTemplate: string;
    seoTemplate: {
        titleTemplate: string;
        descriptionTemplate: string;
        keywordsTemplate: string[];
    };
    /** Minimum data points needed to justify generating */
    minDataThreshold?: number;
    enabled: boolean;
    /** Default author for this template's posts */
    defaultAuthor?: {
        id: string;
        name: string;
        role: string;
    };
    /** Series this template belongs to (for content calendar tracking) */
    seriesId?: string;
}

// ============================================================================
// Template Registry
// ============================================================================

export const CONTENT_TEMPLATES: ContentTemplate[] = [
    // ── Weekly: Smokey's Corner ──────────────────────────────────────
    {
        id: 'weekly_budtender_tips',
        name: "Smokey's Corner",
        category: 'education',
        contentType: 'programmatic',
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        dataSource: 'smokey',
        promptTemplate: `You are writing Smokey's Corner, a weekly educational column for cannabis consumers.

Topic: {{topic}}

Use this real product and trend data to inform the article:
{{dataContext}}

Write an engaging, educational blog post (~700 words) that:
1. Opens with a relatable scenario or question
2. Explains cannabis science in approachable terms
3. References real products or strains from the data
4. Includes practical tips readers can use today
5. Ends with a call-to-action (visit menu, ask budtender)

Tone: Friendly, knowledgeable budtender — like a trusted friend who happens to know everything about cannabis.
Do NOT make medical claims. Always include "consult your budtender" language.`,
        seoTemplate: {
            titleTemplate: "Smokey's Corner: {{topic}}",
            descriptionTemplate: 'Your weekly cannabis education from BakedBot — {{topic}}. Tips, trends, and budtender insights.',
            keywordsTemplate: ['cannabis education', 'budtender tips', '{{topic}}', 'cannabis guide'],
        },
        enabled: true,
        defaultAuthor: { id: 'agent:smokey', name: 'Smokey', role: 'AI Budtender' },
        seriesId: 'smokeys_corner',
    },

    // ── Monthly: State Market Trends ────────────────────────────────
    {
        id: 'market_trends_state',
        name: 'Cannabis Market Trends Report',
        category: 'market_report',
        contentType: 'report',
        frequency: 'monthly',
        dayOfMonth: 1,
        dataSource: 'combined',
        promptTemplate: `Write a comprehensive cannabis market trends report for {{state}} covering {{month}} {{year}}.

Market data:
{{dataContext}}

Structure the report as:
1. **Executive Summary** (3-4 sentences)
2. **Pricing Trends** — average prices, category breakdown, notable shifts
3. **Consumer Behavior** — basket sizes, popular categories, peak hours
4. **Competitive Landscape** — new entrants, closures, market density
5. **Regulatory Update** — any compliance changes this month
6. **Outlook** — predictions for next month

Use the actual data provided. Format numbers with $ and % where appropriate.
Include 2-3 key takeaways at the top for quick scanning.
Target: ~1,200 words. Tone: authoritative data journalism.`,
        seoTemplate: {
            titleTemplate: 'Cannabis Market Trends in {{state}}: {{month}} {{year}}',
            descriptionTemplate: 'Monthly cannabis market analysis for {{state}} — pricing trends, consumer behavior, and competitive landscape for {{month}} {{year}}.',
            keywordsTemplate: ['cannabis market {{state}}', 'dispensary trends {{year}}', '{{state}} cannabis prices', 'cannabis industry report'],
        },
        minDataThreshold: 5,
        enabled: true,
        defaultAuthor: { id: 'agent:pops', name: 'Pops', role: 'Analytics Agent' },
        seriesId: 'market_trends',
    },

    // ── On-Change: Regulatory Alerts ────────────────────────────────
    {
        id: 'regulatory_alert',
        name: 'Regulatory Alert',
        category: 'regulatory_alert',
        contentType: 'programmatic',
        frequency: 'on_change',
        dataSource: 'deebo',
        promptTemplate: `Write an urgent regulatory alert blog post about a cannabis compliance change.

State: {{state}}
Change summary: {{change_summary}}
Effective date: {{effective_date}}

Regulatory details:
{{dataContext}}

Structure:
1. **What Changed** — clear, plain-English summary
2. **Who Is Affected** — which license types, which businesses
3. **What You Need To Do** — actionable compliance steps
4. **Timeline** — when changes take effect, grace periods
5. **BakedBot's Response** — how our compliance engine has been updated

Tone: Urgent but professional. This is a compliance resource, not fear-mongering.
Target: ~800 words. Include a "Key Dates" callout box.`,
        seoTemplate: {
            titleTemplate: '{{state}} Cannabis Regulation Update: {{change_summary}}',
            descriptionTemplate: 'Breaking: {{state}} cannabis regulations changed — {{change_summary}}. What dispensaries need to know and do.',
            keywordsTemplate: ['{{state}} cannabis regulation', 'cannabis compliance update', '{{state}} dispensary rules', 'cannabis law change {{year}}'],
        },
        enabled: true,
        defaultAuthor: { id: 'agent:deebo', name: 'Deebo', role: 'Compliance Agent' },
        seriesId: 'regulatory_alerts',
    },

    // ── Monthly: Price Watch ────────────────────────────────────────
    {
        id: 'price_watch',
        name: 'Cannabis Price Watch',
        category: 'market_report',
        contentType: 'programmatic',
        frequency: 'monthly',
        dayOfMonth: 15,
        dataSource: 'ezal',
        promptTemplate: `Write a cannabis price watch report for the {{region}} market covering {{month}} {{year}}.

Competitive pricing data:
{{dataContext}}

Structure:
1. **Price Snapshot** — average prices by category (flower, vape, edible, pre-roll)
2. **Notable Moves** — competitors that raised or dropped prices significantly
3. **Deal of the Month** — best value products spotted
4. **Price Predictions** — where prices are heading based on trends
5. **Smart Shopping Tips** — advice for cost-conscious consumers

Use actual pricing data. Include a simple comparison table if data supports it.
Target: ~700 words. Tone: consumer-friendly market analysis.`,
        seoTemplate: {
            titleTemplate: 'Cannabis Price Watch: {{region}} — {{month}} {{year}}',
            descriptionTemplate: 'Monthly cannabis price analysis for {{region}} — category averages, notable price changes, and smart shopping tips for {{month}} {{year}}.',
            keywordsTemplate: ['cannabis prices {{region}}', 'dispensary deals', 'cannabis price comparison', 'weed prices {{year}}'],
        },
        minDataThreshold: 3,
        enabled: true,
        defaultAuthor: { id: 'agent:ezal', name: 'Ezal', role: 'Competitive Intel Agent' },
        seriesId: 'price_watch',
    },

    // ── Monthly: Best-Of Comparison ─────────────────────────────────
    {
        id: 'best_of_category',
        name: 'Best-Of Comparison Guide',
        category: 'comparison',
        contentType: 'comparison',
        frequency: 'monthly',
        dayOfMonth: 10,
        dataSource: 'ezal',
        promptTemplate: `Write an honest, transparent comparison guide: "Best {{category}} for Cannabis Dispensaries in {{year}}".

Competitive intelligence data:
{{dataContext}}

Structure:
1. **Our Methodology** — how we evaluated (data sources, criteria)
2. **The Contenders** — 4-6 platforms/products, including BakedBot where relevant
3. **Feature Comparison** — honest side-by-side on key capabilities
4. **Pros & Cons** — for each contender, 3+ pros and 2+ cons
5. **Best For** — who should pick each option
6. **Our Verdict** — honest editorial conclusion

IMPORTANT: Include BakedBot alongside competitors. Be honest about BakedBot's limitations too.
This is "painfully honest" comparison content — not a sales page.
Target: ~1,000 words. Tone: trusted industry analyst.`,
        seoTemplate: {
            titleTemplate: 'Best {{category}} for Cannabis Dispensaries in {{year}}',
            descriptionTemplate: 'Honest comparison of the best {{category}} tools for cannabis dispensaries in {{year}}. Pros, cons, pricing, and our verdict.',
            keywordsTemplate: ['best {{category}} cannabis', 'dispensary {{category}} comparison', 'cannabis business tools {{year}}'],
        },
        minDataThreshold: 3,
        enabled: true,
        defaultAuthor: { id: 'agent:ezal', name: 'Ezal', role: 'Competitive Intel Agent' },
        seriesId: 'comparisons',
    },

    // ── Quarterly: State of the Stash ────────────────────────────────
    {
        id: 'state_of_stash_quarterly',
        name: 'State of the Stash Quarterly Report',
        category: 'market_report',
        contentType: 'report',
        frequency: 'quarterly',
        quarterlyDates: ['01-05', '04-05', '07-05', '10-05'],
        dataSource: 'combined',
        promptTemplate: `Write the "State of the Stash" quarterly cannabis market report for {{quarter}} {{year}}.

This is BakedBot's flagship data journalism piece — the report journalists and industry leaders reference.

Comprehensive market data:
{{dataContext}}

Structure:
1. **Executive Summary** — 3 key takeaways with numbers
2. **Market Size & Growth** — revenue trends, transaction volumes
3. **Pricing Analysis** — average prices by category, YoY changes
4. **Consumer Behavior** — basket sizes, popular categories, shopping patterns
5. **Competitive Dynamics** — market concentration, new entrants, exits
6. **Regulatory Landscape** — compliance changes, pending legislation
7. **Outlook & Predictions** — data-driven forecasts for next quarter

Use actual data. Include specific numbers. Format as authoritative industry report.
Target: ~2,000 words. Tone: Bloomberg-style data journalism.`,
        seoTemplate: {
            titleTemplate: 'State of the Stash: {{quarter}} {{year}} Cannabis Market Report',
            descriptionTemplate: 'Quarterly cannabis market analysis — pricing trends, consumer behavior, competitive dynamics, and outlook for {{quarter}} {{year}}.',
            keywordsTemplate: ['cannabis market report {{year}}', 'state of cannabis industry', 'dispensary market analysis', 'cannabis quarterly report'],
        },
        minDataThreshold: 10,
        enabled: true,
        defaultAuthor: { id: 'agent:pops', name: 'Pops', role: 'Analytics Agent' },
        seriesId: 'state_of_stash',
    },

    // ── Weekly: Trending Products ───────────────────────────────────
    {
        id: 'product_spotlight_trending',
        name: 'Trending Products Spotlight',
        category: 'product_spotlight',
        contentType: 'programmatic',
        frequency: 'weekly',
        dayOfWeek: 3, // Wednesday
        dataSource: 'pops',
        promptTemplate: `Write a trending products spotlight article for {{state}} cannabis market.

Trending product data:
{{dataContext}}

Structure:
1. **This Week's Top Movers** — products with highest velocity increase
2. **Category Breakdown** — what's hot in flower, vape, edible, etc.
3. **Staff Pick** — highlight one standout product with tasting notes
4. **New Arrivals Worth Trying** — recently added products gaining traction
5. **Sleeper Hit** — an underrated product that deserves attention

Use real product names and data. Be enthusiastic but honest.
Do NOT make medical claims or guarantee effects.
Target: ~700 words. Tone: excited product reviewer.`,
        seoTemplate: {
            titleTemplate: 'Trending Now: Top Cannabis Products in {{state}} — Week of {{date}}',
            descriptionTemplate: 'This week\'s hottest cannabis products in {{state}} — trending strains, top sellers, and new arrivals worth trying.',
            keywordsTemplate: ['trending cannabis products', 'best dispensary products {{state}}', 'top cannabis strains {{year}}', 'new cannabis products'],
        },
        minDataThreshold: 5,
        enabled: true,
        defaultAuthor: { id: 'agent:smokey', name: 'Smokey', role: 'AI Budtender' },
        seriesId: 'trending_products',
    },
];

// ============================================================================
// Template Helpers
// ============================================================================

/**
 * Get a template by ID
 */
export function getTemplate(templateId: string): ContentTemplate | undefined {
    return CONTENT_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get all enabled templates
 */
export function getEnabledTemplates(): ContentTemplate[] {
    return CONTENT_TEMPLATES.filter(t => t.enabled);
}

/**
 * Check if a template is due to run today
 */
export function isTemplateDueToday(template: ContentTemplate, now: Date = new Date()): boolean {
    switch (template.frequency) {
        case 'daily':
            return true;

        case 'weekly':
            return template.dayOfWeek !== undefined && now.getUTCDay() === template.dayOfWeek;

        case 'monthly':
            return template.dayOfMonth !== undefined && now.getUTCDate() === template.dayOfMonth;

        case 'quarterly': {
            if (!template.quarterlyDates) return false;
            const todayStr = `${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
            return template.quarterlyDates.includes(todayStr);
        }

        case 'on_change':
            // Triggered externally, not by scheduler
            return false;

        default:
            return false;
    }
}

/**
 * Fill template variables ({{var}}) with actual values
 */
export function fillTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
}

// ============================================================================
// Content Series (for cadence tracking)
// ============================================================================

export interface ContentSeries {
    id: string;
    name: string;
    targetFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
    templateIds: string[];
    category: BlogCategory;
    defaultAuthor?: string;
    enabled: boolean;
}

export const CONTENT_SERIES: ContentSeries[] = [
    {
        id: 'smokeys_corner',
        name: "Smokey's Corner",
        targetFrequency: 'weekly',
        templateIds: ['weekly_budtender_tips'],
        category: 'education',
        defaultAuthor: 'agent:smokey',
        enabled: true,
    },
    {
        id: 'market_trends',
        name: 'Market Intelligence',
        targetFrequency: 'monthly',
        templateIds: ['market_trends_state'],
        category: 'market_report',
        defaultAuthor: 'agent:pops',
        enabled: true,
    },
    {
        id: 'regulatory_alerts',
        name: 'Regulatory Alerts',
        targetFrequency: 'monthly', // target cadence even though triggered on_change
        templateIds: ['regulatory_alert'],
        category: 'regulatory_alert',
        defaultAuthor: 'agent:deebo',
        enabled: true,
    },
    {
        id: 'price_watch',
        name: 'Price Watch',
        targetFrequency: 'monthly',
        templateIds: ['price_watch'],
        category: 'market_report',
        defaultAuthor: 'agent:ezal',
        enabled: true,
    },
    {
        id: 'trending_products',
        name: 'Trending Products',
        targetFrequency: 'weekly',
        templateIds: ['product_spotlight_trending'],
        category: 'product_spotlight',
        defaultAuthor: 'agent:smokey',
        enabled: true,
    },
    {
        id: 'comparisons',
        name: 'Comparison Guides',
        targetFrequency: 'monthly',
        templateIds: ['best_of_category'],
        category: 'comparison',
        defaultAuthor: 'agent:ezal',
        enabled: true,
    },
    {
        id: 'state_of_stash',
        name: 'State of the Stash',
        targetFrequency: 'quarterly',
        templateIds: ['state_of_stash_quarterly'],
        category: 'market_report',
        defaultAuthor: 'agent:pops',
        enabled: true,
    },
];
