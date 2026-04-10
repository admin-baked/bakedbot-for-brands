/**
 * Nightly Learning Consolidation Cron
 *
 * Analyzes telemetry, feedback, and procedural memory from the last 24h
 * to produce LearningDelta proposals. Deltas require approval before
 * being applied to agent behavior.
 *
 * Schedule: 0 4 * * * (4 AM UTC daily)
 *
 * Deploy:
 *   gcloud scheduler jobs create http consolidate-learnings-cron \
 *     --schedule="0 4 * * *" \
 *     --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/consolidate-learnings" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer CRON_SECRET" \
 *     --location=us-central1
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { createLearningDelta } from '@/types/learning-delta';
import type { LearningDelta } from '@/types/learning-delta';
import { detectSlackResponseIssues } from '@/server/services/slack-response-quality';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

function authorizeCron(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error('[ConsolidateLearnings] CRON_SECRET not configured');
    return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 });
  }
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Steps
// ─────────────────────────────────────────────────────────────────────────────

const TWENTY_FOUR_HOURS_AGO = () => {
  const d = new Date();
  d.setHours(d.getHours() - 24);
  return d;
};

const QA_AGENT_FIX_TARGETS: Record<string, string> = {
  smokey: 'src/server/agents/smokey.ts',
  craig: 'src/server/agents/craig.ts',
  deebo: 'src/server/agents/deebo-agent-impl.ts',
};

/**
 * Step 1: Analyze tool failures from telemetry
 */
async function analyzeToolFailures(db: FirebaseFirestore.Firestore): Promise<LearningDelta[]> {
  const deltas: LearningDelta[] = [];
  const since = TWENTY_FOUR_HOURS_AGO();

  try {
    const snap = await db.collection('agent_telemetry')
      .where('timestamp', '>=', since)
      .where('toolErrorCount', '>', 0)
      .limit(500)
      .get();

    // Group failures by toolName + errorType
    const failureMap = new Map<string, { count: number; agents: Set<string>; sampleIds: string[] }>();

    for (const doc of snap.docs) {
      const data = doc.data();
      const toolCalls: Array<{ name: string; status: string }> = data.toolCalls || [];
      for (const tc of toolCalls) {
        if (tc.status === 'error') {
          const key = `${tc.name}:${data.errorType || 'unknown'}`;
          const existing = failureMap.get(key) || { count: 0, agents: new Set<string>(), sampleIds: [] };
          existing.count++;
          existing.agents.add(data.agentName);
          if (existing.sampleIds.length < 5) existing.sampleIds.push(doc.id);
          failureMap.set(key, existing);
        }
      }
    }

    // Create deltas for patterns with 3+ occurrences
    for (const [key, data] of failureMap) {
      if (data.count >= 3) {
        const [toolName, errorType] = key.split(':');
        deltas.push(createLearningDelta({
          category: 'tool_failure_pattern',
          agentName: data.agents.size === 1 ? [...data.agents][0] : undefined,
          summary: `Tool "${toolName}" failed ${data.count} times in 24h with error type "${errorType}". Agents affected: ${[...data.agents].join(', ')}.`,
          evidence: {
            source: 'telemetry',
            count: data.count,
            timeWindow: '24h',
            sampleIds: data.sampleIds,
          },
          proposedAction: {
            type: 'update_routing',
            target: `agent_tool_config/${toolName}`,
            diff: `Consider adding retry logic, input validation, or fallback for "${toolName}" when "${errorType}" occurs.`,
          },
        }));
      }
    }
  } catch (error) {
    logger.error('[ConsolidateLearnings] Tool failure analysis failed:', error as Record<string, unknown>);
  }

  return deltas;
}

/**
 * Step 2: Analyze dead-end loops from telemetry
 */
