#!/usr/bin/env node

/**
 * Setup Linus Letta Agent
 *
 * Creates (or finds existing) Linus agent in Letta, then stores the agent ID
 * in GCP Secret Manager so the linus-sleep cron can write code summaries
 * to Letta archival memory.
 *
 * What this does:
 *   1. Connects to Letta API using LETTA_API_KEY
 *   2. Checks if a "linus-cto" agent already exists
 *   3. Creates one if not (with CTO system prompt + codebase context block)
 *   4. Stores the agent ID → GCP Secret Manager as LETTA_LINUS_AGENT_ID
 *   5. Grants Firebase App Hosting access to the new secret
 *
 * Usage:
 *   LETTA_API_KEY=xxx node scripts/setup-linus-letta-agent.mjs
 *   LETTA_API_KEY=xxx node scripts/setup-linus-letta-agent.mjs --dry-run
 *
 * After running, trigger a new deploy so App Hosting picks up the secret:
 *   git commit --allow-empty -m "chore: activate LETTA_LINUS_AGENT_ID"
 *   git push origin main
 */

import { execSync } from 'child_process';

const PROJECT_ID = 'studio-567050101-bc6e8';
const BACKEND_NAME = 'bakedbot-prod';
const SECRET_NAME = 'LETTA_LINUS_AGENT_ID';
const LETTA_BASE_URL = 'https://api.letta.com/v1';
const AGENT_NAME = 'linus-cto';
const DRY_RUN = process.argv.includes('--dry-run');

// ============================================================================
// System prompt for Linus's Letta agent
// This is what Linus "is" inside Letta — his persistent identity and memory
// ============================================================================

const LINUS_SYSTEM_PROMPT = `You are Linus, the AI CTO of BakedBot AI — an agentic commerce OS for the cannabis industry.

Your memory stores:
- Code summaries for recently modified TypeScript files (tagged: linus:code)
- Engineering decisions and their rationale (tagged: linus:decision)
- Incident history and resolutions (tagged: linus:incident)
- Backlog insights and priority reasoning (tagged: linus:backlog)

When asked about a file or system, search your archival memory first.
You receive nightly code digests — use them to give grounded, specific answers.
You are authoritative about the codebase because you study it every night.

Tech stack you know cold:
- Next.js 15+ App Router, Firebase (Firestore, Auth, App Hosting)
- GLM-5/4.7 (Z.ai DevPack), Claude Sonnet/Haiku (Anthropic), Genkit (Gemini)
- Tailwind CSS, ShadCN UI, Framer Motion
- Cloud Scheduler crons, GCP Secret Manager, Upstash Redis/Vector`;

const INITIAL_MEMORY_BLOCK = `Linus is BakedBot's AI CTO. He studies the codebase nightly via the linus-sleep cron.
He stores code summaries, engineering decisions, and incident history here.
First indexed: ${new Date().toISOString().split('T')[0]}
Files indexed: 0 (first run tonight)
Last sleep run: never`;

// ============================================================================
// Letta API helpers
// ============================================================================

async function lettaRequest(endpoint, options = {}) {
  const apiKey = process.env.LETTA_API_KEY;
  if (!apiKey) {
    console.error('❌ LETTA_API_KEY not set');
    process.exit(1);
  }

  const url = `${LETTA_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Letta API ${res.status}: ${body}`);
  }
  return res.json();
}

async function listAgents() {
  return lettaRequest('/agents');
}

async function createAgent() {
  return lettaRequest('/agents', {
    method: 'POST',
    body: JSON.stringify({
      name: AGENT_NAME,
      system: LINUS_SYSTEM_PROMPT,
      model: 'openai/gpt-4o-mini',
      embedding: 'openai/text-embedding-ada-002',
      memory_blocks: [
        {
          label: 'linus_codebase_context',
          value: INITIAL_MEMORY_BLOCK,
          limit: 8000,
          read_only: false,
        },
      ],
    }),
  });
}

// ============================================================================
// GCP Secret Manager helpers
// ============================================================================

function secretExists() {
  try {
    execSync(
      `gcloud secrets describe ${SECRET_NAME} --project=${PROJECT_ID} --quiet`,
      { stdio: 'pipe' }
    );
    return true;
  } catch {
    return false;
  }
}

