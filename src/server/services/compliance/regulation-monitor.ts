/**
 * Regulation Monitor Service
 *
 * Scrapes official state regulatory URLs weekly, compares content hashes,
 * and — on change — asks Claude Haiku to draft a proposed rule pack update.
 * Saves the draft to BakedBot Drive and posts a Slack alert.
 *
 * ⚠️  NEVER auto-modifies rule packs. All proposals require human review.
 *
 * Flow:
 *  1. Fetch each source URL via Discovery (Firecrawl → RTRVR fallback)
 *  2. SHA-256 hash the content
 *  3. Compare against last stored snapshot in Firestore (`regulation_snapshots`)
 *  4. On change → call Claude Haiku to propose rule pack diff
 *  5. Save proposal as markdown file in BakedBot Drive (`system` org)
 *  6. Post Slack alert with Drive link
 *  7. Store new snapshot hash
 */

import { createHash } from 'crypto';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { discovery } from '@/server/services/firecrawl';
import { callClaude } from '@/ai/claude';
import { getDriveStorageService } from '@/server/services/drive-storage';
import type { DriveFileDoc } from '@/types/drive';
import regulationSources from '@/server/agents/rules/regulation-sources.json';

// ============================================================================
// TYPES
// ============================================================================

export interface RegulationSource {
  id: string;
  jurisdiction: string;
  channel: string;
  label: string;
  url: string;
  rule_pack_file: string;
  notes: string;
}

export interface RegulationSnapshot {
  sourceId: string;
  jurisdiction: string;
  contentHash: string;
  scrapedAt: number;
  contentLength: number;
}

export interface RegulationChangeResult {
  sourceId: string;
  jurisdiction: string;
  label: string;
  changed: boolean;
  previousHash: string | null;
  newHash: string;
  driveFileId?: string;
  error?: string;
}

export interface MonitorRunResult {
  checkedAt: number;
  sourcesChecked: number;
  changesDetected: number;
  results: RegulationChangeResult[];
}

// ============================================================================
// SNAPSHOT STORE (Firestore)
// ============================================================================

async function getSnapshot(sourceId: string): Promise<RegulationSnapshot | null> {
  const db = getAdminFirestore();
  const doc = await db.collection('regulation_snapshots').doc(sourceId).get();
  if (!doc.exists) return null;
  return doc.data() as RegulationSnapshot;
}

async function saveSnapshot(snapshot: RegulationSnapshot): Promise<void> {
  const db = getAdminFirestore();
  await db.collection('regulation_snapshots').doc(snapshot.sourceId).set(snapshot);
}

// ============================================================================
// CONTENT SCRAPING + HASHING
// ============================================================================

function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

async function scrapeSource(source: RegulationSource): Promise<string> {
  const result = await discovery.discoverUrl(source.url, ['markdown']);
  const content: string = result.markdown || '';
  if (!content || content.length < 100) {
    throw new Error(`Scraped content too short (${content.length} chars) — may be blocked or empty`);
  }
  return content;
}

// ============================================================================
// AI PROPOSAL GENERATION
// ============================================================================

const PROPOSAL_SYSTEM_PROMPT = `You are a cannabis compliance analyst reviewing regulatory text changes.
When given old and new regulatory content, your job is to:
1. Identify exactly what changed (new prohibitions, removed exceptions, updated language)
2. Propose specific regex rule additions or modifications for the rule pack JSON
3. Explain the legal basis for each proposed change

Format your response as a markdown document with these sections:
## Summary of Changes
## Proposed Rule Pack Updates (JSON)
## Legal Basis
## Confidence Level (High / Medium / Low)

⚠️ IMPORTANT: These are PROPOSALS ONLY. Do not state that rules have been updated — they require human review before any changes are deployed.`;

async function generateProposal(
  source: RegulationSource,
  newContent: string,
  previousContent: string | null
): Promise<string> {
  const userMessage = previousContent
    ? `Jurisdiction: ${source.jurisdiction}\nRule pack file: ${source.rule_pack_file}\nSource: ${source.label}\n\n--- PREVIOUS CONTENT (truncated to 3000 chars) ---\n${previousContent.slice(0, 3000)}\n\n--- NEW CONTENT (truncated to 3000 chars) ---\n${newContent.slice(0, 3000)}\n\nAnalyze what changed and propose rule pack updates.`
    : `Jurisdiction: ${source.jurisdiction}\nRule pack file: ${source.rule_pack_file}\nSource: ${source.label}\n\n--- CONTENT (first snapshot, truncated to 3000 chars) ---\n${newContent.slice(0, 3000)}\n\nThis is the first snapshot. Note any advertising prohibitions that should be in our rule pack.`;

  const response = await callClaude({
    systemPrompt: PROPOSAL_SYSTEM_PROMPT,
    userMessage,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 1500,
  });

  return response || 'Claude returned an empty response.';
}

// ============================================================================
// DRIVE SAVE
// ============================================================================

const SYSTEM_ORG_ID = 'system'; // Drive files owned by the system (no per-org)

