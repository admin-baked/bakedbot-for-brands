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

// ── Listener 1: Task Completions → Route Dependents + Sub-task roll-up ───────

function watchTaskCompletions() {
  db.collection('agent_tasks')
    .where('status', '==', 'done')
    .onSnapshot(async (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue;
        const task = { id: change.doc.id, ...change.doc.data() };

        // If this is a sub-task, check if all siblings are done → promote parent to awaiting_approval
        if (task.parentTaskId) {
          await rollUpSubTaskCompletion(task);
        }

        if (!task.goalId) continue;

        // Find other open tasks in same goal
        const blocked = await db.collection('agent_tasks')
          .where('goalId', '==', task.goalId)
          .where('status', '==', 'open')
          .get();

        if (!blocked.empty) {
          log('[ORCH] Routing next task in goal', { goalId: task.goalId, nextCount: blocked.size });
          const nextTask = blocked.docs[0];
          await nextTask.ref.update({ status: 'claimed', updatedAt: new Date().toISOString() });
          await slackPost(COORD_CHANNEL,
            `🔄 *${nextTask.data().businessAgent ?? nextTask.data().assignedTo}* — next task ready: ${nextTask.data().title}`
          );
        }

        if (task.resolvedImpactUSD && task.goalId) {
          await db.collection('revenue_goals').doc(task.goalId).update({ updatedAt: new Date().toISOString() });
        }
      }
    }, err => log('[ORCH] taskCompletions listener error', { error: err.message }));
}

