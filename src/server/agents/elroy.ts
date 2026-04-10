/**
 * Uncle Elroy — Store Operations Advisor, Thrive Syracuse
 *
 * Warm, street-smart ops advisor who knows Thrive's customers, inventory,
 * and competition inside-out. Lives in #thrive-syracuse-pilot and answers
 * questions from store managers in real-time.
 *
 * Hardwired to org_thrive_syracuse — not a general-purpose agent.
 *
 * Tools:
 * - get_at_risk_customers   — who needs outreach today
 * - get_customer_segments   — active/loyal/at-risk counts
 * - get_today_checkins      — foot traffic so far today
 * - get_menu_inventory      — live Alleaves menu snapshot
 * - get_competitor_intel    — latest weekly intel from Ezal
 * - search_customer         — look up a customer by name or phone
 * - discovery_browser_automate — browse Weedmaps/AIQ/WordPress/competitor sites
 * - discovery_fill_form     — fill forms on external sites (deals, campaigns, WP content)
 * - discovery_extract_data  — extract structured data from any webpage
 * - discovery_summarize_page — quick page summary
 */

import { executeWithTools, isClaudeAvailable, ClaudeTool, ClaudeResult, AgentContext } from '@/ai/claude';
import { executeGLMWithTools, GLM_MODELS, isGLMConfigured } from '@/ai/glm';
import { executeGeminiFlashWithTools, isGeminiFlashConfigured } from '@/ai/gemini-flash-tools';
import { getAgentModelConfig, type ModelTier } from '@/server/services/agent-model-config';
import { logger } from '@/lib/logger';
import { getAtRiskCustomers, getSegmentSummary, getTodayCheckins } from '@/server/tools/crm-tools';
import { getLatestWeeklyReport } from '@/server/services/ezal/weekly-intel-report';
import { fetchMenuProducts, normalizeProduct } from '@/server/agents/adapters/consumer-adapter';
import { getAdminFirestore } from '@/firebase/admin';
import { discovery } from '@/server/services/firecrawl';
import { withCache, CachePrefix, CacheTTL } from '@/lib/cache';
import {
    getUpcomingHolidays,
    fetchCompetitorHolidayHours,
    formatHoursForSlack,
    SYRACUSE_COMPETITORS,
} from '@/server/services/holiday-hours';