async function analyzeDeadEndLoops(db: FirebaseFirestore.Firestore): Promise<LearningDelta[]> {
  const deltas: LearningDelta[] = [];
  const since = TWENTY_FOUR_HOURS_AGO();

  try {
    const snap = await db.collection('agent_telemetry')
      .where('timestamp', '>=', since)
      .where('deadEndLoopCount', '>', 0)
      .limit(200)
      .get();

    // Group by agent
    const loopMap = new Map<string, { count: number; sampleIds: string[] }>();

    for (const doc of snap.docs) {
      const data = doc.data();
      const agent = data.agentName;
      const existing = loopMap.get(agent) || { count: 0, sampleIds: [] };
      existing.count += data.deadEndLoopCount;
      if (existing.sampleIds.length < 5) existing.sampleIds.push(doc.id);
      loopMap.set(agent, existing);
    }

    for (const [agent, data] of loopMap) {
      if (data.count >= 3) {
        deltas.push(createLearningDelta({
          category: 'dead_end_loop',
          agentName: agent,
          summary: `Agent "${agent}" entered ${data.count} dead-end loops in 24h. May indicate missing tool, bad routing, or ambiguous user input pattern.`,
          evidence: {
            source: 'telemetry',
            count: data.count,
            timeWindow: '24h',
            sampleIds: data.sampleIds,
          },
          proposedAction: {
            type: 'add_eval_case',
            target: `.agent/golden-sets/${agent}-qa.json`,
            diff: `Add negative test cases for the input patterns that triggered dead-end loops.`,
          },
        }));
      }
    }
  } catch (error) {
    logger.error('[ConsolidateLearnings] Dead-end loop analysis failed:', error as Record<string, unknown>);
  }

  return deltas;
}

/**
 * Step 3: Analyze negative feedback patterns
 */
async function analyzeNegativeFeedback(db: FirebaseFirestore.Firestore): Promise<LearningDelta[]> {
  const deltas: LearningDelta[] = [];
  const since = TWENTY_FOUR_HOURS_AGO();

  try {
    const snap = await db.collection('response_feedback')
      .where('createdAt', '>=', since.toISOString())
      .where('rating', '==', 'negative')
      .limit(500)
      .get();

    // Group by agent + org
    const feedbackMap = new Map<string, { count: number; sampleIds: string[]; comments: string[] }>();

    for (const doc of snap.docs) {
      const data = doc.data();
      const key = `${data.agentName || 'unknown'}:${data.orgId || 'global'}`;
      const existing = feedbackMap.get(key) || { count: 0, sampleIds: [], comments: [] };
      existing.count++;
      if (existing.sampleIds.length < 5) existing.sampleIds.push(doc.id);
      if (data.comment && existing.comments.length < 3) existing.comments.push(data.comment);
      feedbackMap.set(key, existing);
    }

    for (const [key, data] of feedbackMap) {
      if (data.count >= 3) {
        const [agent, orgId] = key.split(':');
        deltas.push(createLearningDelta({
          category: 'manual_override_pattern',
          agentName: agent !== 'unknown' ? agent : undefined,
          orgId: orgId !== 'global' ? orgId : undefined,
          summary: `Agent "${agent}" received ${data.count} negative feedback in 24h${orgId !== 'global' ? ` for org ${orgId}` : ''}. ${data.comments.length > 0 ? `Sample comments: ${data.comments.join('; ')}` : ''}`,
          evidence: {
            source: 'feedback',
            count: data.count,
            timeWindow: '24h',
            sampleIds: data.sampleIds,
          },
          proposedAction: {
            type: 'update_instructions',
            target: `src/server/agents/${agent}.ts`,
            diff: `Review and update system instructions based on recurring negative feedback patterns.`,
          },
        }));
      }
    }
  } catch (error) {
    logger.error('[ConsolidateLearnings] Feedback analysis failed:', error as Record<string, unknown>);
  }

  return deltas;
}

/**
 * Step 4: Analyze archived Slack responses for conversation-quality regressions
 */
async function analyzeSlackConversationQuality(db: FirebaseFirestore.Firestore): Promise<LearningDelta[]> {
  const deltas: LearningDelta[] = [];
  const since = TWENTY_FOUR_HOURS_AGO();

  try {
    const snap = await db.collection('slack_responses')
      .where('timestamp', '>=', since)
      .orderBy('timestamp', 'desc')
      .limit(200)
      .get();

    const issueMap = new Map<string, { count: number; sampleIds: string[]; proposedFix: string; agent: string }>();

    for (const doc of snap.docs) {
      const data = doc.data() as { agent?: string; userMessage?: string; agentResponse?: string };
      const agentId = String(data.agent || '').trim().toLowerCase();
      if (!agentId) continue;
      const issues = detectSlackResponseIssues(agentId, {
        userMessage: String(data.userMessage || ''),
        agentResponse: String(data.agentResponse || ''),
      });

      for (const issue of issues) {
        const mapKey = `${agentId}:${issue.key}`;
        const existing = issueMap.get(mapKey) || { count: 0, sampleIds: [], proposedFix: issue.proposedFix, agent: agentId };
        existing.count++;
        if (existing.sampleIds.length < 5) existing.sampleIds.push(doc.id);
        issueMap.set(mapKey, existing);
      }
    }

    for (const [issueKey, data] of issueMap) {
      deltas.push(createLearningDelta({
        category: 'manual_override_pattern',
        agentName: data.agent,
        summary: `Agent "${data.agent}" hit Slack conversation anti-pattern "${issueKey}" ${data.count} time(s) in archived production replies. This should become a prompt or workflow correction before it repeats.`,
        evidence: {
          source: 'production_incident',
          count: data.count,
          timeWindow: '24h',
          sampleIds: data.sampleIds,
        },
        proposedAction: {
          type: 'update_instructions',
          target: QA_AGENT_FIX_TARGETS[data.agent] || `src/server/agents/${data.agent}.ts`,
          diff: `${data.proposedFix} Add or reinforce an eval case for this Slack pattern in the relevant agent QA set.`,
        },
      }));
    }
  } catch (error) {
    logger.error('[ConsolidateLearnings] Slack conversation quality analysis failed:', error as Record<string, unknown>);
  }

  return deltas;
}

