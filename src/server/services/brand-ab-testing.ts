/**
 * Brand A/B Testing Service
 *
 * Test different brand voices to determine which performs better.
 * Tracks metrics and provides statistical analysis.
 */

import { logger } from '@/lib/logger';
import type { BrandVoice, BrandVoiceABTest } from '@/types/brand-guide';

export interface ABTestVariant {
  id: string;
  name: string;
  voiceSettings: Partial<BrandVoice>;
  weight: number;
  performance?: {
    impressions: number;
    clicks: number;
    conversions: number;
    engagementRate: number;
    sentimentScore: number;
  };
}

export interface ABTestMetrics {
  variant: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;                    // Click-through rate
  conversionRate: number;
  engagementScore: number;
}

export interface ABTestResult {
  testId: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  winner?: string;                 // Variant ID
  confidence: number;              // Statistical confidence 0-100%
  metrics: ABTestMetrics[];
  insights: string[];
  recommendations: string[];
}

export class BrandABTestingService {
  /**
   * Create a new A/B test
   */
  async createTest(
    brandId: string,
    testName: string,
    variants: Array<{ name: string; voice: BrandVoice }>,
    duration?: number, // days
    goal: 'engagement' | 'conversion' | 'sentiment' | 'brand_recall' = 'engagement'
  ): Promise<BrandVoiceABTest> {
    const endDate = duration
      ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
      : undefined;

    const test: BrandVoiceABTest = {
      id: `test_${Date.now()}`,
      name: testName,
      variants: variants.map((v, i) => ({
        id: `variant_${i}`,
        name: v.name,
        voiceSettings: v.voice,
        weight: 50, // Equal distribution for 2 variants
        performance: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          engagementRate: 0,
          sentimentScore: 0,
        },
      })),
      status: 'running',
      startDate: new Date(),
      endDate,
      goal,
      winner: undefined,
      notes: undefined,
    };

    logger.info('Created A/B test', {
      testId: test.id,
      brandId,
      variantCount: variants.length,
    });

