#!/usr/bin/env node
/**
 * Seed CEO Goals — GEO Action Plan
 *
 * Creates 4 strategic goals in orgs/org_bakedbot_platform/goals/
 * for tracking the GEO (Generative Engine Optimization) action plan.
 *
 * Usage: node scripts/seed-ceo-goals.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- Firebase Admin Init ---
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
}

const serviceAccountKey = envVars.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// --- Constants ---
const PLATFORM_ORG_ID = 'org_bakedbot_platform';
const now = new Date();

function goalId() {
  return `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// --- Goal Definitions ---
const goals = [
  {
    id: goalId(),
    orgId: PLATFORM_ORG_ID,
    createdBy: 'system_seed',
    title: 'Week 1-2: Quick Wins — Platform Presence',
    description: [
      '1. [DONE] Deploy llm.txt on bakedbot.ai',
      '2. Implement Organization + SoftwareApplication schema markup on bakedbot.ai',
      '3. Create Crunchbase profile with full company details',
      '4. Create LinkedIn company page (fully complete)',
      '5. Sign up for Otterly.ai and monitor 15 key prompts',
      '6. [DONE] Audit robots.txt for AI crawler access',
      '7. Standardize brand name to "BakedBot AI" everywhere',
    ].join('\n'),
    category: 'marketing',
    timeframe: 'weekly',
    startDate: now,
    endDate: addDays(now, 14),
    status: 'active',
    progress: 29, // 2/7 done
    metrics: [{
      key: 'tasks_completed',
      label: 'Tasks Completed',
      targetValue: 7,
      currentValue: 2,
      baselineValue: 0,
      unit: '#',
      direction: 'increase',
    }],
    playbookIds: [],
    suggestedPlaybookIds: [],
    milestones: [],
    createdAt: now,
    updatedAt: now,
    lastProgressUpdatedAt: now,
  },
  {
    id: goalId(),
    orgId: PLATFORM_ORG_ID,
    createdBy: 'system_seed',
    title: 'Week 3-4: Foundation — Review Platforms & Content',
    description: [
      '1. Create G2 product profile; get Thrive Syracuse to leave first review',
      '2. Create Capterra listing',
      '3. Submit to Crozdesk cannabis software directory',
      '4. Create Wikidata entity (requires 2-3 independent press mentions)',
      '5. Add FAQ schema to 5 key pages on bakedbot.ai',
      '6. Create "BakedBot AI vs. Traditional Dispensary Software" comparison content',
    ].join('\n'),
    category: 'marketing',
    timeframe: 'weekly',
    startDate: addDays(now, 14),
    endDate: addDays(now, 28),
    status: 'active',
    progress: 0,
    metrics: [{
      key: 'tasks_completed',
      label: 'Tasks Completed',
      targetValue: 6,
      currentValue: 0,
      baselineValue: 0,
      unit: '#',
      direction: 'increase',
    }],
    playbookIds: [],
    suggestedPlaybookIds: [],
    milestones: [],
    createdAt: now,
    updatedAt: now,
    lastProgressUpdatedAt: now,
  },
  {
    id: goalId(),
    orgId: PLATFORM_ORG_ID,
    createdBy: 'system_seed',
    title: 'Month 2: Authority — Press & Community',
    description: [
      '1. Pitch guest article to mg Magazine or Ganjapreneur',
      '2. Issue first press release via CannabisNewsWire or MJbizwire',
      '3. Begin authentic Reddit participation (r/cannabisindustry, r/weedbiz, r/dispensary)',
      '4. Create "What is BakedBot AI?" definitive page optimized for LLM extraction',
      '5. Submit to Product Hunt',
    ].join('\n'),
    category: 'marketing',
    timeframe: 'monthly',
    startDate: addDays(now, 28),
    endDate: addDays(now, 60),
    status: 'active',
    progress: 0,
    metrics: [{
      key: 'tasks_completed',
      label: 'Tasks Completed',
      targetValue: 5,
      currentValue: 0,
      baselineValue: 0,
      unit: '#',
      direction: 'increase',
    }],
    playbookIds: [],
    suggestedPlaybookIds: [],
    milestones: [],
    createdAt: now,
    updatedAt: now,
    lastProgressUpdatedAt: now,
  },
  {
    id: goalId(),
    orgId: PLATFORM_ORG_ID,
    createdBy: 'system_seed',
    title: 'Sustained Growth: Research & Wikipedia Track',
    description: [
      '1. Publish original research report ("State of AI in Cannabis Retail 2026")',
      '2. Pursue podcast/video appearances (CannaCribs, Cannabis Economy, Ganjapreneur podcast)',
      '3. Build toward Wikipedia notability through accumulated press coverage',
      '4. Monthly press releases tied to milestones',
      '5. Ongoing content creation optimized for AI extraction',
      '6. Quarterly LLM visibility audits using Otterly.ai data',
    ].join('\n'),
    category: 'marketing',
    timeframe: 'yearly',
    startDate: now,
    endDate: addDays(now, 365),
    status: 'active',
    progress: 0,
    metrics: [{
      key: 'tasks_completed',
      label: 'Tasks Completed',
      targetValue: 6,
      currentValue: 0,
      baselineValue: 0,
      unit: '#',
      direction: 'increase',
    }],
    playbookIds: [],
    suggestedPlaybookIds: [],
    milestones: [],
    createdAt: now,
    updatedAt: now,
    lastProgressUpdatedAt: now,
  },
];

// --- Execute ---
async function main() {
  console.log(`Seeding ${goals.length} CEO goals into orgs/${PLATFORM_ORG_ID}/goals/...`);

  for (const goal of goals) {
    await db.collection('orgs').doc(PLATFORM_ORG_ID).collection('goals').doc(goal.id).set(goal);
    console.log(`  Created: ${goal.title} (${goal.timeframe}, ${goal.metrics[0].currentValue}/${goal.metrics[0].targetValue})`);
  }

  console.log(`\nDone! ${goals.length} goals seeded.`);
  console.log(`View at: /dashboard/ceo?tab=goals`);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
