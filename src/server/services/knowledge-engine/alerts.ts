/**
 * Knowledge Engine — Proactive Alerts
 *
 * Scans recent claims and creates knowledge_alerts + mirrors to insights surface.
 * Called after competitive-intel ingestion and on the knowledge-alerts cron.
 */

import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createAlert, getRecentClaims, getRecentAlerts } from './firestore-repo';
import type { KnowledgeClaim, KnowledgeAlert } from './types';
import { generateKnowledgeId } from './ontology';

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

export async function generateKnowledgeAlerts(input: {
  tenantId: string;
  lookbackDays?: number;
}): Promise<{ alertIds: string[]; mirroredInsightIds: string[] }> {
  const { tenantId, lookbackDays = 7 } = input;
  const alertIds: string[] = [];
  const mirroredInsightIds: string[] = [];

  try {
    // Load recent high-impact claims not yet alerted on
    const claims = await getRecentClaims({
      tenantId,
      states: ['signal', 'working_fact', 'verified_fact'],
      minConfidence: 0.45, // lower threshold to catch signals too
      lookbackDays,
      limit: 50,
    });

    // Load existing recent alerts to avoid duplicates
    const existingAlerts = await getRecentAlerts({ tenantId, lookbackDays });
    const alertedClaimIds = new Set(existingAlerts.flatMap(a => a.claimIds));

    const newClaims = claims.filter(c => !alertedClaimIds.has(c.id));

    for (const claim of newClaims) {
      const shouldAlert = isAlertWorthy(claim);
      if (!shouldAlert) continue;

      const alertData = buildAlert(tenantId, claim);
      const alertId = await createAlert(alertData);
      alertIds.push(alertId);

      // Mirror critical/warning alerts to tenants/{orgId}/insights
      if (claim.impactLevel === 'critical' || claim.impactLevel === 'high') {
        const insightId = await mirrorToInsights(tenantId, alertId, alertData, claim);
        if (insightId) {
          mirroredInsightIds.push(insightId);
          // Update alert with mirroredInsightId
          const db = getAdminFirestore();
          await db
            .collection('knowledge_alerts')
            .doc(alertId)
            .update({ mirroredInsightId: insightId });
        }
      }
    }

    logger.info('[KE/alerts] Generated alerts', {
      tenantId,
      alertsCreated: alertIds.length,
      mirrored: mirroredInsightIds.length,
    });

    return { alertIds, mirroredInsightIds };
  } catch (err) {
    logger.error('[KE/alerts] generateKnowledgeAlerts failed', { tenantId, error: err });
    return { alertIds, mirroredInsightIds };
  }
}

// =============================================================================
// ALERT WORTHINESS
// =============================================================================

function isAlertWorthy(claim: KnowledgeClaim): boolean {
  // Critical claims always alert
  if (claim.impactLevel === 'critical') return true;

  // High-confidence verified competitive facts
  if (
    claim.claimType === 'competitor_promo' ||
    claim.claimType === 'competitor_price_shift'
  ) {
    return claim.confidenceScore >= 0.60;
  }

  // High-impact playbook degradation
  if (
    claim.claimType === 'playbook_pattern' ||
    claim.claimType === 'flow_pattern'
  ) {
    return claim.impactLevel === 'high' && claim.confidenceScore >= 0.70;
  }

  // High campaign pattern change
  if (claim.claimType === 'campaign_pattern') {
    return claim.impactLevel === 'high' && claim.state !== 'signal';
  }

  return false;
}

// =============================================================================
// BUILD ALERT
// =============================================================================

function buildAlert(
  tenantId: string,
  claim: KnowledgeClaim
): Omit<KnowledgeAlert, 'id' | 'createdAt'> {
  const category = resolveAlertCategory(claim);
  const severity = resolveAlertSeverity(claim);
  const actionOwner = resolveActionOwner(claim);

  return {
    tenantId,
    category,
    severity,
    title: buildAlertTitle(claim),
    summary: claim.claimText,
    claimIds: [claim.id],
    actionOwner,
    surfacedInBoardroom: severity !== 'info',
    surfacedInIntelligence: true,
    mirroredInsightId: undefined,
  };
}

function resolveAlertCategory(claim: KnowledgeClaim): KnowledgeAlert['category'] {
  if (claim.claimType === 'competitor_promo' || claim.claimType === 'competitor_price_shift') return 'competitive';
  if (claim.claimType === 'campaign_pattern') return 'campaign';
  if (claim.claimType === 'playbook_pattern' || claim.claimType === 'flow_pattern') return 'playbook';
  return 'boardroom';
}

function resolveAlertSeverity(claim: KnowledgeClaim): KnowledgeAlert['severity'] {
  if (claim.impactLevel === 'critical') return 'critical';
  if (claim.impactLevel === 'high') return 'warning';
  return 'info';
}

function resolveActionOwner(claim: KnowledgeClaim): KnowledgeAlert['actionOwner'] {
  if (claim.claimType === 'competitor_promo' || claim.claimType === 'competitor_price_shift') return 'ezal';
  if (claim.claimType === 'campaign_pattern') return 'craig';
  if (claim.claimType === 'playbook_pattern' || claim.claimType === 'flow_pattern') return 'ops';
  return 'marty';
}

function buildAlertTitle(claim: KnowledgeClaim): string {
  const typeLabels: Record<string, string> = {
    competitor_promo: 'Competitor promotion detected',
    competitor_price_shift: 'Competitor price shift',
    campaign_pattern: 'Campaign pattern observed',
    playbook_pattern: 'Playbook performance signal',
    flow_pattern: 'Flow pattern signal',
    recommendation: 'New recommendation',
    risk: 'Risk signal',
  };
  return typeLabels[claim.claimType] ?? 'Knowledge update';
}

// =============================================================================
// MIRROR TO INSIGHTS
// =============================================================================

async function mirrorToInsights(
  tenantId: string,
  alertId: string,
  alertData: Omit<KnowledgeAlert, 'id' | 'createdAt'>,
  claim: KnowledgeClaim
): Promise<string | null> {
  try {
    const db = getAdminFirestore();
    const insightId = generateKnowledgeId('insight');
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('insights')
      .doc(insightId)
      .set({
        id: insightId,
        category: 'competitive',
        severity: alertData.severity,
        title: alertData.title,
        summary: alertData.summary,
        source: 'knowledge_engine',
        claimIds: alertData.claimIds,
        alertId,
        createdAt: FieldValue.serverTimestamp(),
      });
    return insightId;
  } catch (err) {
    logger.warn('[KE/alerts] Failed to mirror insight', { tenantId, alertId, error: err });
    return null;
  }
}