/**
 * Step 5: Analyze QA golden-set benchmark regressions
 */
async function analyzeQABenchmarkFailures(db: FirebaseFirestore.Firestore): Promise<LearningDelta[]> {
  const deltas: LearningDelta[] = [];
  const since = TWENTY_FOUR_HOURS_AGO();

  try {
    const snap = await db.collection('qa_golden_eval_runs')
      .where('ranAt', '>=', since)
      .orderBy('ranAt', 'desc')
      .limit(100)
      .get();

    const runMap = new Map<string, {
      count: number;
      sampleIds: string[];
      latestScore: number;
      threshold: number;
      failureSummaries: string[];
      failingTestIds: string[];
      complianceFailed: boolean;
    }>();

    for (const doc of snap.docs) {
      const data = doc.data() as {
        agent?: string;
        failed?: number;
        score?: number;
        threshold?: number;
        complianceFailed?: boolean;
        belowThreshold?: boolean;
        failureSummaries?: string[];
        failingTestIds?: string[];
      };
      const agent = String(data.agent || '').trim().toLowerCase();
      if (!agent) continue;

      const failed = Number(data.failed || 0);
      const complianceFailed = data.complianceFailed === true;
      const belowThreshold = data.belowThreshold === true;
      if (failed === 0 && !complianceFailed && !belowThreshold) continue;

      const existing = runMap.get(agent) || {
        count: 0,
        sampleIds: [],
        latestScore: Number(data.score || 0),
        threshold: Number(data.threshold || 0),
        failureSummaries: [],
        failingTestIds: [],
        complianceFailed: false,
      };

      existing.count++;
      existing.latestScore = Number(data.score || existing.latestScore || 0);
      existing.threshold = Number(data.threshold || existing.threshold || 0);
      existing.complianceFailed = existing.complianceFailed || complianceFailed;
      if (existing.sampleIds.length < 5) existing.sampleIds.push(doc.id);

      for (const summary of data.failureSummaries || []) {
        if (existing.failureSummaries.length >= 5) break;
        existing.failureSummaries.push(summary);
      }
      for (const testId of data.failingTestIds || []) {
        if (existing.failingTestIds.length >= 5) break;
        existing.failingTestIds.push(testId);
      }

      runMap.set(agent, existing);
    }

    for (const [agent, data] of runMap) {
      deltas.push(createLearningDelta({
        category: 'benchmark_regression',
        agentName: agent,
        summary: `Agent "${agent}" regressed on ${data.count} QA benchmark run(s) in 24h. Latest score ${data.latestScore}% vs ${data.threshold}% threshold.${data.complianceFailed ? ' Compliance-critical failure included.' : ''}${data.failureSummaries.length > 0 ? ` Sample failures: ${data.failureSummaries.join('; ')}` : ''}`,
        evidence: {
          source: 'golden_set',
          count: data.count,
          timeWindow: '24h',
          sampleIds: data.sampleIds,
        },
        proposedAction: {
          type: 'update_instructions',
          target: QA_AGENT_FIX_TARGETS[agent] || `src/server/agents/${agent}.ts`,
          diff: `Fix the regression behind benchmark cases [${data.failingTestIds.join(', ') || 'see run details'}], then rerun the golden-set benchmark before signoff.`,
        },
      }));
    }
  } catch (error) {
    logger.error('[ConsolidateLearnings] QA benchmark analysis failed:', error as Record<string, unknown>);
  }

  return deltas;
}

/**
 * Step 6: Analyze compliance catches
 */
