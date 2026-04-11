export const dynamic = 'force-dynamic';
/**
 * Security Scan Agent — Autonomous RARV Security Patrol
 *
 * "Red" is BakedBot's security watchdog. Runs the RARV cycle:
 *   REASON → identify attack surfaces and recent changes
 *   ACT    → run security checks (OWASP, auth, secrets, headers, injections)
 *   REFLECT → log findings to Firestore, track trends
 *   VERIFY  → confirm fixes, re-test, report to Slack
 *
 * Trigger: Cloud Scheduler (nightly 3 AM CST) or manual
 *   POST /api/cron/security-scan   Authorization: Bearer $CRON_SECRET
 *   Body: { scanType?: 'full' | 'quick' | 'headers-only', skipSlack?: boolean }
 *
 * Uses Groq (free) for analysis → Claude Haiku fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';
import { callGroqOrClaude } from '@/ai/glm';

export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;
const PROD_URL = process.env.NEXT_PUBLIC_APP_URL
    || 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

// ============================================================================
// AUTH
// ============================================================================

function isAuthorized(req: NextRequest): boolean {
    if (!CRON_SECRET) return false;
    const header = req.headers.get('authorization') || '';
    if (header === `Bearer ${CRON_SECRET}`) return true;
    const param = req.nextUrl.searchParams.get('token') || req.nextUrl.searchParams.get('secret');
    return param === CRON_SECRET;
}

// ============================================================================
// SECURITY CHECK DEFINITIONS
// ============================================================================

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface SecurityCheck {
    id: string;
    name: string;
    category: string;
    severity: Severity;
    run: () => Promise<SecurityFinding | null>;
}

interface SecurityFinding {
    checkId: string;
    name: string;
    category: string;
    severity: Severity;
    passed: boolean;
    detail: string;
    recommendation?: string;
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...opts, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

function buildChecks(scanType: string): SecurityCheck[] {
    const checks: SecurityCheck[] = [];

    // ── CATEGORY 1: HTTP Security Headers ──────────────────────────────────

    checks.push({
        id: 'headers-csp',
        name: 'Content-Security-Policy header present',
        category: 'headers',
        severity: 'high',
        run: async () => {
            const res = await fetchWithTimeout(PROD_URL);
            const csp = res.headers.get('content-security-policy') || res.headers.get('content-security-policy-report-only');
            return {
                checkId: 'headers-csp',
                name: 'Content-Security-Policy header present',
                category: 'headers',
                severity: 'high',
                passed: !!csp,
                detail: csp ? `CSP: ${csp.slice(0, 200)}...` : 'No CSP header found',
                recommendation: csp ? undefined : 'Add Content-Security-Policy header to next.config.js',
            };
        },
    });

    checks.push({
        id: 'headers-hsts',
        name: 'Strict-Transport-Security header',
        category: 'headers',
        severity: 'high',
        run: async () => {
            const res = await fetchWithTimeout(PROD_URL);
            const hsts = res.headers.get('strict-transport-security');
            return {
                checkId: 'headers-hsts',
                name: 'Strict-Transport-Security header',
                category: 'headers',
                severity: 'high',
                passed: !!hsts,
                detail: hsts ? `HSTS: ${hsts}` : 'No HSTS header',
                recommendation: hsts ? undefined : 'Add Strict-Transport-Security header with max-age=31536000; includeSubDomains',
            };
        },
    });

    checks.push({
        id: 'headers-xframe',
        name: 'X-Frame-Options / frame-ancestors protection',
        category: 'headers',
        severity: 'medium',
        run: async () => {
            const res = await fetchWithTimeout(PROD_URL);
            const xframe = res.headers.get('x-frame-options');
            const csp = res.headers.get('content-security-policy') || '';
            const hasFrameAncestors = csp.includes('frame-ancestors');
            const passed = !!xframe || hasFrameAncestors;
            return {
                checkId: 'headers-xframe',
                name: 'X-Frame-Options / frame-ancestors',
                category: 'headers',
                severity: 'medium',
                passed,
                detail: passed ? `X-Frame-Options: ${xframe || 'via CSP frame-ancestors'}` : 'No clickjacking protection',
                recommendation: passed ? undefined : 'Add X-Frame-Options: DENY or CSP frame-ancestors directive',
            };
        },
    });

    checks.push({
        id: 'headers-xcontent',
        name: 'X-Content-Type-Options: nosniff',
        category: 'headers',
        severity: 'medium',
        run: async () => {
            const res = await fetchWithTimeout(PROD_URL);
            const val = res.headers.get('x-content-type-options');
            return {
                checkId: 'headers-xcontent',
                name: 'X-Content-Type-Options: nosniff',
                category: 'headers',
                severity: 'medium',
                passed: val === 'nosniff',
                detail: val ? `X-Content-Type-Options: ${val}` : 'Header missing',
            };
        },
    });

    if (scanType === 'headers-only') return checks;

    // ── CATEGORY 2: Authentication & Authorization ─────────────────────────

    checks.push({
        id: 'auth-cron-reject',
        name: 'Cron endpoints reject unauthenticated requests',
        category: 'auth',
        severity: 'critical',
        run: async () => {
            const endpoints = ['/api/cron/pos-sync', '/api/cron/send-campaign', '/api/cron/daily-briefing'];
            const results = await Promise.all(endpoints.map(async ep => {
                const res = await fetchWithTimeout(`${PROD_URL}${ep}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
                return { ep, status: res.status };
            }));
            const allRejected = results.every(r => r.status === 401 || r.status === 403);
            const failures = results.filter(r => r.status !== 401 && r.status !== 403);
            return {
                checkId: 'auth-cron-reject',
                name: 'Cron endpoints reject unauthenticated',
                category: 'auth',
                severity: 'critical',
                passed: allRejected,
                detail: allRejected
                    ? `All ${endpoints.length} cron endpoints correctly return 401/403`
                    : `FAIL: ${failures.map(f => `${f.ep} returned ${f.status}`).join(', ')}`,
                recommendation: allRejected ? undefined : 'Add CRON_SECRET auth check to failing endpoints',
            };
        },
    });

    checks.push({
        id: 'auth-admin-reject',
        name: 'Admin endpoints reject unauthenticated requests',
        category: 'auth',
        severity: 'critical',
        run: async () => {
            const endpoints = ['/api/admin/set-claims', '/api/admin/seed', '/api/admin/debug-user'];
            const results = await Promise.all(endpoints.map(async ep => {
                const res = await fetchWithTimeout(`${PROD_URL}${ep}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
                return { ep, status: res.status };
            }));
            const allRejected = results.every(r => r.status === 401 || r.status === 403);
            const failures = results.filter(r => r.status !== 401 && r.status !== 403);
            return {
                checkId: 'auth-admin-reject',
                name: 'Admin endpoints reject unauthenticated',
                category: 'auth',
                severity: 'critical',
                passed: allRejected,
                detail: allRejected
                    ? `All ${endpoints.length} admin endpoints correctly reject`
                    : `FAIL: ${failures.map(f => `${f.ep} returned ${f.status}`).join(', ')}`,
            };
        },
    });

    checks.push({
        id: 'auth-csrf-chat',
        name: 'Chat API requires CSRF token',
        category: 'auth',
        severity: 'high',
        run: async () => {
            const res = await fetchWithTimeout(`${PROD_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'test', orgId: 'test' }),
            });
            const passed = res.status === 403;
            const body = await res.text().catch(() => '');
            return {
                checkId: 'auth-csrf-chat',
                name: 'Chat API requires CSRF',
                category: 'auth',
                severity: 'high',
                passed,
                detail: passed ? 'CSRF protection active (403 without token)' : `Chat API returned ${res.status}: ${body.slice(0, 100)}`,
            };
        },
    });

    if (scanType === 'quick') return checks;

    // ── CATEGORY 3: Information Disclosure ──────────────────────────────────

    checks.push({
        id: 'info-error-disclosure',
        name: 'Error pages do not leak stack traces',
        category: 'info_disclosure',
        severity: 'high',
        run: async () => {
            const res = await fetchWithTimeout(`${PROD_URL}/api/this-will-404-security-test`);
            const body = await res.text().catch(() => '');
            const leaksInfo = /stack|trace|at\s+\w+|node_modules|\.ts:|\.js:|internal\/|Error:/i.test(body);
            return {
                checkId: 'info-error-disclosure',
                name: 'Error pages do not leak stack traces',
                category: 'info_disclosure',
                severity: 'high',
                passed: !leaksInfo,
                detail: leaksInfo ? `Stack trace or internal path leaked in error response` : 'Error response is clean',
                recommendation: leaksInfo ? 'Sanitize error responses to remove stack traces and internal paths' : undefined,
            };
        },
    });

    checks.push({
        id: 'info-server-header',
        name: 'Server header does not reveal technology',
        category: 'info_disclosure',
        severity: 'low',
        run: async () => {
            const res = await fetchWithTimeout(PROD_URL);
            const server = res.headers.get('server') || '';
            const xPoweredBy = res.headers.get('x-powered-by') || '';
            const leaks = server.toLowerCase().includes('next') || xPoweredBy.toLowerCase().includes('next');
            return {
                checkId: 'info-server-header',
                name: 'Server header privacy',
                category: 'info_disclosure',
                severity: 'low',
                passed: !leaks,
                detail: leaks ? `Server: ${server}, X-Powered-By: ${xPoweredBy}` : 'No technology leakage in headers',
                recommendation: leaks ? 'Remove X-Powered-By header in next.config.js (poweredByHeader: false)' : undefined,
            };
        },
    });

    checks.push({
        id: 'info-env-exposure',
        name: 'Environment files not publicly accessible',
        category: 'info_disclosure',
        severity: 'critical',
        run: async () => {
            const sensitiveFiles = ['/.env', '/.env.local', '/service-account.json', '/.git/config', '/apphosting.yaml'];
            const results = await Promise.all(sensitiveFiles.map(async f => {
                const res = await fetchWithTimeout(`${PROD_URL}${f}`);
                return { file: f, status: res.status, accessible: res.status === 200 };
            }));
            const exposed = results.filter(r => r.accessible);
            return {
                checkId: 'info-env-exposure',
                name: 'Sensitive files not accessible',
                category: 'info_disclosure',
                severity: 'critical',
                passed: exposed.length === 0,
                detail: exposed.length === 0
                    ? `All ${sensitiveFiles.length} sensitive paths return non-200`
                    : `EXPOSED: ${exposed.map(e => e.file).join(', ')}`,
                recommendation: exposed.length > 0 ? 'Block access to sensitive files via middleware or .htaccess' : undefined,
            };
        },
    });

    // ── CATEGORY 4: Injection Vectors ──────────────────────────────────────

    checks.push({
        id: 'inject-xss-reflection',
        name: 'XSS reflection test on search/input endpoints',
        category: 'injection',
        severity: 'critical',
        run: async () => {
            const xssPayload = '<script>alert("xss")</script>';
            const testUrls = [
                `${PROD_URL}/menu/thrive-syracuse?search=${encodeURIComponent(xssPayload)}`,
                `${PROD_URL}/thrivesyracuse?q=${encodeURIComponent(xssPayload)}`,
            ];
            const results = await Promise.all(testUrls.map(async url => {
                const res = await fetchWithTimeout(url);
                const body = await res.text().catch(() => '');
                // Check if raw script tag appears in response (unescaped)
                const reflected = body.includes('<script>alert("xss")</script>');
                return { url, reflected };
            }));
            const vulnerable = results.filter(r => r.reflected);
            return {
                checkId: 'inject-xss-reflection',
                name: 'XSS reflection test',
                category: 'injection',
                severity: 'critical',
                passed: vulnerable.length === 0,
                detail: vulnerable.length === 0
                    ? 'No XSS reflection detected on tested endpoints'
                    : `VULNERABLE: ${vulnerable.map(v => v.url).join(', ')}`,
                recommendation: vulnerable.length > 0 ? 'Sanitize all user input before rendering. Use React auto-escaping.' : undefined,
            };
        },
    });

    checks.push({
        id: 'inject-sql-basic',
        name: 'SQL injection basic probe',
        category: 'injection',
        severity: 'critical',
        run: async () => {
            const sqlPayload = "'; DROP TABLE users; --";
            const testUrls = [
                `${PROD_URL}/api/products/public/thrive-syracuse?search=${encodeURIComponent(sqlPayload)}`,
                `${PROD_URL}/menu/thrive-syracuse?category=${encodeURIComponent(sqlPayload)}`,
            ];
            const results = await Promise.all(testUrls.map(async url => {
                const res = await fetchWithTimeout(url);
                const body = await res.text().catch(() => '');
                // Check for SQL error messages in response
                const sqlError = /sql|syntax|mysql|postgres|sqlite|sequelize|typeorm|prisma|query failed/i.test(body);
                return { url, sqlError, status: res.status };
            }));
            const vulnerable = results.filter(r => r.sqlError);
            return {
                checkId: 'inject-sql-basic',
                name: 'SQL injection probe',
                category: 'injection',
                severity: 'critical',
                passed: vulnerable.length === 0,
                detail: vulnerable.length === 0
                    ? 'No SQL error disclosure detected'
                    : `SQL errors exposed: ${vulnerable.map(v => v.url).join(', ')}`,
            };
        },
    });

    // ── CATEGORY 5: Rate Limiting ──────────────────────────────────────────

    checks.push({
        id: 'rate-limit-chat',
        name: 'Chat API has rate limiting',
        category: 'rate_limiting',
        severity: 'medium',
        run: async () => {
            // Send 10 rapid requests to chat API
            const results = await Promise.all(
                Array.from({ length: 10 }, () =>
                    fetchWithTimeout(`${PROD_URL}/api/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: 'test' }),
                    }).then(r => r.status).catch(() => 0)
                )
            );
            const has429 = results.some(s => s === 429);
            const allSameStatus = results.every(s => s === results[0]);
            return {
                checkId: 'rate-limit-chat',
                name: 'Chat API rate limiting',
                category: 'rate_limiting',
                severity: 'medium',
                passed: has429,
                detail: has429
                    ? 'Rate limiting active (429 detected)'
                    : `No 429 in ${results.length} rapid requests (statuses: ${[...new Set(results)].join(', ')})`,
                recommendation: has429 ? undefined : 'Consider adding rate limiting to /api/chat to prevent abuse',
            };
        },
    });

    // ── CATEGORY 6: CORS Policy ────────────────────────────────────────────

    checks.push({
        id: 'cors-wildcard',
        name: 'CORS does not allow wildcard origin',
        category: 'cors',
        severity: 'high',
        run: async () => {
            const res = await fetchWithTimeout(`${PROD_URL}/api/health`, {
                headers: { 'Origin': 'https://evil-site.com' },
            });
            const allowOrigin = res.headers.get('access-control-allow-origin') || '';
            const isWildcard = allowOrigin === '*';
            const reflectsEvil = allowOrigin === 'https://evil-site.com';
            return {
                checkId: 'cors-wildcard',
                name: 'CORS origin policy',
                category: 'cors',
                severity: 'high',
                passed: !isWildcard && !reflectsEvil,
                detail: isWildcard ? 'CORS allows * (any origin)' : reflectsEvil ? 'CORS reflects arbitrary origins' : `CORS origin: ${allowOrigin || 'not set (good)'}`,
                recommendation: (isWildcard || reflectsEvil) ? 'Restrict CORS to known domains only' : undefined,
            };
        },
    });

    return checks;
}

// ============================================================================
// AI ANALYSIS (Groq free → Haiku fallback)
// ============================================================================

async function analyzeFindings(findings: SecurityFinding[]): Promise<string> {
    const failures = findings.filter(f => !f.passed);
    if (failures.length === 0) return 'All security checks passing. No action needed.';

    const summary = failures.map(f => `- [${f.severity.toUpperCase()}] ${f.name}: ${f.detail}`).join('\n');

    try {
        const response = await callGroqOrClaude({
            userMessage: `Analyze these security findings and provide a prioritized action plan.\n\nFindings:\n${summary}\n\nProvide:\n1. Risk summary (2-3 sentences)\n2. Immediate actions (P0 — fix today)\n3. Short-term actions (P1 — fix this week)\n4. Long-term recommendations\n\nBe specific and actionable. No fluff.`,
            systemPrompt: 'You are Red, BakedBot\'s security agent. You analyze security scan results and provide clear, prioritized remediation plans.',
            caller: 'security-scan',
        });
        return typeof response === 'string' ? response : JSON.stringify(response);
    } catch {
        // Fallback: just return the raw findings
        return `${failures.length} security issues found:\n${summary}`;
    }
}

// ============================================================================
// PERSISTENCE & REPORTING
// ============================================================================

interface SecurityScanRun {
    scanId: string;
    scanType: string;
    timestamp: string;
    total: number;
    passed: number;
    failed: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    findings: SecurityFinding[];
    aiAnalysis: string;
}

async function persistScan(run: SecurityScanRun): Promise<void> {
    const db = getAdminFirestore();
    await db.collection('security_scans').doc(run.scanId).set(run);

    // Also update the latest scan pointer
    await db.collection('security_scans').doc('_latest').set({
        scanId: run.scanId,
        timestamp: run.timestamp,
        passed: run.passed,
        failed: run.failed,
        critical: run.critical,
    });
}

async function postSlackReport(run: SecurityScanRun, skipSlack: boolean): Promise<void> {
    if (skipSlack) return;

    const allPassed = run.failed === 0;
    const emoji = allPassed ? ':shield:' : ':rotating_light:';
    const status = allPassed ? 'ALL CLEAR' : `${run.failed} ISSUES (${run.critical} critical)`;

    const failureLines = run.findings
        .filter(f => !f.passed)
        .sort((a, b) => {
            const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
            return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
        })
        .map(f => `  [${f.severity.toUpperCase()}] ${f.name}`)
        .join('\n');

    const text = [
        `${emoji} *Security Scan — ${status}*`,
        `Type: ${run.scanType} | ${run.passed}/${run.total} passed`,
        failureLines ? `\n*Findings:*\n${failureLines}` : '',
        run.aiAnalysis ? `\n*Red's Analysis:*\n${run.aiAnalysis.slice(0, 500)}` : '',
    ].filter(Boolean).join('\n');

    try {
        await slackService.postMessage('ceo', text);
    } catch {
        try { await slackService.postMessage('linus-deployments', text); } catch { /* silent */ }
    }
}

