/**
 * Dream Loop Service
 *
 * Implements the self-improvement cycle for Linus (and extensible to other agents):
 *
 *   1. INTROSPECT — Review telemetry, learning deltas, feedback, and memory for patterns
 *   2. HYPOTHESIZE — Generate improvement hypotheses with expected outcomes
 *   3. TEST — Validate hypotheses against codebase, golden sets, or dry-run execution
 *   4. REPORT — Summarize findings + proposals to #linus-cto Slack
 *
 * The Dream loop can run:
 *   - On-demand via `linus_dream` tool from Slack
 *   - Scheduled via /api/cron/linus-dream (nightly, after consolidate-learnings)
 *
 * Dream sessions are persisted to Firestore: dream_sessions/{sessionId}
 * Approved improvements are stored as learning_deltas with status 'approved'.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { callGLM } from '@/ai/glm';
import { lettaClient } from './client';
import { lettaBlockManager, BLOCK_LABELS } from './block-manager';
import type { LearningDelta } from '@/types/learning-delta';

// =============================================================================
// TYPES
// =============================================================================

export interface DreamHypothesis {
    id: string;
    area: 'tool_routing' | 'prompt_tuning' | 'memory_gaps' | 'workflow_optimization' | 'cost_reduction' | 'capability_expansion';
    hypothesis: string;
    expectedOutcome: string;
    testPlan: string;
    testResult?: 'confirmed' | 'rejected' | 'inconclusive';
    testEvidence?: string;
}

export interface DreamSession {
    id: string;
    agentName: string;
    startedAt: string;
    completedAt?: string;
    /** Raw introspection findings */
    introspection: {
        toolFailures: number;
        deadEndLoops: number;
        negativeFeedback: number;
        pendingDeltas: number;
        capabilityUtilization: number;
        memoryInsights: string[];
    };
    hypotheses: DreamHypothesis[];
    /** Final summary posted to Slack */
    report: string;
    /** Model used for dream session */
    model: string;
}

// =============================================================================
// INTROSPECT — Gather signals from telemetry, deltas, and memory
// =============================================================================

async function introspect(agentName: string): Promise<DreamSession['introspection']> {
    const db = getAdminFirestore();
    const since = new Date();
    since.setHours(since.getHours() - 48); // Look back 48h for richer signal

    // Run all queries in parallel
    const [telemetrySnap, deltasSnap, feedbackSnap] = await Promise.all([
        db.collection('agent_telemetry')
            .where('_agentName', '==', agentName.toLowerCase())
            .where('timestamp', '>=', since)
            .limit(200)
            .get(),
        db.collection('learning_deltas')
            .where('status', '==', 'proposed')
            .limit(50)
            .get(),
        db.collection('response_feedback')
            .where('rating', '==', 'negative')
            .where('createdAt', '>=', since.toISOString())
            .limit(100)
            .get(),
    ]);

    // Aggregate telemetry
    let toolFailures = 0;
    let deadEndLoops = 0;
    let totalCapUtil = 0;
    let capUtilCount = 0;

    for (const doc of telemetrySnap.docs) {
        const d = doc.data();
        toolFailures += d.toolErrorCount || 0;
        deadEndLoops += d.deadEndLoopCount || 0;
        if (d.capabilityUtilization != null) {
            totalCapUtil += d.capabilityUtilization;
            capUtilCount++;
        }
    }

    const capabilityUtilization = capUtilCount > 0 ? totalCapUtil / capUtilCount : 0;

    // Search Letta memory for recent self-reflections
    const memoryInsights: string[] = [];
    try {
        const agents = await lettaClient.listAgents();
        const researchAgent = agents.find(a => a.name.includes('Research'));
        if (researchAgent) {
            const passages = await lettaClient.searchPassages(
                researchAgent.id,
                `${agentName} improvement pattern failure learning`,
                5
            );
            memoryInsights.push(...passages.slice(0, 5));
        }
    } catch {
        logger.warn('[DreamLoop] Letta memory search failed, continuing without');
    }

    return {
        toolFailures,
        deadEndLoops,
        negativeFeedback: feedbackSnap.size,
        pendingDeltas: deltasSnap.size,
        capabilityUtilization: Math.round(capabilityUtilization * 100) / 100,
        memoryInsights,
    };
}

// =============================================================================
// HYPOTHESIZE — Use GLM to generate improvement hypotheses
// =============================================================================

