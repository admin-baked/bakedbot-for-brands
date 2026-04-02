/**
 * Content Registry — Single source of truth for all customer-facing content surfaces.
 *
 * Each entry tracks:
 *   - what the content is (path, title, category)
 *   - when it was last verified as accurate
 *   - which feature areas it covers (so code changes can flag stale docs)
 *   - staleness thresholds
 *
 * The daily content-freshness-audit cron reads this registry, scores every
 * surface, and reports what needs attention.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentCategory =
    | 'homepage'
    | 'pricing'
    | 'onboarding'
    | 'help'
    | 'blog'
    | 'case-study'
    | 'comparison'
    | 'legal'
    | 'lead-magnet'
    | 'data'
    | 'marketing';

export type FreshnessLevel = 'fresh' | 'aging' | 'stale' | 'critical';

export interface ContentEntry {
    /** Unique key — usually the route path */
    id: string;
    /** Human-readable title */
    title: string;
    /** Content category for grouping in reports */
    category: ContentCategory;
    /** File path(s) that own this content (relative to repo root) */
    sourcePaths: string[];
    /** Date when content was last verified as accurate (YYYY-MM-DD) */
    lastVerified: string;
    /** Feature areas this content documents — used to detect drift when code ships */
    featureTags: string[];
    /** Max days before content is "aging" (default 30) */
    agingThresholdDays?: number;
    /** Max days before content is "stale" (default 60) */
    staleThresholdDays?: number;
    /** Max days before content is "critical" (default 90) */
    criticalThresholdDays?: number;
    /** Owner responsible for updating (team or agent) */
    owner?: string;
    /** Whether this is a high-traffic / high-impact page */
    highImpact?: boolean;
}

export interface FreshnessScore {
    entry: ContentEntry;
    level: FreshnessLevel;
    daysSinceVerified: number;
    /** Suggested action */
    action: string;
}

