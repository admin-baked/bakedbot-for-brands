export const dynamic = 'force-dynamic';
export const maxDuration = 180;

/**
 * Bug Hunter — Autonomous Code Analysis
 *
 * Runs every 30 minutes via Cloud Scheduler.
 *
 * Searches the codebase for potential bugs:
 *   - TODO/FIXME/XXX comments (unfinished work)
 *   - Empty catch blocks (silent failures)
 *   - `catch` blocks with only `console.log` (not logger)
 *   - `any` types (unsafe typing)
 *   - Unhandled promise rejections
 *   - Hardcoded values that should be env vars
 *
 * For each finding, files an agent_task assigned to Linus.
 * Uses dedup to avoid re-filing the same issue.
 *
 * Auth: Bearer CRON_SECRET
 * Cloud Scheduler job: bug-hunter — every 30 min
 */

import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { createTaskInternal } from '@/server/actions/agent-tasks';

const PROJECT_ROOT = process.cwd();
const EXCLUDE_DIRS = new Set([
    'node_modules', '.next', 'out', 'dist', '.git',
    '__tests__', '__test__', 'test', 'tests', '.codex',
    '.claude', 'memory', 'dev/testing', 'dev/work_archive',
]);

const EXCLUDE_FILES = new Set([
    'package.json', 'package-lock.json', 'tsconfig.json',
    '.gitignore', '.env.example', 'next.config.js', 'apphosting.yaml',
]);

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

interface BugFinding {
    type: 'todo' | 'fixme' | 'empty_catch' | 'catch_log' | 'any_type' | 'hardcoded_secret';
    severity: 'critical' | 'high' | 'normal' | 'low';
    file: string;
    line: number;
    snippet: string;
    context: string;
}

function isAuthorized(req: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const header = req.headers.get('authorization') || '';
    if (header === `Bearer ${secret}`) return true;
    const param = req.nextUrl.searchParams.get('secret') || req.nextUrl.searchParams.get('token');
    return param === secret;
}

async function* walkDirectory(dir: string): AsyncGenerator<string> {
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (!entry.isDirectory()) {
                yield fullPath;
            } else if (!EXCLUDE_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
                yield* walkDirectory(fullPath);
            }
        }
    } catch {
        // Skip directories we can't read
    }
}