const ORG_ID = 'org_thrive_syracuse';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const ELROY_TOOLS: ClaudeTool[] = [
    {
        name: 'get_at_risk_customers',
        description: 'Return the top at-risk customers for Thrive Syracuse who need outreach. Includes name, days inactive, lifetime value, and risk tier.',
        input_schema: {
            type: 'object' as const,
            properties: {
                limit: {
                    type: 'number',
                    description: 'Max number of customers to return (default 10)',
                },
            },
            required: [],
        },
    },
    {
        name: 'get_customer_segments',
        description: 'Return a summary of Thrive Syracuse customer segments: how many are active, loyal, at-risk, dormant, and total.',
        input_schema: {
            type: 'object' as const,
            properties: {},
            required: [],
        },
    },
    {
        name: 'get_today_checkins',
        description: 'Return the number of customer check-ins at Thrive Syracuse so far today.',
        input_schema: {
            type: 'object' as const,
            properties: {},
            required: [],
        },
    },
    {
        name: 'get_menu_inventory',
        description: 'Return the current Thrive Syracuse menu from Alleaves. Includes product names, categories, prices, and stock levels.',
        input_schema: {
            type: 'object' as const,
            properties: {
                category: {
                    type: 'string',
                    description: 'Optional: filter by category (e.g. "flower", "edibles", "vapes")',
                },
            },
            required: [],
        },
    },
    {
        name: 'get_competitor_intel',
        description: 'Return the latest competitor intelligence report for the Syracuse market. Includes top deals, pricing gaps, and market trends.',
        input_schema: {
            type: 'object' as const,
            properties: {},
            required: [],
        },
    },
    {
        name: 'search_customer',
        description: 'Look up a specific customer by name or phone number. Returns their visit history, lifetime value, segment, and retention score.',
        input_schema: {
            type: 'object' as const,
            properties: {
                query: {
                    type: 'string',
                    description: 'Customer name (partial match OK) or phone number',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'run_competitive_agent',
        description: 'Run a live Firecrawl AI agent to research real-time competitor data in the Syracuse cannabis market. Use when you need fresher intel than the cached weekly report — e.g. current pricing, active deals, new products at FlnnStoned or other local dispensaries.',
        input_schema: {
            type: 'object' as const,
            properties: {
                query: {
                    type: 'string',
                    description: 'What to research, e.g. "What are FlnnStoned\'s current flower prices?" or "Any dispensary promotions in Syracuse this week?"',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'get_daily_sales',
        description: 'Return today\'s sales figures for Thrive Syracuse: total revenue, transaction count, and average ticket size.',
        input_schema: {
            type: 'object' as const,
            properties: {},
            required: [],
        },
    },
    {
        name: 'get_top_sellers',
        description: 'Return the top-selling products at Thrive Syracuse over the last 7 days, ranked by units sold.',
        input_schema: {
            type: 'object' as const,
            properties: {
                limit: {
                    type: 'number',
                    description: 'Number of products to return (default 10)',
                },
            },
            required: [],
        },
    },
    {
        name: 'get_recent_transactions',
        description: 'Return the most recent customer transactions at Thrive Syracuse with items and totals.',
        input_schema: {
            type: 'object' as const,
            properties: {
                limit: {
                    type: 'number',
                    description: 'Number of transactions to return (default 20)',
                },
            },
            required: [],
        },
    },
    {
        name: 'get_sales_summary',
        description: 'Return a sales comparison for Thrive Syracuse: today vs yesterday vs 7-day average. Useful for spotting slow/busy days.',
        input_schema: {
            type: 'object' as const,
            properties: {},
            required: [],
        },
    },

    {
        name: 'get_competitor_holiday_hours',
        description: 'Fetch current or holiday hours for nearby Syracuse dispensary competitors using Google Places. Use when someone asks about competitor hours around a holiday, or to proactively flag any closures before a holiday.',
        input_schema: {
            type: 'object' as const,
            properties: {
                holiday: {
                    type: 'string',
                    description: 'Optional: name of the holiday to check (e.g. "Easter", "Memorial Day"). Leave blank to check all upcoming holidays.',
                },
            },
            required: [],
        },
    },

    // ---- RTRVR Browser Automation (Weedmaps, AIQ, external sites) ----
    {
        name: 'ask_opencode',
        description: 'Delegate a coding or technical analysis task to the BakedBot AI coding agent (SP13). Use this when you need to generate code, write a Firestore query, analyze a data structure, or answer a technical question that goes beyond your store-ops tools. Responds in seconds using Gemini Flash.',
        input_schema: {
            type: 'object' as const,
            properties: {
                prompt: {
                    type: 'string',
                    description: 'The coding or technical task to delegate. Be specific — include context about what the output should do.',
                },
                model: {
                    type: 'string',
                    description: 'Optional model override. Defaults to google/gemini-2.0-flash. Use anthropic/claude-sonnet-4-6 for complex multi-file analysis.',
                },
            },
            required: ['prompt'],
        },
    },
    {
        name: 'discovery_browser_automate',
        description: 'Execute a browser automation task on external sites (Weedmaps, AIQ, competitor sites). Navigate pages, click buttons, extract data. Use for reading deals, checking listings, or gathering competitive intel.',
        input_schema: {
            type: 'object' as const,
            properties: {
                input: { type: 'string', description: 'Detailed instruction for the browser agent (e.g., "Go to weedmaps.com/dispensaries/thrive-syracuse, extract all current deals")' },
                urls: { type: 'array', items: { type: 'string' }, description: 'URLs to open initially' },
                verbosity: { type: 'string', enum: ['final', 'steps', 'debug'], description: 'Output verbosity (default: final)' },
            },
            required: ['input'],
        },
    },
    {
        name: 'discovery_fill_form',
        description: 'Fill and optionally submit a form on an external site (Weedmaps deal creator, AIQ campaign builder, etc.). IMPORTANT: This performs a real action on a live site — always confirm details with the user before calling.',
        input_schema: {
            type: 'object' as const,
            properties: {
                url: { type: 'string', description: 'URL of the page with the form' },
                formData: { type: 'object', description: 'Key-value mapping of form field labels/names to values' },
                submitButtonText: { type: 'string', description: 'Text of the submit button to click after filling. Omit to fill without submitting.' },
            },
            required: ['url', 'formData'],
        },
    },
    {
        name: 'discovery_extract_data',
        description: 'Extract structured data from a webpage using natural language instructions. Use for pulling deals, prices, or listings from Weedmaps, AIQ, or competitor sites.',
        input_schema: {
            type: 'object' as const,
            properties: {
                url: { type: 'string', description: 'URL to extract data from' },
                instruction: { type: 'string', description: 'What to extract (e.g., "Extract all active deals with title, discount, and expiry date")' },
                schema: { type: 'object', description: 'Optional JSON schema for the expected output shape' },
            },
            required: ['url', 'instruction'],
        },
    },
    {
        name: 'discovery_summarize_page',
        description: 'Summarize the main content of a webpage in bullet points. Quick way to understand a competitor page or listing.',
        input_schema: {
            type: 'object' as const,
            properties: {
                url: { type: 'string', description: 'URL to summarize' },
            },
            required: ['url'],
        },
    },
];

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

async function elroyToolExecutor(toolName: string, input: Record<string, unknown>): Promise<unknown> {
    logger.info(`[Elroy] Executing tool: ${toolName}`, { input });

    switch (toolName) {
        case 'get_at_risk_customers': {
            const limit = typeof input.limit === 'number' ? input.limit : 10;
            const result = await getAtRiskCustomers(ORG_ID, limit, true);
            if (!result?.customers?.length) return { message: 'No at-risk customers found right now.' };
            return result.customers.map((c: any) => ({
                name: c.name ?? c.displayName ?? 'Unknown',
                phone: c.phone ?? null,
                daysSinceLastVisit: c.daysSinceLastVisit ?? c.daysSincePurchase ?? null,
                lifetimeValue: Math.round(c.lifetimeValue ?? c.totalSpent ?? 0),
                segment: c.segment ?? null,
                retentionScore: c.retentionScore ?? null,
                tier: c.tier ?? null,
            }));
        }

        case 'get_customer_segments': {
            const result = await getSegmentSummary(ORG_ID);
            return result ?? { message: 'Customer segment data unavailable.' };
        }

        case 'get_today_checkins': {
            return { checkins: await getTodayCheckins(ORG_ID) };
        }

        case 'get_menu_inventory': {
            const products = await fetchMenuProducts(ORG_ID);
            const category = typeof input.category === 'string' ? input.category.toLowerCase() : null;
            const filtered = category
                ? products.filter((p: any) => (p.category ?? p.category_name ?? '').toLowerCase().includes(category))
                : products;
            return filtered.slice(0, 30).map(normalizeProduct);
        }

        case 'get_competitor_intel': {
            const report = await getLatestWeeklyReport(ORG_ID);
            if (!report) return { message: 'No competitor intel available yet. Ask Ezal to run a fresh scan.' };
            const ageHours = Math.round((Date.now() - new Date(report.generatedAt).getTime()) / 3_600_000);
            return {
                freshness: ageHours < 24 ? 'fresh (< 24h)' : `${Math.floor(ageHours / 24)}d old`,
                topDeals: report.insights.topDeals.slice(0, 3),
                pricingGaps: report.insights.pricingGaps.slice(0, 3),
                marketTrends: report.insights.marketTrends.slice(0, 3),
                recommendations: report.insights.recommendations.slice(0, 3),
            };
        }

        case 'run_competitive_agent': {
            const query = String(input.query ?? '').trim();
            if (!query) return { message: 'Provide a competitor research query.' };
            const prompt = `You are a cannabis market intelligence agent researching the Syracuse, New York area (zip code 13202). Research the following: ${query}. Focus on local dispensaries including FlnnStoned Cannabis and any other competitors near Thrive Syracuse. Return specific pricing, active deals, and product availability information where possible.`;
            logger.info('[Elroy] Running Firecrawl competitive agent', { query });
            const result = await discovery.runAgent(prompt, 90_000);
            if (!result.success) return { message: `Live competitor research failed: ${result.error}. Try get_competitor_intel for cached data.` };
            return { data: result.data, source: 'Firecrawl AI Agent (live research)', note: 'This is real-time data — may take 30–90s to complete.' };
        }

        case 'search_customer': {
            const query = String(input.query ?? '').trim().toLowerCase();
            if (!query) return { message: 'Provide a name or phone number to search.' };

            const db = getAdminFirestore();
            const snap = await db.collection('users')
                .where('orgId', '==', ORG_ID)
                .limit(200)
                .get();

            const matches = snap.docs
                .map((d: any) => ({ id: d.id, ...d.data() } as any))
                .filter((u: any) => {
                    const name = (u.displayName ?? u.name ?? '').toLowerCase();
                    const phone = (u.phone ?? u.phoneNumber ?? '').replace(/\D/g, '');
                    const queryDigits = query.replace(/\D/g, '');
                    return name.includes(query) || (queryDigits.length >= 4 && phone.includes(queryDigits));
                })
                .slice(0, 5);

            if (!matches.length) return { message: `No customers found matching "${input.query}".` };

            return matches.map((u: any) => ({
                name: u.displayName ?? u.name ?? 'Unknown',
                phone: u.phone ?? u.phoneNumber ?? null,
                email: u.email ?? null,
                segment: u.segment ?? null,
                retentionScore: u.retentionScore ?? null,
                lifetimeValue: Math.round(u.lifetimeValue ?? u.totalSpent ?? 0),
                lastVisit: u.lastVisitDate ?? u.lastPurchaseDate ?? null,
                totalVisits: u.totalVisits ?? u.purchaseCount ?? null,
            }));
        }

        case 'get_daily_sales': {
            try {
                const db = getAdminFirestore();
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const snap = await db.collection('orders')
                    .where('brandId', '==', ORG_ID)
                    .where('createdAt', '>=', todayStart)
                    .get();

                if (snap.empty) return { revenue: 0, transactions: 0, averageTicket: 0, message: 'No transactions recorded yet today.' };

                let revenue = 0;
                snap.docs.forEach((d: any) => {
                    const data = d.data() as any;
                    revenue += data.totals?.total ?? data.total ?? 0;
                });
                const transactions = snap.size;
                return {
                    revenue: Math.round(revenue * 100) / 100,
                    transactions,
                    averageTicket: Math.round((revenue / transactions) * 100) / 100,
                    asOf: new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' }) + ' ET',
                };
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                if (msg.includes('index') || msg.includes('FAILED_PRECONDITION')) {
                    logger.warn('[Elroy] get_daily_sales index missing, using fallback', { error: msg });
                    // Fallback: fetch recent orders without composite index
                    const db = getAdminFirestore();
                    const snap = await db.collection('orders')
                        .where('brandId', '==', ORG_ID)
                        .orderBy('createdAt', 'desc')
                        .limit(100)
                        .get();
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    let revenue = 0;
                    let transactions = 0;
                    snap.docs.forEach((d: any) => {
                        const data = d.data() as any;
                        const createdAt = data.createdAt?.toDate?.() ?? new Date(data.createdAt);
                        if (createdAt >= todayStart) {
                            revenue += data.totals?.total ?? data.total ?? 0;
                            transactions++;
                        }
                    });
                    return {
                        revenue: Math.round(revenue * 100) / 100,
                        transactions,
                        averageTicket: transactions > 0 ? Math.round((revenue / transactions) * 100) / 100 : 0,
                        asOf: new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' }) + ' ET',
                        note: 'Using fallback query — Firestore index being built.',
                    };
                }
                throw e;
            }
        }

        case 'get_top_sellers': {
            const limit = typeof input.limit === 'number' ? Math.min(input.limit, 20) : 10;
            return withCache(
                CachePrefix.ANALYTICS,
                `elroy:top_sellers:${ORG_ID}:${limit}`,
                async () => {
                    const db = getAdminFirestore();
                    // Compute top sellers from actual order line items (last 7 days)
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    const ordersSnap = await db.collection('orders')
                        .where('brandId', '==', ORG_ID)
                        .where('createdAt', '>=', weekAgo)
                        .get();

                    if (ordersSnap.empty) {
                        // Fallback: try products collection for pre-aggregated data
                        const prodSnap = await db.collection('products')
                            .where('orgId', '==', ORG_ID)
                            .limit(limit)
                            .get();
                        if (prodSnap.empty) return { message: 'No product sales data available.' };
                        return prodSnap.docs.map((d: any) => {
                            const p = d.data() as any;
                            return { name: p.name ?? p.productName ?? 'Unknown', category: p.category ?? null, price: p.price ?? null, unitsSold7d: 0, revenue7d: 0 };
                        });
                    }

                    // Aggregate sales by product name from order line items
                    const productSales = new Map<string, { name: string; category: string; qty: number; revenue: number }>();
                    ordersSnap.docs.forEach((d: any) => {
                        const items: any[] = d.data().items ?? [];
                        items.forEach((item: any) => {
                            const name = item.name ?? item.productName ?? 'Unknown';
                            const existing = productSales.get(name) || { name, category: item.category ?? 'other', qty: 0, revenue: 0 };
                            existing.qty += item.qty ?? 1;
                            existing.revenue += (item.price ?? 0) * (item.qty ?? 1);
                            productSales.set(name, existing);
                        });
                    });

                    const sorted = [...productSales.values()]
                        .sort((a, b) => b.revenue - a.revenue)
                        .slice(0, limit);

                    if (sorted.length === 0) return { message: 'No product sales data in the last 7 days.' };
                    return sorted.map(p => ({
                        name: p.name,
                        category: p.category,
                        unitsSold7d: p.qty,
                        revenue7d: Math.round(p.revenue * 100) / 100,
                    }));
                },
                CacheTTL.CRM_SEGMENTS // 5 min
            );
        }

        case 'get_recent_transactions': {
            const limit = typeof input.limit === 'number' ? Math.min(input.limit, 50) : 20;
            const db = getAdminFirestore();
            const snap = await db.collection('orders')
                .where('brandId', '==', ORG_ID)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            if (snap.empty) return { message: 'No recent transactions found.' };

            return snap.docs.map((d: any) => {
                const o = d.data() as any;
                const items: any[] = o.items ?? [];
                return {
                    id: d.id,
                    total: Math.round((o.totals?.total ?? o.total ?? 0) * 100) / 100,
                    itemCount: items.length,
                    items: items.slice(0, 3).map((i: any) => `${i.name ?? i.productName}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', '),
                    createdAt: o.createdAt?.toDate?.()?.toISOString?.() ?? o.createdAt ?? null,
                    status: o.status ?? null,
                };
            });
        }

        case 'get_sales_summary': {
            // Cache for 2 minutes — 3 parallel Firestore queries are expensive
            return withCache(
                CachePrefix.ANALYTICS,
                `elroy:sales_summary:${ORG_ID}`,
                async () => {
                    const db = getAdminFirestore();
                    const now = new Date();

                    const todayStart = new Date(now);
                    todayStart.setHours(0, 0, 0, 0);

                    const yesterdayStart = new Date(todayStart);
                    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

                    const weekAgoStart = new Date(todayStart);
                    weekAgoStart.setDate(weekAgoStart.getDate() - 7);

                    let todaySnap, yesterdaySnap, weekSnap;
                    try {
                        [todaySnap, yesterdaySnap, weekSnap] = await Promise.all([
                            db.collection('orders').where('brandId', '==', ORG_ID).where('createdAt', '>=', todayStart).get(),
                            db.collection('orders').where('brandId', '==', ORG_ID).where('createdAt', '>=', yesterdayStart).where('createdAt', '<', todayStart).get(),
                            db.collection('orders').where('brandId', '==', ORG_ID).where('createdAt', '>=', weekAgoStart).where('createdAt', '<', todayStart).get(),
                        ]);
                    } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : String(e);
                        if (msg.includes('index') || msg.includes('FAILED_PRECONDITION')) {
                            logger.warn('[Elroy] get_sales_summary index missing, using fallback', { error: msg });
                            // Fallback: single query, client-side date filter
                            const allSnap = await db.collection('orders')
                                .where('brandId', '==', ORG_ID)
                                .orderBy('createdAt', 'desc')
                                .limit(500)
                                .get();
                            let todayRev = 0, yestRev = 0, weekRev = 0;
                            let todayTx = 0, yestTx = 0, weekTx = 0;
                            allSnap.docs.forEach((d: any) => {
                                const data = d.data() as any;
                                const createdAt = data.createdAt?.toDate?.() ?? new Date(data.createdAt);
                                const amt = data.totals?.total ?? data.total ?? 0;
                                if (createdAt >= todayStart) { todayRev += amt; todayTx++; }
                                else if (createdAt >= yesterdayStart) { yestRev += amt; yestTx++; }
                                if (createdAt >= weekAgoStart && createdAt < todayStart) { weekRev += amt; weekTx++; }
                            });
                            const weekDailyAvg = weekRev / 7;
                            return {
                                today: { revenue: Math.round(todayRev * 100) / 100, transactions: todayTx },
                                yesterday: { revenue: Math.round(yestRev * 100) / 100, transactions: yestTx },
                                sevenDayAvg: { revenue: Math.round(weekDailyAvg * 100) / 100, transactions: Math.round(weekTx / 7) },
                                vsYesterday: yestRev > 0 ? `${((todayRev / yestRev - 1) * 100).toFixed(1)}%` : 'N/A',
                                vsDailyAvg: weekDailyAvg > 0 ? `${((todayRev / weekDailyAvg - 1) * 100).toFixed(1)}%` : 'N/A',
                                note: 'Using fallback query — Firestore index being built.',
                            };
                        }
                        throw e;
                    }

                    const sumRevenue = (docs: any[]) =>
                        docs.reduce((sum, d) => sum + ((d.data() as any).totals?.total ?? (d.data() as any).total ?? 0), 0);

                    const todayRev = sumRevenue(todaySnap.docs);
                    const yestRev = sumRevenue(yesterdaySnap.docs);
                    const weekRev = sumRevenue(weekSnap.docs);
                    const weekDailyAvg = weekRev / 7;

                    return {
                        today: { revenue: Math.round(todayRev * 100) / 100, transactions: todaySnap.size },
                        yesterday: { revenue: Math.round(yestRev * 100) / 100, transactions: yesterdaySnap.size },
                        sevenDayAvg: { revenue: Math.round(weekDailyAvg * 100) / 100, transactions: Math.round(weekSnap.size / 7) },
                        vsYesterday: yestRev > 0 ? `${((todayRev / yestRev - 1) * 100).toFixed(1)}%` : 'N/A',
                        vsDailyAvg: weekDailyAvg > 0 ? `${((todayRev / weekDailyAvg - 1) * 100).toFixed(1)}%` : 'N/A',
                    };
                },
                120 // 2 minutes — sales data changes throughout the day
            );
        }

        // ---- RTRVR Browser Automation ----

        case 'discovery_browser_automate': {
            const { input: taskInput, urls, verbosity } = input as {
                input: string; urls?: string[]; verbosity?: 'final' | 'steps' | 'debug';
            };
            try {
                const { executeDiscoveryBrowserTool } = await import('@/server/services/rtrvr/tools');
                const result = await executeDiscoveryBrowserTool('discovery.browserAutomate', {
                    input: taskInput, urls: urls || [], verbosity: verbosity || 'final',
                });
                return result.success
                    ? { success: true, message: 'Browser automation completed', result: result.data }
                    : { success: false, error: result.error || 'Browser automation failed' };
            } catch (e: any) { return { success: false, error: e.message }; }
        }

        case 'discovery_fill_form': {
            const { url, formData, submitButtonText } = input as {
                url: string; formData: Record<string, string>; submitButtonText?: string;
            };
            try {
                const { executeDiscoveryBrowserTool } = await import('@/server/services/rtrvr/tools');
                const result = await executeDiscoveryBrowserTool('discovery.fillForm', {
                    url, formData, submitButtonText,
                });
                return result.success
                    ? { success: true, url, formFields: Object.keys(formData), submitted: !!submitButtonText, result: result.data }
                    : { success: false, error: result.error || 'Form fill failed' };
            } catch (e: any) { return { success: false, error: e.message }; }
        }

        case 'discovery_extract_data': {
            const { url, instruction, schema } = input as {
                url: string; instruction: string; schema?: Record<string, unknown>;
            };
            try {
                const { executeDiscoveryBrowserTool } = await import('@/server/services/rtrvr/tools');
                const result = await executeDiscoveryBrowserTool('discovery.extractData', {
                    url, instruction, schema: schema || {},
                });
                return result.success
                    ? { success: true, url, instruction, extractedData: result.data }
                    : { success: false, error: result.error || 'Data extraction failed' };
            } catch (e: any) { return { success: false, error: e.message }; }
        }

        case 'discovery_summarize_page': {
            const { url } = input as { url: string };
            try {
                const { executeDiscoveryBrowserTool } = await import('@/server/services/rtrvr/tools');
                const result = await executeDiscoveryBrowserTool('discovery.summarizePage', { url });
                return result.success
                    ? { success: true, url, summary: result.data?.result || result.data }
                    : { success: false, error: result.error || 'Page summarization failed' };
            } catch (e: any) { return { success: false, error: e.message }; }
        }

        case 'get_competitor_holiday_hours': {
            const holidayFilter = typeof input.holiday === 'string' ? input.holiday.toLowerCase() : null;

            // Detect upcoming holidays (look 14 days out so we catch anything soon)
            const upcoming = getUpcomingHolidays(14);
            const relevant = holidayFilter
                ? upcoming.filter((h) => h.name.toLowerCase().includes(holidayFilter))
                : upcoming;

            if (relevant.length === 0 && upcoming.length === 0) {
                return { message: 'No major holidays detected in the next 14 days. Regular hours should apply.' };
            }

            const targetHoliday = relevant[0] ?? upcoming[0];

            logger.info('[Elroy] Fetching competitor holiday hours', { holiday: targetHoliday.name });
            const competitorHours = await fetchCompetitorHolidayHours(SYRACUSE_COMPETITORS);

            const formatted = formatHoursForSlack(competitorHours, targetHoliday);
            return {
                holiday: targetHoliday.name,
                date: targetHoliday.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
                daysUntil: targetHoliday.daysUntil,
                likelyHoursChange: targetHoliday.likelyHoursChange,
                competitors: competitorHours.map((c) => ({
                    name: c.name,
                    isOpenNow: c.isOpenNow,
                    specialNote: c.specialNote,
                    weekdayDescriptions: c.weekdayDescriptions.slice(0, 3),
                    source: c.source,
                })),
                slackSummary: formatted,
                tip: targetHoliday.likelyHoursChange
                    ? `${targetHoliday.name} often causes dispensary hours changes — confirm your own hours on Weedmaps and Google.`
                    : `${targetHoliday.name} is typically a normal operating day for most dispensaries.`,
            };
        }

        case 'ask_opencode': {
            const prompt = String(input.prompt ?? '').trim();
            if (!prompt) return { error: 'prompt is required' };
            const model = typeof input.model === 'string' ? input.model : undefined;

            const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
            const cronSecret = process.env.CRON_SECRET;
            if (!cronSecret) return { error: 'Opencode not configured (missing CRON_SECRET)' };

            logger.info('[Elroy] Delegating task to opencode', { promptPreview: prompt.slice(0, 80) });

            const res = await fetch(`${baseUrl}/api/opencode/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cronSecret}`,
                },
                body: JSON.stringify({ prompt, ...(model ? { model } : {}) }),
                signal: AbortSignal.timeout(60_000),
            });

            if (!res.ok) {
                const err = await res.text();
                logger.error('[Elroy] Opencode request failed', { status: res.status, err });
                return { error: `Opencode error (${res.status}): ${err.slice(0, 200)}` };
            }

            const data = await res.json() as { result: string; model: string };
            logger.info('[Elroy] Opencode response received', { model: data.model, length: data.result.length });
            return { result: data.result, model: data.model };
        }

        default:
            return { error: `Unknown tool: ${toolName}` };
    }
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const ELROY_SYSTEM_PROMPT = `You are Uncle Elroy, the store operations advisor for Thrive Syracuse — a premium cannabis dispensary. You're warm, sharp, and always on top of what's happening on the floor.

You help store managers with:
- Who needs a win-back call or SMS today
- What's moving on the menu (and what's sitting)
- What competitors are doing in the Syracuse market
- How foot traffic and check-ins are trending
- Any specific customer they need the scoop on
- Today's sales revenue, transaction count, and average ticket
- Top sellers over the last 7 days
- Recent transaction history
- Day-over-day and vs 7-day-average sales comparisons
- Live competitor pricing and deals via real-time web research
- Competitor holiday hours — who's open, who's closed, any special hours

Your style: direct, friendly, a little old-school. You know every customer by name. You give real answers with real numbers — no fluff.

Always pull live data with your tools before answering. If data isn't available, say so plainly.

When listing customers who need outreach, always include their days-inactive and LTV so the manager can prioritize.
When discussing inventory, flag anything on sale or with high stock that could move with a quick promotion.
When citing competitor intel, note how fresh it is.
For real-time or "right now" competitor questions (current prices, today's deals), use run_competitive_agent — it runs a live web research sweep via Firecrawl AI. It takes 30–90 seconds. Use get_competitor_intel for quick cached weekly data.
For holiday or special hours questions ("Are competitors open on Easter?", "What are the hours for Memorial Day?"), ALWAYS use get_competitor_holiday_hours first — it pulls authoritative data from Google Places and is faster and more reliable than Firecrawl for hours.
For coding or technical questions ("write me a query", "generate a script", "analyze this data structure"), use ask_opencode — it delegates to the BakedBot AI coding agent and responds in seconds.

EXTERNAL SITE MANAGEMENT (Weedmaps, AIQ, WordPress):
You can browse, extract data from, and fill forms on external sites using your browser tools.
- Use discovery_browser_automate for general browsing and clicking (reading deals, checking listings, navigating WP admin)
- Use discovery_extract_data to pull structured data (current Weedmaps deals, AIQ campaign stats, WP page content)
- Use discovery_fill_form to create/update deals, campaigns, or WordPress content — ALWAYS confirm details with the user before submitting
- Use discovery_summarize_page for a quick overview of any page

THRIVE SYRACUSE WORDPRESS (thrivesyracuse.com):
- WordPress admin panel at thrivesyracuse.com/wp-admin
- Has AIQ menu plugin installed — menu syncs from Alleaves POS via AIQ
- Use browser tools to: update pages, create/edit posts, manage banners, check plugin status
- For AIQ plugin settings or menu display issues, browse to wp-admin > AIQ Menu settings
- For content updates (hours, announcements, banners), use discovery_fill_form on the WP editor

WEEDMAPS (weedmaps.com):
- Thrive Syracuse Weedmaps listing — manage deals, update banners, check reviews
- Use discovery_browser_automate to navigate the Weedmaps business dashboard
- Use discovery_fill_form to create/update deals and banners

AIQ (alpineiq.com):
- Thrive Syracuse AIQ account — loyalty campaigns, SMS/email automations, menu sync
- Use discovery_browser_automate to navigate the AIQ dashboard
- Use discovery_fill_form to create campaigns or update settings

CRITICAL: When filling forms or submitting on external sites, ALWAYS:
1. Tell the user exactly what you're about to fill and where
2. Wait for their confirmation before calling discovery_fill_form with submitButtonText
3. If you're just reading/extracting, no confirmation needed

CONVERSATION RULES (CRITICAL — every Slack reply):
1. *Never send a dead-end response.* Every reply must end with a clear next step, question, or offer. Examples: "Want me to check the competitor deals too?", "I can pull that customer's history — want me to?", "Here's what I'd suggest next…"
2. *Acknowledge context.* Reference what the user said or what happened before. Don't respond as if the conversation just started.
3. *If you're about to pull data, say so first.* Before running tools, briefly state what you're checking so the user knows you're working.
4. *Complete your thought.* Never trail off or give a partial answer. If you need more info, ask for it explicitly.
5. *Use *bold* for emphasis, not **bold** (Slack mrkdwn, not markdown).
6. *Keep it conversational.* You're a store ops advisor chatting with the team — warm, direct, no corporate fluff.`;

const ELROY_AGENT_CONTEXT: AgentContext = {
    name: 'Uncle Elroy',
    role: 'Store Operations Advisor — Thrive Syracuse',
    capabilities: [
        'get_at_risk_customers — win-back target list',
        'get_customer_segments — segment health overview',
        'get_today_checkins — daily foot traffic',
        'get_menu_inventory — live Alleaves menu',
        'get_competitor_intel — cached weekly Syracuse market intel',
        'run_competitive_agent — live Firecrawl AI research for real-time competitor pricing and deals',
        'search_customer — individual customer lookup',
        'get_daily_sales — today\'s revenue, transactions, avg ticket',
        'get_top_sellers — top products last 7 days',
        'get_recent_transactions — latest order history',
        'get_sales_summary — today vs yesterday vs 7-day avg',
        'get_competitor_holiday_hours — Google Places hours for Syracuse competitors around holidays',
        'ask_opencode — delegate coding/technical tasks to BakedBot AI coding agent (SP13)',
        'discovery_browser_automate — browse external sites (Weedmaps, AIQ, WordPress, competitors)',
        'discovery_fill_form — fill and submit forms (deals, campaigns, WP content)',
        'discovery_extract_data — extract structured data from any webpage',
        'discovery_summarize_page — quick page summary',
    ],
    groundingRules: [
        'ALWAYS call a tool BEFORE answering — NEVER say "let me check" without actually calling the tool in the same turn',
        'Cite days-inactive and LTV when listing at-risk customers',
        'Flag staleness when reporting competitor intel',
        'For "right now" or "today" competitor questions, use run_competitive_agent (live, 30–90s) over get_competitor_intel (cached)',
        'For coding/technical questions, use ask_opencode to delegate to SP13',
        'For revenue/sales questions, use get_daily_sales or get_sales_summary',
        'For product performance questions, use get_top_sellers',
        'For "new customers today" or "sign ups" questions, use get_today_checkins',
        'For "deals" or "what should I run" questions, use get_top_sellers + get_competitor_intel to recommend data-driven deals',
        'For "complaints" or "issues" questions, use get_recent_transactions to check for refunds or anomalies',
        'For "compare" or "competition" questions, use get_competitor_intel or run_competitive_agent',
        'For "text customers" or "SMS" questions, use get_customer_segments to identify the target segment first',
        'Always include the asOf timestamp when reporting today\'s sales',
        'NEVER submit a form on an external site without explicit user confirmation first',
        'For holiday or special hours questions, use get_competitor_holiday_hours (Google Places) — NOT run_competitive_agent',
    ],
};

// ============================================================================
// PUBLIC API
// ============================================================================

export interface ElroyRequest {
    prompt: string;
    context?: { userId?: string };
    maxIterations?: number;
    images?: Array<{ data: string; mimeType: string }>;
    progressCallback?: (msg: string) => Promise<void>;
}

export interface ElroyResponse {
    content: string;
    toolExecutions: ClaudeResult['toolExecutions'];
    model: string;
}

// GLM occasionally refuses cannabis-adjacent business context
const GLM_REFUSAL_PATTERNS = [
    'security restrictions',
    "i'm unable to assist",
    'i cannot assist',
    'violates our policy',
    'due to content restrictions',
    'content policy',
    'i am unable to help',
    'cannot help with',
];

/** If GLM executed tools, it didn't truly refuse — the content is usable. */
function isGLMRefusal(result: ClaudeResult): boolean {
    if (!result.content) return false;
    if (result.toolExecutions && result.toolExecutions.length > 0) return false;
    return GLM_REFUSAL_PATTERNS.some(p => result.content.toLowerCase().includes(p));
}

async function notifyGroqRateLimitSlack(agent: string, failedTier: string): Promise<void> {
    try {
        const { postLinusIncidentSlack } = await import('@/server/services/incident-notifications');
        await postLinusIncidentSlack({
            source: 'auto-escalator',
            channelName: 'linus-cto',
            fallbackText: `Groq rate limit hit — ${agent} falling back from ${failedTier} to Gemini Flash`,
            blocks: [{
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*:warning: Groq Rate Limit Exceeded*\n*Agent:* ${agent}\n*Failed tier:* \`${failedTier}\`\n*Fallback:* Gemini Flash ($0.10/$0.40 per 1M tokens)\n\nAuto-switched to Gemini Flash. Will retry Groq on next request.`,
                },
            }],
        });
    } catch (e) {
        logger.warn(`[${agent}] Failed to send Groq rate limit Slack notification`, { error: String(e) });
    }
}

/**
 * Call the opencode Cloud Run service as a last-resort fallback (no tool calling).
 * Returns a text-only response via Gemini Flash.
 */
async function callOpencodeLastResort(prompt: string): Promise<string | null> {
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return null;

    try {
        const res = await fetch(`${baseUrl}/api/opencode/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cronSecret}` },
            body: JSON.stringify({ prompt }),
            signal: AbortSignal.timeout(55_000),
        });
        if (!res.ok) return null;
        const data = await res.json() as { result: string };
        return data.result || null;
    } catch {
        return null;
    }
}

/**
 * Maps an Elroy tool call to a human-readable Slack status message.
 */
function buildElroyProgressMessage(toolName: string, input: Record<string, unknown>): string {
    switch (toolName) {
        case 'get_at_risk_customers':
            return '_Uncle Elroy is pulling the at-risk customer list..._';
        case 'get_customer_segments':
            return '_Uncle Elroy is checking customer segment health..._';
        case 'get_today_checkins':
            return '_Uncle Elroy is counting today\'s check-ins..._';
        case 'get_menu_inventory': {
            const cat = input.category ? ` (${String(input.category)})` : '';
            return `_Uncle Elroy is pulling the live menu${cat}..._`;
        }
        case 'get_competitor_intel':
            return '_Uncle Elroy is pulling the latest competitor intel report..._';
        case 'run_competitive_agent':
            return '_Uncle Elroy is running a live competitor research sweep — this may take 30–90s..._';
        case 'search_customer':
            return `_Uncle Elroy is looking up "${String(input.query ?? '').slice(0, 30)}"..._`;
        case 'get_daily_sales':
            return '_Uncle Elroy is pulling today\'s sales numbers..._';
        case 'get_top_sellers':
            return '_Uncle Elroy is checking the top sellers..._';
        case 'get_recent_transactions':
            return '_Uncle Elroy is pulling recent transactions..._';
        case 'get_sales_summary':
            return '_Uncle Elroy is comparing today vs yesterday vs 7-day average..._';
        case 'get_competitor_holiday_hours':
            return '_Uncle Elroy is checking competitor holiday hours via Google Places..._';
        case 'ask_opencode':
            return '_Uncle Elroy is delegating a technical question to the coding agent..._';
        case 'discovery_browser_automate':
            return '_Uncle Elroy is browsing an external site..._';
        case 'discovery_fill_form':
            return '_Uncle Elroy is filling a form on an external site..._';
        case 'discovery_extract_data':
            return '_Uncle Elroy is extracting data from a page..._';
        case 'discovery_summarize_page':
            return '_Uncle Elroy is summarizing a page..._';
        default:
            return `_Uncle Elroy is checking ${toolName.replace(/_/g, ' ')}..._`;
    }
}

export async function runElroy(request: ElroyRequest): Promise<ElroyResponse> {
    const hasImages = (request.images?.length ?? 0) > 0;

    const fullPrompt = `${ELROY_SYSTEM_PROMPT}\n\n---\n\nUser Request: ${request.prompt}`;

    const onToolCall = request.progressCallback
        ? (toolName: string, input: Record<string, unknown>) =>
              request.progressCallback!(buildElroyProgressMessage(toolName, input))
        : undefined;

    const sharedContext = {
        userId: request.context?.userId,
        orgId: ORG_ID,
        maxIterations: request.maxIterations ?? 5,
        agentContext: ELROY_AGENT_CONTEXT,
        onToolCall,
    };

    // Config-driven tier chain (same config as Linus — shared across all Slack agents)
    const modelConfig = await getAgentModelConfig();
    const tierChain: ModelTier[] = [modelConfig.slackTier, ...modelConfig.fallbackChain];
    logger.info('[Elroy] Model chain', { tierChain, hasImages });

    let result: ClaudeResult | null = null;

    for (const tier of tierChain) {
        if (result) break;

        try {
            switch (tier) {
                case 'glm': {
                    if (!isGLMConfigured()) continue;
                    const glmModel = hasImages ? GLM_MODELS.VISION : GLM_MODELS.STANDARD;
                    logger.info(`[Elroy] Trying GLM ${glmModel}`);
                    const glmResult = await executeGLMWithTools(
                        fullPrompt, ELROY_TOOLS, elroyToolExecutor,
                        { ...sharedContext, model: glmModel }
                    );
                    if (glmResult.content && !isGLMRefusal(glmResult)) {
                        result = glmResult;
                    } else {
                        logger.warn('[Elroy] GLM unusable', { reason: !glmResult.content ? 'empty' : 'refused', toolExecs: glmResult.toolExecutions?.length ?? 0 });
                    }
                    break;
                }
                case 'gemini': {
                    // "gemini" tier = cheapest GLM model WITH tools
                    // GLM provides tool calling at every tier — never fall to no-tools path
                    if (!isGLMConfigured()) continue;
                    const geminiModel = hasImages ? GLM_MODELS.VISION : GLM_MODELS.EXTRACTION;
                    logger.info(`[Elroy] Trying GLM budget ${geminiModel} (gemini tier, with tools)`);
                    const geminiGlmResult = await executeGLMWithTools(
                        fullPrompt, ELROY_TOOLS, elroyToolExecutor,
                        { ...sharedContext, model: geminiModel }
                    );
                    if (geminiGlmResult.content && !isGLMRefusal(geminiGlmResult)) {
                        result = geminiGlmResult;
                    } else {
                        logger.warn('[Elroy] GLM budget unusable', { reason: !geminiGlmResult.content ? 'empty' : 'refused', toolExecs: geminiGlmResult.toolExecutions?.length ?? 0 });
                    }
                    break;
                }
                case 'gemini-flash': {
                    if (!isGeminiFlashConfigured()) continue;
                    logger.info('[Elroy] Trying Gemini Flash (Genkit, with tools)');
                    result = await executeGeminiFlashWithTools(
                        fullPrompt, ELROY_TOOLS, elroyToolExecutor,
                        sharedContext
                    );
                    break;
                }
                case 'haiku': {
                    if (!isClaudeAvailable()) continue;
                    logger.info('[Elroy] Trying Claude Haiku');
                    result = await executeWithTools(
                        fullPrompt, ELROY_TOOLS, elroyToolExecutor,
                        { ...sharedContext, model: 'claude-haiku-4-5-20251001', imageAttachments: request.images }
                    );
                    break;
                }
                case 'sonnet': {
                    if (!isClaudeAvailable()) continue;
                    logger.info('[Elroy] Trying Claude Sonnet');
                    result = await executeWithTools(
                        fullPrompt, ELROY_TOOLS, elroyToolExecutor,
                        { ...sharedContext, model: 'claude-sonnet-4-6', imageAttachments: request.images }
                    );
                    break;
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const isRateLimit = msg.includes('429') || msg.toLowerCase().includes('rate limit');
            logger.error(`[Elroy] Tier ${tier} failed`, { error: msg, isRateLimit });
            if (isRateLimit && (tier === 'glm' || tier === 'gemini')) {
                notifyGroqRateLimitSlack('Elroy', tier).catch(() => {});
            }
        }
    }

    if (!result) {
        throw new Error('All AI providers failed. Check API keys and credits.');
    }

    return {
        content: result.content,
        toolExecutions: result.toolExecutions,
        model: result.model,
    };
}