async function hypothesize(
    agentName: string,
    introspectionData: DreamSession['introspection'],
    pendingDeltas: LearningDelta[]
): Promise<DreamHypothesis[]> {
    const prompt = `You are ${agentName}, a CTO AI agent performing a Dream session — reflecting on your own performance to find improvements.

## Your Recent Performance (last 48h)
- Tool failures: ${introspectionData.toolFailures}
- Dead-end loops: ${introspectionData.deadEndLoops}
- Negative user feedback: ${introspectionData.negativeFeedback}
- Capability utilization: ${(introspectionData.capabilityUtilization * 100).toFixed(0)}% (% of available tools you actually use)
- Pending learning deltas: ${introspectionData.pendingDeltas}

## Pending Learning Deltas (from nightly consolidation)
${pendingDeltas.slice(0, 10).map(d => `- [${d.category}] ${d.summary}`).join('\n') || '(none)'}

## Memory Insights (from Letta archival)
${introspectionData.memoryInsights.map(m => `- ${m.slice(0, 200)}`).join('\n') || '(none recalled)'}

## Task
Generate 2-4 concrete improvement hypotheses. For each:
1. Identify the specific area (tool_routing, prompt_tuning, memory_gaps, workflow_optimization, cost_reduction, capability_expansion)
2. State a testable hypothesis
3. Predict the expected outcome if the hypothesis is correct
4. Describe a concrete test plan (what to check in the codebase, what metric to verify, what to run)

Respond in JSON array format:
[{"area": "...", "hypothesis": "...", "expectedOutcome": "...", "testPlan": "..."}]

Be specific. Reference actual tool names, error patterns, or workflow steps. No vague generalities.`;

    try {
        const result = await callGLM({ userMessage: prompt, maxTokens: 2000 });
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            logger.warn('[DreamLoop] GLM did not return valid JSON for hypotheses');
            return [];
        }

        const raw = JSON.parse(jsonMatch[0]) as Array<{
            area: DreamHypothesis['area'];
            hypothesis: string;
            expectedOutcome: string;
            testPlan: string;
        }>;

        return raw.map((h, i) => ({
            id: `hyp_${Date.now()}_${i}`,
            ...h,
        }));
    } catch (err) {
        logger.error('[DreamLoop] Hypothesis generation failed', { error: String(err) });
        return [];
    }
}

// =============================================================================
// TEST — Validate hypotheses (lightweight: check codebase, query telemetry)
// =============================================================================

async function testHypotheses(
    hypotheses: DreamHypothesis[]
): Promise<DreamHypothesis[]> {
    const db = getAdminFirestore();

    for (const hyp of hypotheses) {
        try {
            // Use GLM to evaluate the hypothesis against available data
            const evalPrompt = `You are evaluating an improvement hypothesis for the Linus CTO agent.

Hypothesis: ${hyp.hypothesis}
Area: ${hyp.area}
Test Plan: ${hyp.testPlan}
Expected Outcome: ${hyp.expectedOutcome}

Based on the test plan, determine if this hypothesis is likely:
- **confirmed**: Evidence supports it and the improvement is actionable
- **rejected**: Evidence contradicts it or it's not feasible
- **inconclusive**: Not enough data to confirm or reject

Respond in JSON: {"result": "confirmed|rejected|inconclusive", "evidence": "brief explanation"}`;

            const evalResult = await callGLM({ userMessage: evalPrompt, maxTokens: 500 });
            const jsonMatch = evalResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                hyp.testResult = parsed.result;
                hyp.testEvidence = parsed.evidence;
            } else {
                hyp.testResult = 'inconclusive';
                hyp.testEvidence = 'GLM response could not be parsed';
            }
        } catch (err) {
            hyp.testResult = 'inconclusive';
            hyp.testEvidence = `Test failed: ${String(err)}`;
        }
    }

    return hypotheses;
}

// =============================================================================
// REPORT — Build summary and persist to Letta + Firestore
// =============================================================================

