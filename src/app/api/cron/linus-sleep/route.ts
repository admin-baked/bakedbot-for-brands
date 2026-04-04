/**
 * Linus Sleep — Nightly Codebase Learning Cron Endpoint
 *
 * Every night at 2 AM EST, Linus:
 *   1. Gets files modified in the last 7 days via git
 *   2. Reads each file (up to 20) and generates a 3-sentence summary via GLM-4-flash
 *   3. Persists each summary to Firestore at linus_code_index/{fileHash}
 *      (Letta archival save attempted first if LETTA_LINUS_AGENT_ID is configured)
 *   4. Posts a completion summary to #linus-deployments
 *
 * Cloud Scheduler:
 *   Schedule: "0 7 * * *"  (2 AM EST = 7 AM UTC)
 *   Name: linus-sleep
 *   gcloud scheduler jobs create http linus-sleep \
 *     --schedule="0 7 * * *" --time-zone="UTC" \
 *     --uri="https://<domain>/api/cron/linus-sleep" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';
import { callGLM, GLM_MODELS } from '@/ai/glm';
import { getAdminFirestore } from '@/firebase/admin';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(process.cwd());
const MAX_FILES = 20;
const MAX_FILE_SIZE_BYTES = 50_000; // Truncate files larger than 50 KB before sending to GLM
const CODE_INDEX_COLLECTION = 'linus_code_index';

const FILE_SUMMARY_SYSTEM_PROMPT = `You are Linus, AI CTO. Summarize this TypeScript file in exactly 3 sentences:
1. What it does and its role in the system
2. Key exports/functions a developer would call
3. Main risk areas or things to watch out for`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileIndexRecord {
    path: string;
    summary: string;
    lastIndexed: number;
    model: string;
}

interface FileSummaryResult {
    relativePath: string;
    summary: string;
    status: 'ok' | 'skipped' | 'error';
    errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

/**
 * Returns up to MAX_FILES recently modified .ts files (last 7 days).
 * Excludes node_modules, .w/ worktrees, and test files.
 */
function getRecentlyModifiedFiles(): string[] {
    try {
        const raw = execSync(
            'git log --since="7 days ago" --name-only --pretty=format: -- "src/**/*.ts" "src/**/*.tsx"',
            { cwd: REPO_ROOT, encoding: 'utf8', timeout: 15_000 }
        );

        const files = raw
            .split('\n')
            .map(line => line.trim())
            .filter(line =>
                line.length > 0 &&
                (line.endsWith('.ts') || line.endsWith('.tsx'))
            )
            .filter(line =>
                !line.includes('node_modules') &&
                !line.includes('/.w/') &&
                !line.includes('.test.') &&
                !line.includes('.spec.')
            );

        // Deduplicate while preserving order
        const seen = new Set<string>();
        const unique: string[] = [];
        for (const f of files) {
            if (!seen.has(f) && (f.endsWith('.ts') || f.endsWith('.tsx'))) {
                seen.add(f);
                unique.push(f);
            }
        }

        return unique.slice(0, MAX_FILES);
    } catch (error) {
        logger.error('[LinusSleep] git log failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return [];
    }
}

// ---------------------------------------------------------------------------
// File reading
// ---------------------------------------------------------------------------

function readFileSafe(relativePath: string): string | null {
    try {
        const absolutePath = path.join(REPO_ROOT, relativePath);
        const content = readFileSync(absolutePath, 'utf8');
        // Truncate very large files to avoid hitting GLM token limits
        if (Buffer.byteLength(content, 'utf8') > MAX_FILE_SIZE_BYTES) {
            return content.slice(0, MAX_FILE_SIZE_BYTES) + '\n\n[...truncated for indexing...]';
        }
        return content;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// GLM summarization
// ---------------------------------------------------------------------------

async function summarizeFile(relativePath: string, content: string): Promise<string> {
    return callGLM({
        systemPrompt: FILE_SUMMARY_SYSTEM_PROMPT,
        userMessage: `File: ${relativePath}\n\n\`\`\`typescript\n${content}\n\`\`\``,
        model: GLM_MODELS.FAST_SYNTHESIS,
        maxTokens: 256,
        temperature: 0.2,
    });
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function fileHash(relativePath: string): string {
    return createHash('sha256').update(relativePath).digest('hex').slice(0, 16);
}

async function saveToFirestore(relativePath: string, summary: string): Promise<void> {
    const db = getAdminFirestore();
    const record: FileIndexRecord = {
        path: relativePath,
        summary,
        lastIndexed: Date.now(),
        model: GLM_MODELS.FAST_SYNTHESIS,
    };
    await db
        .collection(CODE_INDEX_COLLECTION)
        .doc(fileHash(relativePath))
        .set(record, { merge: true });
}

// Letta archival save — only attempted when agent ID is configured.
async function saveToLetta(relativePath: string, summary: string): Promise<void> {
    const agentId = process.env.LETTA_LINUS_AGENT_ID;
    if (!agentId) {
        return; // Letta not configured — Firestore is the primary store
    }

    try {
        const { archivalTagsService, AGENT_TAGS } = await import('@/server/services/letta');
        await archivalTagsService.insertWithTags(agentId, {
            content: `[linus:code:${relativePath}] ${summary}`,
            tags: [AGENT_TAGS.LINUS, `linus:code`],
            agentId,
            tenantId: 'system',
        });
    } catch (error) {
        // Non-fatal: Firestore is always persisted; Letta is a best-effort layer
        logger.warn('[LinusSleep] Letta save failed (non-fatal)', {
            path: relativePath,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// ---------------------------------------------------------------------------
// Slack notification
// ---------------------------------------------------------------------------

async function notifySlack(
    indexed: number,
    durationSec: number,
    topFiles: string[],
    date: string
): Promise<void> {
    const topList = topFiles.map(f => `• \`${f}\``).join('\n') || '_(none)_';

    await postLinusIncidentSlack({
        source: 'auto-escalator',
        channelName: 'linus-deployments',
        fallbackText: `Linus Sleep — ${date}: indexed ${indexed} files in ${durationSec}s`,
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Linus Sleep — ${date}*\nIndexed *${indexed}* files | *${durationSec}s*\n\n*Top files:*\n${topList}`,
                },
            },
        ],
    });
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

async function runLinusSleep(): Promise<{
    indexed: number;
    skipped: number;
    errors: number;
    results: FileSummaryResult[];
    durationMs: number;
}> {
    const startTime = Date.now();
    const files = getRecentlyModifiedFiles();

    logger.info('[LinusSleep] Starting nightly codebase indexing', {
        fileCount: files.length,
    });

    const results: FileSummaryResult[] = [];

    // Process files sequentially to avoid GLM rate limits
    for (const relativePath of files) {
        const content = readFileSafe(relativePath);

        if (!content) {
            results.push({ relativePath, summary: '', status: 'skipped' });
            continue;
        }

        try {
            const summary = await summarizeFile(relativePath, content);

            // Primary: Firestore (always)
            await saveToFirestore(relativePath, summary);

            // Secondary: Letta archival (best-effort)
            await saveToLetta(relativePath, summary);

            results.push({ relativePath, summary, status: 'ok' });

            logger.info('[LinusSleep] Indexed file', { path: relativePath });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('[LinusSleep] Failed to index file', {
                path: relativePath,
                error: errorMessage,
            });
            results.push({ relativePath, summary: '', status: 'error', errorMessage });
        }
    }

    const durationMs = Date.now() - startTime;
    const indexed = results.filter(r => r.status === 'ok').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;

    return { indexed, skipped, errors, results, durationMs };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleRequest(req: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(req, 'linus-sleep');
    if (authError) return authError;

    const startTime = Date.now();

    try {
        const { indexed, skipped, errors, results, durationMs } = await runLinusSleep();
        const durationSec = Math.round(durationMs / 1000);
        const date = new Date().toISOString().slice(0, 10);

        // Top files = first 3 successfully indexed
        const topFiles = results
            .filter(r => r.status === 'ok')
            .slice(0, 3)
            .map(r => r.relativePath);

        // Fire-and-forget Slack notification
        notifySlack(indexed, durationSec, topFiles, date).catch(err => {
            logger.warn('[LinusSleep] Slack notification failed', {
                error: err instanceof Error ? err.message : String(err),
            });
        });

        logger.info('[LinusSleep] Completed', {
            indexed,
            skipped,
            errors,
            durationMs,
        });

        return NextResponse.json({
            success: true,
            indexed,
            skipped,
            errors,
            durationMs,
            topFiles,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logger.error('[LinusSleep] Unhandled error', {
            error: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - startTime,
        });

        return NextResponse.json(
            {
                success: false,
                error: 'Linus sleep failed',
                durationMs: Date.now() - startTime,
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    return handleRequest(req);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    return handleRequest(req);
}
