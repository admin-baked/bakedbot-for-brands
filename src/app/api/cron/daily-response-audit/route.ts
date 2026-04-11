import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { callGroqOrClaude } from '@/ai/glm';
import { getResponsesByDateRange } from '@/server/services/slack-response-archive';
import type { SlackResponseRecord } from '@/server/services/slack-response-archive';

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
    issue?: string;
    suggestedFix?: string;
    channel: string;
    timestamp: string;
}

interface AuditReport {
    auditDate: string;
    totalResponses: number;
    graded: number;
    grades: { good: number; acceptable: number; poor: number; fail: number };
    agentBreakdown: Record<string, { total: number; good: number; poor: number; fail: number }>;
    issues: GradedResponse[];
    summary: string;
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
// Slack notification
// ---------------------------------------------------------------------------

async function postAuditToSlack(report: AuditReport): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
        logger.warn('[ResponseAudit] SLACK_WEBHOOK_URL not set — skipping Slack post');
        return;
    }

    const issueBlocks = report.issues
        .filter((i) => i.grade === 'poor' || i.grade === 'fail')
        .slice(0, 5) // Top 5 issues
        .map((i) => `> *[${i.grade.toUpperCase()}]* \`${i.agent}\`: _"${i.userMessage.slice(0, 60)}..."_\n>  ${i.issue}${i.suggestedFix ? `\n>  Fix: ${i.suggestedFix}` : ''}`)
        .join('\n\n');

    const scoreEmoji = report.grades.fail > 0 ? ':red_circle:' : report.grades.poor > 2 ? ':large_yellow_circle:' : ':large_green_circle:';

    const payload = {
        text: `${scoreEmoji} Daily Agent Audit — ${report.auditDate}`,
        blocks: [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${scoreEmoji === ':large_green_circle:' ? '✅' : scoreEmoji === ':large_yellow_circle:' ? '⚠️' : '🔴'} Daily Agent Audit — ${report.auditDate}` },
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
        ],
    };

    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

        // Get yesterday's responses (full 24h window)
        const now = new Date();
        const endDate = new Date(now);
        endDate.setHours(0, 0, 0, 0); // Midnight today
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 1); // Midnight yesterday

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

        // Generate executive summary
        const summary = await generateSummary(partialReport);
        const report: AuditReport = { ...partialReport, summary };

        // Save and notify in parallel
        const [reportId] = await Promise.all([
            saveAuditReport(report),
            postAuditToSlack(report),
        ]);

        logger.info('[ResponseAudit] Audit complete', {
            reportId,
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
