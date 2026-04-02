/**
 * Content Freshness Audit Service
 *
 * Runs daily (via cron) or on-demand (via npm script).
 * Scans every customer-facing content surface, scores freshness,
 * and returns a structured report that can be sent to Slack or stored.
 *
 * Data sources:
 *   1. Content Registry — static pages (homepage, pricing, case studies, etc.)
 *   2. Help Article Index — 60+ MDX articles with lastUpdated dates
 *   3. Blog posts — queried from Firestore (published posts per org)
 */

import { logger } from '@/lib/logger';
import {
    contentRegistry,
    generateFreshnessReport,
    formatReportForSlack,
    type FreshnessReport,
    type ContentEntry,
} from '@/lib/config/content-registry';
import { articles } from '@/content/help/_index';

// ---------------------------------------------------------------------------
// Help article date extraction
// ---------------------------------------------------------------------------

function getHelpArticleDates(): Record<string, string> {
    const dates: Record<string, string> = {};
    for (const [key, meta] of Object.entries(articles)) {
        dates[key] = meta.lastUpdated;
    }
    return dates;
}

// ---------------------------------------------------------------------------
// Blog freshness (Firestore-backed)
// ---------------------------------------------------------------------------

interface BlogFreshnessSummary {
    totalPublished: number;
    lastPublishedAt: string | null;
    daysSinceLastPost: number | null;
}

async function getBlogFreshness(): Promise<BlogFreshnessSummary> {
    try {
        const { getFirestore } = await import('firebase-admin/firestore');
        const db = getFirestore();

        // Check the platform blog (bakedbot's own blog)
        const snapshot = await db
            .collection('orgs/org_bakedbot/blog_posts')
            .where('status', '==', 'published')
            .orderBy('publishedAt', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { totalPublished: 0, lastPublishedAt: null, daysSinceLastPost: null };
        }

        const countSnap = await db
            .collection('orgs/org_bakedbot/blog_posts')
            .where('status', '==', 'published')
            .count()
            .get();

        const latestPost = snapshot.docs[0].data();
        const publishedAt = latestPost.publishedAt?.toDate?.()
            ?? new Date(latestPost.publishedAt);
        const daysSince = Math.floor(
            (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
            totalPublished: countSnap.data().count,
            lastPublishedAt: publishedAt.toISOString(),
            daysSinceLastPost: daysSince,
        };
    } catch (error) {
        logger.warn('[ContentFreshnessAudit] Could not query blog freshness', {
            error: error instanceof Error ? error.message : String(error),
        });
        return { totalPublished: 0, lastPublishedAt: null, daysSinceLastPost: null };
    }
}

// ---------------------------------------------------------------------------
// Main audit
// ---------------------------------------------------------------------------

export interface ContentFreshnessAuditResult {
    report: FreshnessReport;
    blog: BlogFreshnessSummary;
    slackMessage: string;
}

export async function runContentFreshnessAudit(): Promise<ContentFreshnessAuditResult> {
    const startTime = Date.now();
    logger.info('[ContentFreshnessAudit] Starting audit');

    const now = new Date();

    // 1. Gather help article dates
    const helpDates = getHelpArticleDates();

    // 2. Generate the core report (registry + help articles)
    const report = generateFreshnessReport(contentRegistry, helpDates, now);

    // 3. Check blog freshness
    const blog = await getBlogFreshness();

    // 4. Format for Slack
    let slackMessage = formatReportForSlack(report);

    // Append blog cadence section
    if (blog.daysSinceLastPost !== null) {
        const blogStatus = blog.daysSinceLastPost > 14
            ? ':warning: Blog is going cold'
            : ':white_check_mark: Blog is active';
        slackMessage += '\n\n*Blog Publishing Cadence*\n';
        slackMessage += `${blogStatus} — last post ${blog.daysSinceLastPost}d ago (${blog.totalPublished} total published)`;
    }

    const durationMs = Date.now() - startTime;
    logger.info('[ContentFreshnessAudit] Audit complete', {
        totalPages: report.totalPages,
        critical: report.summary.critical,
        stale: report.summary.stale,
        aging: report.summary.aging,
        fresh: report.summary.fresh,
        durationMs,
    });

    return { report, blog, slackMessage };
}