export interface FreshnessReport {
    generatedAt: string;
    totalPages: number;
    summary: Record<FreshnessLevel, number>;
    scores: FreshnessScore[];
    /** Pages sorted worst-first */
    actionItems: FreshnessScore[];
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const DEFAULT_AGING_DAYS = 30;
const DEFAULT_STALE_DAYS = 60;
const DEFAULT_CRITICAL_DAYS = 90;

// High-impact pages get tighter thresholds
const HIGH_IMPACT_AGING_DAYS = 14;
const HIGH_IMPACT_STALE_DAYS = 30;
const HIGH_IMPACT_CRITICAL_DAYS = 45;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const contentRegistry: ContentEntry[] = [
    // ── Homepage & Core Marketing ──────────────────────────────────────
    {
        id: '/',
        title: 'Homepage',
        category: 'homepage',
        sourcePaths: ['src/app/page.tsx', 'src/components/landing/'],
        lastVerified: '2026-02-05',
        featureTags: ['landing', 'hero', 'value-prop', 'agent-squad'],
        owner: 'marketing',
        highImpact: true,
    },
    {
        id: '/pricing',
        title: 'Pricing Page',
        category: 'pricing',
        sourcePaths: ['src/app/pricing/page.tsx', 'src/lib/config/pricing.ts', 'src/lib/config/pricing-copy.json'],
        lastVerified: '2026-02-22',
        featureTags: ['pricing', 'plans', 'tiers', 'billing'],
        owner: 'marketing',
        highImpact: true,
    },
    {
        id: '/pricing/launch',
        title: 'Launch Pricing Page',
        category: 'pricing',
        sourcePaths: ['src/app/pricing/launch/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['pricing', 'launch'],
        owner: 'marketing',
    },
    {
        id: '/get-started',
        title: 'Get Started / Plan Selection',
        category: 'onboarding',
        sourcePaths: ['src/app/get-started/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['onboarding', 'plan-selection', 'pricing'],
        owner: 'marketing',
        highImpact: true,
    },

    // ── Onboarding ─────────────────────────────────────────────────────
    {
        id: '/onboarding',
        title: 'Onboarding Flow',
        category: 'onboarding',
        sourcePaths: ['src/app/onboarding/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['onboarding', 'signup', 'setup-wizard'],
        owner: 'product',
        highImpact: true,
    },
    {
        id: '/onboarding/passport',
        title: 'Onboarding Passport',
        category: 'onboarding',
        sourcePaths: ['src/app/onboarding/passport/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['onboarding', 'passport'],
        owner: 'product',
    },

    // ── Comparison Pages ───────────────────────────────────────────────
    {
        id: '/vs-leafly',
        title: 'BakedBot vs Leafly',
        category: 'comparison',
        sourcePaths: ['src/app/vs-leafly/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['comparison', 'leafly', 'marketplace'],
        owner: 'marketing',
        highImpact: true,
    },
    {
        id: '/vs-alpine-iq',
        title: 'BakedBot vs Alpine IQ',
        category: 'comparison',
        sourcePaths: ['src/app/vs-alpine-iq/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['comparison', 'alpine-iq'],
        owner: 'marketing',
    },
    {
        id: '/vs-springbig',
        title: 'BakedBot vs Springbig',
        category: 'comparison',
        sourcePaths: ['src/app/vs-springbig/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['comparison', 'springbig'],
        owner: 'marketing',
    },
    {
        id: '/vs-terpli',
        title: 'BakedBot vs Terpli',
        category: 'comparison',
        sourcePaths: ['src/app/vs-terpli/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['comparison', 'terpli'],
        owner: 'marketing',
    },

    // ── Case Studies ───────────────────────────────────────────────────
    {
        id: '/case-studies',
        title: 'Case Studies Index',
        category: 'case-study',
        sourcePaths: ['src/app/case-studies/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['case-studies', 'social-proof'],
        owner: 'marketing',
        highImpact: true,
    },
    {
        id: '/case-studies/ultra-cannabis',
        title: 'Case Study: Ultra Cannabis',
        category: 'case-study',
        sourcePaths: ['src/app/case-studies/ultra-cannabis/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['case-studies', 'seo', 'smokey'],
        owner: 'marketing',
    },
    {
        id: '/case-studies/zaza-factory',
        title: 'Case Study: Zaza Factory',
        category: 'case-study',
        sourcePaths: ['src/app/case-studies/zaza-factory/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['case-studies', 'marketing', 'craig'],
        owner: 'marketing',
    },

    // ── Lead Magnets & Tools ───────────────────────────────────────────
    {
        id: '/free-audit',
        title: 'Free SEO & Compliance Audit',
        category: 'lead-magnet',
        sourcePaths: ['src/app/free-audit/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['lead-magnet', 'seo', 'compliance', 'audit'],
        owner: 'marketing',
    },
    {
        id: '/ny/caurd-grant',
        title: 'NY CAURD Grant Resource',
        category: 'lead-magnet',
        sourcePaths: ['src/app/ny/caurd-grant/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['ny', 'caurd', 'compliance'],
        owner: 'marketing',
    },
    {
        id: '/ny/roi-calculator',
        title: 'NY ROI Calculator',
        category: 'lead-magnet',
        sourcePaths: ['src/app/ny/roi-calculator/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['ny', 'roi', 'calculator'],
        owner: 'marketing',
    },
    {
        id: '/contact',
        title: 'Contact Page',
        category: 'marketing',
        sourcePaths: ['src/app/contact/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['contact', 'support'],
        owner: 'marketing',
    },

    // ── Data / Research ────────────────────────────────────────────────
    {
        id: '/data',
        title: 'Cannabis Industry Data Hub',
        category: 'data',
        sourcePaths: ['src/app/data/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['data', 'research', 'datasets'],
        owner: 'product',
    },

    // ── Legal ──────────────────────────────────────────────────────────
    {
        id: '/privacy-policy',
        title: 'Privacy Policy',
        category: 'legal',
        sourcePaths: ['src/app/privacy-policy/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['legal', 'privacy'],
        owner: 'legal',
        // Legal pages have longer thresholds
        agingThresholdDays: 90,
        staleThresholdDays: 180,
        criticalThresholdDays: 365,
    },
    {
        id: '/terms',
        title: 'Terms of Service',
        category: 'legal',
        sourcePaths: ['src/app/terms/page.tsx'],
        lastVerified: '2026-02-05',
        featureTags: ['legal', 'terms'],
        owner: 'legal',
        agingThresholdDays: 90,
        staleThresholdDays: 180,
        criticalThresholdDays: 365,
    },
];

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function daysBetween(dateStr: string, now: Date): number {
    const d = new Date(dateStr + 'T00:00:00Z');
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function scoreFreshness(entry: ContentEntry, now: Date = new Date()): FreshnessScore {
    const days = daysBetween(entry.lastVerified, now);

    const aging = entry.highImpact
        ? (entry.agingThresholdDays ?? HIGH_IMPACT_AGING_DAYS)
        : (entry.agingThresholdDays ?? DEFAULT_AGING_DAYS);
    const stale = entry.highImpact
        ? (entry.staleThresholdDays ?? HIGH_IMPACT_STALE_DAYS)
        : (entry.staleThresholdDays ?? DEFAULT_STALE_DAYS);
    const critical = entry.highImpact
        ? (entry.criticalThresholdDays ?? HIGH_IMPACT_CRITICAL_DAYS)
        : (entry.criticalThresholdDays ?? DEFAULT_CRITICAL_DAYS);

    let level: FreshnessLevel;
    let action: string;

    if (days >= critical) {
        level = 'critical';
        action = `URGENT: ${days} days without review. Verify accuracy immediately.`;
    } else if (days >= stale) {
        level = 'stale';
        action = `Stale: ${days} days old. Schedule review this week.`;
    } else if (days >= aging) {
        level = 'aging';
        action = `Aging: ${days} days old. Review within 2 weeks.`;
    } else {
        level = 'fresh';
        action = `Fresh: verified ${days} days ago.`;
    }

    return { entry, level, daysSinceVerified: days, action };
}

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

export function generateFreshnessReport(
    entries: ContentEntry[],
    helpArticleDates?: Record<string, string>,
    now: Date = new Date(),
): FreshnessReport {
    const scores: FreshnessScore[] = [];

    // Score registry entries
    for (const entry of entries) {
        scores.push(scoreFreshness(entry, now));
    }

    // Score help articles (from _index.ts lastUpdated dates)
    if (helpArticleDates) {
        for (const [articleKey, lastUpdated] of Object.entries(helpArticleDates)) {
            const helpEntry: ContentEntry = {
                id: `/help/${articleKey}`,
                title: `Help: ${articleKey}`,
                category: 'help',
                sourcePaths: [`src/content/help/${articleKey}.mdx`],
                lastVerified: lastUpdated,
                featureTags: ['help', articleKey.split('/')[0]],
                owner: 'docs',
            };
            scores.push(scoreFreshness(helpEntry, now));
        }
    }

    // Summarize
    const summary: Record<FreshnessLevel, number> = {
        fresh: 0,
        aging: 0,
        stale: 0,
        critical: 0,
    };
    for (const s of scores) {
        summary[s.level]++;
    }

    // Action items: everything that isn't fresh, sorted worst-first
    const actionItems = scores
        .filter(s => s.level !== 'fresh')
        .sort((a, b) => b.daysSinceVerified - a.daysSinceVerified);

    return {
        generatedAt: now.toISOString(),
        totalPages: scores.length,
        summary,
        scores,
        actionItems,
    };
}

// ---------------------------------------------------------------------------
// Slack-friendly report formatter
// ---------------------------------------------------------------------------

export function formatReportForSlack(report: FreshnessReport): string {
    const { summary, actionItems } = report;
    const lines: string[] = [];

    lines.push('*Content Freshness Audit*');
    lines.push(`_Generated ${new Date(report.generatedAt).toLocaleDateString()}_`);
    lines.push('');
    lines.push(`Total pages tracked: *${report.totalPages}*`);
    lines.push(
        `:white_check_mark: Fresh: ${summary.fresh}  |  ` +
        `:hourglass: Aging: ${summary.aging}  |  ` +
        `:warning: Stale: ${summary.stale}  |  ` +
        `:rotating_light: Critical: ${summary.critical}`
    );

    if (actionItems.length === 0) {
        lines.push('');
        lines.push(':tada: All content is fresh! No action needed.');
        return lines.join('\n');
    }

    // Group by level
    const critical = actionItems.filter(i => i.level === 'critical');
    const stale = actionItems.filter(i => i.level === 'stale');
    const aging = actionItems.filter(i => i.level === 'aging');

    if (critical.length > 0) {
        lines.push('');
        lines.push(`:rotating_light: *Critical (${critical.length})*`);
        for (const item of critical.slice(0, 10)) {
            lines.push(`  • \`${item.entry.id}\` — ${item.daysSinceVerified}d old (${item.entry.category})`);
        }
        if (critical.length > 10) lines.push(`  _...and ${critical.length - 10} more_`);
    }

    if (stale.length > 0) {
        lines.push('');
        lines.push(`:warning: *Stale (${stale.length})*`);
        for (const item of stale.slice(0, 10)) {
            lines.push(`  • \`${item.entry.id}\` — ${item.daysSinceVerified}d old (${item.entry.category})`);
        }
        if (stale.length > 10) lines.push(`  _...and ${stale.length - 10} more_`);
    }

    if (aging.length > 0) {
        lines.push('');
        lines.push(`:hourglass: *Aging (${aging.length})*`);
        for (const item of aging.slice(0, 10)) {
            lines.push(`  • \`${item.entry.id}\` — ${item.daysSinceVerified}d old (${item.entry.category})`);
        }
        if (aging.length > 10) lines.push(`  _...and ${aging.length - 10} more_`);
    }

    return lines.join('\n');
}
