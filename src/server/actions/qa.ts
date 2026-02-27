'use server';

/**
 * QA Server Actions — Pinky Agent
 *
 * CRUD operations for:
 * - qa_bugs collection (bug tracker)
 * - qa_test_cases collection (living test plan registry)
 * - QA reporting aggregates
 *
 * Auth:
 * - Read + report_bug: any authenticated user
 * - Triage/assign/verify/close: super_user only
 */

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
    notifyNewBug,
    notifyBugFixed,
    notifyBugVerified
} from '@/server/services/qa-notifications';
import { callClaude } from '@/ai/claude';
import type {
    QABug,
    QABugStatus,
    QABugPriority,
    QABugArea,
    QATestCase,
    QATestStatus,
    QAReport,
    QASmokeRunSummary,
} from '@/types/qa';
import { QA_VALID_TRANSITIONS } from '@/types/qa';

// ============================================================================
// BUG CRUD
// ============================================================================

export async function reportBug(input: {
    title: string;
    steps: string[];
    expected: string;
    actual: string;
    priority: QABugPriority;
    area: QABugArea;
    environment?: QABug['environment'];
    affectedOrgId?: string;
    testCaseId?: string;
    screenshotUrl?: string;
    notes?: string;
}): Promise<{ success: boolean; bugId?: string; error?: string }> {
    try {
        const user = await requireUser();
        const db = getAdminFirestore();

        const bugData: Omit<QABug, 'id'> = {
            title: input.title,
            steps: input.steps,
            expected: input.expected,
            actual: input.actual,
            priority: input.priority,
            area: input.area,
            status: 'open',
            environment: input.environment || 'production',
            reportedBy: user.role === 'super_user' ? (user.email || user.uid) : user.uid,
            affectedOrgId: input.affectedOrgId,
            testCaseId: input.testCaseId,
            screenshotUrl: input.screenshotUrl,
            notes: input.notes,
            createdAt: FieldValue.serverTimestamp() as any,
            updatedAt: FieldValue.serverTimestamp() as any,
        };

        // Remove undefined fields (Firestore rejects undefined)
        const cleanData = Object.fromEntries(
            Object.entries(bugData).filter(([, v]) => v !== undefined)
        ) as Omit<QABug, 'id'>;

        const docRef = await db.collection('qa_bugs').add(cleanData);

        const newBug: QABug = { id: docRef.id, ...cleanData } as QABug;

        logger.info('[QA] Bug reported', { bugId: docRef.id, priority: input.priority, area: input.area });

        // Immediate Slack notification for P0/P1; P2/P3 queued for daily digest
        if (input.priority === 'P0' || input.priority === 'P1') {
            setImmediate(() => notifyNewBug(newBug).catch(err =>
                logger.error('[QA] Failed to send bug notification', { error: err.message })
            ));
        }

        // If linked test case, mark it failed
        if (input.testCaseId) {
            setImmediate(() =>
                updateTestCaseStatus(input.testCaseId!, 'failed', docRef.id).catch(() => {})
            );
        }

        return { success: true, bugId: docRef.id };
    } catch (error) {
        logger.error('[QA] Failed to report bug', { error: (error as Error).message });
        return { success: false, error: (error as Error).message };
    }
}

export async function updateBugStatus(
    bugId: string,
    status: QABugStatus,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser(['super_user']);
        const db = getAdminFirestore();

        const bugRef = db.collection('qa_bugs').doc(bugId);
        const bugSnap = await bugRef.get();

        if (!bugSnap.exists) {
            return { success: false, error: 'Bug not found' };
        }

        const bug = { id: bugId, ...bugSnap.data() } as QABug;

        // Validate state transition
        const validNext = QA_VALID_TRANSITIONS[bug.status] || [];
        if (!validNext.includes(status)) {
            return {
                success: false,
                error: `Invalid transition: ${bug.status} → ${status}. Valid transitions: ${validNext.join(', ') || 'none'}`
            };
        }

        const updates: Record<string, unknown> = {
            status,
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (notes) updates.notes = notes;

        if (status === 'verified' || status === 'closed') {
            updates.verifiedAt = FieldValue.serverTimestamp();
            updates.verifiedBy = user.email || user.uid;
        }

        await bugRef.update(updates);

        logger.info('[QA] Bug status updated', { bugId, from: bug.status, to: status });

        // Send notifications for key transitions
        const updatedBug: QABug = { ...bug, status, notes: notes || bug.notes };
        if (status === 'fixed') {
            setImmediate(() => notifyBugFixed(updatedBug).catch(() => {}));
        } else if (status === 'verified') {
            setImmediate(() => notifyBugVerified(updatedBug).catch(() => {}));
        }

        return { success: true };
    } catch (error) {
        logger.error('[QA] Failed to update bug status', { error: (error as Error).message, bugId });
        return { success: false, error: (error as Error).message };
    }
}

