/**
 * Churn Prediction Service
 *
 * Uses Claude API (not traditional ML) to predict customer churn risk:
 * - RFM (Recency, Frequency, Monetary) feature engineering
 * - Behavioral metrics (purchase patterns, engagement)
 * - Few-shot prompt engineering with examples
 * - Weekly batch processing via cron (Sunday 2 AM)
 *
 * Outputs churn probability (0-100) stored on CustomerProfile
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { callClaude } from '@/ai/claude';
import type { CustomerProfile, CustomerSegment } from '@/types/customers';
import { Timestamp } from 'firebase-admin/firestore';

export interface ChurnFeatures {
  customerId: string;
  // RFM Features
  recency: number; // Days since last order
  frequency: number; // Total orders
  monetary: number; // Lifetime value

  // Behavioral Features
  avgOrderValue: number;
  daysSinceFirst: number;
  orderFrequency: number; // Orders per month
  recentTrend: 'increasing' | 'stable' | 'declining';

  // Engagement Features
  segment: CustomerSegment;
  tier: string;
  points: number;
  daysSinceLastOrder: number;
}

export interface ChurnPrediction {
  customerId: string;
  churnProbability: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  features: ChurnFeatures;
  predictedAt: Date;
}

export interface BatchChurnPredictionResult {
  success: boolean;
  totalCustomers: number;
  predictions: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  errors: Array<{
    customerId: string;
    error: string;
  }>;
  duration: number;
}

export class ChurnPredictionService {
  private firestore: ReturnType<typeof getAdminFirestore>;

  constructor() {
    this.firestore = getAdminFirestore();
  }

  /**
   * Predict churn for a single customer using Claude API
   */
  async predictChurn(
    customerId: string,
    orgId: string
  ): Promise<ChurnPrediction | null> {
    try {
      const customerRef = this.firestore
        .collection('customers')
        .doc(`${orgId}_${customerId}`);

      const customerDoc = await customerRef.get();

      if (!customerDoc.exists) {
        logger.warn('[ChurnPrediction] Customer not found', { customerId, orgId });
        return null;
      }

      const profile = customerDoc.data() as CustomerProfile;

      // Extract features
      const features = this.extractFeatures(profile);

      // Call Claude API for prediction
      const prediction = await this.predictWithClaude(features);

      // Store prediction on customer profile
      await customerRef.update({
        churnProbability: prediction.churnProbability,
        churnRiskLevel: prediction.riskLevel,
        churnReasoning: prediction.reasoning,
        churnPredictedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      logger.info('[ChurnPrediction] Prediction complete', {
        customerId,
        churnProbability: prediction.churnProbability,
        riskLevel: prediction.riskLevel,
      });

      return {
        customerId,
        churnProbability: prediction.churnProbability,
        riskLevel: prediction.riskLevel,
        reasoning: prediction.reasoning,
        features,
        predictedAt: new Date(),
      };
    } catch (error) {
      logger.error('[ChurnPrediction] Prediction failed', {
        customerId,
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });

      return null;
    }
  }

  /**
   * Batch predict churn for all active customers in an org
   * Called by weekly cron job (Sunday 2 AM)
   */
  async predictChurnForOrg(orgId: string): Promise<BatchChurnPredictionResult> {
    const startTime = Date.now();

    logger.info('[ChurnPrediction] Starting batch prediction', { orgId });

    const result: BatchChurnPredictionResult = {
      success: true,
      totalCustomers: 0,
      predictions: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Get all active customers (exclude churned - already 90+ days inactive)
      const customersSnapshot = await this.firestore
        .collection('customers')
        .where('orgId', '==', orgId)
        .where('daysSinceLastOrder', '<', 90) // Only predict for potentially active/at-risk
        .get();

      result.totalCustomers = customersSnapshot.size;

      logger.info('[ChurnPrediction] Processing customers', {
        orgId,
        count: result.totalCustomers,
      });

      // Process in batches to respect Claude API rate limits
      const BATCH_SIZE = 10; // 10 concurrent API calls
      const customers = customersSnapshot.docs;

      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        const batch = customers.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (doc) => {
            try {
              const profile = doc.data() as CustomerProfile;
              const customerId = profile.id;

              // Extract features
              const features = this.extractFeatures(profile);

              // Predict with Claude
              const prediction = await this.predictWithClaude(features);

              // Update customer profile
              await doc.ref.update({
                churnProbability: prediction.churnProbability,
                churnRiskLevel: prediction.riskLevel,
                churnReasoning: prediction.reasoning,
                churnPredictedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });

              result.predictions++;

              // Track risk levels
              if (prediction.riskLevel === 'critical' || prediction.riskLevel === 'high') {
                result.highRisk++;
              } else if (prediction.riskLevel === 'medium') {
                result.mediumRisk++;
              } else {
                result.lowRisk++;
              }

              logger.debug('[ChurnPrediction] Customer predicted', {
                customerId,
                riskLevel: prediction.riskLevel,
                probability: prediction.churnProbability,
              });
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              result.errors.push({
                customerId: doc.data().id || doc.id,
                error: errorMsg,
              });

              logger.error('[ChurnPrediction] Failed to predict customer', {
                customerId: doc.id,
                error: errorMsg,
              });
            }
          })
        );

        logger.info('[ChurnPrediction] Batch processed', {
          batch: Math.floor(i / BATCH_SIZE) + 1,
          processed: Math.min(i + BATCH_SIZE, customers.length),
          total: customers.length,
        });

        // Small delay between batches to respect rate limits
        if (i + BATCH_SIZE < customers.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second
        }
      }

      result.duration = Date.now() - startTime;
      result.success = result.errors.length === 0;

      logger.info('[ChurnPrediction] Batch prediction complete', {
        orgId,
        totalCustomers: result.totalCustomers,
        predictions: result.predictions,
        highRisk: result.highRisk,
        mediumRisk: result.mediumRisk,
        lowRisk: result.lowRisk,
        errors: result.errors.length,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[ChurnPrediction] Batch prediction failed', {
        orgId,
        error: errorMsg,
      });

      result.success = false;
      result.duration = Date.now() - startTime;

      throw error;
    }
  }

  /**
   * Extract RFM and behavioral features from customer profile
   */
  private extractFeatures(profile: CustomerProfile): ChurnFeatures {
    const now = Date.now();

    // Calculate order frequency (orders per month)
    const daysSinceFirst = profile.firstOrderDate
      ? Math.floor((now - new Date(profile.firstOrderDate).getTime()) / (1000 * 60 * 60 * 24))
      : 365;

    const monthsSinceFirst = Math.max(1, daysSinceFirst / 30);
    const orderFrequency = profile.orderCount / monthsSinceFirst;

    // Determine recent trend (simple heuristic based on segment)
    let recentTrend: 'increasing' | 'stable' | 'declining' = 'stable';
    if (profile.segment === 'slipping' || profile.segment === 'at_risk') {
      recentTrend = 'declining';
    } else if (profile.segment === 'vip' || profile.segment === 'loyal') {
      recentTrend = 'stable';
    } else if (profile.segment === 'new' || profile.segment === 'frequent') {
      recentTrend = 'increasing';
    }

    return {
      customerId: profile.id,
      recency: profile.daysSinceLastOrder || 0,
      frequency: profile.orderCount || 0,
      monetary: profile.lifetimeValue || profile.totalSpent || 0,
      avgOrderValue: profile.avgOrderValue || 0,
      daysSinceFirst,
      orderFrequency,
      recentTrend,
      segment: profile.segment,
      tier: profile.tier || 'bronze',
      points: profile.points || 0,
      daysSinceLastOrder: profile.daysSinceLastOrder || 0,
    };
  }

  /**
   * Predict churn using Claude API with few-shot examples
   */
  private async predictWithClaude(features: ChurnFeatures): Promise<{
    churnProbability: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    reasoning: string;
  }> {
    const prompt = `You are a customer churn prediction expert for a cannabis dispensary. Analyze the following customer features and predict their churn probability (0-100) and risk level.

Customer Features:
- Recency: ${features.recency} days since last order
- Frequency: ${features.frequency} total orders
- Monetary: $${features.monetary.toFixed(2)} lifetime value
- Average Order Value: $${features.avgOrderValue.toFixed(2)}
- Days Since First Order: ${features.daysSinceFirst}
- Order Frequency: ${features.orderFrequency.toFixed(2)} orders/month
- Recent Trend: ${features.recentTrend}
- Segment: ${features.segment}
- Loyalty Tier: ${features.tier}
- Loyalty Points: ${features.points}

Examples of churn patterns:

Low Risk (0-25%):
- Recency: 0-14 days, Frequency: 8+, LTV: $500+, Trend: stable/increasing
- Regular purchaser, engaged with loyalty program
- Example: Recency=7, Frequency=12, LTV=$750, Trend=stable → 15% churn risk

Medium Risk (26-50%):
- Recency: 15-30 days, Frequency: 3-7, LTV: $200-500, Trend: stable
- Slipping from regular pattern, may need engagement
- Example: Recency=25, Frequency=5, LTV=$350, Trend=stable → 35% churn risk

High Risk (51-75%):
- Recency: 31-60 days, Frequency: 2-4, LTV: $100-300, Trend: declining
- Clear disengagement pattern, urgent intervention needed
- Example: Recency=45, Frequency=3, LTV=$180, Trend=declining → 65% churn risk

Critical Risk (76-100%):
- Recency: 61-89 days, Frequency: 1-2, LTV: <$100, Trend: declining
- Almost churned, win-back campaign required
- Example: Recency=75, Frequency=1, LTV=$60, Trend=declining → 85% churn risk

Provide your prediction in JSON format:
{
  "churnProbability": <number 0-100>,
  "riskLevel": "<low|medium|high|critical>",
  "reasoning": "<1-2 sentence explanation>"
}`;

    try {
      const response = await callClaude({
        userMessage: prompt,
        systemPrompt: 'You are a data scientist specializing in customer churn prediction. Respond only with valid JSON.',
        model: 'haiku',
      });

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const prediction = JSON.parse(jsonMatch[0]);

      // Validate and clamp values
      const churnProbability = Math.max(0, Math.min(100, prediction.churnProbability || 50));
      const riskLevel = ['low', 'medium', 'high', 'critical'].includes(prediction.riskLevel)
        ? prediction.riskLevel
        : 'medium';
      const reasoning = prediction.reasoning || 'Prediction based on RFM analysis';

      logger.debug('[ChurnPrediction] Claude prediction', {
        customerId: features.customerId,
        churnProbability,
        riskLevel,
      });

      return {
        churnProbability,
        riskLevel,
        reasoning,
      };
    } catch (error) {
      logger.error('[ChurnPrediction] Claude API call failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback: Simple rule-based prediction
      return this.fallbackPrediction(features);
    }
  }

  /**
   * Fallback rule-based prediction if Claude API fails
   */
  private fallbackPrediction(features: ChurnFeatures): {
    churnProbability: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    reasoning: string;
  } {
    let churnProbability = 0;

    // Recency score (0-40 points)
    if (features.recency >= 75) {
      churnProbability += 40;
    } else if (features.recency >= 45) {
      churnProbability += 30;
    } else if (features.recency >= 25) {
      churnProbability += 20;
    } else if (features.recency >= 14) {
      churnProbability += 10;
    }

    // Frequency score (0-30 points)
    if (features.frequency <= 1) {
      churnProbability += 30;
    } else if (features.frequency <= 2) {
      churnProbability += 20;
    } else if (features.frequency <= 4) {
      churnProbability += 10;
    }

    // Trend score (0-30 points)
    if (features.recentTrend === 'declining') {
      churnProbability += 30;
    } else if (features.recentTrend === 'stable') {
      churnProbability += 10;
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (churnProbability >= 76) {
      riskLevel = 'critical';
    } else if (churnProbability >= 51) {
      riskLevel = 'high';
    } else if (churnProbability >= 26) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      churnProbability,
      riskLevel,
      reasoning: 'Fallback prediction based on recency, frequency, and trend',
    };
  }
}
