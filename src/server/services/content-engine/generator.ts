/**
 * Content Engine — Generator Service
 *
 * Generates blog posts from templates using live data from agent sources.
 * Flow: template → gather data → fill prompt → AI generate → compliance check → save
 */

import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { generateBlogDraft, type BlogGeneratorInput } from '@/server/services/blog-generator';
import { checkBlogCompliance } from '@/server/services/blog-compliance';
import { createBlogPostInternal } from '@/server/actions/blog';
import type { BlogPost, BlogContentType } from '@/types/blog';
import {
    type ContentTemplate,
    getTemplate,
    fillTemplate,
} from './templates';

const PLATFORM_ORG_ID = 'org_bakedbot_platform';

// ============================================================================
// Data Gathering Functions
// ============================================================================

/**
 * Gather data from the appropriate agent source for a template
 */
async function gatherDataForTemplate(
    template: ContentTemplate,
    variables: Record<string, string>
): Promise<Record<string, unknown>> {
    const db = getAdminFirestore();

    try {
        switch (template.dataSource) {
            case 'ezal': {
                // Fetch competitive intel data scoped to the requesting org.
                // competitors live at tenants/{orgId}/competitors — use a direct
                // path when orgId is available to avoid cross-tenant exposure.
                const ezalOrgId = variables.orgId;
                const competitorsSnap = ezalOrgId
                    ? await db
                        .collection('tenants').doc(ezalOrgId)
                        .collection('competitors').limit(50)
                        .get()
                    : await db.collectionGroup('competitors').limit(50).get();

                const competitors = competitorsSnap.docs.map(d => ({
                    name: d.data().name,
                    priceRange: d.data().priceRange,
                    categories: d.data().categories,
                    lastUpdated: d.data().lastUpdated,
                }));

                return {
                    competitors,
                    competitorCount: competitors.length,
                    region: variables.region || variables.state || 'NY',
                };
            }

            case 'pops': {
                // Fetch trending products and analytics
                const state = variables.state || 'NY';
                const productsSnap = await db
                    .collection('tenants')
                    .doc(PLATFORM_ORG_ID)
                    .collection('blog_posts')
                    .where('category', '==', 'product_spotlight')
                    .orderBy('publishedAt', 'desc')
                    .limit(5)
                    .get();

                // Get trending products from any org with recent sales data
                const orgsSnap = await db.collection('organizations')
                    .where('state', '==', state)
                    .limit(10)
                    .get();

                const trendingProducts: Record<string, unknown>[] = [];
                for (const orgDoc of orgsSnap.docs) {
                    const productsQuery = await db
                        .collection('tenants')
                        .doc(orgDoc.id)
                        .collection('publicViews')
                        .doc('products')
                        .collection('items')
                        .where('trending', '==', true)
                        .limit(10)
                        .get();

                    for (const pDoc of productsQuery.docs) {
                        trendingProducts.push({
                            name: pDoc.data().name,
                            category: pDoc.data().category,
                            price: pDoc.data().price,
                            strainType: pDoc.data().strainType,
                            brandName: pDoc.data().brandName,
                        });
                    }
                }

                return {
                    recentArticles: productsSnap.docs.map(d => d.data().title),
                    trendingProducts: trendingProducts.slice(0, 20),
                    state,
                };
            }

            case 'money_mike': {
                // Fetch financial benchmarks
                const benchmarksSnap = await db
                    .collection('market_benchmarks')
                    .orderBy('updatedAt', 'desc')
                    .limit(1)
                    .get();

                const benchmarks = benchmarksSnap.empty ? {} : benchmarksSnap.docs[0].data();

                return {
                    benchmarks,
                    state: variables.state || 'NY',
                };
            }

            case 'deebo': {
                // Fetch regulatory data
                const state = variables.state || 'NY';
                const regulationSnap = await db
                    .collection('regulation_snapshots')
                    .where('state', '==', state)
                    .orderBy('checkedAt', 'desc')
                    .limit(3)
                    .get();

                const regulations = regulationSnap.docs.map(d => ({
                    state: d.data().state,
                    contentHash: d.data().contentHash,
                    checkedAt: d.data().checkedAt?.toDate?.()?.toISOString(),
                    changeDetected: d.data().changeDetected,
                    summary: d.data().summary,
                }));

                return {
                    regulations,
                    state,
                    change_summary: variables.change_summary || 'Recent regulatory updates',
                };
            }

            case 'smokey': {
                // Fetch product knowledge for budtender tips
                const state = variables.state || 'NY';
                const orgsSnap = await db.collection('organizations')
                    .where('state', '==', state)
                    .limit(5)
                    .get();

                const popularProducts: Record<string, unknown>[] = [];
                for (const orgDoc of orgsSnap.docs) {
                    const productsQuery = await db
                        .collection('tenants')
                        .doc(orgDoc.id)
                        .collection('publicViews')
                        .doc('products')
                        .collection('items')
                        .orderBy('salesCount', 'desc')
                        .limit(5)
                        .get();

                    for (const pDoc of productsQuery.docs) {
                        popularProducts.push({
                            name: pDoc.data().name,
                            category: pDoc.data().category,
                            price: pDoc.data().price,
                            strainType: pDoc.data().strainType,
                            thcPercent: pDoc.data().thcPercent,
                            effects: pDoc.data().effects,
                        });
                    }
                }

                return {
                    popularProducts: popularProducts.slice(0, 15),
                    state,
                    topic: variables.topic || 'cannabis tips',
                };
            }

            case 'combined': {
                // Fetch from multiple sources
                const state = variables.state || 'NY';
                const combinedOrgId = variables.orgId;

                const [competitorsSnap, benchmarksSnap] = await Promise.all([
                    combinedOrgId
                        ? db.collection('tenants').doc(combinedOrgId).collection('competitors').limit(20).get()
                        : db.collectionGroup('competitors').limit(20).get(),
                    db.collection('market_benchmarks').orderBy('updatedAt', 'desc').limit(1).get(),
                ]);

                return {
                    competitors: competitorsSnap.docs.map(d => ({
                        name: d.data().name,
                        priceRange: d.data().priceRange,
                    })),
                    benchmarks: benchmarksSnap.empty ? {} : benchmarksSnap.docs[0].data(),
                    state,
                };
            }

            default:
                return {};
        }
    } catch (error) {
        logger.warn('[ContentEngine:gatherData] Failed to gather data', {
            templateId: template.id,
            dataSource: template.dataSource,
            error: String(error),
        });
        return {};
    }
}