// ============================================================================
// MAIN
// ============================================================================

async function runSecurityScan(scanType: string, skipSlack: boolean): Promise<SecurityScanRun> {
    const scanId = `sec-scan-${Date.now()}`;
    const checks = buildChecks(scanType);

    logger.info('[SecurityScan] Starting', { scanId, scanType, checks: checks.length });

    // Run all checks (parallel within categories for speed)
    const findings: SecurityFinding[] = [];
    for (const check of checks) {
        try {
            const result = await check.run();
            if (result) findings.push(result);
        } catch (err) {
            findings.push({
                checkId: check.id,
                name: check.name,
                category: check.category,
                severity: check.severity,
                passed: false,
                detail: `Check failed to execute: ${(err as Error).message}`,
            });
        }
    }

    const passed = findings.filter(f => f.passed).length;
    const failed = findings.filter(f => !f.passed).length;
    const critical = findings.filter(f => !f.passed && f.severity === 'critical').length;
    const high = findings.filter(f => !f.passed && f.severity === 'high').length;
    const medium = findings.filter(f => !f.passed && f.severity === 'medium').length;
    const low = findings.filter(f => !f.passed && f.severity === 'low').length;

    // AI analysis of findings
    const aiAnalysis = await analyzeFindings(findings);

    const run: SecurityScanRun = {
        scanId,
        scanType,
        timestamp: new Date().toISOString(),
        total: findings.length,
        passed,
        failed,
        critical,
        high,
        medium,
        low,
        findings,
        aiAnalysis,
    };

    // Persist + report
    try { await persistScan(run); } catch (err) {
        logger.error('[SecurityScan] Persist failed', { error: (err as Error).message });
    }
    await postSlackReport(run, skipSlack);

    logger.info('[SecurityScan] Complete', { scanId, passed, failed, critical });
    return run;
}

export async function POST(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const scanType = body.scanType || 'full';
        const skipSlack = body.skipSlack === true;

        const run = await runSecurityScan(scanType, skipSlack);
        return NextResponse.json({ success: true, ...run });
    } catch (error) {
        logger.error('[SecurityScan] Handler failed', { error: (error as Error).message });
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const scanType = request.nextUrl.searchParams.get('type') || 'quick';
        const skipSlack = request.nextUrl.searchParams.get('skipSlack') === 'true';

        const run = await runSecurityScan(scanType, skipSlack);
        return NextResponse.json({ success: true, ...run });
    } catch (error) {
        logger.error('[SecurityScan] Handler failed', { error: (error as Error).message });
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