async function analyzeComplianceCatches(db: FirebaseFirestore.Firestore): Promise<LearningDelta[]> {
  const deltas: LearningDelta[] = [];
  const since = TWENTY_FOUR_HOURS_AGO();

  try {
    // Query agent events for rule_check failures
    const snap = await db.collectionGroup('agentEvents')
      .where('type', '==', 'rule_check')
      .where('createdAt', '>=', since.toISOString())
      .limit(500)
      .get();

    // Group by rule type
    const ruleMap = new Map<string, { count: number; sampleIds: string[]; tenants: Set<string> }>();

    for (const doc of snap.docs) {
      const data = doc.data();
      const violations: Array<{ ruleId?: string }> = data.payload?.violations || [];
      for (const v of violations) {
        const ruleId = v.ruleId || 'unknown_rule';
        const existing = ruleMap.get(ruleId) || { count: 0, sampleIds: [], tenants: new Set<string>() };
        existing.count++;
        existing.tenants.add(data.tenantId);
        if (existing.sampleIds.length < 5) existing.sampleIds.push(doc.id);
        ruleMap.set(ruleId, existing);
      }
    }

    for (const [ruleId, data] of ruleMap) {
      if (data.count >= 5) {
        deltas.push(createLearningDelta({
          category: 'compliance_catch_pattern',
          summary: `Compliance rule "${ruleId}" triggered ${data.count} times in 24h across ${data.tenants.size} tenant(s). Consider pre-screening content before it reaches Deebo.`,
          evidence: {
            source: 'telemetry',
            count: data.count,
            timeWindow: '24h',
            sampleIds: data.sampleIds,
          },
          proposedAction: {
            type: 'update_guardrail',
            target: `src/server/agents/rules/${ruleId}.ts`,
            diff: `Add upstream content pre-screening for the pattern that keeps triggering rule "${ruleId}".`,
          },
        }));
      }
    }
  } catch (error) {
    logger.error('[ConsolidateLearnings] Compliance analysis failed:', error as Record<string, unknown>);
  }

  return deltas;
}

/**
 * Step 7: Identify high-performing workflow trajectories from procedural memory
 */
async function analyzeHighPerformingWorkflows(db: FirebaseFirestore.Firestore): Promise<LearningDelta[]> {
  const deltas: LearningDelta[] = [];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    // Query agent telemetry for successful multi-step runs with high capability utilization
    const snap = await db.collection('agent_telemetry')
      .where('timestamp', '>=', sevenDaysAgo)
      .where('success', '==', true)
      .where('toolCallCount', '>=', 3)
      .limit(200)
      .get();

    // Group by agent + tool combination pattern
    const workflowMap = new Map<string, {
      count: number;
      avgLatency: number;
      totalLatency: number;
      agents: Set<string>;
      sampleIds: string[];
    }>();

    for (const doc of snap.docs) {
      const data = doc.data();
      const toolPattern = (data.uniqueToolsUsed || []).sort().join('+');
      if (!toolPattern) continue;

      const key = `${data.agentName}:${toolPattern}`;
      const existing = workflowMap.get(key) || {
        count: 0, avgLatency: 0, totalLatency: 0, agents: new Set<string>(), sampleIds: [],
      };
      existing.count++;
      existing.totalLatency += data.totalLatencyMs || 0;
      existing.agents.add(data.agentName);
      if (existing.sampleIds.length < 5) existing.sampleIds.push(doc.id);
      workflowMap.set(key, existing);
    }

    // Surface patterns with 5+ successful executions as "high performing"
    for (const [key, data] of workflowMap) {
      if (data.count >= 5) {
        const [agent, toolPattern] = key.split(':');
        const avgLatency = Math.round(data.totalLatency / data.count);
        deltas.push(createLearningDelta({
          category: 'high_performing_workflow',
          agentName: agent,
          summary: `Agent "${agent}" successfully completed ${data.count} tasks using tool pattern [${toolPattern}] in 7d (avg ${avgLatency}ms). Consider boosting this workflow's priority in procedural memory.`,
          evidence: {
            source: 'telemetry',
            count: data.count,
            timeWindow: '7d',
            sampleIds: data.sampleIds,
          },
          proposedAction: {
            type: 'update_routing',
            target: `procedural_memory/${agent}`,
            diff: `Boost importance score for workflows matching tool pattern [${toolPattern}].`,
          },
        }));
      }
    }
  } catch (error) {
    logger.error('[ConsolidateLearnings] High-performing workflow analysis failed:', error as Record<string, unknown>);
  }

  return deltas;
}

