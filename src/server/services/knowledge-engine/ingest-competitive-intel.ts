/**
 * Knowledge Engine — Competitive Intel Ingestion
 *
 * Parses Ezal's markdown competitive reports into structured entities, observations,
 * and claims. Called from the competitive-intel cron after report generation.
 *
 * Phase 1 claim types:
 * - competitor_promo (started, ended, repeated)
 * - competitor_price_shift (>= 15% material, >= 30% + 2 products = critical/price war)
 */

import { logger } from '@/lib/logger';
import {
  createSourceIfNew,
  createObservation,
  createClaim,
  upsertEntity,
  upsertEdge,
  startIngestionRun,
  completeIngestionRun,
  failIngestionRun,
} from './firestore-repo';
import { upsertChunks, upsertEntityIndex, embedText } from './lancedb-repo';
import { chunkClaim, indexEntity } from './chunking';
import { computeConfidenceScore, computeClaimState, getConfidenceBand, getRecencyBucket } from './scoring';
import { validateClaimText, generateKnowledgeId, toCanonicalName } from './ontology';
import type { IngestResult, KnowledgeClaim, KnowledgeEntity } from './types';
import { INGESTION_RULES } from './constants';
import { Timestamp } from 'firebase-admin/firestore';

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

export async function ingestCompetitiveIntelKnowledge(input: {
  tenantId: string;
  reportMarkdown: string;
  sourceRef: string;
  observedAt: Date;
  createdBy: 'ezal' | 'system';
}): Promise<IngestResult> {
  const { tenantId, reportMarkdown, sourceRef, observedAt, createdBy } = input;

  const runId = await startIngestionRun({ tenantId, pipeline: 'competitive_intel' });
  const startedAt = Date.now();

  let sourceId = '';
  const observationIds: string[] = [];
  const claimIds: string[] = [];

  try {
    // 1. Create source (dedup by checksum)
    const sourceResult = await createSourceIfNew({
      tenantId,
      sourceType: 'competitive_report',
      title: `Competitive Intel Report — ${observedAt.toISOString().slice(0, 10)}`,
      sourceRef,
      observedAt,
      trustClass: 'agent_generated',
      content: reportMarkdown,
    });

    if (sourceResult.isDuplicate) {
      logger.info('[KE/ingest-CI] Duplicate source — skipping', { tenantId, sourceRef });
      await completeIngestionRun(runId, { sourceCount: 0, observationCount: 0, claimCount: 0, promotedCount: 0 });
      return { sourceId: sourceResult.id, observationIds: [], claimIds: [] };
    }
    sourceId = sourceResult.id;

    // 2. Extract competitors mentioned in the report
    const competitorNames = extractCompetitorNames(reportMarkdown);
    const entityIds: string[] = [];

    for (const name of competitorNames) {
      const entityId = await upsertEntity({
        tenantId,
        entityType: 'competitor',
        name,
        sourceId,
        metadata: { extractedFrom: sourceRef },
      });
      entityIds.push(entityId);

      // Index entity in LanceDB
      try {
        const vector = await embedText(`${name} competitor cannabis`);
        const entity: KnowledgeEntity = {
          id: entityId,
          tenantId,
          entityType: 'competitor',
          name,
          canonicalName: toCanonicalName(name),
          status: 'active',
          tags: ['competitor'],
          metadata: { extractedFrom: sourceRef },
          sourceIds: [sourceId],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await upsertEntityIndex(tenantId, [indexEntity(entity, vector)]);
      } catch (embedErr) {
        logger.warn('[KE/ingest-CI] Entity embed failed', { name, error: embedErr });
      }
    }

    // 3. Extract observations from each section
    const sections = extractReportSections(reportMarkdown);

    for (const section of sections) {
      const obsId = await createObservation({
        tenantId,
        sourceId,
        observationType: 'competitor_change',
        title: section.heading,
        summary: section.summary,
        entityIds,
        rawContent: section.raw,
        observedAt,
        createdBy,
        tags: ['competitive_intel'],
      });
      observationIds.push(obsId);

      // 4. Extract claims from section
      const sectionClaims = extractClaimsFromSection(section, tenantId, sourceId, obsId, entityIds, observedAt);

      for (const claim of sectionClaims) {
        const claimId = await createClaim({ ...claim, id: generateKnowledgeId('kc') });
        claimIds.push(claimId);

        // Wire edges: observation → supports → claim
        await upsertEdge({
          tenantId,
          fromId: obsId,
          toId: claimId,
          edgeType: 'supports_claim',
          sourceIds: [sourceId],
        });

        // Index claim chunk in LanceDB
        try {
          const vector = await embedText(claim.claimText);
          const chunk = chunkClaim(
            { ...claim, id: claimId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
            'competitive_intel',
            [`CI Report ${observedAt.toISOString().slice(0, 10)}`],
            vector
          );
          await upsertChunks(tenantId, [chunk]);
        } catch (embedErr) {
          logger.warn('[KE/ingest-CI] Claim embed failed', { claimId, error: embedErr });
        }
      }
    }

    const durationMs = Date.now() - startedAt;
    await completeIngestionRun(runId, {
      sourceCount: 1,
      observationCount: observationIds.length,
      claimCount: claimIds.length,
      promotedCount: 0,
    });

    logger.info('[KE/ingest-CI] Ingestion complete', {
      tenantId,
      sourceRef,
      observations: observationIds.length,
      claims: claimIds.length,
      durationMs,
    });

    return { sourceId, observationIds, claimIds };
  } catch (err) {
    await failIngestionRun(runId, String(err));
    logger.error('[KE/ingest-CI] Ingestion failed', { tenantId, sourceRef, error: err });
    throw err;
  }
}

// =============================================================================
// SECTION EXTRACTION
// =============================================================================

interface ReportSection {
  heading: string;
  summary: string;
  raw: string;
}

function extractReportSections(markdown: string): ReportSection[] {
  const sections: ReportSection[] = [];
  const lines = markdown.split('\n');
  let current: ReportSection | null = null;
  const rawLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('###') || line.startsWith('##')) {
      if (current) {
        current.raw = rawLines.join('\n');
        current.summary = rawLines
          .filter(l => l.startsWith('- ') || l.startsWith('* '))
          .slice(0, 3)
          .join(' ')
          .slice(0, 300);
        sections.push(current);
      }
      rawLines.length = 0;
      current = { heading: line.replace(/^#+\s*/, '').trim(), summary: '', raw: '' };
    } else if (current) {
      rawLines.push(line);
    }
  }

  if (current) {
    current.raw = rawLines.join('\n');
    current.summary = rawLines
      .filter(l => l.startsWith('- ') || l.startsWith('* '))
      .slice(0, 3)
      .join(' ')
      .slice(0, 300);
    sections.push(current);
  }

  return sections.filter(s => s.raw.trim().length > 20);
}

// =============================================================================
// COMPETITOR NAME EXTRACTION
// =============================================================================

function extractCompetitorNames(markdown: string): string[] {
  const names = new Set<string>();

  // Look for patterns like "**Competitor Name**" or "Competitor Name offers/has/launched"
  const boldPattern = /\*\*([A-Z][A-Za-z\s&'-]{2,40})\*\*/g;
  let match;
  while ((match = boldPattern.exec(markdown)) !== null) {
    const candidate = match[1].trim();
    if (
      candidate.length > 2 &&
      !candidate.toLowerCase().includes('price') &&
      !candidate.toLowerCase().includes('offer') &&
      !candidate.toLowerCase().includes('margin')
    ) {
      names.add(candidate);
    }
  }

  return [...names].slice(0, 20);
}

// =============================================================================
// CLAIM EXTRACTION
// =============================================================================

function extractClaimsFromSection(
  section: ReportSection,
  tenantId: string,
  sourceId: string,
  obsId: string,
  entityIds: string[],
  observedAt: Date
): Omit<KnowledgeClaim, 'id' | 'createdAt' | 'updatedAt'>[] {
  const claims: Omit<KnowledgeClaim, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const lines = section.raw.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'));
  const ageDays = (Date.now() - observedAt.getTime()) / (1000 * 60 * 60 * 24);

  for (const line of lines) {
    const text = line.replace(/^[-*]\s*/, '').trim();
    if (text.length < 20) continue;

    // Detect claim type
    const claimType = detectClaimType(text);
    if (!claimType) continue;

    const impactLevel = detectImpactLevel(text, claimType);

    const confidence = computeConfidenceScore({
      trustClass: 'agent_generated',
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmation: false,
      contradictionCount: 0,
      ageDays,
    });

    const state = computeClaimState({
      confidenceScore: confidence,
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmed: false,
      contradicted: false,
      dismissed: false,
    });

    const recencyBucket = getRecencyBucket(observedAt);

    claims.push({
      tenantId,
      entityIds,
      observationIds: [obsId],
      sourceIds: [sourceId],
      claimType,
      claimText: validateClaimText(text),
      state,
      confidenceScore: confidence,
      confidenceBand: getConfidenceBand(confidence),
      evidenceType: 'external_scrape',
      recencyBucket,
      impactLevel,
      promotedToLetta: false,
      contradictedByClaimIds: [],
    });
  }

  return claims;
}

function detectClaimType(text: string): KnowledgeClaim['claimType'] | null {
  const lower = text.toLowerCase();

  if (/\bpromo|\bdiscount|\bsale|\bdeal|\boff\b|\b%\s*off/.test(lower)) return 'competitor_promo';
  if (/price\s*(drop|cut|reduc|declin|lower|slash)/i.test(lower)) return 'competitor_price_shift';
  if (/launched|new product|added|released/i.test(lower)) return 'competitor_promo';
  if (/discontinued|removed|pulled/i.test(lower)) return 'competitor_promo';

  return null;
}

function detectImpactLevel(text: string, claimType: string): KnowledgeClaim['impactLevel'] {
  const lower = text.toLowerCase();

  // Price war detection
  if (claimType === 'competitor_price_shift') {
    const pctMatch = text.match(/(\d+)\s*%/);
    if (pctMatch) {
      const pct = parseInt(pctMatch[1], 10);
      if (pct >= INGESTION_RULES.PRICE_WAR_PCT) return 'critical';
      if (pct >= INGESTION_RULES.MATERIAL_PRICE_DROP_PCT) return 'high';
    }
    return 'medium';
  }

  if (/\ball\s+products?|\bsitewide|\bmassive|\blaunch/i.test(lower)) return 'high';
  if (/\bmajor|\bsignificant/i.test(lower)) return 'medium';
  return 'low';
}
