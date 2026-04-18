#!/usr/bin/env node
/**
 * Setup BakedBot's first revenue goal: $4k MRR in 30 days, en route to $1M ARR.
 *
 * Creates the goal + lets Marty decompose it into tasks for each agent.
 * Run: node scripts/setup-first-goal.mjs [--dry-run]
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const dryRun = process.argv.includes('--dry-run');
const reset  = process.argv.includes('--reset'); // delete existing goal+tasks before creating

function initFirebase() {
  if (getApps().length > 0) return;
  const keyB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!keyB64) { console.error('Missing FIREBASE_SERVICE_ACCOUNT_KEY'); process.exit(1); }
  initializeApp({ credential: cert(JSON.parse(Buffer.from(keyB64, 'base64').toString('utf8'))) });
}

// BakedBot Executive Boardroom — agents working on BakedBot's own growth (NOT dispensary-client agents)
const AGENT_CAPABILITIES = `
BakedBot Executive Boardroom — agents working toward $1M ARR:
- marty (CEO): company_strategy, goal_decomposition, partner_outreach, board_update, hiring_plan
- jack (CRO): sales_outreach, pipeline_build, demo_close, prospect_research, linkedin_outreach
- glenda (CMO): brand_campaign, content_calendar, case_study, pr_outreach, social_strategy
- mike_exec (CFO): investor_deck, pricing_analysis, financial_model, budget_review, fundraise_prep
- leo (COO): onboarding_ops, process_automation, client_success, sop_creation, ops_dashboard
- linus (CTO): integration_setup, onboarding_automation, product_roadmap, technical_debt, performance_fix
`;

const GOAL = {
  title: 'Grow MRR to $4,000 by May 31 — en route to $1M ARR',
  targetMRR: 4000,
  currentMRR: 925,
  deadline: '2026-05-31',
};

async function decompose() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const gap = GOAL.targetMRR - GOAL.currentMRR;
  const deadline = new Date(GOAL.deadline);
  const weeksLeft = Math.ceil((deadline - new Date()) / (7 * 24 * 60 * 60 * 1000));
  const weeklyTarget = Math.ceil(gap / weeksLeft);

  console.log(`\n🎯 Decomposing goal: ${GOAL.title}`);
  console.log(`   Gap: $${gap.toLocaleString()} | ${weeksLeft} weeks | $${weeklyTarget.toLocaleString()}/week needed\n`);

  const prompt = `You are Marty, AI CEO of BakedBot — a cannabis industry marketing platform.

You are assigning tasks to your INTERNAL EXECUTIVE BOARDROOM — Jack (CRO), Glenda (CMO), Mike (CFO), Leo (COO), Linus (CTO).
These are BakedBot's own executives working to grow BakedBot's business, NOT dispensary client agents.

FIRST MONTH REVENUE GOAL:
- Current MRR: $${GOAL.currentMRR.toLocaleString()} (1 client: Thrive Syracuse dispensary)
- Target MRR: $${GOAL.targetMRR.toLocaleString()}
- Gap: $${gap.toLocaleString()} (~3-4 new dispensary clients at $750-1000/mo, or upsells + new logos)
- Deadline: ${GOAL.deadline} (${weeksLeft} weeks)
- Weekly revenue needed: $${weeklyTarget.toLocaleString()}
- Long-term vision: $1M ARR

Context about BakedBot:
- Multi-agent cannabis marketing platform (SMS, email, loyalty, competitive intel, compliance)
- Primary market: dispensaries and cannabis brands in NY, NJ, CT, IL, MI
- Thrive Syracuse is live — use as proof of concept / case study
- Need Jack closing new dispensary logos, Glenda building brand presence, Mike preparing investor story

${AGENT_CAPABILITIES}

Create 6-9 specific tasks for the first month across the executive team.
Each task should be executable within 30 days and directly generate or protect BakedBot's revenue.
Mix of: new logo acquisition (Jack — outreach, demos, closes), brand/marketing (Glenda), financial prep (Mike), ops/onboarding (Leo), product/tech (Linus).

Return ONLY valid JSON:
{
  "reasoning": "2-3 sentence month-1 strategy",
  "weeklyTarget": ${weeklyTarget},
  "estimatedTotalImpactUSD": <number>,
  "tasks": [
    {
      "title": "...",
      "body": "2-3 sentences: what to do, how, expected outcome",
      "businessAgent": "agent_name",
      "playbookId": "playbook_name or null",
      "estimatedImpactUSD": <number>,
      "priority": "critical|high|normal|low",
      "category": "feature|data|other",
      "rationale": "one sentence why this moves the needle"
    }
  ]
}`;

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content.find(b => b.type === 'text')?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in response');
  return JSON.parse(match[0]);
}

async function deleteExistingGoal(db) {
  const existing = await db.collection('revenue_goals')
    .where('status', '==', 'active').get();
  if (existing.empty) { console.log('   No existing active goals to delete.'); return; }
  for (const doc of existing.docs) {
    const goal = doc.data();
    // Delete linked tasks
    if (goal.taskIds?.length) {
      const batch = db.batch();
      for (const taskId of goal.taskIds) {
        batch.delete(db.collection('agent_tasks').doc(taskId));
      }
      await batch.commit();
    }
    await doc.ref.delete();
    console.log(`   🗑️  Deleted goal ${doc.id} + ${goal.taskIds?.length ?? 0} tasks`);
  }
}

async function main() {
  initFirebase();
  const db = getFirestore();

  if (reset) {
    console.log('\n🗑️  Resetting existing goals + tasks...');
    await deleteExistingGoal(db);
  }

  const decomp = await decompose();

  console.log(`\n📋 Marty's Strategy:\n   ${decomp.reasoning}\n`);
  console.log(`   Estimated total pipeline: $${decomp.estimatedTotalImpactUSD?.toLocaleString()}`);
  console.log(`   Tasks: ${decomp.tasks.length}\n`);

  for (const t of decomp.tasks) {
    const dollar = t.estimatedImpactUSD ? ` (~$${t.estimatedImpactUSD.toLocaleString()})` : '';
    console.log(`   ${t.priority === 'critical' ? '🔴' : t.priority === 'high' ? '🟠' : '🟡'} [${t.businessAgent}] ${t.title}${dollar}`);
    console.log(`      ${t.rationale}`);
  }

  if (dryRun) {
    console.log('\n✅ Dry run — no writes. Remove --dry-run to create.');
    return;
  }

  console.log('\n📝 Writing to Firestore...');
  const now = new Date().toISOString();

  // Create the goal
  const goalRef = await db.collection('revenue_goals').add({
    ...GOAL,
    status: 'active',
    taskIds: [],
    estimatedTotalImpactUSD: decomp.estimatedTotalImpactUSD,
    decompositionReasoning: decomp.reasoning,
    createdBy: 'user',
    createdAt: now,
    updatedAt: now,
  });
  console.log(`   ✅ Goal created: ${goalRef.id}`);

  // Create all tasks
  const taskIds = [];
  for (const t of decomp.tasks) {
    const ref = await db.collection('agent_tasks').add({
      title: t.title,
      body: `${t.body}\n\n**Rationale:** ${t.rationale}`,
      status: 'open',
      stoplight: 'gray',
      priority: t.priority,
      category: t.category,
      reportedBy: 'marty',
      assignedTo: t.businessAgent,
      businessAgent: t.businessAgent,
      playbookId: t.playbookId ?? null,
      estimatedImpactUSD: t.estimatedImpactUSD,
      goalId: goalRef.id,
      triggeredBy: 'agent',
      steps: [],
      createdAt: now,
      updatedAt: now,
    });
    taskIds.push(ref.id);
    console.log(`   ✅ Task: [${t.businessAgent}] ${t.title}`);
  }

  // Link tasks to goal
  await goalRef.update({ taskIds, updatedAt: new Date().toISOString() });

  console.log(`\n🚀 Done! ${taskIds.length} tasks created for goal: ${GOAL.title}`);
  console.log(`   Open Agent Board to see them: /dashboard/admin/agent-board\n`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
