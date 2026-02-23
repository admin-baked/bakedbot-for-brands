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

export async function POST(_request: NextRequest) {
  try {
    const session = await requireUser();
    const db = getAdminFirestore();

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

    logger.info('[goals/suggest] Resolving org data', { orgId: resolvedOrgId, uid: session.uid });

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
      .collection('tenants')
      .doc(resolvedOrgId)
      .collection('goals')
      .where('status', '==', 'active')
      .limit(20)
      .get();

    const activeGoals = activeGoalsSnapshot.docs.map(doc => doc.data());

    // 3. Load recent order metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrdersSnapshot = await db
      .collection('orders')
      .where('brandId', '==', resolvedOrgId)
      .limit(200)
      .get();

    const recentOrders = recentOrdersSnapshot.docs.map(doc => doc.data());
    const monthlyRevenue = recentOrders.reduce((sum: number, o: any) => sum + (o.totals?.total || o.total || 0), 0);

    // 4. Check POS integration status
    const locationSnap = await db.collection('locations')
      .where('orgId', '==', resolvedOrgId)
      .limit(1)
      .get();
    const hasPOS = !locationSnap.empty && locationSnap.docs[0].data()?.posConfig?.status === 'active';

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

Currently Active Goals (avoid duplicating these):
${activeGoals.length > 0 ? activeGoals.map((g: any) => `- ${g.title} (${g.category}/${g.timeframe})`).join('\n') : 'None yet'}

Suggest goals that:
1. Address the biggest business gaps based on the segment data
2. Are specific and measurable with realistic targets
3. Include a mix of timeframes (weekly, monthly, yearly)
4. Cover different categories: foot_traffic, revenue, retention, loyalty, marketing, compliance
5. Explain WHY each goal matters based on the actual data above

Return a JSON array of 3-5 goal objects:
[
  {
    "title": "Specific, actionable goal title",
    "description": "2-3 sentence description",
    "category": "foot_traffic" | "revenue" | "retention" | "loyalty" | "marketing" | "compliance",
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

    return NextResponse.json({
      success: true,
      suggestions,
    });

  } catch (error) {
    logger.error('[goals/suggest] Error generating goal suggestions', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to generate goal suggestions' },
      { status: 500 }
    );
  }
}
