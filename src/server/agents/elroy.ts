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
 */

import { executeWithTools, isClaudeAvailable, ClaudeTool, ClaudeResult, AgentContext } from '@/ai/claude';
import { logger } from '@/lib/logger';
import { getAtRiskCustomers, getSegmentSummary, getTodayCheckins } from '@/server/tools/crm-tools';
import { getLatestWeeklyReport } from '@/server/services/ezal/weekly-intel-report';
import { fetchMenuProducts, normalizeProduct } from '@/server/agents/adapters/consumer-adapter';
import { getAdminFirestore } from '@/firebase/admin';

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
        }

        case 'get_top_sellers': {
            const limit = typeof input.limit === 'number' ? Math.min(input.limit, 20) : 10;
            const db = getAdminFirestore();
            const snap = await db.collection('products')
                .where('orgId', '==', ORG_ID)
                .orderBy('salesLast7Days', 'desc')
                .limit(limit)
                .get();

            if (snap.empty) return { message: 'No product sales data available.' };

            return snap.docs.map((d: any) => {
                const p = d.data() as any;
                return {
                    name: p.name ?? p.productName ?? 'Unknown',
                    category: p.category ?? p.categoryName ?? null,
                    price: p.price ?? p.basePrice ?? null,
                    unitsSold7d: p.salesLast7Days ?? 0,
                    unitsSold30d: p.salesLast30Days ?? null,
                    trending: p.trending ?? false,
                    inStock: p.inStock ?? p.available ?? true,
                };
            });
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
            const db = getAdminFirestore();
            const now = new Date();

            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            const yesterdayStart = new Date(todayStart);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);

            const weekAgoStart = new Date(todayStart);
            weekAgoStart.setDate(weekAgoStart.getDate() - 7);

            const [todaySnap, yesterdaySnap, weekSnap] = await Promise.all([
                db.collection('orders').where('brandId', '==', ORG_ID).where('createdAt', '>=', todayStart).get(),
                db.collection('orders').where('brandId', '==', ORG_ID).where('createdAt', '>=', yesterdayStart).where('createdAt', '<', todayStart).get(),
                db.collection('orders').where('brandId', '==', ORG_ID).where('createdAt', '>=', weekAgoStart).where('createdAt', '<', todayStart).get(),
            ]);

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

Your style: direct, friendly, a little old-school. You know every customer by name. You give real answers with real numbers — no fluff.

Always pull live data with your tools before answering. If data isn't available, say so plainly.

When listing customers who need outreach, always include their days-inactive and LTV so the manager can prioritize.
When discussing inventory, flag anything on sale or with high stock that could move with a quick promotion.
When citing competitor intel, note how fresh it is.`;

const ELROY_AGENT_CONTEXT: AgentContext = {
    name: 'Uncle Elroy',
    role: 'Store Operations Advisor — Thrive Syracuse',
    capabilities: [
        'get_at_risk_customers — win-back target list',
        'get_customer_segments — segment health overview',
        'get_today_checkins — daily foot traffic',
        'get_menu_inventory — live Alleaves menu',
        'get_competitor_intel — Syracuse market intel',
        'search_customer — individual customer lookup',
        'get_daily_sales — today\'s revenue, transactions, avg ticket',
        'get_top_sellers — top products last 7 days',
        'get_recent_transactions — latest order history',
        'get_sales_summary — today vs yesterday vs 7-day avg',
    ],
    groundingRules: [
        'Always use tools to fetch live data before answering',
        'Cite days-inactive and LTV when listing at-risk customers',
        'Flag staleness when reporting competitor intel',
        'For revenue/sales questions, use get_daily_sales or get_sales_summary',
        'For product performance questions, use get_top_sellers',
        'Always include the asOf timestamp when reporting today\'s sales',
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

export async function runElroy(request: ElroyRequest): Promise<ElroyResponse> {
    if (!isClaudeAvailable()) {
        throw new Error('Claude API is required for Uncle Elroy. Set CLAUDE_API_KEY environment variable.');
    }

    logger.info('[Elroy] Processing request', { promptLength: request.prompt.length });

    const fullPrompt = `${ELROY_SYSTEM_PROMPT}\n\n---\n\nUser Request: ${request.prompt}`;

    const onToolCall = request.progressCallback
        ? (toolName: string) => request.progressCallback!(`_Uncle Elroy is checking ${toolName.replace(/_/g, ' ')}..._`)
        : undefined;

    const result = await executeWithTools(
        fullPrompt,
        ELROY_TOOLS,
        elroyToolExecutor,
        {
            userId: request.context?.userId,
            orgId: ORG_ID,
            maxIterations: request.maxIterations ?? 5,
            agentContext: ELROY_AGENT_CONTEXT,
            imageAttachments: request.images,
            onToolCall,
        }
    );

    return {
        content: result.content,
        toolExecutions: result.toolExecutions,
        model: result.model,
    };
}