async function rollUpSubTaskCompletion(completedSubTask) {
  const parentRef = db.collection('agent_tasks').doc(completedSubTask.parentTaskId);
  const parent = await parentRef.get();
  if (!parent.exists) return;

  const parentData = parent.data();
  if (parentData.status !== 'in_progress') return; // already promoted or not our concern
  if (!parentData.subTaskIds?.length) return;

  // Check if all sibling sub-tasks are done
  const siblings = await db.collection('agent_tasks')
    .where('parentTaskId', '==', completedSubTask.parentTaskId)
    .get();

  const allDone = siblings.docs.every(d => d.data().status === 'done');
  if (!allDone) return;

  // All sub-tasks done — build a summary artifact and promote parent to awaiting_approval
  const summaries = siblings.docs.map(d => {
    const t = d.data();
    const artifactSnippet = t.artifact?.content ? `\n${t.artifact.content.slice(0, 300)}` : '';
    return `**[${t.businessAgent ?? t.assignedTo}] ${t.title}**${artifactSnippet}`;
  }).join('\n\n---\n\n');

  const now = new Date().toISOString();
  await parentRef.update({
    status: 'awaiting_approval',
    stoplight: 'purple',
    artifact: {
      type: 'document',
      title: `Sub-task Summary — ${parentData.title}`,
      content: `All ${siblings.size} specialist sub-tasks complete.\n\n${summaries}`,
      generatedBy: 'orchestrator',
      generatedAt: now,
    },
    updatedAt: now,
  });

  log('[ORCH] Parent promoted to awaiting_approval', { parentTaskId: completedSubTask.parentTaskId });
  await slackPost(COORD_CHANNEL,
    `🟣 *${parentData.businessAgent ?? parentData.assignedTo}* task ready for review: ${parentData.title}\n> All ${siblings.size} sub-tasks complete — awaiting your approval`
  );
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
Assign to BakedBot's EXECUTIVE BOARDROOM (NOT dispensary agents):
- jack (CRO): sales outreach, demo scheduling, deal closing
- glenda (CMO): brand campaigns, case studies, PR
- mike_exec (CFO): investor outreach, pricing strategy
- leo (COO): client onboarding, process ops
- linus (CTO): product/tech improvements that unblock sales

Return ONLY JSON:
{
  "tasks": [
    {
      "title": "...",
      "body": "...",
      "businessAgent": "jack|glenda|mike_exec|leo|linus",
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

// ── Listener 3: Exec Task Claims → Spawn Specialist Sub-Agents ───────────────

const EXEC_AGENTS = new Set(['jack', 'glenda', 'mike_exec', 'leo', 'linus', 'marty']);
const SPECIALIST_ROSTER = `
Specialists available (work FOR executive agents):
- craig: write outreach copy, email campaigns, SMS blasts, pitch decks, social posts
- smokey: product spotlight, menu analysis, strain recommendations (for dispensary demos)
- mrs_parker: loyalty program setup, retention sequences, VIP tier design
- ezal: competitor research, dispensary prospecting, market intelligence, lead lists
- pops: revenue reports, cohort analysis, MRR dashboard, pricing data
- deebo: compliance review, TCPA audit, state regulation check
`;

// Track tasks we've already spawned sub-agents for (in-memory dedup across snapshots)
const spawnedSubAgentsFor = new Set();

function watchExecTaskClaims() {
  db.collection('agent_tasks')
    .where('status', '==', 'claimed')
    .onSnapshot(async (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue;
        const task = { id: change.doc.id, ...change.doc.data() };

        // Only exec-level agents trigger sub-agent spawning
        if (!EXEC_AGENTS.has(task.businessAgent)) continue;
        // Skip if no goal context or already processed
        if (!task.goalId) continue;
        if (spawnedSubAgentsFor.has(task.id)) continue;
        spawnedSubAgentsFor.add(task.id);

        log('[ORCH] Exec claimed task — spawning sub-agents', { taskId: task.id, agent: task.businessAgent });
        await spawnSubAgents(task);
      }
    }, err => log('[ORCH] execTaskClaims listener error', { error: err.message }));
}

async function spawnSubAgents(task) {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `You are the BakedBot orchestrator. An executive agent just claimed a task and needs specialist support.

Executive: ${task.businessAgent}
Task: "${task.title}"
Details: ${task.body ?? ''}

${SPECIALIST_ROSTER}

Decompose this into 2-3 specialist sub-tasks that directly support the executive's goal.
Only spawn specialists that add real value — don't pad.

Return ONLY JSON:
{
  "subTasks": [
    {
      "title": "...",
      "body": "1-2 sentences: what to do and what output to hand back to ${task.businessAgent}",
      "assignedTo": "specialist_agent_id",
      "estimatedImpactUSD": <number or null>
    }
  ]
}`,
      }],
    });

    const text = msg.content.find(b => b.type === 'text')?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in sub-agent response');

    const { subTasks } = JSON.parse(match[0]);
    const now = new Date().toISOString();
    const subTaskIds = [];

    for (const s of subTasks) {
      const ref = await db.collection('agent_tasks').add({
        title: s.title,
        body: s.body,
        status: 'open',
        stoplight: 'gray',
        priority: 'high',
        category: 'feature',
        reportedBy: task.businessAgent,
        assignedTo: s.assignedTo,
        businessAgent: s.assignedTo,
        parentTaskId: task.id,
        goalId: task.goalId ?? null,
        estimatedImpactUSD: s.estimatedImpactUSD ?? null,
        triggeredBy: 'agent',
        steps: [],
        createdAt: now,
        updatedAt: now,
      });
      subTaskIds.push(ref.id);
    }

    // Mark parent in_progress and link sub-tasks
    await db.collection('agent_tasks').doc(task.id).update({
      status: 'in_progress',
      subTaskIds,
      updatedAt: now,
    });

    log('[ORCH] Sub-agents spawned', { parentTaskId: task.id, count: subTasks.length });
    await slackPost(COORD_CHANNEL,
      `🔀 *${task.businessAgent}* spawned ${subTasks.length} sub-task${subTasks.length > 1 ? 's' : ''} for: ${task.title}\n${subTasks.map(s => `> • [${s.assignedTo}] ${s.title}`).join('\n')}`
    );
  } catch (err) {
    log('[ORCH] Sub-agent spawn failed', { taskId: task.id, error: err.message });
  }
}

// ── Listener 4: Agent Coordination (locks + status) ──────────────────────────

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
watchExecTaskClaims();
watchAgentCoordination();

log('[ORCH] All listeners active — watching task completions, revenue goals, agent coordination');

// Startup Slack post
slackPost(COORD_CHANNEL, '🟢 *Agent Orchestrator* started — watching task completions, revenue gaps, coordination locks');