export async function assignBug(
    bugId: string,
    assignedTo: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireUser(['super_user']);
        const db = getAdminFirestore();

        const bugRef = db.collection('qa_bugs').doc(bugId);
        const bugSnap = await bugRef.get();
        if (!bugSnap.exists) return { success: false, error: 'Bug not found' };

        await bugRef.update({
            assignedTo,
            status: 'assigned',
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('[QA] Bug assigned', { bugId, assignedTo });
        return { success: true };
    } catch (error) {
        logger.error('[QA] Failed to assign bug', { error: (error as Error).message, bugId });
        return { success: false, error: (error as Error).message };
    }
}

export async function verifyFix(
    bugId: string,
    notes?: string,
    commitFixed?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser(['super_user']);
        const db = getAdminFirestore();

        const bugRef = db.collection('qa_bugs').doc(bugId);
        const bugSnap = await bugRef.get();
        if (!bugSnap.exists) return { success: false, error: 'Bug not found' };

        const bug = { id: bugId, ...bugSnap.data() } as QABug;

        const updates: Record<string, unknown> = {
            status: 'verified',
            verifiedAt: FieldValue.serverTimestamp(),
            verifiedBy: user.email || user.uid,
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (notes) updates.notes = notes;
        if (commitFixed) updates.commitFixed = commitFixed;

        await bugRef.update(updates);

        const updatedBug: QABug = { ...bug, status: 'verified', notes, commitFixed };
        setImmediate(() => notifyBugVerified(updatedBug).catch(() => {}));

        // If linked test case, mark it passed
        if (bug.testCaseId) {
            setImmediate(() =>
                updateTestCaseStatus(bug.testCaseId!, 'passed').catch(() => {})
            );
        }

        logger.info('[QA] Bug fix verified', { bugId, verifiedBy: user.email });
        return { success: true };
    } catch (error) {
        logger.error('[QA] Failed to verify fix', { error: (error as Error).message, bugId });
        return { success: false, error: (error as Error).message };
    }
}

// ============================================================================
// QUERIES
// ============================================================================

export async function getBugs(filters: {
    orgId?: string;
    status?: QABugStatus | QABugStatus[];
    priority?: QABugPriority | QABugPriority[];
    area?: QABugArea;
    assignedTo?: string;
    limit?: number;
} = {}): Promise<QABug[]> {
    try {
        const user = await requireUser();
        const db = getAdminFirestore();

        let query = db.collection('qa_bugs') as FirebaseFirestore.Query;

        // Dispensary admins can only see bugs affecting their org
        if (user.role !== 'super_user') {
            const orgId = filters.orgId || user.currentOrgId || user.brandId || user.uid;
            query = query.where('affectedOrgId', '==', orgId);
        } else if (filters.orgId) {
            query = query.where('affectedOrgId', '==', filters.orgId);
        }

        // Apply single-value filters (Firestore doesn't support array-in + orderBy well)
        if (filters.area) {
            query = query.where('area', '==', filters.area);
        }
        if (filters.assignedTo) {
            query = query.where('assignedTo', '==', filters.assignedTo);
        }
        if (filters.status && !Array.isArray(filters.status)) {
            query = query.where('status', '==', filters.status);
        }
        if (filters.priority && !Array.isArray(filters.priority)) {
            query = query.where('priority', '==', filters.priority);
        }

        query = query.orderBy('createdAt', 'desc').limit(filters.limit || 100);

        const snap = await query.get();
        const bugs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as QABug));

        // Client-side filter for array values
        let result = bugs;
        if (Array.isArray(filters.status)) {
            result = result.filter(b => (filters.status as QABugStatus[]).includes(b.status));
        }
        if (Array.isArray(filters.priority)) {
            result = result.filter(b => (filters.priority as QABugPriority[]).includes(b.priority));
        }

        return result;
    } catch (error) {
        logger.error('[QA] Failed to fetch bugs', { error: (error as Error).message });
        return [];
    }
}

export async function getBugById(bugId: string): Promise<QABug | null> {
    try {
        await requireUser();
        const db = getAdminFirestore();
        const snap = await db.collection('qa_bugs').doc(bugId).get();
        if (!snap.exists) return null;
        return { id: snap.id, ...snap.data() } as QABug;
    } catch (error) {
        logger.error('[QA] Failed to fetch bug', { error: (error as Error).message, bugId });
        return null;
    }
}

