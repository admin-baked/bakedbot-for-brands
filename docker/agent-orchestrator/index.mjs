/**
 * Agent Orchestrator — Always-On Cloud Run Service
 *
 * Watches Firestore in real-time via onSnapshot and:
 * 1. Routes completed tasks to waiting agents
 * 2. Unblocks agents when their dependencies finish
 * 3. Phase 3: Detects revenue goal gaps and triggers Marty to spawn new tasks
 *
 * Deploy: gcloud run deploy agent-orchestrator --source docker/agent-orchestrator
 *         --region us-central1 --min-instances 1 --set-env-vars FIREBASE_SERVICE_ACCOUNT_KEY=...
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import http from 'http';

// ── Init ──────────────────────────────────────────────────────────────────────

const keyB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!keyB64) { console.error('[ORCH] Missing FIREBASE_SERVICE_ACCOUNT_KEY'); process.exit(1); }
const serviceAccount = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf8'));
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const APP_URL   = process.env.APP_URL ?? 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
const COORD_CHANNEL = '#agent-coordination';
const REVENUE_CHANNEL = '#revenue-goals';

function log(msg, data = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), msg, ...data }));
}

async function slackPost(channel, text) {
  if (!SLACK_TOKEN) return;
  try {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SLACK_TOKEN}` },
      body: JSON.stringify({ channel, text }),
    });
  } catch { /* non-fatal */ }
}

// ── Listener 1: Task Completions → Route Dependents ──────────────────────────

function watchTaskCompletions() {
  db.collection('agent_tasks')
    .where('status', '==', 'done')
    .onSnapshot(async (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue;
        const task = { id: change.doc.id, ...change.doc.data() };
        if (!task.goalId) continue;

        // Find other tasks in same goal that are blocked
        const blocked = await db.collection('agent_tasks')
          .where('goalId', '==', task.goalId)
          .where('status', '==', 'open')
          .get();

        if (!blocked.empty) {
          log('[ORCH] Routing next task in goal', { goalId: task.goalId, nextCount: blocked.size });
          // Mark first blocked task as 'claimed' and notify agent
          const nextTask = blocked.docs[0];
          await nextTask.ref.update({ status: 'claimed', updatedAt: new Date().toISOString() });
          await slackPost(COORD_CHANNEL,
            `🔄 *${nextTask.data().businessAgent ?? nextTask.data().assignedTo}* — next task ready: ${nextTask.data().title}`
          );
        }

        // Update resolvedImpactUSD on goal if task has it
        if (task.resolvedImpactUSD && task.goalId) {
          const goalRef = db.collection('revenue_goals').doc(task.goalId);
          await goalRef.update({ updatedAt: new Date().toISOString() });
        }
      }
    }, err => log('[ORCH] taskCompletions listener error', { error: err.message }));
}

// ── Listener 2: Revenue Goals → Gap Detection ─────────────────────────────────

let lastGapCheckAt = 0;
const GAP_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 min

function watchRevenueGoals() {
  db.collection('revenue_goals')
    .where('status', '==', 'active')
    .onSnapshot(async (snap) => {
      const now = Date.now();
      if (now - lastGapCheckAt < GAP_CHECK_INTERVAL_MS) return;
      lastGapCheckAt = now;

      for (const doc of snap.docs) {
        const goal = { id: doc.id, ...doc.data() };
        await evaluateGoalGap(goal);
      }
    }, err => log('[ORCH] revenueGoals listener error', { error: err.message }));
}

// ── Phase 3: Marty Autonomous Gap Analysis ────────────────────────────────────

async function evaluateGoalGap(goal) {
  const deadline = new Date(goal.deadline);
  const now      = new Date();
  const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  const gap      = goal.targetMRR - goal.currentMRR;
  const pct      = Math.round((goal.currentMRR / goal.targetMRR) * 100);

  // Only act if: >20% behind pace AND >7 days left AND gap is significant
  const weeksElapsed = Math.max(1, (new Date(goal.createdAt) - now) / (7 * 24 * 60 * 60 * 1000) * -1);
  const totalWeeks   = Math.max(1, (deadline - new Date(goal.createdAt)) / (7 * 24 * 60 * 60 * 1000));
  const expectedPct  = Math.min(100, Math.round((weeksElapsed / totalWeeks) * 100));
  const behindPct    = expectedPct - pct;

  log('[ORCH] Goal gap eval', { goalId: goal.id, pct, expectedPct, behindPct, daysLeft });

  if (behindPct < 20 || daysLeft < 7 || gap < 500) return;

  // Check how many open tasks already exist for this goal
  const openTasks = await db.collection('agent_tasks')
    .where('goalId', '==', goal.id)
    .where('status', 'in', ['open', 'claimed', 'in_progress'])
    .get();

  if (openTasks.size >= 5) {
    log('[ORCH] Skipping spawn — enough active tasks', { goalId: goal.id, openCount: openTasks.size });
    return;
  }

  log('[ORCH] Behind pace — asking Marty to spawn tasks', { goalId: goal.id, behindPct, openTasks: openTasks.size });
  await slackPost(REVENUE_CHANNEL,
    `⚠️ *Revenue Goal Behind Pace*\n>${goal.title}\n>Current: $${goal.currentMRR.toLocaleString()} (${pct}%) | Expected: ${expectedPct}% | ${daysLeft} days left\n>Asking Marty to spawn corrective tasks…`
  );

  await spawnMartyCorrectionTasks(goal, gap, daysLeft, openTasks.size);
}

