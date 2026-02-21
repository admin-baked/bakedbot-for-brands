/**
 * Customer Insights Generator (Smokey)
 *
 * Generates insights about customer segments, churn risk, and loyalty performance
 * to help dispensaries optimize retention and customer engagement.
 */

import { InsightGeneratorBase } from '../insight-generator-base';
import { getSegmentSummary, getAtRiskCustomers } from '@/server/tools/crm-tools';
import { logger } from '@/lib/logger';
import type { InsightCard } from '@/types/insight-cards';

// ============ Types ============

interface SegmentData {
  [key: string]: {
    count: number;
    totalSpent: number;
    avgSpent: number;
  };
}

// ============ Generator ============

export class CustomerInsightsGenerator extends InsightGeneratorBase {
  constructor(orgId: string) {
    super(orgId, 'smokey', 'Smokey', 'customer');
  }

  /**
   * Generate all customer insights
   */
  async generate(): Promise<InsightCard[]> {
    const insights: InsightCard[] = [];

    try {
      logger.info('[CustomerInsights] Generating insights', { orgId: this.orgId });

      // Fetch segment data and at-risk customers in parallel
      const [segmentResult, atRiskResult] = await Promise.all([
        this.getSegments(),
        getAtRiskCustomers(this.orgId, 100, true),
      ]);

      // 1. Churn Risk Alert
      if (atRiskResult?.customers && atRiskResult.customers.length > 0) {
        const churnInsight = this.createChurnRiskInsight(atRiskResult.customers);
        insights.push(churnInsight);
      }

      // 2. New vs Returning Mix
      if (segmentResult) {
        const newVsReturningInsight = this.createNewVsReturningInsight(segmentResult);
        insights.push(newVsReturningInsight);

        // 3. VIP/Loyalty Performance
        const loyaltyInsight = this.createLoyaltyInsight(segmentResult);
        insights.push(loyaltyInsight);
      }

      // Save to Firestore
      await this.saveInsights(insights);

      logger.info('[CustomerInsights] Generated insights', {
        orgId: this.orgId,
        count: insights.length,
      });

      return insights;
    } catch (error) {
      logger.error('[CustomerInsights] Error generating insights', {
        error,
        orgId: this.orgId,
      });
      return [];
    }
  }

  /**
   * Fetch customer segment summary
   */
  private async getSegments(): Promise<Record<string, unknown> | null> {
    try {
      const result = await getSegmentSummary(this.orgId);
      return result?.segments || null;
    } catch (error) {
      logger.error('[CustomerInsights] Error fetching segments', {
        error,
        orgId: this.orgId,
      });
      return null;
    }
  }

  /**
   * Create churn risk insight card
   */
  private createChurnRiskInsight(atRiskCustomers: Record<string, unknown>[]): InsightCard {
    // Get top 10 by LTV
    const topAtRisk = atRiskCustomers
      .sort((a, b) => ((b as any).totalSpent || 0) - ((a as any).totalSpent || 0))
      .slice(0, 10);

    const totalLTVAtRisk = topAtRisk.reduce((sum, c) => sum + ((c as any).totalSpent || 0), 0);
    const avgDaysSinceOrder =
      topAtRisk.length > 0
        ? Math.round(
            topAtRisk.reduce((sum, c) => sum + ((c as any).daysSinceLastOrder || 0), 0) / topAtRisk.length
          )
        : 0;

    const severity = atRiskCustomers.length > 50 ? 'warning' : 'info';

    return this.createInsight({
      title: 'CHURN RISK ALERT',
      headline: `${atRiskCustomers.length} customers at risk`,
      subtext:
        totalLTVAtRisk > 0
          ? `$${Math.round(totalLTVAtRisk).toLocaleString()} LTV | ${avgDaysSinceOrder} days inactive`
          : `${avgDaysSinceOrder} days since last purchase`,
      value: atRiskCustomers.length,
      unit: 'customers',
      severity,
      trend: 'down',
      trendValue: `${atRiskCustomers.length}`,
      actionable: true,
      ctaLabel: atRiskCustomers.length > 10 ? 'View Top 10' : 'Create Win-Back',
      threadType: 'campaign',
      threadPrompt: `I have ${atRiskCustomers.length} customers at risk of churning with $${Math.round(totalLTVAtRisk).toLocaleString()} in LTV. Help me create a win-back campaign targeting the highest-value customers.`,
      dataSource: 'Customer segments (CRM)',
    });
  }

  /**
   * Create new vs returning customer mix insight
   */
  private createNewVsReturningInsight(segments: Record<string, unknown>): InsightCard {
    const newCount = ((segments.new as any)?.count || 0) as number;
    const returningCount =
      (((segments.loyal as any)?.count || 0) +
        ((segments.frequent as any)?.count || 0) +
        ((segments.vip as any)?.count || 0)) as number;
    const totalActive = newCount + returningCount;
    const returningPercent =
      totalActive > 0 ? Math.round((returningCount / totalActive) * 100) : 0;

    const severity = returningPercent >= 60 ? 'success' : returningPercent >= 40 ? 'info' : 'warning';
    const trend = returningPercent >= 60 ? 'up' : returningPercent >= 40 ? 'stable' : 'down';

    return this.createInsight({
      title: 'CUSTOMER MIX',
      headline: `${returningPercent}% returning customers`,
      subtext: `${newCount} new | ${returningCount} returning | ${totalActive} total active`,
      value: returningPercent,
      unit: '%',
      severity,
      trend,
      trendValue: `${returningPercent}%`,
      actionable: true,
      ctaLabel: 'Retention Strategy',
      threadType: 'crm_customer',
      threadPrompt: `Analyze our customer retention metrics. We have ${newCount} new customers and ${returningCount} returning customers (${returningPercent}% retention rate). What strategies should we focus on?`,
      dataSource: 'Customer segments (CRM)',
    });
  }

  /**
   * Create loyalty and VIP performance insight
   */
  private createLoyaltyInsight(segments: Record<string, unknown>): InsightCard {
    const vipCount = ((segments.vip as any)?.count || 0) as number;
    const vipLTV = ((segments.vip as any)?.totalSpent || 0) as number;
    const loyalCount = ((segments.loyal as any)?.count || 0) as number;
    const loyalLTV = ((segments.loyal as any)?.totalSpent || 0) as number;

    const totalVIPLTV = vipCount > 0 ? vipLTV : 0;
    const totalLoyalLTV = loyalCount > 0 ? loyalLTV : 0;
    const combinedLTV = totalVIPLTV + totalLoyalLTV;

    const avgVIPSpend = vipCount > 0 ? Math.round(totalVIPLTV / vipCount) : 0;

    // Calculate concentration of VIP spend
    const totalAllSpent = Object.values(segments).reduce((sum: number, s) => sum + (((s as any)?.totalSpent || 0) as number), 0);
    const vipConcentration =
      totalAllSpent > 0 ? Math.round((totalVIPLTV / (totalAllSpent as number)) * 100) : 0;

    return this.createInsight({
      title: 'LOYALTY PERFORMANCE',
      headline: `${vipCount} VIP customers generating ${vipConcentration}% of revenue`,
      subtext:
        avgVIPSpend > 0
          ? `$${avgVIPSpend.toLocaleString()} avg LTV | ${loyalCount} Loyal (${Math.round((loyalLTV / (vipLTV + loyalLTV)) * 100)}% combined)`
          : `${loyalCount} Loyal customers | $${Math.round(loyalLTV).toLocaleString()} combined LTV`,
      value: vipCount,
      unit: 'VIPs',
      severity: 'success',
      trend: 'up',
      trendValue: `${vipConcentration}%`,
      actionable: true,
      ctaLabel: 'VIP Rewards Program',
      threadType: 'campaign',
      threadPrompt: `Create an exclusive VIP rewards program for our ${vipCount} best customers (${vipConcentration}% of revenue). They have $${Math.round(totalVIPLTV).toLocaleString()} combined LTV with $${avgVIPSpend.toLocaleString()} average value each.`,
      dataSource: 'Customer segments (CRM)',
    });
  }
}