// ============================================================================
// Topic Generators
// ============================================================================

const SMOKEYS_CORNER_TOPICS = [
    'Understanding Terpenes: Why Your Cannabis Smells Like Pine',
    'Indica vs Sativa: Does It Really Matter?',
    'How to Read a Cannabis Label Like a Pro',
    'Microdosing 101: Finding Your Sweet Spot',
    'The Best Cannabis Storage Tips for Freshness',
    'Edibles vs Flower: Choosing the Right Consumption Method',
    'Cannabis and Cooking: Beginner-Friendly Recipes',
    'What Your Budtender Wishes You Knew',
    'Understanding THC Percentages: Higher Isn\'t Always Better',
    'The Rise of Cannabis Beverages: What to Know',
    'Pre-Rolls vs Rolling Your Own: A Complete Guide',
    'CBD vs THC: Understanding the Difference',
];

function pickWeeklyTopic(templateId: string): string {
    if (templateId === 'weekly_budtender_tips') {
        const weekOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        return SMOKEYS_CORNER_TOPICS[weekOfYear % SMOKEYS_CORNER_TOPICS.length];
    }
    return 'Cannabis Industry Insights';
}

// ============================================================================
// Main Generation Function
// ============================================================================

/**
 * Generate a blog post from a content template
 */