export async function getQAReport(orgId?: string): Promise<QAReport> {
    try {
        await requireUser();
        const db = getAdminFirestore();

        // Fetch all bugs (super user) or org-scoped
        let bugsQuery = db.collection('qa_bugs') as FirebaseFirestore.Query;
        if (orgId) bugsQuery = bugsQuery.where('affectedOrgId', '==', orgId);

        const [bugsSnap, testCasesSnap] = await Promise.all([
            bugsQuery.get(),
            db.collection('qa_test_cases').get(),
        ]);

        const bugs = bugsSnap.docs.map(d => d.data() as QABug);

        const byPriority: Record<string, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
        const byStatus: Record<string, number> = {
            open: 0, triaged: 0, assigned: 0, in_progress: 0,
            fixed: 0, verified: 0, closed: 0, wont_fix: 0
        };
        const byArea: Record<string, number> = {};

        let openCount = 0;

        for (const bug of bugs) {
            byStatus[bug.status] = (byStatus[bug.status] || 0) + 1;
            byPriority[bug.priority] = (byPriority[bug.priority] || 0) + 1;
            byArea[bug.area] = (byArea[bug.area] || 0) + 1;
            if (!['closed', 'wont_fix', 'verified'].includes(bug.status)) openCount++;
        }

        const testCases = testCasesSnap.docs.map(d => d.data() as QATestCase);
        const totalTests = testCases.length;
        const passing = testCases.filter(t => t.status === 'passed').length;
        const failing = testCases.filter(t => t.status === 'failed').length;
        const untested = testCases.filter(t => t.status === 'untested').length;
        const coveragePct = totalTests > 0 ? Math.round((passing / totalTests) * 100) : 0;

        return {
            total: bugs.length,
            open: openCount,
            byPriority: byPriority as QAReport['byPriority'],
            byStatus: byStatus as QAReport['byStatus'],
            byArea: byArea as QAReport['byArea'],
            testCoverage: { total: totalTests, passing, failing, untested, coveragePct },
            generatedAt: new Date(),
        };
    } catch (error) {
        logger.error('[QA] Failed to generate QA report', { error: (error as Error).message });
        return {
            total: 0, open: 0,
            byPriority: { P0: 0, P1: 0, P2: 0, P3: 0 },
            byStatus: { open: 0, triaged: 0, assigned: 0, in_progress: 0, fixed: 0, verified: 0, closed: 0, wont_fix: 0 },
            byArea: {},
            testCoverage: { total: 0, passing: 0, failing: 0, untested: 0, coveragePct: 0 },
            generatedAt: new Date(),
        };
    }
}

// ============================================================================
// TEST CASE REGISTRY
// ============================================================================

export async function updateTestCaseStatus(
    testCaseId: string,
    status: QATestStatus,
    linkedBugId?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser();
        const db = getAdminFirestore();

        const updates: Record<string, unknown> = {
            status,
            lastTestedAt: FieldValue.serverTimestamp(),
            lastTestedBy: user.uid,
        };
        if (linkedBugId) updates.linkedBugId = linkedBugId;

        await db.collection('qa_test_cases').doc(testCaseId).update(updates);
        logger.info('[QA] Test case status updated', { testCaseId, status });
        return { success: true };
    } catch (error) {
        // Silently fail — test cases might not exist yet during bootstrap
        logger.warn('[QA] Could not update test case status', { testCaseId, error: (error as Error).message });
        return { success: false, error: (error as Error).message };
    }
}

export async function getTestCases(filters: {
    area?: string;
    status?: QATestStatus;
    limit?: number;
} = {}): Promise<QATestCase[]> {
    try {
        await requireUser();
        const db = getAdminFirestore();

        let query = db.collection('qa_test_cases') as FirebaseFirestore.Query;
        if (filters.area) query = query.where('area', '==', filters.area);
        if (filters.status) query = query.where('status', '==', filters.status);
        query = query.limit(filters.limit || 200);

        const snap = await query.get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as QATestCase));
    } catch (error) {
        logger.error('[QA] Failed to fetch test cases', { error: (error as Error).message });
        return [];
    }
}

// ============================================================================
// REGRESSION HISTORY
// Returns closed/verified bugs for an area, sorted most recent first.
// Use this to detect when the same area keeps breaking.
// ============================================================================

