import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { callGroqOrClaude, callGLM, isGLMConfigured, GLM_MODELS } from '@/ai/glm';
import { getResponsesByDateRange } from '@/server/services/slack-response-archive';
import type { SlackResponseRecord } from '@/server/services/slack-response-archive';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import { callClaude } from '@/ai/claude';
import { callGemini, isGeminiFlashConfigured } from '@/ai/gemini-flash-tools';
import { invalidateCoachingCache } from '@/server/services/coaching-loader';
import { lettaBlockManager, BLOCK_LABELS } from '@/server/services/letta/block-manager';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Deliberative coaching: 3 model calls per agent (Opus→Gemini→Opus)

const CRON_SECRET = process.env.CRON_SECRET;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function getAuthToken(req: NextRequest): string | null {
    const header = req.headers.get('authorization') || '';
    if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
    return req.nextUrl.searchParams.get('token');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DimensionScores {
    accuracy: number;
    toolUse: number;
    contextHandling: number;
    actionability: number;
    compliance: number;
    depth: number;  // Response completeness — penalizes terse/abbreviated answers
}

interface GradedResponse {
    agent: string;
    userMessage: string;
    agentResponse: string;
    grade: 'great' | 'good' | 'acceptable' | 'poor' | 'fail';
    score: number;          // 0-100 numeric score for trend tracking
    issue?: string;
    suggestedFix?: string;
    dimensions?: DimensionScores;
    channel: string;
    timestamp: string;
}

function gradeToScore(grade: string): number {
    switch (grade) {
        case 'great': return 97;
        case 'good': return 85;
        case 'acceptable': return 65;
        case 'poor': return 35;
        case 'fail': return 10;
        default: return 50;
    }
}

interface CoachingPatch {
    agent: string;
    patterns: string[];       // Failure patterns observed
    instructions: string[];   // Concrete behavioral changes
    exampleFixes: Array<{     // Before/after response examples
        userMessage: string;
        badResponse: string;
        improvedResponse: string;
    }>;
    priority: 'critical' | 'important' | 'minor';
    deliberation?: {          // Opus + Gemini agreement record
        opusProposal: string;
        geminiReview: string;
        agreement: string;    // Final synthesized rationale
        disagreements?: string[]; // Points where models initially disagreed
    };
}

interface AuditReport {
    auditDate: string;
    totalResponses: number;
    graded: number;
    ungradedCount?: number;
    grades: { great: number; good: number; acceptable: number; poor: number; fail: number };
    averageScore: number;
    agentBreakdown: Record<string, { total: number; great: number; good: number; poor: number; fail: number; avgScore: number }>;
    issues: GradedResponse[];
    summary: string;
    coachingPatches?: CoachingPatch[];
}

// ---------------------------------------------------------------------------
// Grading prompt
// ---------------------------------------------------------------------------

const GRADING_SYSTEM_PROMPT = `You are a QA auditor for BakedBot AI agents. These are Digital Workers — knowledge workers with tools, memory, and web access serving cannabis dispensary owners.

Grade each agent response on a 5-point scale (target: 95+):
- **great** (95-100): Exceptional — accurate, data-driven, actionable, handles context perfectly, thorough depth
- **good** (80-94): Accurate and helpful, minor improvements possible
- **acceptable** (60-79): Mostly correct but could be more specific, actionable, or thorough
- **poor** (30-59): Vague, generic, missed available data, poor context handling, or too brief for the question
- **fail** (0-29): Hallucinated, leaked info, compliance violation, empty/broken, lost context, or single-sentence non-answer to a complex question

For each response, output a JSON object:
{
  "grade": "great"|"good"|"acceptable"|"poor"|"fail",
  "score": 0-100,
  "issue": "brief explanation if below great",
  "suggestedFix": "what the agent should have done differently",
  "dimensions": {
    "accuracy": 0-100,
    "toolUse": 0-100,
    "contextHandling": 0-100,
    "actionability": 0-100,
    "compliance": 0-100,
    "depth": 0-100
  }
}

Evaluate these 9 dimensions — a Digital Worker must excel at ALL of them:

1. **Accuracy**: Did the agent answer the actual question with real data?
2. **Tool Use**: Did it call the right tools? Did it use tool results effectively, or ignore them? Did it call tools it didn't need?
3. **Context Handling**: In multi-turn conversations, did it maintain context? Did it reference earlier messages correctly? Did it handle topic switches gracefully?
4. **Context Compaction**: When conversations are long, did the agent summarize/compress earlier context intelligently, or did it lose track of earlier details?
5. **Web Browsing & Research**: When the agent has web access, did it search effectively? Did it cite sources? Did it synthesize findings rather than just dumping raw results?
6. **Actionability**: Was the response specific and actionable, or generic filler? Could the dispensary owner act on it immediately?
7. **Compliance**: Any health claims, underage language, leaked internal data, or regulatory red flags?
8. **Tone & Professionalism**: Appropriate for a dispensary owner audience? Concise but thorough?
9. **Depth & Completeness**: Did the agent give a thorough, complete answer? A 1-2 sentence reply to a complex operational question is ALWAYS poor/fail regardless of accuracy. Complex questions (analytics, security audits, build health, competitive analysis) require multi-sentence responses with specifics. Speed should NEVER come at the cost of completeness — a fast terse answer is worse than a slower thorough one.

IMPORTANT — Depth scoring guide:
- 100: Thorough, specific, covers all aspects of the question
- 70-90: Mostly complete, minor gaps
- 40-60: Key details missing, answer feels rushed or abbreviated
- 10-30: 1-2 sentences on a question that needed a paragraph — penalize heavily
- 0: Single sentence or empty on a complex question

Special attention for multi-turn/long conversations:
- Did the agent remember what was discussed 5+ messages ago?
- Did it avoid repeating itself or asking questions already answered?
- Did it gracefully handle "as I mentioned earlier" type references?
- Did tool failures degrade the response quality, or did the agent adapt?

Respond with a JSON array of objects, one per response. ONLY output the JSON array.`;

// ---------------------------------------------------------------------------
// Core audit logic
// ---------------------------------------------------------------------------

/**
 * Grade a single batch using Gemini Flash (free) → Groq → Claude Haiku fallback.
 * Returns raw JSON string on success, throws on total failure.
 */
async function callGrader(prompt: string): Promise<string> {
    // Tier 1: Gemini Flash — free, no rate limits
    if (isGeminiFlashConfigured()) {
        try {
            return await callGemini({
                systemPrompt: GRADING_SYSTEM_PROMPT,
                userMessage: prompt,
                maxTokens: 2048,
                temperature: 0.2,
                caller: 'daily-response-audit-gemini',
            });
        } catch (err) {
            logger.warn('[ResponseAudit] Gemini grading failed, trying Groq', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    // Tier 2: Groq — free but rate-limited
    try {
        return await callGroqOrClaude({
            systemPrompt: GRADING_SYSTEM_PROMPT,
            userMessage: prompt,
            maxTokens: 2048,
            temperature: 0.2,
            caller: 'daily-response-audit-groq',
        });
    } catch (err) {
        logger.warn('[ResponseAudit] Groq+Claude grading failed', {
            error: err instanceof Error ? err.message : String(err),
        });
        throw err;
    }
}

async function gradeResponses(responses: SlackResponseRecord[]): Promise<GradedResponse[]> {
    // Batch into chunks of 10 for grading
    const BATCH_SIZE = 10;
    const graded: GradedResponse[] = [];

    for (let i = 0; i < responses.length; i += BATCH_SIZE) {
        const batch = responses.slice(i, i + BATCH_SIZE);

        const formattedBatch = batch.map((r, idx) => (
            `[${idx + 1}] Agent: ${r.agent} (${r.agentName})
Channel: ${r.channel} | Type: ${r.requestType}
User: ${r.userMessage.slice(0, 300)}
Agent: ${r.agentResponse.slice(0, 500)}
Tools: ${r.toolCalls?.join(', ') || 'none'}`
        )).join('\n\n---\n\n');

        const prompt = `Grade these ${batch.length} agent responses:\n\n${formattedBatch}`;

        try {
            const raw = await callGrader(prompt);

            const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const grades = JSON.parse(cleaned);

            if (Array.isArray(grades)) {
                grades.forEach((g: any, idx: number) => {
                    if (idx < batch.length) {
                        const grade = g.grade || 'acceptable';
                        graded.push({
                            agent: batch[idx].agent,
                            userMessage: batch[idx].userMessage.slice(0, 200),
                            agentResponse: batch[idx].agentResponse.slice(0, 300),
                            grade,
                            score: typeof g.score === 'number' ? g.score : gradeToScore(grade),
                            issue: g.issue,
                            suggestedFix: g.suggestedFix,
                            dimensions: g.dimensions || undefined,
                            channel: batch[idx].channel,
                            timestamp: batch[idx].date,
                        });
                    }
                });
            }
        } catch (err) {
            logger.warn('[ResponseAudit] All grading tiers failed for batch', {
                batchStart: i,
                error: err instanceof Error ? err.message : String(err),
            });
            // Mark batch as ungraded — distinct from real grades so coaching pipeline skips them
            batch.forEach((r) => {
                graded.push({
                    agent: r.agent,
                    userMessage: r.userMessage.slice(0, 200),
                    agentResponse: r.agentResponse.slice(0, 300),
                    grade: 'acceptable',
                    score: -1,
                    issue: 'UNGRADED — all grading tiers failed',
                    channel: r.channel,
                    timestamp: r.date,
                });
            });
        }
    }

    return graded;
}

async function generateSummary(report: Omit<AuditReport, 'summary'>): Promise<string> {
    const issueList = report.issues
        .filter((i) => i.grade === 'poor' || i.grade === 'fail')
        .map((i) => `- [${i.grade.toUpperCase()} ${i.score}] ${i.agent}: "${i.userMessage.slice(0, 80)}..." → ${i.issue}`)
        .join('\n');

    const agentStats = Object.entries(report.agentBreakdown)
        .map(([agent, stats]) => `${agent}: ${stats.total} responses, avg ${stats.avgScore} (${stats.great} great, ${stats.good} good, ${stats.poor} poor, ${stats.fail} fail)`)
        .join('\n');

    const prompt = `Write a brief executive summary (3-5 sentences) of this daily agent audit. Target is 95+ average score.

Date: ${report.auditDate}
Total responses: ${report.totalResponses}
Average score: ${report.averageScore}
Grades: ${report.grades.great} great, ${report.grades.good} good, ${report.grades.acceptable} acceptable, ${report.grades.poor} poor, ${report.grades.fail} fail

Agent breakdown:
${agentStats}

Issues found:
${issueList || 'None'}

Be specific about which agents need attention, their average scores, and what the common failure patterns are. If coaching patches were generated via Opus+Gemini deliberation, mention that. If all agents scored 95+, celebrate briefly.`;

    // Use Gemini Flash (free) for summary, fallback to Groq/Claude
    if (isGeminiFlashConfigured()) {
        try {
            return await callGemini({
                userMessage: prompt,
                maxTokens: 500,
                temperature: 0.3,
                caller: 'daily-response-audit-summary',
            });
        } catch {
            // Fall through to Groq/Claude
        }
    }
    return callGroqOrClaude({
        userMessage: prompt,
        maxTokens: 500,
        temperature: 0.3,
        caller: 'daily-response-audit-summary',
    });
}

// ---------------------------------------------------------------------------
// Deliberative Coaching — Opus proposes, Gemini reviews, Opus synthesizes
// ---------------------------------------------------------------------------

const COACHING_SYSTEM_PROMPT = `You are a senior AI systems coach. Your job is to analyze an AI agent's failures and produce a precise "coaching patch" — behavioral instructions that will be injected into the agent's system prompt to fix the observed failure patterns.

These agents are Digital Workers — knowledge workers with tools, memory, web browsing, and multi-turn conversation capabilities. Coach them like you would coach a new employee who has access to all the right tools but isn't using them effectively.

Rules:
- Be concrete and actionable. "Be more helpful" is useless. "When the user asks about inbox/calendar and Gmail auth fails, acknowledge the failure in one sentence then offer 3 alternative actions you CAN take" is useful.
- Each instruction should be a single, testable rule the agent can follow.
- Include before/after response examples so the agent can pattern-match.
- Address these Digital Worker competencies specifically:
  * TOOL USE: When to call tools, how to handle tool failures, when NOT to call tools
  * CONTEXT MANAGEMENT: How to maintain context in long conversations, what to remember vs. re-ask
  * WEB RESEARCH: How to search effectively, cite sources, synthesize rather than dump
  * COMPACTION: How to summarize earlier context without losing critical details
- Prioritize: "critical" = hallucinating data, leaking info, or losing context mid-conversation, "important" = poor tool use or failing to answer, "minor" = tone/style issues.
- Output valid JSON only.`;

function buildIssueDetails(agentIssues: GradedResponse[]): string {
    return agentIssues.map((i, idx) => {
        const dims = i.dimensions
            ? `\nDimension scores: accuracy=${i.dimensions.accuracy}, toolUse=${i.dimensions.toolUse}, contextHandling=${i.dimensions.contextHandling}, actionability=${i.dimensions.actionability}, compliance=${i.dimensions.compliance}`
            : '';
        return `[${idx + 1}] Grade: ${i.grade.toUpperCase()} (Score: ${i.score})${dims}
User asked: "${i.userMessage}"
Agent said: "${i.agentResponse}"
Issue: ${i.issue}
Suggested fix: ${i.suggestedFix || 'none'}`;
    }).join('\n\n');
}

/**
 * Call the best available reasoning model: Opus (best) → Gemini 2.5 Flash (free fallback).
 * Ensures coaching never stalls due to Claude credit exhaustion.
 */
async function callCoachingModel(opts: { systemPrompt: string; userMessage: string; maxTokens: number; temperature: number; caller: string }): Promise<{ text: string; model: string }> {
    // Tier 1: Opus — best reasoning for coaching quality
    try {
        const text = await callClaude({
            model: 'claude-opus-4-20250514',
            systemPrompt: opts.systemPrompt,
            userMessage: opts.userMessage,
            maxTokens: opts.maxTokens,
            temperature: opts.temperature,
            caller: opts.caller,
        });
        return { text, model: 'opus' };
    } catch (err) {
        logger.warn('[ResponseAudit] Opus unavailable, falling back to Gemini 2.5 Flash', {
            caller: opts.caller,
            error: err instanceof Error ? err.message : String(err),
        });
    }

    // Tier 2: Gemini 2.5 Flash — free, solid reasoning
    if (isGeminiFlashConfigured()) {
        const text = await callGemini({
            model: 'googleai/gemini-2.5-flash',
            systemPrompt: opts.systemPrompt,
            userMessage: opts.userMessage,
            maxTokens: opts.maxTokens,
            temperature: opts.temperature,
            caller: `${opts.caller}-gemini-fallback`,
        });
        return { text, model: 'gemini-2.5-flash' };
    }

    throw new Error('No coaching model available — both Opus and Gemini unavailable');
}

/**
 * Step 1: Propose an initial coaching patch (Opus → Gemini fallback)
 */
async function opusPropose(agent: string, failRate: string, stats: { poor: number; fail: number; total: number }, issueDetails: string): Promise<{ text: string; model: string }> {
    return callCoachingModel({
        systemPrompt: COACHING_SYSTEM_PROMPT,
        userMessage: `Agent "${agent}" scored ${failRate}% poor/fail (${stats.poor} poor, ${stats.fail} fail out of ${stats.total} total).

Here are the specific failures:

${issueDetails}

Generate a coaching patch as JSON:
{
  "agent": "${agent}",
  "patterns": ["pattern 1", "pattern 2"],
  "instructions": ["concrete instruction 1", "concrete instruction 2"],
  "exampleFixes": [{ "userMessage": "...", "badResponse": "...", "improvedResponse": "..." }],
  "priority": "critical"|"important"|"minor"
}`,
        maxTokens: 1500,
        temperature: 0.3,
        caller: 'deliberative-coaching-propose',
    });
}

const ADVERSARY_REVIEW_PROMPT = `You are a senior AI systems reviewer acting as an ADVERSARY. Another AI coach proposed a coaching patch for a failing agent. Your job is to CHALLENGE the proposal — find weaknesses, missing patterns, vague instructions, and potential conflicts. Be tough but fair.

You are from a DIFFERENT model family than the proposer. Use your different perspective to catch blind spots the proposer's training might have missed.

Focus your review on:
1. Are the instructions TESTABLE? Could you verify the agent follows them?
2. Are any instructions too vague or too narrow? (Good: "When POS tool returns empty, say 'I couldn't find that product' and suggest searching by category". Bad: "Handle errors better")
3. Did the proposer miss any failure patterns visible in the data?
4. For LONG CONVERSATION failures: Did the proposer address context management and compaction?
5. For TOOL USE failures: Did the proposer address when to retry vs. when to gracefully degrade?
6. For WEB BROWSING failures: Did the proposer address source citation and synthesis?
7. Would these instructions conflict with each other or with the agent's core role?
8. Are there edge cases or failure modes the proposer didn't consider?

Be specific. "This is too vague" is unhelpful. "Instruction 3 says 'handle errors gracefully' but doesn't specify whether to retry, show a fallback message, or escalate — pick one" is useful.

Output JSON:
{
  "approved": true/false,
  "critique": "overall assessment",
  "missingPatterns": ["patterns the proposer missed"],
  "improvedInstructions": ["rewritten or additional instructions"],
  "removedInstructions": ["instructions that are too vague or counterproductive"],
  "suggestedExamples": [{ "userMessage": "...", "badResponse": "...", "improvedResponse": "..." }]
}`;

/**
 * Step 2: Adversarial review — Groq Llama (Meta) → Gemini 3 Pro (Google) fallback.
 * Different model family from proposer ensures real tension, not echo chamber.
 * Slow-walked: coaching runs ~4 agents/day, well under Groq's 30 req/min.
 */
async function adversarialReview(agent: string, proposal: string, issueDetails: string): Promise<{ text: string; model: string }> {
    const userMessage = `Agent "${agent}" has these failures:

${issueDetails}

A coaching patch was proposed:
${proposal}

Review the proposal as an adversary. Be specific about what's good, what's missing, and what needs to change.`;

    // Tier 1: Groq Llama 3.3 70B — Meta training, genuinely different perspective from Gemini/Claude
    if (isGLMConfigured()) {
        try {
            const text = await callGLM({
                systemPrompt: ADVERSARY_REVIEW_PROMPT,
                userMessage,
                model: GLM_MODELS.STRATEGIC,
                maxTokens: 1500,
                temperature: 0.3,
            });
            return { text, model: 'groq-llama-3.3-70b' };
        } catch (err) {
            logger.warn('[ResponseAudit] Groq adversary review failed, falling back to Gemini 3 Pro', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    // Tier 2: Gemini 3 Pro — different from proposer (Opus/Gemini Flash), strong reasoning
    if (isGeminiFlashConfigured()) {
        const text = await callGemini({
            model: 'googleai/gemini-3-pro-preview',
            systemPrompt: ADVERSARY_REVIEW_PROMPT,
            userMessage,
            maxTokens: 1500,
            temperature: 0.3,
            caller: 'deliberative-coaching-adversary-gemini3pro',
        });
        return { text, model: 'gemini-3-pro' };
    }

    return { text: JSON.stringify({ approved: true, critique: 'No adversary available — proposal accepted as-is', suggestions: [] }), model: 'none' };
}

/**
 * Step 3: Synthesize final agreed patch from both perspectives (Opus → Gemini fallback)
 */
async function opusSynthesize(agent: string, opusProposal: string, geminiReviewText: string): Promise<{ text: string; model: string }> {
    return callCoachingModel({
        systemPrompt: `You are synthesizing the final coaching patch for an AI agent. An initial patch was proposed, and a peer reviewer critiqued it. Now produce the FINAL agreed-upon patch that incorporates valid feedback.

Rules:
- Accept the reviewer's critique when it makes the instructions more testable or catches a missed pattern.
- Reject suggestions when they make instructions vague or conflict with the agent's core role.
- The final patch MUST be strictly actionable — every instruction must be testable.
- Include a "deliberation.agreement" field explaining what changed and why.
- Output valid JSON only.`,
        userMessage: `Original proposal:
${opusProposal}

Reviewer's feedback:
${geminiReviewText}

Produce the final, agreed-upon coaching patch as JSON:
{
  "agent": "${agent}",
  "patterns": ["final pattern list"],
  "instructions": ["final instruction list — merged from both perspectives"],
  "exampleFixes": [{ "userMessage": "...", "badResponse": "...", "improvedResponse": "..." }],
  "priority": "critical"|"important"|"minor",
  "deliberation": {
    "agreement": "what changed after review and why",
    "disagreements": ["points where reviewer feedback was rejected and why"]
  }
}`,
        maxTokens: 2000,
        temperature: 0.2,
        caller: 'deliberative-coaching-synthesize',
    });
}

async function generateCoachingPatches(
    report: Omit<AuditReport, 'summary' | 'coachingPatches'>
): Promise<CoachingPatch[]> {
    // Coach agents below 95 average — not just poor/fail, but anything below great
    const agentsNeedingCoaching = Object.entries(report.agentBreakdown)
        .filter(([, stats]) => stats.avgScore < 95 || stats.poor > 0 || stats.fail > 0)
        .map(([agent]) => agent);

    if (agentsNeedingCoaching.length === 0) return [];

    const patches: CoachingPatch[] = [];

    for (const agent of agentsNeedingCoaching) {
        // Include all non-great responses for coaching — we're targeting 95+
        const agentIssues = report.issues.filter(
            (i) => i.agent === agent && i.grade !== 'great'
        );
        if (agentIssues.length === 0) continue;

        const stats = report.agentBreakdown[agent];
        const failRate = ((stats.poor + stats.fail) / stats.total * 100).toFixed(0);
        const issueDetails = buildIssueDetails(agentIssues);

        try {
            // === DELIBERATIVE PIPELINE: Propose → Review → Synthesize (Opus preferred, Gemini fallback) ===
            logger.info('[ResponseAudit] Deliberative coaching starting', { agent });

            // Step 1: Propose initial coaching patch
            const proposal = await opusPropose(agent, failRate, stats, issueDetails);

            // Slow-walk: 3s pause between model calls to stay under rate limits
            await new Promise((r) => setTimeout(r, 3000));

            // Step 2: Adversarial review (different model family for real tension)
            const review = await adversarialReview(agent, proposal.text, issueDetails);

            await new Promise((r) => setTimeout(r, 3000));

            // Step 3: Synthesize final agreed patch from both perspectives
            const synthesis = await opusSynthesize(agent, proposal.text, review.text);

            const cleaned = synthesis.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const patch = JSON.parse(cleaned) as CoachingPatch;

            // Preserve the full deliberation record with model provenance
            const modelsUsed = `propose:${proposal.model}, adversary:${review.model}, synthesize:${synthesis.model}`;
            if (!patch.deliberation) {
                patch.deliberation = {
                    opusProposal: proposal.text.slice(0, 500),
                    geminiReview: review.text.slice(0, 500),
                    agreement: `Synthesized with adversarial review (${modelsUsed})`,
                };
            } else {
                patch.deliberation.opusProposal = proposal.text.slice(0, 500);
                patch.deliberation.geminiReview = review.text.slice(0, 500);
            }

            patches.push(patch);

            logger.info('[ResponseAudit] Deliberative coaching complete', {
                agent,
                modelsUsed,
                instructionCount: patch.instructions.length,
                priority: patch.priority,
                hasDisagreements: (patch.deliberation.disagreements?.length ?? 0) > 0,
            });
        } catch (err) {
            logger.warn('[ResponseAudit] Deliberative coaching failed for agent', {
                agent,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    return patches;
}

async function saveCoachingPatches(patches: CoachingPatch[], auditDate: string): Promise<void> {
    if (patches.length === 0) return;
    const db = getAdminFirestore();

    // Save each patch to agent_coaching collection — agents read their latest patch on startup
    const writes = patches.map((patch) =>
        db.collection('agent_coaching').doc(`${patch.agent}_latest`).set({
            ...patch,
            auditDate,
            updatedAt: new Date(),
        }, { merge: false })
    );

    // Also append to history for trend tracking
    const historyWrites = patches.map((patch) =>
        db.collection('agent_coaching_history').add({
            ...patch,
            auditDate,
            createdAt: new Date(),
        })
    );

    await Promise.all([...writes, ...historyWrites]);

    // Invalidate in-memory cache so agents pick up new patches immediately
    for (const patch of patches) {
        invalidateCoachingCache(patch.agent);
    }

    logger.info('[ResponseAudit] Coaching patches saved + cache invalidated', {
        agents: patches.map((p) => p.agent),
        priorities: patches.map((p) => `${p.agent}:${p.priority}`),
    });

    // Persist coaching summary to Hive Mind (Letta) — cross-agent learning
    // Marty (CEO) and all agents can see what the team learned overnight
    try {
        const summary = patches.map((p) =>
            `[${p.agent}:${p.priority}] ${p.instructions.slice(0, 200)}`
        ).join('\n');
        await lettaBlockManager.appendToBlock(
            'system',
            BLOCK_LABELS.OVERNIGHT_LEARNINGS,
            `Audit ${auditDate}: ${patches.length} patch(es)\n${summary}`,
            'overnight-training'
        );
        logger.info('[ResponseAudit] Coaching patches persisted to Hive Mind');
    } catch (err) {
        logger.warn('[ResponseAudit] Failed to persist coaching to Hive Mind', {
            error: err instanceof Error ? err.message : String(err),
        });
    }
}

// ---------------------------------------------------------------------------
// Slack notification
// ---------------------------------------------------------------------------

async function postAuditToSlack(report: AuditReport): Promise<void> {
    const issueBlocks = report.issues
        .filter((i) => i.grade === 'poor' || i.grade === 'fail')
        .slice(0, 5)
        .map((i) => `> *[${i.grade.toUpperCase()} ${i.score}]* \`${i.agent}\`: _"${i.userMessage.slice(0, 60)}..."_\n>  ${i.issue}${i.suggestedFix ? `\n>  Fix: ${i.suggestedFix}` : ''}`)
        .join('\n\n');

    const avgScore = report.averageScore;
    const scoreEmoji = avgScore >= 95 ? '🏆' : avgScore >= 80 ? '✅' : avgScore >= 60 ? '⚠️' : '🔴';
    const coachingCount = report.coachingPatches?.length ?? 0;
    const deliberationNote = coachingCount > 0
        ? `\n🧠 *${coachingCount} coaching patch${coachingCount > 1 ? 'es' : ''}* generated via Opus+Gemini deliberation`
        : '';

    const agentScores = Object.entries(report.agentBreakdown)
        .map(([agent, stats]) => `\`${agent}\` avg ${stats.avgScore}`)
        .join(' | ');

    const blocks = [
        {
            type: 'header',
            text: { type: 'plain_text', text: `${scoreEmoji} Daily Agent Audit — ${report.auditDate} (avg: ${avgScore})` },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*${report.totalResponses} responses graded — Target: 95+*\n🏆 ${report.grades.great} great | ✅ ${report.grades.good} good | 🟡 ${report.grades.acceptable} acceptable | 🟠 ${report.grades.poor} poor | 🔴 ${report.grades.fail} fail${deliberationNote}\n\n${agentScores}`,
            },
        },
        {
            type: 'section',
            text: { type: 'mrkdwn', text: report.summary },
        },
        ...(issueBlocks ? [{
            type: 'section',
            text: { type: 'mrkdwn', text: `*Top Issues:*\n${issueBlocks}` },
        }] : []),
    ];

    await postLinusIncidentSlack({
        source: 'agent-dream-review',
        channelName: 'ceo',
        fallbackText: `${scoreEmoji} Daily Agent Audit — ${report.auditDate}: avg ${avgScore}, ${report.grades.great} great, ${report.grades.poor} poor, ${report.grades.fail} fail`,
        blocks,
    });
}

// ---------------------------------------------------------------------------
// Save to Firestore
// ---------------------------------------------------------------------------

async function saveAuditReport(report: AuditReport): Promise<string> {
    const db = getAdminFirestore();
    const ref = await db.collection('agent_audit_reports').add({
        ...report,
        createdAt: new Date(),
    });
    return ref.id;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
    const token = getAuthToken(req);
    if (!CRON_SECRET || token !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        logger.info('[ResponseAudit] Starting daily response audit');

        // Date range: default = yesterday midnight→today midnight.
        // Override with ?date=YYYY-MM-DD to audit a specific day,
        // or ?hours=N for a rolling N-hour window (useful for ad-hoc stress tests).
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        const dateParam = req.nextUrl.searchParams.get('date');
        const hoursParam = req.nextUrl.searchParams.get('hours');

        if (dateParam) {
            // Audit a specific calendar day
            startDate = new Date(dateParam + 'T00:00:00Z');
            endDate = new Date(dateParam + 'T23:59:59.999Z');
        } else if (hoursParam) {
            // Rolling window: last N hours from now
            const hours = Math.min(parseInt(hoursParam, 10) || 24, 168); // cap at 7 days
            endDate = new Date(now);
            startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);
        } else {
            // Default: yesterday midnight → today midnight
            endDate = new Date(now);
            endDate.setHours(0, 0, 0, 0);
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 1);
        }

        const responses = await getResponsesByDateRange(startDate, endDate);

        if (responses.length === 0) {
            logger.info('[ResponseAudit] No responses to audit');
            return NextResponse.json({ ok: true, message: 'No responses to audit', totalResponses: 0 });
        }

        // Sample if too many (grade up to 50 to save tokens)
        const MAX_GRADE = 50;
        const toGrade = responses.length > MAX_GRADE
            ? sampleResponses(responses, MAX_GRADE)
            : responses;

        // Grade responses
        const graded = await gradeResponses(toGrade);

        // Separate real grades from ungraded (score=-1 = grading tiers all failed)
        const realGraded = graded.filter((g) => g.score >= 0);
        const ungradedCount = graded.length - realGraded.length;

        // Build report from real grades only
        const grades = { great: 0, good: 0, acceptable: 0, poor: 0, fail: 0 };
        const agentBreakdown: Record<string, { total: number; great: number; good: number; poor: number; fail: number; avgScore: number; _scoreSum: number }> = {};

        for (const g of realGraded) {
            grades[g.grade]++;
            if (!agentBreakdown[g.agent]) {
                agentBreakdown[g.agent] = { total: 0, great: 0, good: 0, poor: 0, fail: 0, avgScore: 0, _scoreSum: 0 };
            }
            agentBreakdown[g.agent].total++;
            agentBreakdown[g.agent]._scoreSum += g.score;
            if (g.grade === 'great') agentBreakdown[g.agent].great++;
            if (g.grade === 'good') agentBreakdown[g.agent].good++;
            if (g.grade === 'poor') agentBreakdown[g.agent].poor++;
            if (g.grade === 'fail') agentBreakdown[g.agent].fail++;
        }

        // Compute averages
        let totalScore = 0;
        for (const [, stats] of Object.entries(agentBreakdown)) {
            stats.avgScore = stats.total > 0 ? Math.round(stats._scoreSum / stats.total) : 0;
            totalScore += stats._scoreSum;
            delete (stats as Record<string, unknown>)['_scoreSum'];
        }
        const averageScore = realGraded.length > 0 ? Math.round(totalScore / realGraded.length) : 0;

        // Include non-great REAL grades as issues for coaching (exclude ungraded)
        const issues = realGraded.filter((g) => g.grade !== 'great');

        const partialReport = {
            auditDate: startDate.toISOString().split('T')[0],
            totalResponses: responses.length,
            graded: realGraded.length,
            ungradedCount,
            grades,
            averageScore,
            agentBreakdown: agentBreakdown as Record<string, { total: number; great: number; good: number; poor: number; fail: number; avgScore: number }>,
            issues,
        };

        // Generate executive summary (Groq — free)
        const summary = await generateSummary(partialReport);

        // Generate coaching patches via Opus+Gemini deliberation — targeted at agents below 95 avg
        // This is the key intelligence leverage: cheap models grade, expensive models deliberate on coaching.
        const coachingPatches = (averageScore < 95 || issues.length > 0)
            ? await generateCoachingPatches(partialReport)
            : [];

        const report: AuditReport = { ...partialReport, summary, coachingPatches };

        // Save report, coaching patches, and notify in parallel
        const [reportId] = await Promise.all([
            saveAuditReport(report),
            postAuditToSlack(report),
            saveCoachingPatches(coachingPatches, partialReport.auditDate),
        ]);

        // Auto-file agent tasks for poor/fail agents (Principle 6: zero dead ends)
        try {
            const { createTaskInternal } = await import('@/server/actions/agent-tasks');
            const poorAgents = Object.entries(agentBreakdown)
                .filter(([, stats]) => stats.poor > 0 || stats.fail > 0);

            for (const [agent, stats] of poorAgents) {
                const agentIssues = issues
                    .filter(i => i.agent === agent && (i.grade === 'poor' || i.grade === 'fail'))
                    .slice(0, 3);

                const issueList = agentIssues
                    .map(i => `- **[${i.grade.toUpperCase()} ${i.score}]** "${i.userMessage.slice(0, 80)}"\n  ${i.issue || 'No details'}${i.suggestedFix ? `\n  Fix: ${i.suggestedFix}` : ''}`)
                    .join('\n');

                await createTaskInternal({
                    title: `${agent}: ${stats.poor + stats.fail} poor/fail responses (avg ${stats.avgScore})`,
                    body: `Daily audit ${partialReport.auditDate} found quality issues for **${agent}**.\n\n**Stats:** ${stats.total} graded, avg ${stats.avgScore}, ${stats.poor} poor, ${stats.fail} fail\n\n**Top issues:**\n${issueList}`,
                    priority: stats.fail > 0 ? 'high' : 'normal',
                    category: 'agent_quality',
                    reportedBy: 'daily-response-audit',
                    assignedTo: 'linus',
                });
            }

            if (poorAgents.length > 0) {
                logger.info('[ResponseAudit] Filed agent tasks', {
                    agents: poorAgents.map(([a]) => a),
                    count: poorAgents.length,
                });
            }
        } catch (taskErr) {
            // Non-critical — audit still succeeded
            logger.warn('[ResponseAudit] Failed to file agent tasks', {
                error: taskErr instanceof Error ? taskErr.message : String(taskErr),
            });
        }

        logger.info('[ResponseAudit] Audit complete', {
            reportId,
            coachingPatches: coachingPatches.length,
            totalResponses: responses.length,
            graded: realGraded.length,
            ungradedCount,
            grades,
            issueCount: issues.length,
        });

        return NextResponse.json({
            ok: true,
            reportId,
            totalResponses: responses.length,
            graded: realGraded.length,
            ungradedCount,
            averageScore,
            grades,
            issueCount: issues.length,
            coachingPatchCount: coachingPatches.length,
            coachingAgents: coachingPatches.map((p) => `${p.agent}:${p.priority}`),
            deliberative: coachingPatches.length > 0,
            summary,
        });

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('[ResponseAudit] Audit failed', { error: message });
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}

// Cloud Scheduler sends POST
export async function POST(req: NextRequest): Promise<NextResponse> {
    return GET(req);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stratified sample: proportional representation per agent */
function sampleResponses(responses: SlackResponseRecord[], maxCount: number): SlackResponseRecord[] {
    const byAgent: Record<string, SlackResponseRecord[]> = {};
    for (const r of responses) {
        if (!byAgent[r.agent]) byAgent[r.agent] = [];
        byAgent[r.agent].push(r);
    }

    const agents = Object.keys(byAgent);
    const perAgent = Math.max(1, Math.floor(maxCount / agents.length));
    const sampled: SlackResponseRecord[] = [];

    for (const agent of agents) {
        const agentResponses = byAgent[agent];
        // Take evenly spaced samples
        const step = Math.max(1, Math.floor(agentResponses.length / perAgent));
        for (let i = 0; i < agentResponses.length && sampled.length < maxCount; i += step) {
            sampled.push(agentResponses[i]);
        }
    }

    return sampled;
}