    return test;
  }

  /**
   * Record impression for a variant
   */
  async recordImpression(
    test: BrandVoiceABTest,
    variantId: string
  ): Promise<BrandVoiceABTest> {
    const variant = test.variants.find((v) => v.id === variantId);
    if (variant && variant.performance) {
      variant.performance.impressions++;
    }
    return test;
  }

  /**
   * Record click for a variant
   */
  async recordClick(
    test: BrandVoiceABTest,
    variantId: string
  ): Promise<BrandVoiceABTest> {
    const variant = test.variants.find((v) => v.id === variantId);
    if (variant && variant.performance) {
      variant.performance.clicks++;
      // Recalculate engagement rate
      variant.performance.engagementRate = variant.performance.impressions > 0
        ? (variant.performance.clicks / variant.performance.impressions) * 100
        : 0;
    }
    return test;
  }

  /**
   * Record conversion for a variant
   */
  async recordConversion(
    test: BrandVoiceABTest,
    variantId: string
  ): Promise<BrandVoiceABTest> {
    const variant = test.variants.find((v) => v.id === variantId);
    if (variant && variant.performance) {
      variant.performance.conversions++;
    }
    return test;
  }

  /**
   * Analyze test results and determine winner
   */
  async analyzeTest(test: BrandVoiceABTest): Promise<ABTestResult> {
    const metrics: ABTestMetrics[] = test.variants.map((variant) => {
      const impressions = variant.performance?.impressions || 0;
      const clicks = variant.performance?.clicks || 0;
      const conversions = variant.performance?.conversions || 0;

      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

      return {
        variant: variant.id,
        impressions,
        clicks,
        conversions,
        ctr,
        conversionRate,
        engagementScore: variant.performance?.engagementRate || 0,
      };
    });

    // Determine winner (simple: highest conversion rate)
    let winner: string | undefined;
    let maxConversionRate = 0;

    for (const metric of metrics) {
      if (metric.conversionRate > maxConversionRate && metric.impressions >= 100) {
        maxConversionRate = metric.conversionRate;
        winner = metric.variant;
      }
    }

    // Calculate statistical confidence (simplified)
    const confidence = this.calculateConfidence(test);

    // Generate insights
    const insights = this.generateInsights(test, metrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(test, metrics, winner);

    return {
      testId: test.id,
      status: test.status,
      winner,
      confidence,
      metrics,
      insights,
      recommendations,
    };
  }

  /**
   * Calculate statistical confidence
   * Simplified version - in production, use proper statistical tests
   */
  private calculateConfidence(test: BrandVoiceABTest): number {
    const totalImpressions = test.variants.reduce(
      (sum, v) => sum + (v.performance?.impressions || 0),
      0
    );

    // Confidence increases with sample size
    if (totalImpressions < 100) return 0;
    if (totalImpressions < 500) return 60;
    if (totalImpressions < 1000) return 75;
    if (totalImpressions < 5000) return 85;
    return 95;
  }

  /**
   * Generate insights from test data
   */
  private generateInsights(
    _test: BrandVoiceABTest,
    metrics: ABTestMetrics[]
  ): string[] {
    const insights: string[] = [];

    // Compare CTR
    const ctrs = metrics.map((m) => m.ctr);
    const maxCtr = Math.max(...ctrs);
    const minCtr = Math.min(...ctrs);
    const ctrDiff = ((maxCtr - minCtr) / minCtr) * 100;

    if (ctrDiff > 20) {
      insights.push(
        `Significant CTR difference: ${ctrDiff.toFixed(1)}% improvement from best to worst variant`
      );
    }

    // Compare conversion rates
    const conversionRates = metrics.map((m) => m.conversionRate);
    const maxConversion = Math.max(...conversionRates);
    const minConversion = Math.min(...conversionRates);
    const conversionDiff = maxConversion - minConversion;

    if (conversionDiff > 5) {
      insights.push(
        `Best variant has ${conversionDiff.toFixed(1)}% higher conversion rate`
      );
    }

    // Sample size check
    const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
    if (totalImpressions < 1000) {
      insights.push(
        `Low sample size (${totalImpressions} impressions). Continue test for more reliable results.`
      );
    }

    return insights;
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(
    test: BrandVoiceABTest,
    metrics: ABTestMetrics[],
    winner?: string
  ): string[] {
    const recommendations: string[] = [];

    if (winner) {
      const winningVariant = test.variants.find((v) => v.id === winner);
      if (winningVariant) {
        recommendations.push(
          `Consider adopting "${winningVariant.name}" voice as your primary brand voice`
        );

        // Analyze winning voice characteristics
        const personality = winningVariant.voiceSettings.personality?.join(', ') || 'N/A';
        const tone = winningVariant.voiceSettings.tone || 'N/A';
        recommendations.push(
          `Winning voice traits: ${personality} with ${tone} tone`
        );
      }
    } else {
      recommendations.push('Continue test to gather more data before making decision');
    }

    // Check if test should continue
    const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
    if (totalImpressions < 1000) {
      recommendations.push('Aim for at least 1,000 total impressions for statistical significance');
    }

    return recommendations;
  }

  /**
   * Pause an active test
   */
  async pauseTest(test: BrandVoiceABTest): Promise<BrandVoiceABTest> {
    return {
      ...test,
      status: 'paused',
    };
  }

  /**
   * Resume a paused test
   */
  async resumeTest(test: BrandVoiceABTest): Promise<BrandVoiceABTest> {
    return {
      ...test,
      status: 'running',
    };
  }

  /**
   * Complete a test and declare winner
   */
  async completeTest(test: BrandVoiceABTest): Promise<BrandVoiceABTest> {
    const result = await this.analyzeTest(test);

    return {
      ...test,
      status: 'completed',
      endDate: new Date(),
      winner: result.winner,
      notes: `Test completed with ${result.confidence}% confidence. Winner: ${result.winner || 'No clear winner'}`,
    };
  }
}

// Singleton instance
let instance: BrandABTestingService | null = null;

export function getBrandABTestingService(): BrandABTestingService {
  if (!instance) {
    instance = new BrandABTestingService();
  }
  return instance;
}