export async function getRegressionHistory(area: QABugArea): Promise<QABug[]> {
    try {
        await requireUser();
        const db = getAdminFirestore();

        const snap = await db.collection('qa_bugs')
            .where('area', '==', area)
            .where('status', 'in', ['verified', 'closed', 'fixed'])
            .orderBy('updatedAt', 'desc')
            .limit(20)
            .get();

        return snap.docs.map(d => ({ id: d.id, ...d.data() } as QABug));
    } catch (error) {
        logger.error('[QA] Failed to fetch regression history', { error: (error as Error).message, area });
        return [];
    }
}

// ============================================================================
// SMOKE TEST RESULTS PERSISTENCE
// ============================================================================

export async function saveSmokeRunResult(summary: QASmokeRunSummary): Promise<void> {
    try {
        const db = getAdminFirestore();
        await db.collection('qa_smoke_runs').add({
            ...summary,
            savedAt: FieldValue.serverTimestamp(),
        });
        logger.info('[QA] Smoke run result saved', {
            runId: summary.runId,
            passed: summary.passed,
            failed: summary.failed
        });
    } catch (error) {
        logger.error('[QA] Failed to save smoke run result', { error: (error as Error).message });
    }
}

// ============================================================================
// AI TEST CASE GENERATION
// ============================================================================

export async function generateTestCasesFromSpec(input: {
    featureName: string;
    specContent: string;
    area: QABugArea;
    count?: number;
}): Promise<{ success: boolean; testCases?: QATestCase[]; error?: string }> {
    try {
        const user = await requireUser(['super_user']);
        const db = getAdminFirestore();

        const count = input.count ?? 10;

        const rawJson = await callClaude({
            systemPrompt: `You are a QA engineer generating structured test cases from a feature spec.
Return ONLY a valid JSON array (no markdown, no code block) with exactly ${count} test case objects.
Each object must have these fields:
- title: string (short descriptive test name)
- steps: string (numbered steps, e.g. "1. Do X\\n2. Do Y\\n3. Check Z")
- expected: string (what should happen)
- priority: "critical" | "medium" | "low"`,
            userMessage: `Feature: ${input.featureName}\nArea: ${input.area}\n\nSpec:\n${input.specContent}\n\nGenerate ${count} test cases covering happy paths, edge cases, and failure scenarios.`,
            maxTokens: 4096,
        });

        let parsed: Array<{ title: string; steps: string; expected: string; priority: 'critical' | 'medium' | 'low' }>;
        try {
            // Strip any accidental markdown fences
            const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch {
            return { success: false, error: 'Claude returned invalid JSON — try again with a shorter spec' };
        }

        const batch = db.batch();
        const testCases: QATestCase[] = [];

        parsed.forEach((tc, i) => {
            const id = `${input.area}_${Date.now()}_${i}`;
            const docRef = db.collection('qa_test_cases').doc(id);
            const testCase: QATestCase = {
                id,
                area: input.featureName,
                title: tc.title,
                steps: tc.steps,
                expected: tc.expected,
                priority: tc.priority,
                status: 'untested',
                lastTestedBy: user.uid,
            };
            batch.set(docRef, testCase);
            testCases.push(testCase);
        });

        await batch.commit();
        logger.info('[QA] Test cases generated', { area: input.area, count: testCases.length });
        return { success: true, testCases };
    } catch (error) {
        logger.error('[QA] Failed to generate test cases', { error: (error as Error).message });
        return { success: false, error: (error as Error).message };
    }
}

// ============================================================================
// INBOX THREAD CONTENT READER
// Used by Pinky to extract bug details from customer-reported inbox conversations
// ============================================================================

export async function getInboxThreadContent(threadId: string): Promise<{
    success: boolean;
    content?: string;
    orgId?: string;
    error?: string;
}> {
    try {
        await requireUser(['super_user']);
        const db = getAdminFirestore();

        const snap = await db.collection('inbox_threads').doc(threadId).get();
        if (!snap.exists) {
            return { success: false, error: 'Thread not found' };
        }

        const data = snap.data() as {
            orgId?: string;
            messages?: Array<{ role?: string; type?: string; content?: string; text?: string }>;
        };

        const messages = data.messages ?? [];
        const formatted = messages.map((m, i) => {
            const role = m.role ?? m.type ?? `message_${i}`;
            const content = m.content ?? m.text ?? '';
            return `${role}: ${content}`;
        }).join('\n\n');

        return {
            success: true,
            content: formatted || '(no messages found)',
            orgId: data.orgId,
        };
    } catch (error) {
        logger.error('[QA] Failed to read inbox thread', { error: (error as Error).message, threadId });
        return { success: false, error: (error as Error).message };
    }
}