async function spawnMartyCorrectionTasks(goal, gap, daysLeft, existingOpenCount) {
  const weeksLeft    = Math.max(1, Math.ceil(daysLeft / 7));
  const weeklyTarget = Math.ceil(gap / weeksLeft);

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are Marty, AI CEO of BakedBot (cannabis marketing platform).

URGENT: Revenue goal is behind pace.
Goal: ${goal.title}
Gap: $${gap.toLocaleString()} | ${daysLeft} days left | Weekly needed: $${weeklyTarget.toLocaleString()}
Existing open tasks: ${existingOpenCount}

Create 2-3 HIGH PRIORITY corrective tasks to close this gap FAST.
Focus on highest-velocity revenue actions: outreach, campaigns, upsells.

Return ONLY JSON:
{
  "tasks": [
    {
      "title": "...",
      "body": "...",
      "businessAgent": "marty|craig|smokey|mrs_parker",
      "playbookId": "playbook_name or null",
      "estimatedImpactUSD": <number>,
      "rationale": "..."
    }
  ]
}`,
      }],
    });

    const text = msg.content.find(b => b.type === 'text')?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');

    const { tasks } = JSON.parse(match[0]);
    const now = new Date().toISOString();
    const taskIds = [];

    for (const t of tasks) {
      const ref = await db.collection('agent_tasks').add({
        title: t.title,
        body: `${t.body}\n\n**Auto-spawned by Marty** — goal behind pace. Rationale: ${t.rationale}`,
        status: 'open',
        stoplight: 'gray',
        priority: 'high',
        category: 'feature',
        reportedBy: 'marty',
        assignedTo: t.businessAgent,
        businessAgent: t.businessAgent,
        playbookId: t.playbookId ?? null,
        estimatedImpactUSD: t.estimatedImpactUSD,
        goalId: goal.id,
        triggeredBy: 'agent',
        steps: [],
        createdAt: now,
        updatedAt: now,
      });
      taskIds.push(ref.id);
    }

    // Append to goal's taskIds
    await db.collection('revenue_goals').doc(goal.id).update({
      taskIds: [...(goal.taskIds ?? []), ...taskIds],
      updatedAt: now,
    });

    log('[ORCH] Marty spawned corrective tasks', { goalId: goal.id, count: tasks.length });
    await slackPost(REVENUE_CHANNEL,
      `🎯 *Marty spawned ${tasks.length} corrective task${tasks.length > 1 ? 's' : ''}*\n${tasks.map(t => `> • ${t.title} (${t.businessAgent}, ~$${t.estimatedImpactUSD.toLocaleString()})`).join('\n')}`
    );
  } catch (err) {
    log('[ORCH] Marty spawn failed', { error: err.message });
    await slackPost(COORD_CHANNEL, `❌ Marty failed to spawn corrective tasks for goal: ${goal.title}\n> ${err.message}`);
  }
}

// ── Listener 3: Agent Coordination (locks + status) ──────────────────────────

function watchAgentCoordination() {
  // Sweep expired locks every 10 min via periodic check
  setInterval(async () => {
    const now = new Date();
    const locks = await db.collection('agent_locks').get();
    const batch = db.batch();
    let swept = 0;
    for (const doc of locks.docs) {
      const lock = doc.data();
      if (lock.expiresAt?.toDate && lock.expiresAt.toDate() < now) {
        batch.delete(doc.ref);
        swept++;
      }
    }
    if (swept > 0) {
      await batch.commit();
      log('[ORCH] Swept expired locks', { count: swept });
      await slackPost(COORD_CHANNEL, `🧹 Swept ${swept} expired lock${swept > 1 ? 's' : ''}`);
    }
  }, 10 * 60 * 1000);
}

// ── HTTP Health Check (required by Cloud Run) ─────────────────────────────────

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', ts: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(process.env.PORT ?? 8080, () => {
  log('[ORCH] Agent Orchestrator started', { port: process.env.PORT ?? 8080 });
});

// ── Start All Listeners ───────────────────────────────────────────────────────

watchTaskCompletions();
watchRevenueGoals();
watchAgentCoordination();

log('[ORCH] All listeners active — watching task completions, revenue goals, agent coordination');

// Startup Slack post
slackPost(COORD_CHANNEL, '🟢 *Agent Orchestrator* started — watching task completions, revenue gaps, coordination locks');
