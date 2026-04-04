/**
 * Customer Health Alert + Craig Handoff Cron Endpoint
 *
 * Cloud Scheduler job (manual creation):
 *   Name:     customer-health-alert
 *   Schedule: "0 14 * * *"  (9 AM EST = 2 PM UTC, daily)
 *   URL:      https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/customer-health-alert
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 *
 * Scans all customer records across active orgs for at-risk signals (60+ days
 * inactive, segment=at_risk, segment=churned), generates a Craig outreach brief
 * via GLM, and posts it to #craig Slack channel. Saves audit trail to Firestore.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { requireCronSecret } from '@/server/auth/cron';
import { callGLM, GLM_MODELS } from '@/ai/glm';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import type { CustomerSegment } from '@/types/customers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AtRiskCustomer {
  id: string;
  orgId: string;
  name: string;
  daysSinceVisit: number;
  segment: CustomerSegment;
  topProducts: string[];
}

interface CraigBrief {
  summary: string;
  suggestedCampaign: string;
  sampleMessage: string;
  urgencyTier: 'low' | 'medium' | 'high';
}

// ---------------------------------------------------------------------------
// Step 1 — Collect at-risk customers
// ---------------------------------------------------------------------------

async function fetchAtRiskCustomers(): Promise<AtRiskCustomer[]> {
  const db = getAdminFirestore();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const customers: AtRiskCustomer[] = [];

  // Primary path: collectionGroup query (requires composite index)
  try {
    const snap = await db.collectionGroup('customers')
      .where('lastVisitDate', '<=', sixtyDaysAgo)
      .orderBy('lastVisitDate', 'asc')
      .limit(50)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      const orgId: string = data.orgId ?? doc.ref.parent.parent?.id ?? '';
      if (!orgId) continue;

      const lastVisit: Date | undefined = data.lastVisitDate?.toDate?.() ?? data.lastOrderDate?.toDate?.();
      const daysSinceVisit = lastVisit
        ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      customers.push({
        id: doc.id,
        orgId,
        name: [data.firstName, data.lastName].filter(Boolean).join(' ') || data.displayName || 'Unknown',
        daysSinceVisit,
        segment: (data.segment as CustomerSegment) ?? 'at_risk',
        topProducts: Array.isArray(data.preferredProducts) ? (data.preferredProducts as string[]).slice(0, 3) : [],
      });
    }

    // Also pick up explicitly-segmented at_risk / churned customers (may not have lastVisitDate)
    const segmentSnap = await db.collectionGroup('customers')
      .where('segment', 'in', ['at_risk', 'churned'])
      .limit(50)
      .get();

    const seenIds = new Set(customers.map(c => c.id));
    for (const doc of segmentSnap.docs) {
      if (seenIds.has(doc.id)) continue;
      const data = doc.data();
      const orgId: string = data.orgId ?? doc.ref.parent.parent?.id ?? '';
      if (!orgId) continue;

      const lastVisit: Date | undefined = data.lastVisitDate?.toDate?.() ?? data.lastOrderDate?.toDate?.();
      const daysSinceVisit = lastVisit
        ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
        : (data.daysSinceLastOrder as number | undefined) ?? 999;

      customers.push({
        id: doc.id,
        orgId,
        name: [data.firstName, data.lastName].filter(Boolean).join(' ') || data.displayName || 'Unknown',
        daysSinceVisit,
        segment: (data.segment as CustomerSegment) ?? 'at_risk',
        topProducts: Array.isArray(data.preferredProducts) ? (data.preferredProducts as string[]).slice(0, 3) : [],
      });
      seenIds.add(doc.id);
    }

    return customers.slice(0, 50);
  } catch (primaryErr) {
    logger.warn('[CustomerHealthAlert] collectionGroup query failed, falling back to per-org scan', {
      error: String(primaryErr),
    });
  }

  // Fallback: iterate active orgs and query their customer subcollections
  try {
    const orgsSnap = await db.collection('organizations')
      .where('status', '==', 'active')
      .limit(10)
      .get();

    const seenIds = new Set<string>();

    await Promise.allSettled(
      orgsSnap.docs.map(async orgDoc => {
        try {
          const orgId = orgDoc.id;
          const custSnap = await db.collection('organizations').doc(orgId)
            .collection('customers')
            .where('segment', 'in', ['at_risk', 'churned'])
            .limit(10)
            .get();

          for (const doc of custSnap.docs) {
            if (seenIds.has(doc.id)) continue;
            const data = doc.data();
            const lastVisit: Date | undefined = data.lastVisitDate?.toDate?.() ?? data.lastOrderDate?.toDate?.();
            const daysSinceVisit = lastVisit
              ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
              : (data.daysSinceLastOrder as number | undefined) ?? 999;

            customers.push({
              id: doc.id,
              orgId,
              name: [data.firstName, data.lastName].filter(Boolean).join(' ') || data.displayName || 'Unknown',
              daysSinceVisit,
              segment: (data.segment as CustomerSegment) ?? 'at_risk',
              topProducts: Array.isArray(data.preferredProducts) ? (data.preferredProducts as string[]).slice(0, 3) : [],
            });
            seenIds.add(doc.id);
            if (customers.length >= 50) return;
          }
        } catch (orgErr) {
          logger.warn('[CustomerHealthAlert] Per-org customer query failed', {
            orgId: orgDoc.id,
            error: String(orgErr),
          });
        }
      })
    );
  } catch (fallbackErr) {
    logger.error('[CustomerHealthAlert] Fallback per-org scan failed', {
      error: String(fallbackErr),
    });
  }

  return customers.slice(0, 50);
}

// ---------------------------------------------------------------------------
// Step 2 — GLM generates Craig brief
// ---------------------------------------------------------------------------

async function generateCraigBrief(customers: AtRiskCustomer[]): Promise<CraigBrief | null> {
  const sample = customers.slice(0, 10).map(c => ({
    id: c.id,
    name: c.name,
    daysSinceVisit: c.daysSinceVisit,
    orgId: c.orgId,
    topProducts: c.topProducts,
  }));

  const systemPrompt = `You are Craig, BakedBot's marketing agent. You specialize in cannabis customer retention SMS/email campaigns.
Generate a brief, actionable outreach plan for at-risk customers. Be specific about what to say.
Respond ONLY with valid JSON matching exactly this schema (no markdown, no code fences):
{
  "summary": "3-sentence overview of the at-risk cohort",
  "suggestedCampaign": "Campaign name and concept",
  "sampleMessage": "Draft SMS/email message text (compliant, no explicit cannabis product names)",
  "urgencyTier": "low|medium|high"
}`;

  const userMessage = `At-risk customer cohort (${customers.length} total, showing top 10):\n${JSON.stringify(sample, null, 2)}`;

  try {
    const raw = await callGLM({
      userMessage,
      systemPrompt,
      model: GLM_MODELS.STANDARD,
      maxTokens: 1024,
      temperature: 0.7,
    });

    // Strip markdown fences if GLM wraps the JSON
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      suggestedCampaign: typeof parsed.suggestedCampaign === 'string' ? parsed.suggestedCampaign : '',
      sampleMessage: typeof parsed.sampleMessage === 'string' ? parsed.sampleMessage : '',
      urgencyTier: (['low', 'medium', 'high'] as const).includes(parsed.urgencyTier as 'low' | 'medium' | 'high')
        ? (parsed.urgencyTier as 'low' | 'medium' | 'high')
        : 'medium',
    };
  } catch (err) {
    logger.warn('[CustomerHealthAlert] GLM brief generation failed', {
      error: String(err),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Step 3 — Post to Slack #craig
// ---------------------------------------------------------------------------

function buildSlackBlocks(
  customers: AtRiskCustomer[],
  orgCount: number,
  brief: CraigBrief | null,
): { blocks: Record<string, unknown>[]; fallbackText: string } {
  const urgencyEmoji: Record<string, string> = { low: '🟡', medium: '🟠', high: '🔴' };
  const tier = brief?.urgencyTier ?? 'medium';
  const emoji = urgencyEmoji[tier] ?? '🟠';

  const fallbackText = brief
    ? `🚨 Craig — Customer Health Alert\n${customers.length} at-risk customers found across ${orgCount} orgs\n\nUrgency: ${tier}`
    : `🚨 Craig — Customer Health Alert\n${customers.length} at-risk customers found across ${orgCount} orgs (brief unavailable)`;

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🚨 Craig — Customer Health Alert', emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${customers.length}* at-risk customers found across *${orgCount}* org${orgCount !== 1 ? 's' : ''}`,
      },
    },
  ];

  if (brief) {
    blocks.push(
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `📊 *Overview*\n${brief.summary}` },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `💬 *Suggested Campaign*: ${brief.suggestedCampaign}\n\n_Draft message:_\n> ${brief.sampleMessage}`,
        },
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `${emoji} Urgency: *${tier}*` }],
      },
    );
  } else {
    // Fallback: raw cohort summary without AI brief
    const orgList = [...new Set(customers.map(c => c.orgId))].join(', ');
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `_AI brief unavailable. Manual review needed._\nOrgs affected: ${orgList}`,
      },
    });
  }

  return { blocks, fallbackText };
}

// ---------------------------------------------------------------------------
// Step 4 — Firestore audit trail
// ---------------------------------------------------------------------------

async function saveAuditRecord(
  customers: AtRiskCustomer[],
  brief: CraigBrief | null,
): Promise<void> {
  const db = getAdminFirestore();
  try {
    await db.collection('craig_briefs').add({
      type: 'customer_health_alert',
      atRiskCount: customers.length,
      orgIds: [...new Set(customers.map(c => c.orgId))],
      brief: brief ?? null,
      createdAt: new Date(),
    });
  } catch (err) {
    logger.warn('[CustomerHealthAlert] Failed to save audit record', {
      error: String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireCronSecret(request, 'customer-health-alert');
  if (authError) return authError;

  logger.info('[CustomerHealthAlert] Starting customer health alert job');

  // Step 1: fetch at-risk customers
  const customers = await fetchAtRiskCustomers();

  logger.info('[CustomerHealthAlert] At-risk customers found', {
    count: customers.length,
  });

  if (customers.length === 0) {
    logger.info('[CustomerHealthAlert] No at-risk customers found — skipping brief and Slack post');
    return NextResponse.json({ success: true, atRiskCount: 0, message: 'No at-risk customers found' });
  }

  const orgIds = [...new Set(customers.map(c => c.orgId))];

  // Step 2: generate Craig brief (non-blocking on failure)
  const brief = await generateCraigBrief(customers);

  if (brief) {
    logger.info('[CustomerHealthAlert] Craig brief generated', {
      urgencyTier: brief.urgencyTier,
    });
  } else {
    logger.warn('[CustomerHealthAlert] Craig brief unavailable — posting raw summary to Slack');
  }

  // Step 3: post to Slack #craig
  const { blocks, fallbackText } = buildSlackBlocks(customers, orgIds.length, brief);

  const slackResult = await postLinusIncidentSlack({
    blocks,
    fallbackText,
    source: 'auto-escalator',
    channelName: 'craig',
  });

  logger.info('[CustomerHealthAlert] Slack notification result', {
    sent: slackResult.sent,
    delivery: slackResult.delivery,
    channelName: slackResult.channelName,
  });

  // Step 4: save audit trail (fire-and-forget — don't block response)
  saveAuditRecord(customers, brief).catch(err => {
    logger.warn('[CustomerHealthAlert] Audit record save failed', { error: String(err) });
  });

  return NextResponse.json({
    success: true,
    atRiskCount: customers.length,
    orgCount: orgIds.length,
    urgencyTier: brief?.urgencyTier ?? null,
    slackSent: slackResult.sent,
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