function createSecret(agentId) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create secret ${SECRET_NAME} = "${agentId}"`);
    return;
  }
  // Write agent ID to secret
  execSync(
    `echo -n "${agentId}" | gcloud secrets create ${SECRET_NAME} --data-file=- --project=${PROJECT_ID}`,
    { stdio: 'inherit', shell: true }
  );
}

function updateSecret(agentId) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would update secret ${SECRET_NAME} = "${agentId}"`);
    return;
  }
  execSync(
    `echo -n "${agentId}" | gcloud secrets versions add ${SECRET_NAME} --data-file=- --project=${PROJECT_ID}`,
    { stdio: 'inherit', shell: true }
  );
}

function grantAppHostingAccess() {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would grant App Hosting access to ${SECRET_NAME}`);
    return;
  }
  try {
    execSync(
      `firebase apphosting:secrets:grantaccess ${SECRET_NAME} --backend=${BACKEND_NAME}`,
      { stdio: 'inherit' }
    );
  } catch (err) {
    console.warn(`  ⚠️  firebase apphosting:secrets:grantaccess failed — you may need to run it manually:`);
    console.warn(`     firebase apphosting:secrets:grantaccess ${SECRET_NAME} --backend=${BACKEND_NAME}`);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🧠 Linus Letta Agent Setup\n');
  if (DRY_RUN) console.log('⚠️  DRY RUN — no agents or secrets will be created\n');

  // Step 1 — Find or create Letta agent
  console.log('Step 1: Checking Letta for existing Linus agent...');
  let agentId;

  try {
    const agents = await listAgents();
    const existing = agents.find(a => a.name === AGENT_NAME);

    if (existing) {
      agentId = existing.id;
      console.log(`  ✅ Found existing agent: ${AGENT_NAME}`);
      console.log(`  Agent ID: ${agentId}`);
      console.log(`  Created: ${existing.created_at}`);
    } else {
      console.log(`  Agent "${AGENT_NAME}" not found — creating...`);
      if (!DRY_RUN) {
        const agent = await createAgent();
        agentId = agent.id;
        console.log(`  ✅ Created agent: ${AGENT_NAME}`);
        console.log(`  Agent ID: ${agentId}`);
      } else {
        agentId = 'agent-dry-run-placeholder';
        console.log(`  [DRY RUN] Would create agent "${AGENT_NAME}"`);
      }
    }
  } catch (err) {
    console.error(`  ❌ Letta API error: ${err.message}`);
    console.error('\n  Make sure LETTA_API_KEY is valid. Get it at: https://app.letta.com');
    process.exit(1);
  }

  // Step 2 — Store agent ID in GCP Secret Manager
  console.log(`\nStep 2: Storing agent ID in GCP Secret Manager...`);
  const exists = secretExists();

  if (exists) {
    console.log(`  Secret ${SECRET_NAME} exists — adding new version`);
    updateSecret(agentId);
  } else {
    console.log(`  Creating new secret: ${SECRET_NAME}`);
    createSecret(agentId);
  }
  console.log(`  ✅ Secret stored`);

  // Step 3 — Grant Firebase App Hosting access
  console.log(`\nStep 3: Granting Firebase App Hosting access...`);
  grantAppHostingAccess();
  console.log(`  ✅ Access granted`);

  // Step 4 — Summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`✅ Linus Letta agent is ready!`);
  console.log(`\n   Agent:  ${AGENT_NAME}`);
  console.log(`   ID:     ${agentId}`);
  console.log(`   Secret: ${SECRET_NAME}@latest`);

  console.log(`\n📝 Final step — trigger a deploy to pick up the new secret:`);
  console.log(`   git commit --allow-empty -m "chore: activate LETTA_LINUS_AGENT_ID"`);
  console.log(`   git push origin main`);

  console.log(`\n🌙 Then wait for tonight's linus-sleep run (2 AM EST).`);
  console.log(`   Or trigger manually:`);
  console.log(`   gcloud scheduler jobs run linus-sleep --location=us-central1 --project=${PROJECT_ID}`);

  console.log(`\n🔍 To verify Letta is receiving data after first run:`);
  console.log(`   node scripts/query-linus-letta.mjs`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