/**
 * Step 8: Refresh performance baselines for all orgs with recent order data
 */
async function refreshPerformanceBaselines(db: FirebaseFirestore.Firestore): Promise<number> {
  let refreshed = 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    // Find all org_profiles
    const profileSnap = await db.collection('org_profiles').limit(100).get();

    for (const profileDoc of profileSnap.docs) {
      const orgId = profileDoc.id;

      try {
        // Query order events for this org from the last 30 days
        const ordersSnap = await db.collection(`tenants/${orgId}/agentEvents`)
          .where('type', '==', 'order_completed')
          .where('createdAt', '>=', thirtyDaysAgo.toISOString())
          .limit(1000)
          .get();

        if (ordersSnap.empty) continue;

        const orders = ordersSnap.docs.map(d => d.data());
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + (o.payload?.revenue || 0), 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Query unique customers
        const customerIds = new Set(orders.map(o => o.customerId).filter(Boolean));
        const repeatCustomers = orders.filter(o => {
          const id = o.customerId;
          return id && orders.filter(o2 => o2.customerId === id).length > 1;
        });
        const repeatRate = customerIds.size > 0 ? new Set(repeatCustomers.map(o => o.customerId)).size / customerIds.size : 0;

        const baselines = {
          averageOrderValue: Math.round(avgOrderValue * 100) / 100,
          repeatPurchaseRate: Math.round(repeatRate * 1000) / 1000,
          lastUpdated: new Date().toISOString().split('T')[0],
        };

        // Merge into org_profiles/{orgId}.operations.performanceBaselines
        await profileDoc.ref.set(
          { operations: { performanceBaselines: baselines } },
          { merge: true },
        );

        refreshed++;
        logger.info(`[ConsolidateLearnings] Refreshed baselines for ${orgId}: AOV=$${baselines.averageOrderValue}, repeat=${baselines.repeatPurchaseRate}`);
      } catch (orgErr) {
        logger.warn(`[ConsolidateLearnings] Baseline refresh failed for ${orgId}:`, orgErr as Record<string, unknown>);
      }
    }
  } catch (error) {
    logger.error('[ConsolidateLearnings] Performance baselines refresh failed:', error as Record<string, unknown>);
  }

  return refreshed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

async function handler(req: NextRequest): Promise<NextResponse> {
  const authError = authorizeCron(req);
  if (authError) return authError;

  const startTime = Date.now();
  logger.info('[ConsolidateLearnings] Starting nightly learning consolidation');

  try {
    const db = getAdminFirestore();

    // Run all analysis steps + baselines refresh in parallel
    const [toolFailures, deadEndLoops, negativeFeedback, slackConversationQuality, qaBenchmarkFailures, complianceCatches, highPerformers, baselinesRefreshed] = await Promise.all([
      analyzeToolFailures(db),
      analyzeDeadEndLoops(db),
      analyzeNegativeFeedback(db),
      analyzeSlackConversationQuality(db),
      analyzeQABenchmarkFailures(db),
      analyzeComplianceCatches(db),
      analyzeHighPerformingWorkflows(db),
      refreshPerformanceBaselines(db),
    ]);

    const allDeltas = [...toolFailures, ...deadEndLoops, ...negativeFeedback, ...slackConversationQuality, ...qaBenchmarkFailures, ...complianceCatches, ...highPerformers];

    // Persist deltas to Firestore
    const batch = db.batch();
    for (const delta of allDeltas) {
      batch.set(db.collection('learning_deltas').doc(delta.id), delta);
    }
    if (allDeltas.length > 0) {
      await batch.commit();
    }

    const duration = Date.now() - startTime;
    const summary = {
      success: true,
      duration_ms: duration,
      deltas: {
        total: allDeltas.length,
        tool_failures: toolFailures.length,
        dead_end_loops: deadEndLoops.length,
        negative_feedback: negativeFeedback.length,
        slack_conversation_quality: slackConversationQuality.length,
        qa_benchmark_failures: qaBenchmarkFailures.length,
        compliance_catches: complianceCatches.length,
        high_performers: highPerformers.length,
        baselines_refreshed: baselinesRefreshed,
      },
    };

    logger.info(`[ConsolidateLearnings] Complete: ${allDeltas.length} deltas proposed, ${baselinesRefreshed} baselines refreshed in ${duration}ms`);
    return NextResponse.json(summary);
  } catch (error) {
    logger.error('[ConsolidateLearnings] Cron failed:', error as Record<string, unknown>);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }
