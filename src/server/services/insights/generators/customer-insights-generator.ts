/**
 * Customer Insights Generator (Smokey)
 *
 * Generates insights about customer segments, churn risk, and loyalty performance
 * to help dispensaries optimize retention and customer engagement.
 */

import { InsightGeneratorBase } from '../insight-generator-base';
import { getSegmentSummary, getAtRiskCustomers, getTodayCheckins } from '@/server/tools/crm-tools';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { InsightCard } from '@/types/insight-cards';

// ============ Generator ============

type CustomerSegmentMetrics = {
  count?: number;
  totalSpent?: number;
  avgSpend?: number;
  recentActiveCount?: number;
};

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

      // Fetch segment data, at-risk customers, and today's traffic in parallel
      const [segmentResult, atRiskResult, todayCheckins, todayMix] = await Promise.all([
        this.getSegments(),
        getAtRiskCustomers(this.orgId, 100, false),
        getTodayCheckins(this.orgId).catch(() => 0),
        this.getTodayNewVsReturning(),
      ]);

      // 1. Churn Risk Alert
      if (atRiskResult?.customers && atRiskResult.customers.length > 0) {
        const churnInsight = this.createChurnRiskInsight(atRiskResult.customers);
        insights.push(churnInsight);
      }

      // 2. New vs Returning Mix — daily-updating with actual today traffic
      if (segmentResult) {
        const newVsReturningInsight = this.createNewVsReturningInsight(segmentResult, {
          todayCheckins,
          todayNew: todayMix.newCustomers,
          todayReturning: todayMix.returningCustomers,
        });
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
   * Query today's orders and classify customers as new vs returning.
   * Returning = has ordered within the last 30 days (before today).
   * New = first-ever order OR no order in 30+ days.
   */
  private async getTodayNewVsReturning(): Promise<{ newCustomers: number; returningCustomers: number }> {
    try {
      const db = getAdminFirestore();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get today's orders for this org
      const todayOrdersSnap = await db.collection('orders')
        .where('orgId', '==', this.orgId)
        .where('createdAt', '>=', todayStart)
        .limit(500)
        .get();

      if (todayOrdersSnap.empty) {
        return { newCustomers: 0, returningCustomers: 0 };
      }

      // Collect unique customer identifiers from today's orders
      const customerIds = new Set<string>();
      for (const doc of todayOrdersSnap.docs) {
        const data = doc.data();
        const customerId = data.customerId || data.customerEmail || data.userId;
        if (customerId) customerIds.add(customerId);
      }

      if (customerIds.size === 0) {
        return { newCustomers: 0, returningCustomers: 0 };
      }

      // For each unique customer, check if they have an order in the 30 days BEFORE today
      const thirtyDaysAgo = new Date(todayStart);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let returningCount = 0;
      // Batch check: query orders in last 30 days for these customers
      // Use a single query to check which customers have prior orders
      const priorOrdersSnap = await db.collection('orders')
        .where('orgId', '==', this.orgId)
        .where('createdAt', '>=', thirtyDaysAgo)
        .where('createdAt', '<', todayStart)
        .limit(1000)
        .get();

      const customersWithPriorOrders = new Set<string>();
      for (const doc of priorOrdersSnap.docs) {
        const data = doc.data();
        const customerId = data.customerId || data.customerEmail || data.userId;
        if (customerId) customersWithPriorOrders.add(customerId);
      }

      for (const cid of customerIds) {
        if (customersWithPriorOrders.has(cid)) {
          returningCount++;
        }
      }

      return {
        newCustomers: customerIds.size - returningCount,
        returningCustomers: returningCount,
      };
    } catch (error) {
      logger.warn('[CustomerInsights] Error fetching today new vs returning', {
        error: error instanceof Error ? error.message : String(error),
        orgId: this.orgId,
      });
      return { newCustomers: 0, returningCustomers: 0 };
    }
  }

  /**
   * Create churn risk insight card — shows specific at-risk customers with
   * ready-to-approve win-back actions instead of linking to AI Campaign Planner.
   */
  private createChurnRiskInsight(atRiskCustomers: Record<string, unknown>[]): InsightCard {
    // Get top 5 by LTV — specific enough to act on
    const topAtRisk = atRiskCustomers
      .sort((a, b) => ((b as any).totalSpent || 0) - ((a as any).totalSpent || 0))
      .slice(0, 5);

    const totalLTVAtRisk = topAtRisk.reduce((sum, c) => sum + ((c as any).totalSpent || 0), 0);
    const avgDaysSinceOrder =
      topAtRisk.length > 0
        ? Math.round(
            topAtRisk.reduce((sum, c) => sum + ((c as any).daysSinceLastOrder || 0), 0) / topAtRisk.length
          )
        : 0;

    const severity = atRiskCustomers.length > 50 ? 'warning' : 'info';

    // Build specific customer lines for the card
    const customerLines = topAtRisk
      .map((c) => {
        const name = (c as any).name ?? (c as any).displayName ?? 'Customer';
        const ltv = Math.round((c as any).totalSpent || 0);
        const days = (c as any).daysSinceLastOrder || (c as any).daysSincePurchase || '?';
        return `${name} — $${ltv.toLocaleString()} LTV, ${days}d inactive`;
      })
      .join('; ');

    const headline = totalLTVAtRisk > 0
      ? `$${Math.round(totalLTVAtRisk).toLocaleString()} LTV at risk (${atRiskCustomers.length} customers)`
      : `${atRiskCustomers.length} customers at risk`;

    const subtextParts = [
      `Top ${topAtRisk.length}: ${customerLines}`,
      `Avg ${avgDaysSinceOrder} days since last order`,
    ];

    return this.createInsight({
      title: 'CHURN RISK ALERT',
      tooltipText: 'Customers inactive 60+ days, sorted by lifetime value. Shows top 5 by LTV with ready-to-approve win-back actions.',
      headline,
      subtext: subtextParts.join('\n'),
      value: atRiskCustomers.length,
      unit: 'customers',
      severity,
      trend: 'down',
      trendValue: `$${Math.round(totalLTVAtRisk).toLocaleString()} at risk`,
      actionable: true,
      ctaLabel: 'Approve Win-Back',
      threadType: 'churn_risk',
      threadPrompt: `Send a win-back campaign to these ${topAtRisk.length} highest-value at-risk customers:\n${topAtRisk.map((c) => {
        const name = (c as any).name ?? (c as any).displayName ?? 'Customer';
        const ltv = Math.round((c as any).totalSpent || 0);
        const days = (c as any).daysSinceLastOrder || '?';
        const email = (c as any).email || '';
        const phone = (c as any).phone || '';
        return `- ${name}: $${ltv} LTV, ${days}d inactive${email ? `, ${email}` : ''}${phone ? `, ${phone}` : ''}`;
      }).join('\n')}\n\nGenerate personalized win-back messages for each customer. Include a specific offer or incentive. Create an approvable artifact I can approve from Slack.`,
      dataSource: 'Customer segments (CRM)',
      metadata: {
        totalAtRisk: atRiskCustomers.length,
        totalLTVAtRisk,
        avgDaysSinceOrder,
        topCustomers: topAtRisk.map((c) => ({
          name: (c as any).name ?? (c as any).displayName ?? 'Customer',
          email: (c as any).email ?? null,
          phone: (c as any).phone ?? null,
          ltv: Math.round((c as any).totalSpent || 0),
          daysSinceOrder: (c as any).daysSinceLastOrder || 0,
          segment: (c as any).segment ?? 'at_risk',
        })),
      },
    });
  }

  /**
   * Create new vs returning customer mix insight — updated daily with actual
   * today traffic (check-ins + orders), not just lifetime segment counts.
   *
   * Returning = ordered within last 30 days. Aligns with:
   * - 7-day retention nudge cron
   * - Mrs. Parker welcome/returning email flows
   * - Churn threshold: 60+ days = at-risk (not returning)
   */
  private createNewVsReturningInsight(
    segments: Record<string, unknown>,
    todayTraffic?: { todayCheckins: number; todayNew: number; todayReturning: number },
  ): InsightCard {
    const returningSegments = ['vip', 'loyal', 'frequent', 'high_value', 'regular'] as const;
    const getSegmentMetrics = (segmentKey: string): CustomerSegmentMetrics => {
      const metrics = segments[segmentKey];
      return typeof metrics === 'object' && metrics !== null
        ? (metrics as CustomerSegmentMetrics)
        : {};
    };
    const sumMetric = (
      segmentKeys: readonly string[],
      metric: keyof CustomerSegmentMetrics,
    ): number => segmentKeys.reduce((sum, segmentKey) => sum + (getSegmentMetrics(segmentKey)[metric] ?? 0), 0);

    const lifetimeNewCount = getSegmentMetrics('new').count ?? 0;
    const lifetimeReturningCount = sumMetric(returningSegments, 'count');
    const lifetimeTrackedBase = lifetimeNewCount + lifetimeReturningCount;

    const activeNewCount = getSegmentMetrics('new').recentActiveCount ?? 0;
    const activeReturningCount = sumMetric(returningSegments, 'recentActiveCount');
    const activeThirtyDayBase = activeNewCount + activeReturningCount;
    const hasThirtyDayBase = activeThirtyDayBase > 0;

    const overallNewCount = hasThirtyDayBase ? activeNewCount : lifetimeNewCount;
    const overallReturningCount = hasThirtyDayBase ? activeReturningCount : lifetimeReturningCount;
    const overallBaseCount = overallNewCount + overallReturningCount;
    const returningPercent =
      overallBaseCount > 0 ? Math.round((overallReturningCount / overallBaseCount) * 100) : 0;

    // Today's actual traffic — this is what changes daily
    const todayTotal = (todayTraffic?.todayNew ?? 0) + (todayTraffic?.todayReturning ?? 0);
    const todayCheckins = todayTraffic?.todayCheckins ?? 0;
    const hasTodayData = todayTotal > 0 || todayCheckins > 0;

    const severity = returningPercent >= 60 ? 'success' : returningPercent >= 40 ? 'info' : 'warning';
    const trend = returningPercent >= 60 ? 'up' : returningPercent >= 40 ? 'stable' : 'down';

    // Build dynamic subtext with today's data front-and-center
    const subtextParts: string[] = [];
    if (hasTodayData) {
      const todayLine = todayTotal > 0
        ? `Today: ${todayTotal} customers (${todayTraffic!.todayNew} new, ${todayTraffic!.todayReturning} returning)`
        : `Today: ${todayCheckins} check-in${todayCheckins !== 1 ? 's' : ''} so far`;
      subtextParts.push(todayLine);
    }
    subtextParts.push(
      hasThirtyDayBase
        ? `30-day active CRM base: ${activeNewCount} new | ${activeReturningCount} returning | ${activeThirtyDayBase} total`
        : `Tracked CRM base: ${lifetimeNewCount} new | ${lifetimeReturningCount} returning | ${lifetimeTrackedBase} total`
    );
    if (hasThirtyDayBase && lifetimeTrackedBase > activeThirtyDayBase) {
      subtextParts.push(`Tracked CRM base: ${lifetimeTrackedBase} segmented customers`);
    }

    return this.createInsight({
      title: 'CUSTOMER MIX',
      headline: hasTodayData && todayTotal > 0
        ? `${todayTraffic!.todayReturning} returning today (${todayTotal} total)`
        : `${returningPercent}% returning customers`,
      subtext: subtextParts.join('\n'),
      tooltipText:
        'Returning: repeat customers active in the last 30 days. New: first-ever visitors or first-time buyers in that same 30-day window. Updates every hour with live check-in and order data.',
      value: hasTodayData && todayTotal > 0 ? todayTotal : returningPercent,
      unit: hasTodayData && todayTotal > 0 ? 'customers today' : '%',
      severity,
      trend,
      trendValue: hasTodayData && todayTotal > 0
        ? `${todayTraffic!.todayReturning}/${todayTotal} returning`
        : hasThirtyDayBase
          ? `${returningPercent}% of 30-day active CRM base`
          : `${returningPercent}% of tracked CRM base`,
      actionable: true,
      ctaLabel: 'Retention Strategy',
      threadType: 'crm_customer',
      threadPrompt: `Analyze our customer retention metrics. Today we've had ${todayTotal} customers (${todayTraffic?.todayNew ?? 0} new, ${todayTraffic?.todayReturning ?? 0} returning). Our ${hasThirtyDayBase ? '30-day active CRM base' : 'tracked CRM base'} is ${overallNewCount} new and ${overallReturningCount} returning (${returningPercent}% repeat). What strategies should we focus on?`,
      dataSource: 'Check-ins + orders (live) + CRM segments',
      metadata: {
        todayCheckins,
        todayNew: todayTraffic?.todayNew ?? 0,
        todayReturning: todayTraffic?.todayReturning ?? 0,
        activeNewCount,
        activeReturningCount,
        activeThirtyDayBase,
        lifetimeNewCount,
        lifetimeReturningCount,
        lifetimeTrackedBase,
        overallNewCount,
        overallReturningCount,
        overallBaseCount,
        baseWindow: hasThirtyDayBase ? '30_day_active' : 'tracked_crm',
        returningPercent,
      },
    });
  }

  /**
   * Create loyalty and VIP performance insight
   */
  private createLoyaltyInsight(segments: Record<string, unknown>): InsightCard {
    const vipCount = ((segments.vip as any)?.count || 0) as number;
    const vipLTV = ((segments.vip as any)?.totalSpent || 0) as number;
    const vipRecentActiveCount = ((segments.vip as any)?.recentActiveCount || 0) as number;
    const loyalCount = ((segments.loyal as any)?.count || 0) as number;
    const loyalLTV = ((segments.loyal as any)?.totalSpent || 0) as number;

    const totalVIPLTV = vipCount > 0 ? vipLTV : 0;
    const totalLoyalLTV = loyalCount > 0 ? loyalLTV : 0;
    const combinedLTV = totalVIPLTV + totalLoyalLTV;

    const avgVIPSpend = vipCount > 0 ? Math.round(totalVIPLTV / vipCount) : 0;

    // Calculate concentration of VIP lifetime value in the tracked CRM base.
    const totalAllSpent = Object.values(segments).reduce((sum: number, s) => sum + (((s as any)?.totalSpent || 0) as number), 0);
    const vipConcentration =
      totalAllSpent > 0 ? Math.round((totalVIPLTV / (totalAllSpent as number)) * 100) : 0;
    const combinedLoyaltyShare =
      combinedLTV > 0 ? Math.round((totalLoyalLTV / combinedLTV) * 100) : 0;
    const hasConcentrationRisk = vipCount > 0 && vipCount <= 3 && vipConcentration >= 50;

    return this.createInsight({
      title: 'LOYALTY PERFORMANCE',
      tooltipText: 'LTV is based on lifetime spend. Concentration alerts occur when top VIPs account for most revenue, creating risk if they churn.',
      headline: vipCount > 0
        ? `${vipCount} VIP customers hold ${vipConcentration}% of tracked LTV`
        : 'No VIP concentration detected',
      subtext:
        avgVIPSpend > 0
          ? `CRM LTV basis | ${vipRecentActiveCount} active in last 30d | $${avgVIPSpend.toLocaleString()} avg LTV | ${loyalCount} Loyal (${combinedLoyaltyShare}% of VIP+Loyal LTV)`
          : `CRM LTV basis | ${loyalCount} Loyal customers | $${Math.round(loyalLTV).toLocaleString()} combined LTV`,
      value: vipCount,
      unit: 'VIPs',
      severity: hasConcentrationRisk ? 'warning' : 'success',
      trendValue: `${vipConcentration}% of tracked LTV`,
      actionable: true,
      ctaLabel: hasConcentrationRisk ? 'Reduce Concentration Risk' : 'VIP Rewards Program',
      threadType: 'campaign',
      threadPrompt: hasConcentrationRisk
        ? `Review our customer concentration risk. ${vipCount} VIP customers account for ${vipConcentration}% of tracked lifetime value, and ${vipRecentActiveCount} were active in the last 30 days. Help me build the loyal layer beyond these top customers.`
        : `Create an exclusive VIP rewards program for our ${vipCount} best customers. They hold ${vipConcentration}% of tracked lifetime value, with $${Math.round(totalVIPLTV).toLocaleString()} combined LTV and $${avgVIPSpend.toLocaleString()} average value each.`,
      dataSource: 'Customer segments (CRM lifetime spend)',
    });
  }
}
