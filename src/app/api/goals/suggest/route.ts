/**
 * POST /api/goals/suggest
 * AI-powered goal suggestion endpoint
 *
 * Analyzes org data (customer segments, order metrics, campaign performance)
 * and returns 3-5 personalized goal suggestions via Gemini 2.5 Flash
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { ai } from '@/ai/genkit';
import { logger } from '@/lib/logger';
import type { SuggestedGoal, GoalCategory, GoalTimeframe } from '@/types/goals';

const GOAL_SUGGESTION_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type SuggestGoalRequestBody = {
  forceRefresh?: boolean;
};

type GoalSuggestionCacheDoc = {
  suggestions: SuggestedGoal[];
  generatedAt: string;
  expiresAt: string;
  source: 'ai';
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getRequestBody(body: unknown): SuggestGoalRequestBody {
  if (!body || typeof body !== 'object') return {};
  const forceRefresh = (body as { forceRefresh?: unknown }).forceRefresh;
  return { forceRefresh: forceRefresh === true };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser();
    const db = getAdminFirestore();
    const parsedBody = getRequestBody(await request.json().catch(() => ({})));

    // Resolve orgId from session claims (dispensary users use orgId/currentOrgId)
    const orgId = (session as any).orgId
      || (session as any).currentOrgId
      || session.brandId
      || session.locationId;

    if (!orgId) {
      // Fallback: look it up from the users collection
      const userDoc = await db.collection('users').doc(session.uid).get();
      const userData = userDoc.data();
      const resolvedOrgId = userData?.orgId || userData?.currentOrgId || userData?.brandId;
      if (!resolvedOrgId) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }
    }

    const resolvedOrgId = (session as any).orgId
      || (session as any).currentOrgId
      || session.brandId
      || session.locationId
      || (await db.collection('users').doc(session.uid).get().then(d => d.data()?.orgId || d.data()?.currentOrgId || d.data()?.brandId));

    if (!resolvedOrgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    logger.info('[goals/suggest] Resolving org data', {
      orgId: resolvedOrgId,
      uid: session.uid,
      forceRefresh: parsedBody.forceRefresh === true,
    });

    const cacheRef = db
      .collection('orgs')
      .doc(resolvedOrgId)
      .collection('goalSuggestions')
      .doc('weekly');

    if (!parsedBody.forceRefresh) {
      const cacheDoc = await cacheRef.get();
      if (cacheDoc.exists) {
        const cached = cacheDoc.data() as GoalSuggestionCacheDoc;
        const expiresAtMs = Date.parse(cached.expiresAt);

        if (Array.isArray(cached.suggestions) && Number.isFinite(expiresAtMs) && expiresAtMs > Date.now()) {
          logger.info('[goals/suggest] Serving cached goal suggestions', {
            orgId: resolvedOrgId,
            suggestionCount: cached.suggestions.length,
            expiresAt: cached.expiresAt,
          });

          return NextResponse.json({
            success: true,
            suggestions: cached.suggestions,
            meta: {
              source: 'cache',
              generatedAt: cached.generatedAt,
              expiresAt: cached.expiresAt,
            },
          });
        }
      }
    }

    // 1. Load customer data from the correct collection path
    // Customers are stored in top-level 'customers' collection with orgId field
    const customersSnapshot = await db
      .collection('customers')
      .where('orgId', '==', resolvedOrgId)
      .limit(500)
      .get();

    const customers = customersSnapshot.docs.map(doc => doc.data());
    const totalCustomers = customers.length;

    const segmentCounts = {
      total: totalCustomers,
      vip: customers.filter((c: any) => c.segment === 'vip' || c.tier === 'platinum' || c.tier === 'gold').length,
      loyal: customers.filter((c: any) => c.segment === 'loyal').length,
      atRisk: customers.filter((c: any) => c.segment === 'at_risk' || (c.daysSinceLastOrder && c.daysSinceLastOrder > 60)).length,
      slipping: customers.filter((c: any) => c.segment === 'slipping' || (c.daysSinceLastOrder && c.daysSinceLastOrder > 30 && c.daysSinceLastOrder <= 60)).length,
      churned: customers.filter((c: any) => c.segment === 'churned' || (c.daysSinceLastOrder && c.daysSinceLastOrder > 90)).length,
      new: customers.filter((c: any) => c.segment === 'new').length,
      frequent: customers.filter((c: any) => c.segment === 'frequent').length,
    };

    const avgOrderValue = totalCustomers > 0
      ? customers.reduce((sum: number, c: any) => sum + (c.avgOrderValue || 0), 0) / totalCustomers
      : 0;

    const repeatRate = totalCustomers > 0
      ? (customers.filter((c: any) => (c.orderCount || 0) > 1).length / totalCustomers) * 100
      : 0;

    const avgLifetimeValue = totalCustomers > 0
      ? customers.reduce((sum: number, c: any) => sum + (c.lifetimeValue || c.totalSpent || 0), 0) / totalCustomers
      : 0;

    // 2. Load active goals to avoid duplicate suggestions
    const activeGoalsSnapshot = await db
      .collection('orgs')
      .doc(resolvedOrgId)
      .collection('goals')
      .where('status', '==', 'active')
      .limit(20)
      .get();

    const activeGoals = activeGoalsSnapshot.docs.map(doc => doc.data());

    // 3. Load recent order metrics
    const recentOrdersSnapshot = await db
      .collection('orders')
      .where('brandId', '==', resolvedOrgId)
      .limit(200)
      .get();

    const recentOrders = recentOrdersSnapshot.docs.map(doc => doc.data());
    const monthlyRevenue = recentOrders.reduce(
      (sum: number, order) => sum + toNumber((order as { totals?: { total?: number }; total?: number }).totals?.total ?? (order as { total?: number }).total),
      0
    );

    // 4. Check POS integration status
    const locationSnap = await db.collection('locations')
      .where('orgId', '==', resolvedOrgId)
      .limit(1)
      .get();
    const hasPOS = !locationSnap.empty && locationSnap.docs[0].data()?.posConfig?.status === 'active';

    // 5. Load COGS/margin data for profitability-aware suggestions
    let portfolioMargin: number | null = null;
    let lowestMarginCategory: string | null = null;
    let cogsProductCount = 0;

    try {
      const productsWithCost = await db
        .collection('tenants').doc(resolvedOrgId)
        .collection('publicViews').doc('products').collection('items')
        .where('cost', '>', 0)
        .limit(300)
        .get();

      if (!productsWithCost.empty) {
        let totalRevenue = 0;
        let totalCost = 0;
        const categoryMargins = new Map<string, { revenue: number; cost: number }>();

        productsWithCost.docs.forEach(doc => {
          const d = doc.data() as Record<string, any>;
          const price = d.price || 0;
          const cost = d.cost || 0;
          if (price > 0 && cost > 0) {
            cogsProductCount++;
            totalRevenue += price;
            totalCost += cost;
            const cat = (d.category as string) || 'Other';
            const existing = categoryMargins.get(cat) || { revenue: 0, cost: 0 };
            categoryMargins.set(cat, { revenue: existing.revenue + price, cost: existing.cost + cost });
          }
        });

        if (totalRevenue > 0) {
          portfolioMargin = Math.round(((totalRevenue - totalCost) / totalRevenue) * 1000) / 10;
        }

        let lowestMarginPct = Infinity;
        categoryMargins.forEach((vals, cat) => {
          if (vals.revenue > 0) {
            const m = ((vals.revenue - vals.cost) / vals.revenue) * 100;
            if (m < lowestMarginPct) { lowestMarginPct = m; lowestMarginCategory = cat; }
          }
        });
      }
    } catch {
      // Non-fatal — COGS data is optional for goal suggestions
    }

    // Build analysis prompt
    const analysisPrompt = `You are an AI business advisor for a cannabis dispensary. Based on the following data, suggest 3-5 strategic business goals.

Customer Data:
- Total customers: ${segmentCounts.total}
- VIP customers: ${segmentCounts.vip}
- Loyal customers: ${segmentCounts.loyal}
- New customers (recent): ${segmentCounts.new}
- Slipping away (30-60 days inactive): ${segmentCounts.slipping}
- At risk (60+ days inactive): ${segmentCounts.atRisk}
- Churned (90+ days inactive): ${segmentCounts.churned}
- Frequent buyers: ${segmentCounts.frequent}
- Average order value: $${avgOrderValue.toFixed(2)}
- Average lifetime value: $${avgLifetimeValue.toFixed(2)}
- Repeat purchase rate: ${repeatRate.toFixed(1)}%

Business Metrics:
- Recent orders loaded: ${recentOrders.length}
- Estimated monthly revenue: $${monthlyRevenue.toFixed(2)}
- POS Integration active: ${hasPOS ? 'Yes' : 'No'}

Profitability Context:
- COGS data available: ${cogsProductCount > 0 ? `Yes (${cogsProductCount} products)` : 'No'}${portfolioMargin !== null ? `\n- Portfolio gross margin: ${portfolioMargin}% (cannabis industry healthy range: 40-60%)` : ''}${portfolioMargin !== null && portfolioMargin < 30 ? `\n- ⚠️ MARGIN ALERT: Portfolio margin is below 30% — profitability goal is strongly recommended` : ''}${lowestMarginCategory ? `\n- Lowest-margin category: ${lowestMarginCategory}` : ''}

Currently Active Goals (avoid duplicating these):
${activeGoals.length > 0 ? activeGoals.map((g: any) => `- ${g.title} (${g.category}/${g.timeframe})`).join('\n') : 'None yet'}

Suggest goals that:
1. Address the biggest business gaps based on the segment data
2. Are specific and measurable with realistic targets
3. Include a mix of timeframes (weekly, monthly, yearly)
4. Cover different categories: foot_traffic, revenue, retention, loyalty, marketing, compliance, margin
5. Explain WHY each goal matters based on the actual data above${portfolioMargin !== null && portfolioMargin < 35 ? '\n6. IMPORTANT: Include a margin/profitability goal given the below-target portfolio margin' : ''}

Return a JSON array of 3-5 goal objects:
[
  {
    "title": "Specific, actionable goal title",
    "description": "2-3 sentence description",
    "category": "foot_traffic" | "revenue" | "retention" | "loyalty" | "marketing" | "compliance" | "margin",
    "timeframe": "weekly" | "monthly" | "yearly",
    "targetValue": <number>,
    "unit": "$" | "#" | "%",
    "rationale": "Why this goal matters based on the data above",
    "suggestedPlaybookIds": []
  }
]`;

    logger.info('[goals/suggest] Calling AI for goal suggestions', {
      orgId: resolvedOrgId,
      customerCount: segmentCounts.total,
      atRisk: segmentCounts.atRisk,
      churned: segmentCounts.churned,
    });

    // Call Gemini 2.5 Flash - use text response and parse JSON manually
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: analysisPrompt,
    });

    const responseText = response.text?.trim() || '';

    if (!responseText) {
      logger.error('[goals/suggest] Empty response from AI', { orgId: resolvedOrgId });
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Parse JSON from response (may be wrapped in markdown code blocks)
    let suggestionsData: any[] = [];
    try {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      const arrMatch = responseText.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : arrMatch ? arrMatch[0] : responseText;
      suggestionsData = JSON.parse(jsonStr);
      if (!Array.isArray(suggestionsData)) {
        suggestionsData = [suggestionsData];
      }
    } catch (parseError) {
      logger.error('[goals/suggest] Failed to parse AI response as JSON', {
        response: responseText.substring(0, 500),
        error: parseError,
      });
      return NextResponse.json(
        { error: 'Failed to parse goal suggestions from AI response' },
        { status: 500 }
      );
    }

    // Transform to SuggestedGoal format
    const suggestions: SuggestedGoal[] = suggestionsData
      .slice(0, 5)
      .filter((g: any) => g.title && g.category && g.timeframe)
      .map((goal: any) => ({
        title: goal.title,
        description: goal.description || '',
        category: goal.category as GoalCategory,
        timeframe: goal.timeframe as GoalTimeframe,
        targetMetric: {
          key: 'primary',
          label: goal.title,
          targetValue: typeof goal.targetValue === 'number' ? goal.targetValue : 0,
          currentValue: 0,
          baselineValue: 0,
          unit: goal.unit || '#',
          direction: 'increase' as const,
        },
        rationale: goal.rationale || '',
        suggestedPlaybookIds: goal.suggestedPlaybookIds || [],
      }));

    logger.info('[goals/suggest] Generated goal suggestions', {
      orgId: resolvedOrgId,
      count: suggestions.length,
    });

    const generatedAt = new Date();
    const expiresAt = new Date(generatedAt.getTime() + GOAL_SUGGESTION_CACHE_TTL_MS);

    await cacheRef.set({
      suggestions,
      generatedAt: generatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      source: 'ai',
    } satisfies GoalSuggestionCacheDoc);

    logger.info('[goals/suggest] Cached goal suggestions', {
      orgId: resolvedOrgId,
      suggestionCount: suggestions.length,
      expiresAt: expiresAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      suggestions,
      meta: {
        source: 'ai',
        generatedAt: generatedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.startsWith('Unauthorized') || msg.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error('[goals/suggest] Error generating goal suggestions', {
      message: msg,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to generate goal suggestions' },
      { status: 500 }
    );
  }
}
