/**
 * Base class for insight generators
 *
 * All insight generators (Money Mike, Smokey, Pops, etc.) inherit from this class
 * to get common functionality: insight creation, validation, and persistence.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { InsightCard, InsightCategory, InsightSeverity } from '@/types/insight-cards';
import type { InboxThreadType, InboxAgentPersona } from '@/types/inbox';

// ============ Base Class ============

export abstract class InsightGeneratorBase {
  protected orgId: string;
  protected agentId: string;
  protected agentName: string;
  protected category: InsightCategory;

  constructor(
    orgId: string,
    agentId: string,
    agentName: string,
    category: InsightCategory
  ) {
    this.orgId = orgId;
    this.agentId = agentId;
    this.agentName = agentName;
    this.category = category;
  }

  /**
   * Generate insights for this organization.
   * Implemented by subclasses.
   */
  abstract generate(): Promise<InsightCard[]>;

  protected buildInsightSlug(insight: Pick<InsightCard, 'category' | 'title'>): string {
    return `${this.orgId}:${insight.category}:${insight.title}`
      .toLowerCase()
      .replace(/[^a-z0-9:_-]/g, '_')
      .slice(0, 500);
  }

  /**
   * Save insights to Firestore using deterministic doc IDs so each run
   * upserts (overwrites) the same document instead of appending new ones.
   * Doc ID: slugified `orgId:category:title` — stable across runs, unique per insight type.
   */
  protected async saveInsights(insights: InsightCard[]): Promise<void> {
    if (insights.length === 0) {
      logger.debug('[InsightGenerator] No insights to save', {
        orgId: this.orgId,
        agentId: this.agentId,
      });
      return;
    }

    try {
      const db = getAdminFirestore();
      const batch = db.batch();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h TTL

      insights.forEach((insight) => {
        const slug = this.buildInsightSlug(insight);
        const ref = db
          .collection('tenants')
          .doc(this.orgId)
          .collection('insights')
          .doc(slug);

        batch.set(ref, {
          ...insight,
          id: slug,
          orgId: this.orgId,
          generatedAt: FieldValue.serverTimestamp(),
          expiresAt,
        }, { merge: true });
      });

      await batch.commit();

      logger.info('[InsightGenerator] Insights saved', {
        orgId: this.orgId,
        agentId: this.agentId,
        count: insights.length,
      });
    } catch (error) {
      logger.error('[InsightGenerator] Failed to save insights', {
        error,
        orgId: this.orgId,
        agentId: this.agentId,
      });
      throw error;
    }
  }

  /**
   * Create an insight card with default values
   */
  protected createInsight(
    data: Partial<Omit<InsightCard, 'id' | 'category' | 'agentId' | 'agentName'>>
  ): InsightCard {
    return {
      id: '', // Set by saveInsights
      category: this.category,
      agentId: this.agentId,
      agentName: this.agentName,
      title: '',
      headline: '',
      severity: 'info',
      actionable: true,
      lastUpdated: new Date(),
      dataSource: 'Unknown',
      ...data,
    } as InsightCard;
  }
}

// ============ Helper: Safe Extraction ============

/**
 * Safely extract a value from a Firestore document, handling various types
 */
export function safeExtract<T>(
  value: unknown,
  defaultValue: T,
  converter?: (v: unknown) => T
): T {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (converter) {
    try {
      return converter(value);
    } catch {
      return defaultValue;
    }
  }

  return (value as T) || defaultValue;
}
