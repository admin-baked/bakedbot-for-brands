/**
 * Regulatory Insights Generator
 *
 * Monitors regulatory changes, compliance alerts, and jurisdiction-specific
 * guidance using Big Worm intelligence. Generates critical insights for compliance teams.
 *
 * Agent: Deebo (compliance enforcement)
 */

import { InsightGeneratorBase } from '../insight-generator-base';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { InsightCard } from '@/types/insight-cards';

interface RegulationSnapshot {
  jurisdiction: string;
  lastChecked: Date;
  contentHash: string;
  content: string;
  changeDetected: boolean;
  proposedModifications?: string;
}

// ============ Regulatory Insights Generator ============

export class RegulatoryInsightsGenerator extends InsightGeneratorBase {
  constructor(orgId: string) {
    super(orgId, 'deebo', 'Deebo', 'compliance');
  }

  async generate(): Promise<InsightCard[]> {
    const insights: InsightCard[] = [];

    try {
      // Fetch org's primary jurisdiction
      const jurisdiction = await this.getOrgJurisdiction();

      if (!jurisdiction) {
        logger.debug('[RegulatoryInsights] No jurisdiction found', {
          orgId: this.orgId,
        });
        return [];
      }

      // Check for recent regulation changes
      const regulationChanges = await this.checkRegulationChanges(jurisdiction);

      if (regulationChanges.length > 0) {
        insights.push(
          ...regulationChanges.map((change) =>
            this.createRegulatoryChangeInsight(change, jurisdiction)
          )
        );
      }

      // Check compliance deadline calendar
      const upcomingDeadlines = await this.getUpcomingCompliance();
      if (upcomingDeadlines.length > 0) {
        insights.push(
          ...upcomingDeadlines.map((deadline) =>
            this.createComplianceDeadlineInsight(deadline)
          )
        );
      }

      // Save to Firestore
      await this.saveInsights(insights);

      logger.info('[RegulatoryInsights] Generated regulatory insights', {
        orgId: this.orgId,
        count: insights.length,
        jurisdiction,
      });

      return insights;
    } catch (error) {
      logger.error('[RegulatoryInsights] Error generating insights', {
        error,
        orgId: this.orgId,
      });
      return [];
    }
  }

  /**
   * Get organization's primary jurisdiction from tenant or brand config
   */
  private async getOrgJurisdiction(): Promise<string | null> {
    try {
      const db = getAdminFirestore();

      // Try to get from tenant doc
      const tenantDoc = await db.collection('tenants').doc(this.orgId).get();

      if (tenantDoc.exists) {
        const data = tenantDoc.data();
        return data?.jurisdiction || data?.state || data?.location || null;
      }

      // Fallback to user's orgMemberships
      const usersSnap = await db
        .collection('users')
        .where('orgMemberships.' + this.orgId, '!=', null)
        .limit(1)
        .get();

      if (!usersSnap.empty) {
        const userData = usersSnap.docs[0].data();
        const orgData = userData.orgMemberships?.[this.orgId];
        return orgData?.jurisdiction || orgData?.state || null;
      }

      return null;
    } catch (error) {
      logger.error('[RegulatoryInsights] Error fetching jurisdiction', {
        error,
        orgId: this.orgId,
      });
      return null;
    }
  }

  /**
   * Check for recent regulation changes in jurisdiction
   */
  private async checkRegulationChanges(
    jurisdiction: string
  ): Promise<RegulationSnapshot[]> {
    try {
      const db = getAdminFirestore();

      // Fetch recent regulation snapshots from monitoring service
      const snapshotsSnap = await db
        .collection('regulation_snapshots')
        .where('jurisdiction', '==', jurisdiction)
        .where('changeDetected', '==', true)
        .orderBy('lastChecked', 'desc')
        .limit(5)
        .get();

      return snapshotsSnap.docs.map((doc) => ({
        ...(doc.data() as RegulationSnapshot),
      }));
    } catch (error) {
      logger.debug('[RegulatoryInsights] No regulation snapshots found', {
        jurisdiction,
      });
      return [];
    }
  }

  /**
   * Get upcoming compliance deadlines
   */
  private async getUpcomingCompliance(): Promise<
    Array<{
      id: string;
      title: string;
      dueDate: Date;
      jurisdiction: string;
      requirement: string;
      severity: 'critical' | 'warning';
    }>
  > {
    try {
      const db = getAdminFirestore();
      const now = new Date();
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Fetch compliance calendar items due in next 30 days
      const deadlinesSnap = await db
        .collection('compliance_calendar')
        .where('dueDate', '>=', now)
        .where('dueDate', '<=', thirtyDaysFromNow)
        .orderBy('dueDate', 'asc')
        .get();

      return deadlinesSnap.docs.map((doc) => {
        const data = doc.data();
        const daysUntilDue = Math.ceil(
          (new Date(data.dueDate).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return {
          id: doc.id,
          title: data.title || 'Compliance Deadline',
          dueDate: new Date(data.dueDate),
          jurisdiction: data.jurisdiction || 'General',
          requirement: data.requirement || 'Regulatory requirement',
          severity: daysUntilDue <= 7 ? 'critical' : 'warning',
        };
      });
    } catch (error) {
      logger.debug('[RegulatoryInsights] No compliance deadlines found');
      return [];
    }
  }

  /**
   * Create insight for regulatory change
   */
  private createRegulatoryChangeInsight(
    change: RegulationSnapshot,
    jurisdiction: string
  ): InsightCard {
    return this.createInsight({
      title: 'REGULATORY CHANGE',
      headline: `${jurisdiction} updated ${change.jurisdiction} regulations`,
      subtext:
        change.proposedModifications ||
        'New guidance issued - review recommended',
      severity: 'critical',
      actionable: true,
      ctaLabel: 'Review Changes',
      threadType: 'compliance_audit',
      threadPrompt: `New regulatory changes detected in ${jurisdiction}. The regulations have been updated or new guidance issued. Please review the following changes and advise on any required operational modifications:\n\n${change.proposedModifications || change.content.substring(0, 500)}`,
      dataSource: 'Regulation Monitor (Deebo)',
    });
  }

  /**
   * Create insight for compliance deadline
   */
  private createComplianceDeadlineInsight(deadline: {
    id: string;
    title: string;
    dueDate: Date;
    jurisdiction: string;
    requirement: string;
    severity: 'critical' | 'warning';
  }): InsightCard {
    const daysUntilDue = Math.ceil(
      (deadline.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const dateStr = deadline.dueDate.toLocaleDateString();

    return this.createInsight({
      title: 'COMPLIANCE DEADLINE',
      headline: `${deadline.title} due in ${daysUntilDue} days`,
      subtext: `Deadline: ${dateStr} | Requirement: ${deadline.requirement}`,
      value: daysUntilDue,
      unit: 'days',
      severity: deadline.severity,
      actionable: true,
      ctaLabel: 'Create Compliance Task',
      threadType: 'compliance_audit',
      threadPrompt: `We have a compliance deadline coming up: ${deadline.title} due on ${dateStr} (${daysUntilDue} days away). Requirement: ${deadline.requirement}. Please help me create a task or action plan to ensure compliance.`,
      dataSource: `Compliance Calendar (${deadline.jurisdiction})`,
    });
  }
}
