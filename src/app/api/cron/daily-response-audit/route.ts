import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { callGroqOrClaude } from '@/ai/glm';
import { getResponsesByDateRange } from '@/server/services/slack-response-archive';
import type { SlackResponseRecord } from '@/server/services/slack-response-archive';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import { callClaude } from '@/ai/claude';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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

interface GradedResponse {
    agent: string;
    userMessage: string;
    agentResponse: string;
    grade: 'good' | 'acceptable' | 'poor' | 'fail';
    score: number;          // 0-100 numeric score for trend tracking
    issue?: string;
    suggestedFix?: string;
    channel: string;
    timestamp: string;
}

function gradeToScore(grade: string): number {
    switch (grade) {
        case 'good': return 90;
        case 'acceptable': return 60;
        case 'poor': return 30;
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
}

interface AuditReport {
    auditDate: string;
    totalResponses: number;
    graded: number;
    grades: { good: number; acceptable: number; poor: number; fail: number };
    agentBreakdown: Record<string, { total: number; good: number; poor: number; fail: number }>;
    issues: GradedResponse[];
    summary: string;
    coachingPatches?: CoachingPatch[];
}

// ---------------------------------------------------------------------------
// Grading prompt
// ---------------------------------------------------------------------------

const GRADING_SYSTEM_PROMPT = `You are a QA auditor for BakedBot AI agents. These agents serve cannabis dispensary owners.

Grade each agent response on a 4-point scale:
- **good**: Accurate, helpful, on-brand, uses data when available
- **acceptable**: Mostly correct but could be more specific or actionable
- **poor**: Vague, generic, missing data the agent should have used, or off-topic
- **fail**: Factually wrong, hallucinated data, leaked internal info, compliance violation, or empty/broken

For each response, output a JSON object:
{ "grade": "good"|"acceptable"|"poor"|"fail", "issue": "brief explanation if poor/fail", "suggestedFix": "what the agent should have done differently" }

Focus on:
1. Did the agent answer the actual question?
2. Did it use real data (POS, CRM, competitive) or make things up?
3. Was the tone appropriate for a dispensary owner audience?
4. Any compliance red flags (health claims, underage language)?
5. Was the response actionable or just filler?

Respond with a JSON array of objects, one per response. ONLY output the JSON array.`;

// ---------------------------------------------------------------------------
// Core audit logic
// ---------------------------------------------------------------------------

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

        try {
            const raw = await callGroqOrClaude({
                systemPrompt: GRADING_SYSTEM_PROMPT,
                userMessage: `Grade these ${batch.length} agent responses:\n\n${formattedBatch}`,
                maxTokens: 2048,
                temperature: 0.2,
                caller: 'daily-response-audit',
            });

            const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const grades = JSON.parse(cleaned);

            if (Array.isArray(grades)) {
                grades.forEach((g: any, idx: number) => {
                    if (idx < batch.length) {
                        graded.push({
                            agent: batch[idx].agent,
                            userMessage: batch[idx].userMessage.slice(0, 200),
                            agentResponse: batch[idx].agentResponse.slice(0, 300),
                            grade: g.grade || 'acceptable',
                            score: typeof g.score === 'number' ? g.score : gradeToScore(g.grade || 'acceptable'),
                            issue: g.issue,
                            suggestedFix: g.suggestedFix,
                            channel: batch[idx].channel,
                            timestamp: batch[idx].date,
                        });
                    }
                });
            }
        } catch (err) {
            logger.warn('[ResponseAudit] Grading batch failed', {
                batchStart: i,
                error: err instanceof Error ? err.message : String(err),
            });
            // Mark batch as ungraded
            batch.forEach((r) => {
                graded.push({
                    agent: r.agent,
                    userMessage: r.userMessage.slice(0, 200),
                    agentResponse: r.agentResponse.slice(0, 300),
                    grade: 'acceptable',
                    score: 50,
                    issue: 'Grading failed — skipped',
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
        .map((i) => `- [${i.grade.toUpperCase()}] ${i.agent}: "${i.userMessage.slice(0, 80)}..." → ${i.issue}`)
        .join('\n');

    const agentStats = Object.entries(report.agentBreakdown)
        .map(([agent, stats]) => `${agent}: ${stats.total} responses (${stats.good} good, ${stats.poor} poor, ${stats.fail} fail)`)
        .join('\n');

    const prompt = `Write a brief executive summary (3-5 sentences) of this daily agent audit:

Date: ${report.auditDate}
Total responses: ${report.totalResponses}
Grades: ${report.grades.good} good, ${report.grades.acceptable} acceptable, ${report.grades.poor} poor, ${report.grades.fail} fail

Agent breakdown:
${agentStats}

Issues found:
${issueList || 'None'}

Be specific about which agents need attention and what the common failure patterns are. If all agents performed well, say so briefly.`;

    return callGroqOrClaude({
        userMessage: prompt,
        maxTokens: 500,
        temperature: 0.3,
        caller: 'daily-response-audit-summary',
    });
}

// ---------------------------------------------------------------------------
// Opus Coaching — uses high-intelligence model to generate behavioral patches
// ---------------------------------------------------------------------------

async function generateCoachingPatches(
    report: Omit<AuditReport, 'summary' | 'coachingPatches'>
): Promise<CoachingPatch[]> {
    // Only coach agents with poor/fail grades — no wasted Opus calls
    const agentsNeedingCoaching = Object.entries(report.agentBreakdown)
        .filter(([, stats]) => stats.poor > 0 || stats.fail > 0)
        .map(([agent]) => agent);

    if (agentsNeedingCoaching.length === 0) return [];

    const patches: CoachingPatch[] = [];

    for (const agent of agentsNeedingCoaching) {
        const agentIssues = report.issues.filter(
            (i) => i.agent === agent && (i.grade === 'poor' || i.grade === 'fail')
        );
        if (agentIssues.length === 0) continue;

        const stats = report.agentBreakdown[agent];
        const failRate = ((stats.poor + stats.fail) / stats.total * 100).toFixed(0);

        const issueDetails = agentIssues.map((i, idx) =>
            `[${idx + 1}] Grade: ${i.grade.toUpperCase()}
User asked: "${i.userMessage}"
Agent said: "${i.agentResponse}"
Issue: ${i.issue}
Suggested fix: ${i.suggestedFix || 'none'}`
        ).join('\n\n');

        try {
            const raw = await callClaude({
                model: 'claude-opus-4-20250514',
                systemPrompt: `You are a senior AI systems coach. Your job is to analyze an AI agent's failures and produce a precise "coaching patch" — behavioral instructions that will be injected into the agent's system prompt to fix the observed failure patterns.

Rules:
- Be concrete and actionable. "Be more helpful" is useless. "When the user asks about inbox/calendar and Gmail auth fails, acknowledge the failure in one sentence then offer 3 alternative actions you CAN take" is useful.
- Each instruction should be a single, testable rule the agent can follow.
- Include before/after response examples so the agent can pattern-match.
- Prioritize: "critical" = hallucinating data or leaking internal info, "important" = failing to answer questions, "minor" = tone/style issues.
- Output valid JSON only.`,
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
            });

            const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const patch = JSON.parse(cleaned) as CoachingPatch;
            patches.push(patch);
        } catch (err) {
            logger.warn('[ResponseAudit] Opus coaching failed for agent', {
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
    logger.info('[ResponseAudit] Coaching patches saved', {
        agents: patches.map((p) => p.agent),
        priorities: patches.map((p) => `${p.agent}:${p.priority}`),
    });
}

// ---------------------------------------------------------------------------
// Slack notification
// ---------------------------------------------------------------------------

async function postAuditToSlack(report: AuditReport): Promise<void> {
    const issueBlocks = report.issues
        .filter((i) => i.grade === 'poor' || i.grade === 'fail')
        .slice(0, 5)
        .map((i) => `> *[${i.grade.toUpperCase()}]* \`${i.agent}\`: _"${i.userMessage.slice(0, 60)}..."_\n>  ${i.issue}${i.suggestedFix ? `\n>  Fix: ${i.suggestedFix}` : ''}`)
        .join('\n\n');

    const scoreEmoji = report.grades.fail > 0 ? '🔴' : report.grades.poor > 2 ? '⚠️' : '✅';

    const blocks = [
        {
            type: 'header',
            text: { type: 'plain_text', text: `${scoreEmoji} Daily Agent Audit — ${report.auditDate}` },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*${report.totalResponses} responses graded*\n✅ ${report.grades.good} good | 🟡 ${report.grades.acceptable} acceptable | 🟠 ${report.grades.poor} poor | 🔴 ${report.grades.fail} fail`,
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
        fallbackText: `${scoreEmoji} Daily Agent Audit — ${report.auditDate}: ${report.grades.good} good, ${report.grades.poor} poor, ${report.grades.fail} fail`,
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

        // Build report
        const grades = { good: 0, acceptable: 0, poor: 0, fail: 0 };
        const agentBreakdown: Record<string, { total: number; good: number; poor: number; fail: number }> = {};

        for (const g of graded) {
            grades[g.grade]++;
            if (!agentBreakdown[g.agent]) {
                agentBreakdown[g.agent] = { total: 0, good: 0, poor: 0, fail: 0 };
            }
            agentBreakdown[g.agent].total++;
            if (g.grade === 'good') agentBreakdown[g.agent].good++;
            if (g.grade === 'poor') agentBreakdown[g.agent].poor++;
            if (g.grade === 'fail') agentBreakdown[g.agent].fail++;
        }

        const issues = graded.filter((g) => g.grade === 'poor' || g.grade === 'fail');

        const partialReport = {
            auditDate: startDate.toISOString().split('T')[0],
            totalResponses: responses.length,
            graded: graded.length,
            grades,
            agentBreakdown,
            issues,
        };

        // Generate executive summary (Groq — free)
        const summary = await generateSummary(partialReport);

        // Generate coaching patches (Opus — targeted, only for agents with failures)
        // This is the key intelligence leverage: cheap models grade, expensive model coaches.
        const coachingPatches = (issues.length > 0)
            ? await generateCoachingPatches(partialReport)
            : [];

        const report: AuditReport = { ...partialReport, summary, coachingPatches };

        // Save report, coaching patches, and notify in parallel
        const [reportId] = await Promise.all([
            saveAuditReport(report),
            postAuditToSlack(report),
            saveCoachingPatches(coachingPatches, partialReport.auditDate),
        ]);

        logger.info('[ResponseAudit] Audit complete', {
            reportId,
            coachingPatches: coachingPatches.length,
            totalResponses: responses.length,
            graded: graded.length,
            grades,
            issueCount: issues.length,
        });

        return NextResponse.json({
            ok: true,
            reportId,
            totalResponses: responses.length,
            graded: graded.length,
            grades,
            issueCount: issues.length,
            coachingPatchCount: coachingPatches.length,
            coachingAgents: coachingPatches.map((p) => `${p.agent}:${p.priority}`),
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
