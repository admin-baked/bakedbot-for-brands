/**
 * Dream Loop Service
 *
 * Implements the self-improvement cycle for executive and role agents:
 *
 *   1. INTROSPECT — Review telemetry, learning deltas, feedback, Slack signals, and memory
 *   2. HYPOTHESIZE — Generate improvement hypotheses with expected outcomes
 *   3. TEST — Validate hypotheses against available evidence
 *   4. REPORT — Persist the session and route review requests to Linus + Marty when needed
 *
 * Dream sessions are persisted to Firestore: dream_sessions/{sessionId}
 * Approved improvements are stored as learning_deltas with status 'approved'.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { callGLM } from '@/ai/glm';
import { lettaClient } from './client';
import { lettaBlockManager, BLOCK_LABELS } from './block-manager';
import type { BlockLabel } from './block-manager';
import type { LearningDelta } from '@/types/learning-delta';
import { detectSlackResponseIssues } from '@/server/services/slack-response-quality';
import { logAgentLearning } from '@/server/services/agent-learning-loop';

export type DreamModel = 'glm' | 'gemini-flash' | 'gemini-pro' | 'haiku' | 'sonnet' | 'opus';
export const VALID_DREAM_MODELS: DreamModel[] = ['glm', 'gemini-flash', 'gemini-pro', 'haiku', 'sonnet', 'opus'];
export type DreamRolloutGroup = 'initial_slack' | 'super_users' | 'role_agents' | 'all';
const VALID_DREAM_MODEL_SET = new Set<string>(VALID_DREAM_MODELS);
export const VALID_DREAM_ROLLOUT_GROUPS: DreamRolloutGroup[] = ['initial_slack', 'super_users', 'role_agents', 'all'];
const VALID_DREAM_ROLLOUT_GROUP_SET = new Set<string>(VALID_DREAM_ROLLOUT_GROUPS);

export function isDreamModel(value: unknown): value is DreamModel {
    return typeof value === 'string' && VALID_DREAM_MODEL_SET.has(value);
}

export function isDreamRolloutGroup(value: unknown): value is DreamRolloutGroup {
    return typeof value === 'string' && VALID_DREAM_ROLLOUT_GROUP_SET.has(value);
}

const DREAM_MODEL_LABELS: Record<DreamModel, string> = {
    'glm': 'Llama 3.3 70B (Groq)',
    'gemini-flash': 'Gemini 2.5 Flash',
    'gemini-pro': 'Gemini 2.5 Pro',
    'haiku': 'Claude Haiku 4.5',
    'sonnet': 'Claude Sonnet 4.6',
    'opus': 'Claude Opus 4.6',
};

const DREAM_MODEL_IDS: Record<DreamModel, string> = {
    'glm': 'llama-3.3-70b-versatile',
    'gemini-flash': 'googleai/gemini-2.5-flash',
    'gemini-pro': 'googleai/gemini-2.5-pro',
    'haiku': 'claude-haiku-4-5-20251001',
    'sonnet': 'claude-sonnet-4-6-20250414',
    'opus': 'claude-opus-4-6-20250414',
};

const DREAM_MODEL_FALLBACKS: Record<DreamModel, DreamModel[]> = {
    'glm': ['gemini-flash'],
    'gemini-flash': ['glm'],
    'gemini-pro': ['gemini-flash', 'glm'],
    'haiku': ['glm', 'gemini-flash'],
    'sonnet': ['haiku', 'glm', 'gemini-flash'],
    'opus': ['sonnet', 'haiku', 'glm', 'gemini-flash'],
};

export type DreamAgentId =
    | 'marty'
    | 'linus'
    | 'elroy'
    | 'leo'
    | 'jack'
    | 'glenda'
    | 'mike_exec'
    | 'roach'
    | 'bigworm'
    | 'openclaw'
    | 'smokey'
    | 'craig'
    | 'pops'
    | 'ezal'
    | 'money_mike'
    | 'mrs_parker'
    | 'day_day'
    | 'felisha'
    | 'deebo';

interface DreamAgentProfile {
    agentId: DreamAgentId;
    displayName: string;
    roleLabel: string;
    defaultModel: DreamModel;
    defaultOrgId?: string;
    reviewChannels: string[];
    legacyLearningCollections?: string[];
    lettaBlock?: {
        blockId: string;
        blockLabel: BlockLabel;
        owner: string;
    };
}

const DEFAULT_REVIEW_CHANNELS = ['linus-cto', 'ceo'];

const DREAM_AGENT_PROFILES: Record<DreamAgentId, DreamAgentProfile> = {
    marty: { agentId: 'marty', displayName: 'Marty', roleLabel: 'CEO AI agent', defaultModel: 'opus', reviewChannels: DEFAULT_REVIEW_CHANNELS, legacyLearningCollections: ['marty_learning_log'] },
    linus: { agentId: 'linus', displayName: 'Linus', roleLabel: 'CTO AI agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS, lettaBlock: { blockId: 'linus_internal', blockLabel: BLOCK_LABELS.AGENT_LINUS, owner: 'Linus' } },
    elroy: { agentId: 'elroy', displayName: 'Uncle Elroy', roleLabel: 'Store operations advisor', defaultModel: 'glm', defaultOrgId: 'org_thrive_syracuse', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    leo: { agentId: 'leo', displayName: 'Leo', roleLabel: 'COO AI agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    jack: { agentId: 'jack', displayName: 'Jack', roleLabel: 'CRO AI agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    glenda: { agentId: 'glenda', displayName: 'Glenda', roleLabel: 'CMO AI agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    mike_exec: { agentId: 'mike_exec', displayName: 'Mike', roleLabel: 'CFO AI agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    roach: { agentId: 'roach', displayName: 'Roach', roleLabel: 'Research librarian agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    bigworm: { agentId: 'bigworm', displayName: 'Big Worm', roleLabel: 'Research agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    openclaw: { agentId: 'openclaw', displayName: 'OpenClaw', roleLabel: 'Automation agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    smokey: { agentId: 'smokey', displayName: 'Smokey', roleLabel: 'Budtender agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    craig: { agentId: 'craig', displayName: 'Craig', roleLabel: 'Marketing agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    pops: { agentId: 'pops', displayName: 'Pops', roleLabel: 'Analytics agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    ezal: { agentId: 'ezal', displayName: 'Ezal', roleLabel: 'Competitive intelligence agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    money_mike: { agentId: 'money_mike', displayName: 'Money Mike', roleLabel: 'Pricing and profitability agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    mrs_parker: { agentId: 'mrs_parker', displayName: 'Mrs. Parker', roleLabel: 'Loyalty agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    day_day: { agentId: 'day_day', displayName: 'Day Day', roleLabel: 'Growth agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    felisha: { agentId: 'felisha', displayName: 'Felisha', roleLabel: 'Operations coordinator agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
    deebo: { agentId: 'deebo', displayName: 'Deebo', roleLabel: 'Compliance agent', defaultModel: 'glm', reviewChannels: DEFAULT_REVIEW_CHANNELS },
};

const DREAM_AGENT_ALIASES: Record<string, DreamAgentId> = {
    marty: 'marty',
    linus: 'linus',
    elroy: 'elroy',
    uncleelroy: 'elroy',
    uncle_elroy: 'elroy',
    leo: 'leo',
    jack: 'jack',
    glenda: 'glenda',
    mike: 'mike_exec',
    mike_exec: 'mike_exec',
    roach: 'roach',
    bigworm: 'bigworm',
    big_worm: 'bigworm',
    openclaw: 'openclaw',
    smokey: 'smokey',
    craig: 'craig',
    pops: 'pops',
    ezal: 'ezal',
    moneymike: 'money_mike',
    money_mike: 'money_mike',
    mrsparker: 'mrs_parker',
    mrs_parker: 'mrs_parker',
    dayday: 'day_day',
    day_day: 'day_day',
    felisha: 'felisha',
    deebo: 'deebo',
};

export const DREAM_AGENT_GROUPS: Record<DreamRolloutGroup, DreamAgentId[]> = {
    initial_slack: ['linus', 'elroy'],
    super_users: ['marty', 'leo', 'jack', 'linus', 'glenda', 'mike_exec', 'roach', 'bigworm', 'openclaw'],
    role_agents: ['smokey', 'craig', 'pops', 'ezal', 'money_mike', 'mrs_parker', 'day_day', 'felisha', 'deebo', 'elroy'],
    all: [
        'marty', 'leo', 'jack', 'linus', 'glenda', 'mike_exec', 'roach', 'bigworm', 'openclaw',
        'smokey', 'craig', 'pops', 'ezal', 'money_mike', 'mrs_parker', 'day_day', 'felisha', 'deebo', 'elroy',
    ],
};

function normalizeDreamAgentKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function getDreamProfile(agent: string): DreamAgentProfile {
    const normalized = normalizeDreamAgentKey(agent);
    const agentId = DREAM_AGENT_ALIASES[normalized];
    if (!agentId) {
        throw new Error(`Unsupported dream agent "${agent}".`);
    }
    return DREAM_AGENT_PROFILES[agentId];
}

export function getDreamAgentsForGroup(group: DreamRolloutGroup): DreamAgentId[] {
    const agents = DREAM_AGENT_GROUPS[group];
    if (!agents) {
        throw new Error(`Unsupported dream rollout group "${group}".`);
    }
    return agents;
}

function getDreamModelChain(model: DreamModel): DreamModel[] {
    return [model, ...DREAM_MODEL_FALLBACKS[model]].filter(
        (candidate, index, all) => all.indexOf(candidate) === index
    );
}

function formatDreamModelPlan(model: DreamModel): string {
    const chain = getDreamModelChain(model);
    if (chain.length <= 1) {
        return DREAM_MODEL_LABELS[model];
    }
    return `${DREAM_MODEL_LABELS[chain[0]]} (fallback: ${chain.slice(1).map(candidate => DREAM_MODEL_LABELS[candidate]).join(' → ')})`;
}

// Brief pause between fallback tiers to avoid cascading 429s (e.g. Claude rate-limit → immediate Gemini burst).
const INTER_TIER_SLEEP_MS = 2_000;

async function dreamInfer(prompt: string, model: DreamModel, maxTokens: number = 2000): Promise<string> {
    let lastError: unknown = null;
    const chain = getDreamModelChain(model);

    // Guarantee GLM is always the last resort, even if not in the built chain.
    const safeChain: DreamModel[] = chain.includes('glm') ? chain : [...chain, 'glm'];

    for (let i = 0; i < safeChain.length; i++) {
        const candidate = safeChain[i];
        if (i > 0) {
            logger.warn('[DreamLoop] Falling back to next tier', {
                requestedModel: model,
                failedTier: safeChain[i - 1],
                nextTier: candidate,
            });
            await new Promise(resolve => setTimeout(resolve, INTER_TIER_SLEEP_MS));
        }
        try {
            switch (candidate) {
                case 'glm':
                    return await callGLM({ userMessage: prompt, maxTokens });
                case 'gemini-flash':
                case 'gemini-pro': {
                    const { ai } = await import('@/ai/genkit');
                    const result = await ai.generate({
                        model: DREAM_MODEL_IDS[candidate],
                        prompt,
                        config: { maxOutputTokens: maxTokens, temperature: 1.0 },
                    });
                    return result.text;
                }
                case 'haiku':
                case 'sonnet':
                case 'opus': {
                    const { callClaude } = await import('@/ai/claude');
                    return await callClaude({
                        userMessage: prompt,
                        model: DREAM_MODEL_IDS[candidate],
                        maxTokens,
                        temperature: 1.0,
                    });
                }
            }
        } catch (error) {
            lastError = error;
            logger.warn('[DreamLoop] Dream inference tier failed', {
                requestedModel: model,
                candidate,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError || 'Dream inference failed — all tiers exhausted including GLM safety net'));
}

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
    agentId: string;
    agentName: string;
    orgId?: string | null;
    reviewChannels: string[];
    startedAt: string;
    completedAt?: string;
    introspection: {
        toolFailures: number;
        deadEndLoops: number;
        negativeFeedback: number;
        qaBenchmarkFailures: number;
        pendingDeltas: number;
        capabilityUtilization: number;
        memoryInsights: string[];
    };
    hypotheses: DreamHypothesis[];
    report: string;
    model: string;
}

interface DreamOptions {
    orgId?: string | null;
}

function getRelevantDeltas(deltas: LearningDelta[], agentId: string, orgId?: string | null): LearningDelta[] {
    return deltas.filter(delta => {
        const matchesAgent = !delta.agentName || delta.agentName === agentId;
        const matchesOrg = !orgId || !delta.orgId || delta.orgId === orgId;
        return matchesAgent && matchesOrg;
    });
}

function matchesOrg(value: unknown, orgId?: string | null): boolean {
    if (!orgId) return true;
    return value === orgId || value == null;
}

async function introspect(agent: string, options: DreamOptions = {}): Promise<DreamSession['introspection']> {
    const profile = getDreamProfile(agent);
    const agentId = profile.agentId;
    const effectiveOrgId = options.orgId || profile.defaultOrgId || null;
    const db = getAdminFirestore();
    const since = new Date();
    since.setHours(since.getHours() - 48);
    const sinceIso = since.toISOString();
    const sinceMs = since.getTime();

    const [
        telemetrySnap,
        deltasSnap,
        feedbackSnap,
        learningLogSnap,
        slackResponsesSnap,
        qaBenchmarkSnap,
        lettaPassages,
        ...legacyLearningResults
    ] = await Promise.all([
        db.collection('agent_telemetry')
            .where('_agentName', '==', agentId)
            .where('timestamp', '>=', since)
            .limit(200)
            .get(),
        db.collection('learning_deltas')
            .where('status', '==', 'proposed')
            .limit(100)
            .get(),
        db.collection('response_feedback')
            .where('rating', '==', 'negative')
            .where('createdAt', '>=', sinceIso)
            .limit(200)
            .get(),
        db.collection('agent_learning_log')
            .where('timestamp', '>=', sinceMs)
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get(),
        db.collection('slack_responses')
            .where('timestamp', '>=', since)
            .orderBy('timestamp', 'desc')
            .limit(120)
            .get(),
        db.collection('qa_golden_eval_runs')
            .where('ranAt', '>=', since)
            .orderBy('ranAt', 'desc')
            .limit(50)
            .get(),
        (async () => {
            try {
                const agents = await lettaClient.listAgents();
                const researchAgent = agents.find(entry => entry.name.includes('Research'));
                if (!researchAgent) return [] as string[];
                return await lettaClient.searchPassages(
                    researchAgent.id,
                    `${profile.displayName} improvement pattern failure learning`,
                    5
                );
            } catch {
                logger.warn('[DreamLoop] Letta memory search failed, continuing without');
                return [] as string[];
            }
        })(),
        ...(profile.legacyLearningCollections || []).map(collectionName =>
            db.collection(collectionName)
                .where('createdAt', '>=', sinceMs)
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get()
        ),
    ]);

    let toolFailures = 0;
    let deadEndLoops = 0;
    let totalCapUtil = 0;
    let capUtilCount = 0;

    for (const doc of telemetrySnap.docs) {
        const data = doc.data();
        if (!matchesOrg(data.orgId ?? data._orgId, effectiveOrgId)) continue;
        toolFailures += Number(data.toolErrorCount || 0);
        deadEndLoops += Number(data.deadEndLoopCount || 0);
        if (typeof data.capabilityUtilization === 'number') {
            totalCapUtil += data.capabilityUtilization;
            capUtilCount++;
        }
    }

    const allPendingDeltas = deltasSnap.docs.map(doc => doc.data() as LearningDelta);
    const pendingDeltas = getRelevantDeltas(allPendingDeltas, agentId, effectiveOrgId);

    const negativeFeedbackDocs = feedbackSnap.docs
        .map(doc => doc.data())
        .filter(data => String(data.agentName || '').toLowerCase() === agentId)
        .filter(data => matchesOrg(data.orgId, effectiveOrgId));

    const memoryInsights: string[] = [];
    const appendLearningEntries = (docs: FirebaseFirestore.QuerySnapshot['docs']) => {
        for (const doc of docs) {
            const data = doc.data();
            if (String(data.agentId || '').toLowerCase() !== agentId) continue;
            if (!matchesOrg(data.orgId, effectiveOrgId)) continue;
            memoryInsights.push(`[${data.category || 'general'}] ${data.action} → ${data.result}: ${data.reason || 'no reason'}`);
        }
    };

    appendLearningEntries(learningLogSnap.docs);
    for (const snap of legacyLearningResults) {
        for (const doc of snap.docs) {
            const data = doc.data();
            memoryInsights.push(`[${data.category || 'legacy'}] ${data.action} → ${data.result}: ${data.reason || 'no reason'}`);
        }
    }

    for (const doc of slackResponsesSnap.docs) {
        const data = doc.data() as { agent?: string; userMessage?: string; agentResponse?: string };
        if (String(data.agent || '').toLowerCase() !== agentId) continue;
        const issues = detectSlackResponseIssues(agentId, {
            userMessage: String(data.userMessage || ''),
            agentResponse: String(data.agentResponse || ''),
        });
        for (const issue of issues) {
            memoryInsights.push(`[slack_quality] ${issue.summary} Fix: ${issue.proposedFix}`);
        }
    }

    let qaBenchmarkFailures = 0;
    for (const doc of qaBenchmarkSnap.docs) {
        const data = doc.data() as {
            agent?: string;
            orgId?: string | null;
            failed?: number;
            complianceFailed?: boolean;
            belowThreshold?: boolean;
            failureSummaries?: string[];
            failingTestIds?: string[];
        };
        if (String(data.agent || '').toLowerCase() !== agentId) continue;
        if (!matchesOrg(data.orgId, effectiveOrgId)) continue;

        const failed = Number(data.failed || 0);
        const didFail = failed > 0 || data.complianceFailed === true || data.belowThreshold === true;
        if (!didFail) continue;

        qaBenchmarkFailures++;
        const summary = (data.failureSummaries || []).slice(0, 2).join('; ');
        const caseIds = (data.failingTestIds || []).slice(0, 3).join(', ');
        memoryInsights.push(
            `[qa_benchmark] Failed golden-set run${caseIds ? ` (${caseIds})` : ''}${summary ? `: ${summary}` : '.'}`
        );
    }

    memoryInsights.push(...lettaPassages.slice(0, 5));

    const capabilityUtilization = capUtilCount > 0 ? totalCapUtil / capUtilCount : 0;

    return {
        toolFailures,
        deadEndLoops,
        negativeFeedback: negativeFeedbackDocs.length,
        qaBenchmarkFailures,
        pendingDeltas: pendingDeltas.length,
        capabilityUtilization: Math.round(capabilityUtilization * 100) / 100,
        memoryInsights,
    };
}

async function hypothesize(
    agent: string,
    introspectionData: DreamSession['introspection'],
    pendingDeltas: LearningDelta[],
    model: DreamModel
): Promise<DreamHypothesis[]> {
    const profile = getDreamProfile(agent);
    const prompt = `You are ${profile.displayName}, a ${profile.roleLabel}, performing a Dream session — reflecting on your own performance to find improvements.

CRITICAL: Only reference events and data shown below. NEVER fabricate deals, revenue, meetings, or accomplishments. If data is sparse, say so — an honest "not enough data" is better than fiction.

## Your Recent Performance (last 48h)
- Tool failures: ${introspectionData.toolFailures}
- Dead-end loops: ${introspectionData.deadEndLoops}
- Negative user feedback: ${introspectionData.negativeFeedback}
- QA benchmark failures: ${introspectionData.qaBenchmarkFailures}
- Capability utilization: ${(introspectionData.capabilityUtilization * 100).toFixed(0)}% (% of available tools you actually use)
- Pending learning deltas: ${introspectionData.pendingDeltas}

## Pending Learning Deltas (from nightly consolidation)
${pendingDeltas.slice(0, 10).map(delta => `- [${delta.category}] ${delta.summary}`).join('\n') || '(none)'}

## Memory Insights
${introspectionData.memoryInsights.map(insight => `- ${insight.slice(0, 220)}`).join('\n') || '(none recalled)'}

## Task
Generate 2-4 concrete improvement hypotheses. For each:
1. Identify the specific area (tool_routing, prompt_tuning, memory_gaps, workflow_optimization, cost_reduction, capability_expansion)
2. State a testable hypothesis
3. Predict the expected outcome if the hypothesis is correct
4. Describe a concrete test plan (what to check, what metric to verify, what to run)

Respond in JSON array format:
[{"area": "...", "hypothesis": "...", "expectedOutcome": "...", "testPlan": "..."}]

Be specific. Reference actual tool names, error patterns, benchmark failures, or workflow steps. No vague generalities.`;

    try {
        const result = await dreamInfer(prompt, model, 2000);
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            logger.warn('[DreamLoop] Model did not return valid JSON for hypotheses', { agent: profile.agentId, model });
            return [];
        }

        const raw = JSON.parse(jsonMatch[0]) as Array<{
            area: DreamHypothesis['area'];
            hypothesis: string;
            expectedOutcome: string;
            testPlan: string;
        }>;

        return raw.map((hypothesis, index) => ({
            id: `hyp_${Date.now()}_${index}`,
            ...hypothesis,
        }));
    } catch (error) {
        logger.error('[DreamLoop] Hypothesis generation failed', {
            agent: profile.agentId,
            error: error instanceof Error ? error.message : String(error),
        });
        return [];
    }
}

async function testHypotheses(
    hypotheses: DreamHypothesis[],
    model: DreamModel,
    agent: string
): Promise<DreamHypothesis[]> {
    const profile = getDreamProfile(agent);

    for (const hypothesis of hypotheses) {
        try {
            const evalPrompt = `You are evaluating an improvement hypothesis for ${profile.displayName}, a ${profile.roleLabel}.

CRITICAL: Only confirm hypotheses with concrete evidence from the provided context. If there is no data to support or reject the hypothesis, mark it inconclusive. NEVER invent evidence.

Hypothesis: ${hypothesis.hypothesis}
Area: ${hypothesis.area}
Expected Outcome: ${hypothesis.expectedOutcome}
Test Plan: ${hypothesis.testPlan}

Respond in JSON:
{"result":"confirmed|rejected|inconclusive","evidence":"brief explanation"}`;

            const evalResult = await dreamInfer(evalPrompt, model, 500);
            const jsonMatch = evalResult.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]) as {
                    result?: DreamHypothesis['testResult'];
                    evidence?: string;
                };
                hypothesis.testResult = parsed.result || 'inconclusive';
                hypothesis.testEvidence = parsed.evidence || 'No evidence returned.';
            } else {
                hypothesis.testResult = 'inconclusive';
                hypothesis.testEvidence = 'Dream evaluation response could not be parsed.';
            }
        } catch (error) {
            hypothesis.testResult = 'inconclusive';
            hypothesis.testEvidence = `Test failed: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    return hypotheses;
}

function buildReport(session: DreamSession): string {
    const { introspection, hypotheses } = session;
    const confirmed = hypotheses.filter(hypothesis => hypothesis.testResult === 'confirmed');
    const rejected = hypotheses.filter(hypothesis => hypothesis.testResult === 'rejected');
    const inconclusive = hypotheses.filter(hypothesis => hypothesis.testResult === 'inconclusive');

    const sections = [
        `*Dream Session — ${session.agentName}*`,
        `_${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}${session.orgId ? ` • ${session.orgId}` : ''}_`,
        '',
        '*Introspection (48h):*',
        `• Tool failures: ${introspection.toolFailures} | Dead-end loops: ${introspection.deadEndLoops}`,
        `• Negative feedback: ${introspection.negativeFeedback} | QA benchmark failures: ${introspection.qaBenchmarkFailures}`,
        `• Capability utilization: ${(introspection.capabilityUtilization * 100).toFixed(0)}% | Pending learning deltas: ${introspection.pendingDeltas}`,
        '',
    ];

    if (confirmed.length > 0) {
        sections.push(`*Confirmed Hypotheses (${confirmed.length}):*`);
        for (const hypothesis of confirmed) {
            sections.push(`✅ *${hypothesis.area}*: ${hypothesis.hypothesis}`);
            sections.push(`   → Expected: ${hypothesis.expectedOutcome}`);
            sections.push(`   → Evidence: ${hypothesis.testEvidence}`);
            sections.push('');
        }
    }

    if (inconclusive.length > 0) {
        sections.push(`*Inconclusive (${inconclusive.length}):*`);
        for (const hypothesis of inconclusive) {
            sections.push(`⚠️ *${hypothesis.area}*: ${hypothesis.hypothesis}`);
            sections.push(`   → ${hypothesis.testEvidence}`);
            sections.push('');
        }
    }

    if (rejected.length > 0) {
        sections.push(`*Rejected (${rejected.length}):*`);
        for (const hypothesis of rejected) {
            sections.push(`❌ *${hypothesis.area}*: ${hypothesis.hypothesis}`);
            sections.push(`   → ${hypothesis.testEvidence}`);
            sections.push('');
        }
    }

    if (confirmed.length === 0 && inconclusive.length === 0 && rejected.length === 0) {
        sections.push('_No hypotheses generated this session. Performance metrics look healthy._');
        sections.push('');
    }

    sections.push(`_Model: ${session.model} | Duration: ${session.completedAt ? Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000) : '?'}s_`);
    return sections.join('\n');
}

export function sessionNeedsReview(session: DreamSession): boolean {
    return (
        session.hypotheses.some(hypothesis => hypothesis.testResult === 'confirmed')
        || session.introspection.negativeFeedback > 0
        || session.introspection.qaBenchmarkFailures > 0
        || session.introspection.deadEndLoops > 0
        || session.introspection.toolFailures > 0
    );
}

export function buildDreamReviewDigest(
    sessions: DreamSession[],
    label: string,
    orgId?: string | null
): string {
    const lines = [
        `*Dream Rollout Review — ${label}*${orgId ? ` (${orgId})` : ''}`,
        '',
    ];

    for (const session of sessions) {
        const confirmed = session.hypotheses.filter(hypothesis => hypothesis.testResult === 'confirmed').length;
        lines.push(
            `• ${session.agentName}: ${confirmed} confirmed, ${session.introspection.negativeFeedback} negative feedback, ${session.introspection.qaBenchmarkFailures} QA benchmark failures, session \`${session.id}\``
        );
    }

    lines.push('');
    lines.push('Please review with Linus and Marty before signoff on any prompt, workflow, or code fixes.');
    return lines.join('\n');
}

export async function notifyDreamReview(session: DreamSession): Promise<void> {
    const { postLinusIncidentSlack } = await import('@/server/services/incident-notifications');
    const needsReview = sessionNeedsReview(session);
    const reviewNote = needsReview
        ? `\n\n*Review requested:* Linus and Marty should decide whether prompt, workflow, or code changes are needed before signoff.\n*Session ID:* \`${session.id}\``
        : `\n\n*Pulse only:* No confirmed fix requests this round.\n*Session ID:* \`${session.id}\``;

    for (const channelName of session.reviewChannels) {
        await postLinusIncidentSlack({
            source: 'agent-dream-review',
            channelName,
            fallbackText: `${session.agentName} dream ${needsReview ? 'review request' : 'pulse'}: ${session.hypotheses.filter(hypothesis => hypothesis.testResult === 'confirmed').length} confirmed`,
            blocks: [
                {
                    type: 'section',
                    text: { type: 'mrkdwn', text: `${session.report}${reviewNote}` },
                },
            ],
        });
    }
}

export async function runDreamSession(
    agent: string = 'Linus',
    requestedModel?: DreamModel,
    options: DreamOptions = {}
): Promise<DreamSession> {
    const profile = getDreamProfile(agent);
    const agentId = profile.agentId;
    const agentName = profile.displayName;
    const model = requestedModel || profile.defaultModel;
    const effectiveOrgId = options.orgId || profile.defaultOrgId || null;
    const sessionId = `dream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date().toISOString();
    const db = getAdminFirestore();

    logger.info('[DreamLoop] Starting dream session', {
        sessionId,
        agentId,
        agentName,
        orgId: effectiveOrgId,
        model,
        modelPlan: formatDreamModelPlan(model),
    });

    const introspectionData = await introspect(agentId, { orgId: effectiveOrgId });
    logger.info('[DreamLoop] Introspection complete', {
        sessionId,
        agentId,
        orgId: effectiveOrgId,
        ...introspectionData,
    });

    const deltasSnap = await db.collection('learning_deltas')
        .where('status', '==', 'proposed')
        .orderBy('proposedAt', 'desc')
        .limit(50)
        .get();
    const pendingDeltas = getRelevantDeltas(
        deltasSnap.docs.map(doc => doc.data() as LearningDelta),
        agentId,
        effectiveOrgId
    );

    const rawHypotheses = await hypothesize(agentId, introspectionData, pendingDeltas, model);
    const testedHypotheses = await testHypotheses(rawHypotheses, model, agentId);

    const session: DreamSession = {
        id: sessionId,
        agentId,
        agentName,
        orgId: effectiveOrgId,
        reviewChannels: profile.reviewChannels,
        startedAt,
        introspection: introspectionData,
        hypotheses: testedHypotheses,
        report: '',
        model: formatDreamModelPlan(model),
    };

    session.completedAt = new Date().toISOString();
    session.report = buildReport(session);

    await db.doc(`dream_sessions/${sessionId}`).set(session);

    await Promise.all(
        testedHypotheses.map(hypothesis =>
            logAgentLearning({
                agentId,
                action: `Dream hypothesis: ${hypothesis.hypothesis}`,
                result: hypothesis.testResult === 'confirmed'
                    ? 'success'
                    : hypothesis.testResult === 'rejected'
                        ? 'failure'
                        : 'partial',
                reason: hypothesis.testEvidence || hypothesis.testResult || 'No evidence recorded',
                nextStep: hypothesis.testResult === 'confirmed'
                    ? 'Review with Linus and Marty before applying the fix.'
                    : 'Investigate further during the next dream or review cycle.',
                category: 'dream',
                orgId: effectiveOrgId,
                brandId: effectiveOrgId,
                metadata: {
                    sessionId,
                    area: hypothesis.area,
                    expectedOutcome: hypothesis.expectedOutcome,
                    testPlan: hypothesis.testPlan,
                },
            })
        )
    );

    const confirmed = testedHypotheses.filter(hypothesis => hypothesis.testResult === 'confirmed');
    if (confirmed.length > 0) {
        try {
            const agents = await lettaClient.listAgents();
            const researchAgent = agents.find(entry => entry.name.includes('Research'));
            if (researchAgent) {
                for (const hypothesis of confirmed) {
                    await lettaClient.insertPassage(
                        researchAgent.id,
                        `[dream:${agentId}:${hypothesis.area}] ${hypothesis.hypothesis} — Evidence: ${hypothesis.testEvidence}`
                    );
                }
            }
        } catch {
            logger.warn('[DreamLoop] Failed to persist dream insights to Letta');
        }
    }

    if (profile.lettaBlock) {
        try {
            await lettaBlockManager.appendToBlock(
                profile.lettaBlock.blockId,
                profile.lettaBlock.blockLabel,
                `\n[Dream ${new Date().toISOString().split('T')[0]}] ${confirmed.length} confirmed, ${testedHypotheses.length - confirmed.length} other. Cap util: ${(introspectionData.capabilityUtilization * 100).toFixed(0)}%.`,
                profile.lettaBlock.owner
            );
        } catch {
            logger.warn('[DreamLoop] Failed to update Letta personal memory block', { agentId });
        }
    }

    logger.info('[DreamLoop] Dream session complete', {
        sessionId,
        agentId,
        orgId: effectiveOrgId,
        hypotheses: testedHypotheses.length,
        confirmed: confirmed.length,
    });

    return session;
}