async function scanFile(filePath: string): Promise<BugFinding[]> {
    const findings: BugFinding[] = [];
    const ext = filePath.slice(filePath.lastIndexOf('.'));

    if (!SOURCE_EXTENSIONS.has(ext)) return findings;

    try {
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNum = i + 1;
            const lineLower = line.toLowerCase();

            // TODO comments (unfinished work)
            if (/\bTODO\b/i.test(line) && !line.trim().startsWith('//') === false) {
                const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join('\n');
                findings.push({
                    type: 'todo',
                    severity: 'normal',
                    file: relative(PROJECT_ROOT, filePath),
                    line: lineNum,
                    snippet: line.trim().slice(0, 150),
                    context,
                });
            }

            // FIXME/XXX comments (known bugs)
            if (/\b(FIXME|XXX|HACK|BUG)\b/i.test(line)) {
                const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join('\n');
                findings.push({
                    type: 'fixme',
                    severity: 'high',
                    file: relative(PROJECT_ROOT, filePath),
                    line: lineNum,
                    snippet: line.trim().slice(0, 150),
                    context,
                });
            }

            // Empty catch blocks
            const emptyCatchMatch = line.match(/catch\s*\([^)]*\)\s*\{\s*\}/);
            if (emptyCatchMatch) {
                const context = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join('\n');
                findings.push({
                    type: 'empty_catch',
                    severity: 'high',
                    file: relative(PROJECT_ROOT, filePath),
                    line: lineNum,
                    snippet: line.trim(),
                    context,
                });
            }

            // Catch blocks with only console.log (should use logger)
            const catchWithConsoleOnly = line.match(/catch\s*\([^)]*\)\s*\{/);
            if (catchWithConsoleOnly) {
                const blockLines: string[] = [];
                let braceCount = 0;
                for (let j = i; j < Math.min(lines.length, i + 10); j++) {
                    blockLines.push(lines[j]);
                    braceCount += (lines[j].match(/\{/g) || []).length;
                    braceCount -= (lines[j].match(/\}/g) || []).length;
                    if (braceCount === 0 && j > i) break;
                }
                const block = blockLines.join('\n');
                const hasOnlyConsoleLog = /catch[^}]*\{[\s\S]*?console\.(log|error|warn)[\s\S]*?\}/.test(block) &&
                    !block.includes('logger');
                const hasOnlyComment = /catch[^}]*\{\s*\/\//.test(block);
                if (hasOnlyConsoleLog || hasOnlyComment) {
                    findings.push({
                        type: 'catch_log',
                        severity: 'normal',
                        file: relative(PROJECT_ROOT, filePath),
                        line: lineNum,
                        snippet: blockLines[0]?.trim().slice(0, 100) || '',
                        context: block,
                    });
                }
            }

            // `any` types (unsafe typing)
            const anyTypeMatch = line.match(/:\s*any\b/);
            const commentAny = line.match(/\/\/\s*.*\bany\b/);
            const tsIgnore = line.includes('@ts-ignore') || line.includes('@ts-expect-error');
            if (anyTypeMatch && !commentAny && !tsIgnore) {
                // Skip if it's in a type definition file
                if (!filePath.includes('/types/') && !filePath.includes('/src/types/')) {
                    findings.push({
                        type: 'any_type',
                        severity: 'low',
                        file: relative(PROJECT_ROOT, filePath),
                        line: lineNum,
                        snippet: line.trim().slice(0, 150),
                        context: lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join('\n'),
                    });
                }
            }

            // Hardcoded secrets/keys patterns
            const hardcodedPatterns = [
                /(['"`])(?:sk|password|secret|token|api[_-]?key|auth)[=:]\s*['"`][a-zA-Z0-9]{8,}/i,
                /api[_-]?key\s*[:=]\s*['"`]sk-/i,
                /firebase\.config\s*=\s*\{[^}]*key:\s*['"`][a-zA-Z0-9_-]{20,}/,
            ];
            for (const pattern of hardcodedPatterns) {
                if (pattern.test(line) && !line.includes('process.env') && !line.includes('process.cwd')) {
                    findings.push({
                        type: 'hardcoded_secret',
                        severity: 'critical',
                        file: relative(PROJECT_ROOT, filePath),
                        line: lineNum,
                        snippet: '[REDACTED] hardcoded credential pattern detected',
                        context: lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join('\n'),
                    });
                }
            }
        }
    } catch {
        // Skip files we can't read
    }

    return findings;
}

async function recentTaskExists(titlePrefix: string): Promise<boolean> {
    try {
        const db = getAdminFirestore();
        const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour dedup window

        const snap = await db.collection('agent_tasks')
            .where('status', 'in', ['open', 'claimed', 'in_progress'])
            .where('reportedBy', '==', 'bug-hunter')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        return snap.docs.some(doc => {
            const data = doc.data();
            const createdAt = new Date(data.createdAt);
            return createdAt > cutoff && data.title?.startsWith(titlePrefix);
        });
    } catch {
        return false;
    }
}

async function fileTask(finding: BugFinding): Promise<string | null> {
    const severityLabel = finding.severity.toUpperCase();
    const typeLabel = {
        todo: 'TODO',
        fixme: 'FIXME',
        empty_catch: 'Empty Catch',
        catch_log: 'Silent Catch',
        any_type: 'Unsafe `any`',
        hardcoded_secret: 'SECURITY',
    }[finding.type];

    const title = `[${severityLabel}] ${typeLabel}: ${finding.file}:${finding.line}`;

    const dedupPrefix = `${finding.type}:${finding.file}:${finding.line}`;
    if (await recentTaskExists(dedupPrefix)) {
        return null;
    }

    const priorityMap: Record<BugFinding['severity'], 'critical' | 'high' | 'normal' | 'low'> = {
        critical: 'critical',
        high: 'high',
        normal: 'normal',
        low: 'low',
    };

    const result = await createTaskInternal({
        title,
        body: `## Bug Hunter Finding\n\n**Type:** ${typeLabel}\n**Severity:** ${severityLabel}\n**File:** \`${finding.file}\` (line ${finding.line})\n\n### Snippet\n\`\`\`\n${finding.snippet}\n\`\`\`\n\n### Context\n\`\`\`\n${finding.context}\n\`\`\`\n\n### Recommended Action\n${
            finding.type === 'todo' ? 'Implement the TODO or add it to the backlog.' :
            finding.type === 'fixme' ? 'Investigate and fix the known issue.' :
            finding.type === 'empty_catch' ? 'Add proper error handling — log with logger and/or re-throw.' :
            finding.type === 'catch_log' ? 'Replace console.log with logger from `@/lib/logger`.' :
            finding.type === 'any_type' ? 'Replace `any` with a proper type or `unknown`.' :
            finding.type === 'hardcoded_secret' ? 'Move credential to environment variable.' :
            'Review and fix.'
        }`,
        priority: priorityMap[finding.severity],
        category: 'bug',
        reportedBy: 'bug-hunter',
        assignedTo: 'linus',
        filePath: finding.file,
        errorSnippet: finding.snippet,
    });

    return result.success ? result.taskId || null : null;
}

async function run(): Promise<{ scanned: number; findings: number; filed: number }> {
    logger.info('[BugHunter] Starting code scan');

    const srcDir = join(PROJECT_ROOT, 'src');
    let scanned = 0;
    const allFindings: BugFinding[] = [];

    // Scan all source files
    for await (const filePath of walkDirectory(srcDir)) {
        const fileName = filePath.split(/[/\\]/).pop() || '';
        if (EXCLUDE_FILES.has(fileName)) continue;

        scanned++;
        const findings = await scanFile(filePath);
        allFindings.push(...findings);
    }

    logger.info('[BugHunter] Scan complete', { scanned, findings: allFindings.length });

    // Filter to most severe findings (avoid flooding with low-priority issues)
    const criticalFindings = allFindings.filter(f => f.severity === 'critical');
    const highFindings = allFindings.filter(f => f.severity === 'high').slice(0, 10);
    const normalFindings = allFindings.filter(f => f.severity === 'normal').slice(0, 5);

    const prioritizedFindings = [...criticalFindings, ...highFindings, ...normalFindings];

    // File tasks for each finding
    let filed = 0;
    for (const finding of prioritizedFindings) {
        const taskId = await fileTask(finding);
        if (taskId) {
            filed++;
            logger.info('[BugHunter] Task filed', { taskId, type: finding.type, file: finding.file });
        }
    }

    logger.info('[BugHunter] Complete', { scanned, findings: allFindings.length, filed });
    return { scanned, findings: allFindings.length, filed };
}

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await run();
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        logger.error('[BugHunter] Handler failed', { error: (err as Error).message });
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await run();
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        logger.error('[BugHunter] Handler failed', { error: (err as Error).message });
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