async function saveToDrive(
  source: RegulationSource,
  proposal: string,
  scrapedAt: number
): Promise<string> {
  const driveService = getDriveStorageService();
  const dateStr = new Date(scrapedAt).toISOString().slice(0, 10);
  const filename = `regulation-change-${source.jurisdiction.toLowerCase()}-${dateStr}.md`;

  const content = `# Regulation Change Detected: ${source.label}

**Detected:** ${new Date(scrapedAt).toLocaleString()}
**Source:** ${source.url}
**Rule Pack:** ${source.rule_pack_file}

> ⚠️ HUMAN REVIEW REQUIRED — Do not deploy rule pack changes without legal verification.

---

${proposal}
`;

  const buffer = Buffer.from(content, 'utf8');
  const uploadResult = await driveService.uploadFile({
    userId: SYSTEM_ORG_ID,
    userEmail: 'system@bakedbot.ai',
    file: {
      buffer,
      originalName: filename,
      mimeType: 'text/plain',
      size: buffer.length,
    },
    category: 'documents',
    description: `Regulation change proposal for ${source.jurisdiction} — ${source.label}`,
    tags: ['compliance', 'regulation', source.jurisdiction.toLowerCase()],
    metadata: {
      sourceId: source.id,
      jurisdiction: source.jurisdiction,
      rulePackFile: source.rule_pack_file,
    },
  });

  if (!uploadResult.success || !uploadResult.storagePath || !uploadResult.downloadUrl) {
    throw new Error(uploadResult.error || 'Drive upload failed');
  }

  // Write drive_files Firestore doc so it appears in the BakedBot Drive UI
  const db = getAdminFirestore();
  const now = Date.now();
  const fileDoc: DriveFileDoc = {
    id: '',
    name: filename,
    mimeType: 'text/plain',
    size: buffer.length,
    storagePath: uploadResult.storagePath,
    downloadUrl: uploadResult.downloadUrl,
    folderId: null,
    path: `/${filename}`,
    ownerId: SYSTEM_ORG_ID,
    ownerEmail: 'system@bakedbot.ai',
    category: 'documents',
    tags: ['compliance', 'regulation', source.jurisdiction.toLowerCase()],
    description: `Regulation change proposal for ${source.jurisdiction} — ${source.label}`,
    metadata: {
      sourceId: source.id,
      jurisdiction: source.jurisdiction,
      rulePackFile: source.rule_pack_file,
    },
    isShared: false,
    shareIds: [],
    viewCount: 0,
    downloadCount: 0,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  const driveFileRef = await db.collection('drive_files').add(fileDoc);
  await driveFileRef.update({ id: driveFileRef.id });

  return driveFileRef.id;
}

// ============================================================================
// SLACK ALERT
// ============================================================================

async function sendSlackAlert(
  source: RegulationSource,
  driveFileId: string
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.warn('[RegulationMonitor] SLACK_WEBHOOK_URL not set — skipping alert');
    return;
  }

  const driveUrl = `https://bakedbot.ai/dashboard/drive?file=${driveFileId}`;
  const payload = {
    text: `🔔 *Regulation Change Detected*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🔔 *Regulation Change Detected*\n*${source.label}*\n\nContent at <${source.url}|${source.url}> has changed.\n\nA rule pack update proposal has been drafted. *Human review required before deploying.*`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Review Proposal in Drive' },
            url: driveUrl,
            style: 'primary',
          },
        ],
      },
    ],
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ============================================================================
// MAIN MONITOR RUN
// ============================================================================

export async function runRegulationMonitor(): Promise<MonitorRunResult> {
  const sources = regulationSources.sources as RegulationSource[];
  const checkedAt = Date.now();
  const results: RegulationChangeResult[] = [];

  logger.info('[RegulationMonitor] Starting run', { sourceCount: sources.length });

  for (const source of sources) {
    const result: RegulationChangeResult = {
      sourceId: source.id,
      jurisdiction: source.jurisdiction,
      label: source.label,
      changed: false,
      previousHash: null,
      newHash: '',
    };

    try {
      // 1. Scrape
      const content = await scrapeSource(source);
      result.newHash = hashContent(content);

      // 2. Get previous snapshot
      const previous = await getSnapshot(source.id);
      result.previousHash = previous?.contentHash ?? null;

      // 3. Check for change
      if (previous && previous.contentHash === result.newHash) {
        logger.info('[RegulationMonitor] No change', { sourceId: source.id });
        results.push(result);
        continue;
      }

      result.changed = true;
      logger.info('[RegulationMonitor] Change detected', {
        sourceId: source.id,
        previousHash: result.previousHash,
        newHash: result.newHash,
      });

      // 4. Generate proposal via Claude Haiku
      // If we have the previous content we'd diff it — for now we use the new content + note it's first snapshot
      const previousContent = previous ? null : null; // We only store hash, not full content (privacy + size)
      const proposal = await generateProposal(source, content, previousContent);

      // 5. Save to Drive
      const driveFileId = await saveToDrive(source, proposal, checkedAt);
      result.driveFileId = driveFileId;

      // 6. Slack alert
      await sendSlackAlert(source, driveFileId);

      // 7. Store new snapshot
      await saveSnapshot({
        sourceId: source.id,
        jurisdiction: source.jurisdiction,
        contentHash: result.newHash,
        scrapedAt: checkedAt,
        contentLength: content.length,
      });

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[RegulationMonitor] Source check failed', { sourceId: source.id, error: message });
      result.error = message;
    }

    results.push(result);
  }

  const changesDetected = results.filter(r => r.changed).length;

  logger.info('[RegulationMonitor] Run complete', {
    sourcesChecked: sources.length,
    changesDetected,
  });

  return {
    checkedAt,
    sourcesChecked: sources.length,
    changesDetected,
    results,
  };
}