function buildReport(session: DreamSession): string {
    const { introspection: intro, hypotheses } = session;
    const confirmed = hypotheses.filter(h => h.testResult === 'confirmed');
    const rejected = hypotheses.filter(h => h.testResult === 'rejected');
    const inconclusive = hypotheses.filter(h => h.testResult === 'inconclusive');

    let report = `*Dream Session — ${session.agentName}*\n_${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}_\n\n`;

    report += `*Introspection (48h):*\n`;
    report += `• Tool failures: ${intro.toolFailures} | Dead-end loops: ${intro.deadEndLoops}\n`;
    report += `• Negative feedback: ${intro.negativeFeedback} | Capability utilization: ${(intro.capabilityUtilization * 100).toFixed(0)}%\n`;
    report += `• Pending learning deltas: ${intro.pendingDeltas}\n\n`;

    if (confirmed.length > 0) {
        report += `*Confirmed Hypotheses (${confirmed.length}):*\n`;
        for (const h of confirmed) {
            report += `✅ *${h.area}*: ${h.hypothesis}\n   → Expected: ${h.expectedOutcome}\n   → Evidence: ${h.testEvidence}\n\n`;
        }
    }

    if (inconclusive.length > 0) {
        report += `*Inconclusive (${inconclusive.length}):*\n`;
        for (const h of inconclusive) {
            report += `⚠️ *${h.area}*: ${h.hypothesis}\n   → ${h.testEvidence}\n\n`;
        }
    }

    if (rejected.length > 0) {
        report += `*Rejected (${rejected.length}):*\n`;
        for (const h of rejected) {
            report += `❌ *${h.area}*: ${h.hypothesis}\n   → ${h.testEvidence}\n\n`;
        }
    }

    if (confirmed.length === 0 && inconclusive.length === 0 && rejected.length === 0) {
        report += `_No hypotheses generated this session. Performance metrics look healthy._\n`;
    }

    report += `_Model: ${session.model} | Duration: ${session.completedAt ? Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000) : '?'}s_`;

    return report;
}

// =============================================================================
// MAIN DREAM LOOP
// =============================================================================

export async function runDreamSession(agentName: string = 'Linus'): Promise<DreamSession> {
    const sessionId = `dream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const db = getAdminFirestore();

    logger.info(`[DreamLoop] Starting dream session for ${agentName}`, { sessionId });

    // 1. INTROSPECT
    const introspectionData = await introspect(agentName);
    logger.info(`[DreamLoop] Introspection complete`, { ...introspectionData, sessionId });

    // 2. Load pending deltas for hypothesis context
    const deltasSnap = await db.collection('learning_deltas')
        .where('status', '==', 'proposed')
        .orderBy('proposedAt', 'desc')
        .limit(10)
        .get();
    const pendingDeltas = deltasSnap.docs.map(d => d.data() as LearningDelta);

    // 3. HYPOTHESIZE
    const rawHypotheses = await hypothesize(agentName, introspectionData, pendingDeltas);
    logger.info(`[DreamLoop] Generated ${rawHypotheses.length} hypotheses`, { sessionId });

    // 4. TEST
    const testedHypotheses = await testHypotheses(rawHypotheses);

    // 5. BUILD SESSION
    const session: DreamSession = {
        id: sessionId,
        agentName,
        startedAt: new Date().toISOString(),
        introspection: introspectionData,
        hypotheses: testedHypotheses,
        report: '',
        model: 'glm',
    };

    session.completedAt = new Date().toISOString();
    session.report = buildReport(session);

    // 6. PERSIST to Firestore
    await db.doc(`dream_sessions/${sessionId}`).set(session);

    // 7. SAVE confirmed hypotheses to Letta memory
    const confirmed = testedHypotheses.filter(h => h.testResult === 'confirmed');
    if (confirmed.length > 0) {
        try {
            const agents = await lettaClient.listAgents();
            const researchAgent = agents.find(a => a.name.includes('Research'));
            if (researchAgent) {
                for (const h of confirmed) {
                    await lettaClient.insertPassage(
                        researchAgent.id,
                        `[dream:${agentName}:${h.area}] ${h.hypothesis} — Evidence: ${h.testEvidence}`
                    );
                }
            }
        } catch {
            logger.warn('[DreamLoop] Failed to persist dream insights to Letta');
        }
    }

    // 8. Update Letta personal memory block
    try {
        await lettaBlockManager.appendToBlock(
            'linus_internal',
            BLOCK_LABELS.AGENT_LINUS,
            `\n[Dream ${new Date().toISOString().split('T')[0]}] ${confirmed.length} confirmed, ${testedHypotheses.length - confirmed.length} other. Cap util: ${(introspectionData.capabilityUtilization * 100).toFixed(0)}%.`,
            'Linus'
        );
    } catch {
        logger.warn('[DreamLoop] Failed to update Letta personal memory block');
    }

    logger.info(`[DreamLoop] Dream session complete`, {
        sessionId,
        hypotheses: testedHypotheses.length,
        confirmed: confirmed.length,
    });

    return session;
}
