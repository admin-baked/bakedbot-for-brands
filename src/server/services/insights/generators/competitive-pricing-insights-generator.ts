/**
 * Competitive Pricing Insights Generator (Ezal)
 *
 * Monitors competitor pricing changes and alerts on price drops >30%.
 * Generates insights for brand teams to adjust pricing strategy in real-time.
 *
 * Agent: Ezal (lookout/competitive intelligence)
 */

import { InsightGeneratorBase } from '../insight-generator-base';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { InsightCard } from '@/types/insight-cards';

interface PricingAlert {
  competitorId: string;
  competitorName: string;
  productId: string;
  productName: string;
  previousPrice: number;
  currentPrice: number;
  priceChange: number; // percentage
  scannedAt: Date;
  alertedAt?: Date;
}

// ============ Competitive Pricing Insights Generator ============

export class CompetitivePricingInsightsGenerator extends InsightGeneratorBase {
  constructor(orgId: string) {
    super(orgId, 'ezal', 'Ezal', 'market');
  }

  async generate(): Promise<InsightCard[]> {
    const insights: InsightCard[] = [];

    try {
      // Fetch significant price drops from competitors
      const priceDrops = await this.getSignificantPriceDrops();

      if (priceDrops.length === 0) {
        logger.debug('[CompetitivePricing] No price drops detected', {
          orgId: this.orgId,
        });
        return [];
      }

      // Group by competitor for better UX
      const byCompetitor = this.groupByCompetitor(priceDrops);

      // Create insights
      Object.entries(byCompetitor).forEach(([competitorName, drops]) => {
        insights.push(this.createPriceDropInsight(competitorName, drops));
      });

      // If very significant drops, create high-priority alert
      const criticalDrops = priceDrops.filter((d) => d.priceChange < -50);
      if (criticalDrops.length > 0) {
        insights.push(
          this.createCriticalPriceWarningInsight(
            criticalDrops,
            priceDrops.length
          )
        );
      }

      // Save to Firestore
      await this.saveInsights(insights);

      // Mark these price drops as alerted
      await this.markAsPriceDropAlerted(priceDrops);

      logger.info('[CompetitivePricing] Generated pricing insights', {
        orgId: this.orgId,
        count: insights.length,
        priceDropsDetected: priceDrops.length,
      });

      return insights;
    } catch (error) {
      logger.error('[CompetitivePricing] Error generating insights', {
        error,
        orgId: this.orgId,
      });
      return [];
    }
  }

  /**
   * Get competitors with significant price drops (>30%)
   */
  private async getSignificantPriceDrops(): Promise<PricingAlert[]> {
    try {
      const db = getAdminFirestore();

      // Fetch org's competitors
      const competitorsSnap = await db
        .collection('tenants')
        .doc(this.orgId)
        .collection('competitors')
        .get();

      const priceDrops: PricingAlert[] = [];

      // Check each competitor's recent pricing
      for (const competitorDoc of competitorsSnap.docs) {
        const competitor = competitorDoc.data();

        // Get price history for this competitor
        const pricesSnap = await db
          .collection('tenants')
          .doc(this.orgId)
          .collection('competitors')
          .doc(competitorDoc.id)
          .collection('pricing_history')
          .orderBy('scannedAt', 'desc')
          .limit(2) // Get current and previous scan
          .get();

        if (pricesSnap.size < 2) continue;

        const docs = pricesSnap.docs;
        const current = docs[0].data();
        const previous = docs[1].data();

        // Compare product prices
        if (current.products && previous.products) {
          current.products.forEach(
            (
              currentProduct: {
                id: string;
                name: string;
                price: number;
              }
            ) => {
              const prevProduct = previous.products.find(
                (p: { id: string }) => p.id === currentProduct.id
              );

              if (prevProduct && prevProduct.price > 0) {
                const priceChange =
                  ((currentProduct.price - prevProduct.price) /
                    prevProduct.price) *
                  100;

                // Alert on drops > 30%
                if (priceChange < -30) {
                  priceDrops.push({
                    competitorId: competitorDoc.id,
                    competitorName: competitor.name || 'Unknown Competitor',
                    productId: currentProduct.id,
                    productName: currentProduct.name,
                    previousPrice: prevProduct.price,
                    currentPrice: currentProduct.price,
                    priceChange,
                    scannedAt: new Date(current.scannedAt),
                  });
                }
              }
            }
          );
        }
      }

      // Sort by biggest drops first
      return priceDrops.sort((a, b) => a.priceChange - b.priceChange);
    } catch (error) {
      logger.debug('[CompetitivePricing] Error fetching price drops', { error });
      return [];
    }
  }

  /**
   * Group price drops by competitor
   */
  private groupByCompetitor(
    drops: PricingAlert[]
  ): Record<string, PricingAlert[]> {
    return drops.reduce(
      (acc, drop) => {
        if (!acc[drop.competitorName]) {
          acc[drop.competitorName] = [];
        }
        acc[drop.competitorName].push(drop);
        return acc;
      },
      {} as Record<string, PricingAlert[]>
    );
  }

  /**
   * Create insight for price drops by competitor
   */
  private createPriceDropInsight(
    competitorName: string,
    drops: PricingAlert[]
  ): InsightCard {
    const topDrop = drops[0]; // Biggest drop
    const dropPercentage = Math.abs(Math.round(topDrop.priceChange));
    const avgDropPercentage = Math.abs(
      Math.round(
        drops.reduce((sum, d) => sum + d.priceChange, 0) / drops.length
      )
    );

    return this.createInsight({
      title: 'COMPETITOR PRICE DROP',
      headline: `${competitorName}: ${dropPercentage}% price cut on ${topDrop.productName}`,
      subtext: `${drops.length} product(s) dropped prices | Avg: -${avgDropPercentage}% | $${topDrop.previousPrice} → $${topDrop.currentPrice}`,
      value: dropPercentage,
      unit: '%',
      severity: dropPercentage > 50 ? 'critical' : 'warning',
      trend: 'down',
      trendValue: `-${dropPercentage}%`,
      actionable: true,
      ctaLabel: 'Adjust Our Pricing',
      threadType: 'market_intel',
      threadPrompt: `${competitorName} just dropped prices on ${drops.length} products, with ${topDrop.productName} dropping ${dropPercentage}% from $${topDrop.previousPrice} to $${topDrop.currentPrice}. Should we adjust our pricing strategy to remain competitive?`,
      dataSource: `Competitive Intelligence (Ezal)`,
    });
  }

  /**
   * Create critical alert for major price wars
   */
  private createCriticalPriceWarningInsight(
    criticalDrops: PricingAlert[],
    totalDrops: number
  ): InsightCard {
    const competitors = [...new Set(criticalDrops.map((d) => d.competitorName))];
    const avgDrop = Math.abs(
      Math.round(
        criticalDrops.reduce((sum, d) => sum + d.priceChange, 0) /
          criticalDrops.length
      )
    );

    return this.createInsight({
      title: '🚨 PRICE WAR ALERT',
      headline: `${competitors.length} competitor(s) slashing prices by >50%`,
      subtext: `${criticalDrops.length} products affected | Market moving quickly | Immediate action recommended`,
      value: criticalDrops.length,
      unit: 'products',
      severity: 'critical',
      trend: 'down',
      trendValue: `-${avgDrop}%`,
      actionable: true,
      ctaLabel: 'Emergency Pricing Review',
      threadType: 'market_intel',
      threadPrompt: `URGENT: We're detecting a potential price war. ${competitors.join(', ')} have cut prices by more than 50% on ${criticalDrops.length} products (avg -${avgDrop}%). This could significantly impact our market position. What should our response strategy be?`,
      dataSource: 'Competitive Intelligence (Ezal) - CRITICAL',
    });
  }

  /**
   * Mark price drops as alerted to prevent duplicate alerts
   */
  private async markAsPriceDropAlerted(drops: PricingAlert[]): Promise<void> {
    try {
      const db = getAdminFirestore();
      const batch = db.batch();

      for (const drop of drops) {
        const ref = db
          .collection('tenants')
          .doc(this.orgId)
          .collection('price_drop_alerts')
          .doc(`${drop.competitorId}_${drop.productId}`);

        batch.set(
          ref,
          {
            competitorId: drop.competitorId,
            competitorName: drop.competitorName,
            productId: drop.productId,
            productName: drop.productName,
            priceChange: drop.priceChange,
            previousPrice: drop.previousPrice,
            currentPrice: drop.currentPrice,
            alertedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h TTL
          },
          { merge: true }
        );
      }

      await batch.commit();
    } catch (error) {
      logger.debug('[CompetitivePricing] Could not mark alerts', { error });
    }
  }
}
