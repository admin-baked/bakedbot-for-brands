/**
 * POST /api/goals/suggest
 * AI-powered goal suggestion endpoint
 *
 * Analyzes org data (customer segments, order metrics, campaign performance, POS data)
 * and returns 3-5 personalized goal suggestions via Gemini 2.5 Flash
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { ai } from '@/ai/genkit';
import { logger } from '@/lib/logger';
import type { SuggestedGoal, GoalCategory, GoalTimeframe } from '@/types/goals';

interface SuggestedGoalResponse {
  title: string;
  description: string;
  category: GoalCategory;
  timeframe: GoalTimeframe;
  targetValue: number;
  unit: string;
  rationale: string;
  suggestedPlaybookIds: string[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser();
    const db = getAdminFirestore();

    // Get user's org
    const userDoc = await db.collection('users').doc(session.uid).get();
    const userData = userDoc.data();
    const orgId = userData?.currentOrgId || userData?.orgIds?.[0];

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // 1. Load customer segments
    const customersSnapshot = await db
      .collection('orgs')
      .doc(orgId)
      .collection('customers')
      .limit(1000)
      .get();

    const customers = customersSnapshot.docs.map(doc => doc.data() as Record<string, any>);
    const segmentCounts = {
      total: customers.length,
      vip: customers.filter((c: any) => c.tier === 'platinum' || c.tier === 'gold').length,
      loyal: customers.filter((c: any) => c.segment === 'loyal' || c.tier === 'gold' || c.tier === 'platinum').length,
      atRisk: customers.filter((c: any) => c.daysSinceLastOrder && c.daysSinceLastOrder > 30).length,
      churned: customers.filter((c: any) => c.daysSinceLastOrder && c.daysSinceLastOrder > 90).length,
      new: customers.filter((c: any) => {
        const firstOrderDate = c.firstOrderDate?.toDate?.() || c.firstOrderDate;
        if (!firstOrderDate) return false;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(firstOrderDate) > thirtyDaysAgo;
      }).length,
    };

    const avgOrderValue = customers.length > 0
      ? customers.reduce((sum: number, c: any) => sum + (c.avgOrderValue || 0), 0) / customers.length
      : 0;

    const repeatRate = customers.length > 0
      ? (customers.filter((c: any) => (c.orderCount || 0) > 1).length / customers.length) * 100
      : 0;

    // 2. Load 30-day order metrics (simulated from customer data)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCustomers = customers.filter((c: any) => {
      const lastOrder = c.lastOrderDate?.toDate?.() || c.lastOrderDate;
      return lastOrder && new Date(lastOrder) > thirtyDaysAgo;
    });

    const monthlyRevenue = recentCustomers.reduce((sum: number, c: any) => {
      return sum + ((c.avgOrderValue || 0) * (c.orderCount || 1));
    }, 0);

    const newCustomersThisMonth = segmentCounts.new;

    // 3. Load active goals (to avoid duplicate suggestions)
    const activeGoalsSnapshot = await db
      .collection('orgs')
      .doc(orgId)
      .collection('goals')
      .where('status', '==', 'active')
      .get();

    const activeGoals = activeGoalsSnapshot.docs.map(doc => doc.data() as Record<string, any>);

    // 4. Load recent campaign performance (simulated)
    const campaignsSnapshot = await db
      .collection('orgs')
      .doc(orgId)
      .collection('campaigns')
      .where('status', '==', 'sent')
      .orderBy('sentAt', 'desc')
      .limit(10)
      .get();

    const campaigns = campaignsSnapshot.docs.map(doc => doc.data() as Record<string, any>);
    const avgOpenRate = campaigns.length > 0
      ? campaigns.reduce((sum: number, c: any) => sum + (c.performance?.openRate || 0), 0) / campaigns.length
      : 0;

    // 5. Load POS data (Alleaves integration - if available)
    const org = await db.collection('orgs').doc(orgId).get();
    const orgData = org.data();
    const hasAlleaves = orgData?.integrations?.alleaves?.connected === true;

    // Build the analysis prompt
    const analysisPrompt = `
Based on this dispensary data, suggest 3-5 strategic business goals:

Customer Data:
- Total customers: ${segmentCounts.total}
- VIP/Gold tier: ${segmentCounts.vip}
- Loyal customers: ${segmentCounts.loyal}
- At-risk (30+ days inactive): ${segmentCounts.atRisk}
- Churned (90+ days inactive): ${segmentCounts.churned}
- New customers this month: ${newCustomersThisMonth}
- Average order value: $${avgOrderValue.toFixed(2)}
- Repeat purchase rate: ${repeatRate.toFixed(1)}%

Business Metrics (30 days):
- Monthly revenue: $${monthlyRevenue.toFixed(2)}
- Recent customers active: ${recentCustomers.length}
- Average campaign open rate: ${avgOpenRate.toFixed(1)}%

Active Goals (to avoid duplicates):
${activeGoals.length > 0 ? activeGoals.map((g: any) => `- ${g.title} (${g.category}/${g.timeframe})`).join('\n') : 'None'}

POS Integration: ${hasAlleaves ? 'Connected (Alleaves)' : 'Not connected'}

Suggest goals that:
1. Address the biggest business gaps (low repeat rate? High churn? Few new customers?)
2. Are specific and measurable with clear targets
3. Vary by timeframe (weekly/monthly/yearly)
4. Consider different categories (foot_traffic, revenue, retention, loyalty, marketing)
5. Include rationale explaining WHY this goal matters based on the data

Return ONLY a valid JSON array of 3-5 goal suggestions matching this schema:
[
  {
    "title": "string (specific, actionable goal)",
    "description": "string",
    "category": "foot_traffic" | "revenue" | "retention" | "loyalty" | "marketing" | "compliance",
    "timeframe": "weekly" | "monthly" | "yearly",
    "targetValue": number,
    "unit": "$" | "#" | "%",
    "rationale": "string (reference actual data from above)",
    "suggestedPlaybookIds": []
  }
]
`;

    logger.info('[goals/suggest] Analyzing org data for goal suggestions', {
      orgId,
      customerCount: segmentCounts.total,
      monthlyRevenue,
    });

    // Call Gemini 2.5 Flash with structured output
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: analysisPrompt,
      output: { format: 'json' },
    });

    const responseText = response.text?.trim() || '';

    // Parse JSON from response (may be wrapped in markdown code blocks)
    let suggestionsData: SuggestedGoalResponse[] = [];
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || responseText.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
      suggestionsData = JSON.parse(jsonStr);
    } catch (parseError) {
      logger.error('[goals/suggest] Failed to parse AI response as JSON', {
        response: responseText.substring(0, 200),
        error: parseError,
      });
      return NextResponse.json(
        { error: 'Failed to parse goal suggestions' },
        { status: 500 }
      );
    }

    // Validate and transform to SuggestedGoal format
    const suggestions: SuggestedGoal[] = suggestionsData
      .slice(0, 5) // Max 5 suggestions
      .map(goal => ({
        title: goal.title,
        description: goal.description,
        category: goal.category as GoalCategory,
        timeframe: goal.timeframe as GoalTimeframe,
        targetMetric: {
          key: 'primary',
          label: goal.title,
          targetValue: goal.targetValue,
          currentValue: 0,
          baselineValue: 0,
          unit: goal.unit,
          direction: 'increase' as const,
        },
        rationale: goal.rationale,
        suggestedPlaybookIds: goal.suggestedPlaybookIds || [],
      }));

    logger.info('[goals/suggest] Generated goal suggestions', {
      orgId,
      count: suggestions.length,
    });

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    logger.error('[goals/suggest] Error generating goal suggestions:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    return NextResponse.json(
      { error: 'Failed to generate goal suggestions' },
      { status: 500 }
    );
  }
}
