/**
 * Linus Sleep — Nightly Codebase Learning Cron Endpoint
 *
 * Every night at 2 AM EST, Linus:
 *   1. Gets files modified in the last 7 days (local git → GitHub API fallback)
 *   2. Reads each file (up to 20) via filesystem or GitHub raw content API, summarizes via GLM-4-flash
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
import { getSecret } from '@/server/utils/secrets';

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

const GH_OWNER = 'admin-baked';
const GH_REPO = 'bakedbot-for-brands';

function filterAndDedup(files: string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const f of files) {
        const trimmed = f.trim();
        if (
            trimmed.length > 0 &&
            (trimmed.endsWith('.ts') || trimmed.endsWith('.tsx')) &&
            !trimmed.includes('node_modules') &&
            !trimmed.includes('/.w/') &&
            !trimmed.includes('.test.') &&
            !trimmed.includes('.spec.') &&
            !seen.has(trimmed)
        ) {
            seen.add(trimmed);
            unique.push(trimmed);
        }
    }
    return unique.slice(0, MAX_FILES);
}

/**
 * Returns up to MAX_FILES recently modified .ts files (last 7 days).
 * Tries local git first; falls back to GitHub API in production
 * where .git directory is not available (Firebase App Hosting).
 */
async function getRecentlyModifiedFiles(): Promise<string[]> {
    // Strategy 1: local git (works in dev, CI — fast)
    try {
        const raw = execSync(
            'git log --since="7 days ago" --name-only --pretty=format: -- "src/**/*.ts" "src/**/*.tsx"',
            { cwd: REPO_ROOT, encoding: 'utf8', timeout: 15_000 }
        );
        const localFiles = filterAndDedup(raw.split('\n'));
        if (localFiles.length > 0) {
            logger.info('[LinusSleep] Using local git', { fileCount: localFiles.length });
            return localFiles;
        }
    } catch {
        // Expected in production — .git not present
    }

    // Strategy 2: GitHub API (works in production)
    logger.info('[LinusSleep] Local git unavailable, falling back to GitHub API');
    try {
        let token: string | undefined = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '')?.trim() || undefined;
        if (!token) {
            const secretVal = await getSecret('GITHUB_TOKEN');
            token = secretVal?.trim() ?? undefined;
        }
        if (!token) {
            logger.error('[LinusSleep] No GITHUB_TOKEN available for API fallback', {
                hasGH: !!process.env.GITHUB_TOKEN,
                hasGHT: !!process.env.GH_TOKEN,
                envKeys: Object.keys(process.env).filter(k => k.includes('GITHUB') || k.includes('PLAYBOOK')).join(','),
            });
            return [];
        }

        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/commits?sha=main&since=${since}&per_page=30`;

        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (!res.ok) {
            logger.error('[LinusSleep] GitHub API error', { status: res.status, body: await res.text() });
            return [];
        }

        const commits: Array<{ sha: string }> = await res.json();
        const allFiles: string[] = [];

        // Fetch file lists from up to 10 commits (avoid rate limits)
        for (const commit of commits.slice(0, 10)) {
            const detailRes = await fetch(
                `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/commits/${commit.sha}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/vnd.github+json',
                        'X-GitHub-Api-Version': '2022-11-28',
                    },
                }
            );
            if (!detailRes.ok) continue;
            const detail: { files?: Array<{ filename: string }> } = await detailRes.json();
            for (const f of detail.files || []) {
                allFiles.push(f.filename);
            }
        }

        const result = filterAndDedup(allFiles);
        logger.info('[LinusSleep] GitHub API returned files', { fileCount: result.length, commitsScanned: Math.min(commits.length, 10) });
        return result;
    } catch (error) {
        logger.error('[LinusSleep] GitHub API fallback failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return [];
    }
}

// ---------------------------------------------------------------------------
// File reading
// ---------------------------------------------------------------------------

/**
 * Read file content — local filesystem first, GitHub raw content fallback.
 */
async function readFileSafe(relativePath: string): Promise<string | null> {
    // Try local filesystem first
    try {
        const absolutePath = path.join(REPO_ROOT, relativePath);
        const content = readFileSync(absolutePath, 'utf8');
        if (content.length > 0) {
            if (Buffer.byteLength(content, 'utf8') > MAX_FILE_SIZE_BYTES) {
                return content.slice(0, MAX_FILE_SIZE_BYTES) + '\n\n[...truncated for indexing...]';
            }
            return content;
        }
    } catch {
        // Expected in production
    }

    // Fallback: GitHub raw content API
    try {
        let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
        if (!token) token = (await getSecret('GITHUB_TOKEN')) ?? undefined;
        if (!token) return null;

        const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${relativePath}?ref=main`;
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.raw+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });
        if (!res.ok) return null;

        const content = await res.text();
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
    const files = await getRecentlyModifiedFiles();

    logger.info('[LinusSleep] Starting nightly codebase indexing', {
        fileCount: files.length,
    });

    const results: FileSummaryResult[] = [];

    // Process files sequentially to avoid GLM rate limits
    for (const relativePath of files) {
        const content = await readFileSafe(relativePath);

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