export async function generateFromTemplate(
    templateId: string,
    variables: Record<string, string> = {},
    overrideData?: Record<string, unknown>
): Promise<{ postId: string; slug: string; title: string; status: string } | null> {
    const template = getTemplate(templateId);
    if (!template) {
        logger.error('[ContentEngine:generate] Template not found', { templateId });
        return null;
    }

    const now = new Date();
    const defaultVars: Record<string, string> = {
        month: now.toLocaleString('en-US', { month: 'long' }),
        year: String(now.getFullYear()),
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        state: 'NY',
        region: 'New York',
        topic: pickWeeklyTopic(templateId),
    };
    const mergedVars = { ...defaultVars, ...variables };

    logger.info('[ContentEngine:generate] Starting generation', {
        templateId,
        category: template.category,
        variables: mergedVars,
    });

    try {
        // 1. Gather data from agent source
        const rawData = overrideData || await gatherDataForTemplate(template, mergedVars);

        // Check minimum data threshold
        const dataPointCount = Object.values(rawData).reduce<number>((count, val) => {
            if (Array.isArray(val)) return count + val.length;
            if (val && typeof val === 'object') return count + Object.keys(val as object).length;
            return count + (val ? 1 : 0);
        }, 0);

        if (template.minDataThreshold && dataPointCount < template.minDataThreshold) {
            logger.warn('[ContentEngine:generate] Insufficient data, skipping', {
                templateId,
                dataPointCount,
                threshold: template.minDataThreshold,
            });
            return null;
        }

        // 2. Build prompt with template + data
        const dataContext = JSON.stringify(rawData, null, 2).substring(0, 8000);
        const filledPrompt = fillTemplate(template.promptTemplate, {
            ...mergedVars,
            dataContext,
        });

        // 3. Generate blog draft via AI
        const generatorInput: BlogGeneratorInput = {
            topic: fillTemplate(template.seoTemplate.titleTemplate, mergedVars),
            category: template.category,
            tone: 'professional',
            length: template.contentType === 'report' ? 'long' : 'medium',
            seoKeywords: template.seoTemplate.keywordsTemplate.map(k => fillTemplate(k, mergedVars)),
            orgId: PLATFORM_ORG_ID,
            userId: template.defaultAuthor?.id || 'agent:craig',
            outline: filledPrompt,
        };

        const draft = await generateBlogDraft(generatorInput);

        // 4. Run compliance check (Deebo gate)
        const compliance = await checkBlogCompliance({
            title: draft.title,
            content: draft.content,
            category: template.category,
            status: 'draft',
        } as any).catch((err: unknown) => {
            logger.warn('[ContentEngine:generate] Compliance check failed', { error: String(err) });
            return null;
        });
        const compliancePassed = !compliance || compliance.status !== 'failed';

        // 5. Save to Firestore
        const post = await createBlogPostInternal({
            orgId: PLATFORM_ORG_ID,
            title: draft.title,
            subtitle: draft.subtitle,
            excerpt: draft.excerpt,
            content: draft.content,
            category: template.category,
            tags: draft.tags,
            seoKeywords: draft.seoKeywords,
            createdBy: template.defaultAuthor?.id || 'agent:craig',
            author: template.defaultAuthor || { id: 'agent:craig', name: 'Craig', role: 'AI Content Strategist' },
            status: compliancePassed ? 'approved' : 'pending_review',
            generatedBy: 'programmatic_cron',
            contentType: template.contentType,
            templateId: template.id,
            dataSnapshot: rawData,
        });

        logger.info('[ContentEngine:generate] Post created', {
            templateId,
            postId: post.id,
            title: post.title,
            status: post.status,
            complianceStatus: compliance?.status || 'skipped',
        });

        return {
            postId: post.id,
            slug: post.slug,
            title: post.title,
            status: post.status,
        };
    } catch (error) {
        logger.error('[ContentEngine:generate] Failed', {
            templateId,
            error: String(error),
        });
        return null;
    }
}
