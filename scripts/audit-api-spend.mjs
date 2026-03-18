/**
 * Audit: Last $20 of Claude API + Gemini API Spend
 *
 * Claude: reads from Firestore agent_telemetry (costEstimateUsd per invocation)
 * Gemini: queries GCP Cloud Billing via gcloud CLI
 *
 * Usage: node --env-file=.env.local scripts/audit-api-spend.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Firebase init ─────────────────────────────────────────────────────────────
function loadServiceAccount() {
  const envPath = path.join(ROOT, '.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');
  let key = null;
  for (const line of content.split('\n')) {
    if (line.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY=')) {
      key = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim();
      break;
    }
  }
  if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  return JSON.parse(Buffer.from(key, 'base64').toString('utf-8'));
}

const serviceAccount = loadServiceAccount();
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const TARGET_USD = 20;
const GCP_PROJECT = 'studio-567050101-bc6e8';

// ── Claude Audit (Firestore agent_telemetry) ──────────────────────────────────
async function auditClaudeSpend() {
  console.log('\n=== CLAUDE API SPEND AUDIT ===\n');

  // Pull last 2000 invocations ordered newest-first
  const snap = await db.collection('agent_telemetry')
    .orderBy('timestamp', 'desc')
    .limit(2000)
    .get();

  if (snap.empty) {
    console.log('No agent_telemetry records found.');
    return;
  }

  const byAgent   = {};
  const byModel   = {};
  const byDate    = {};
  const byDay     = {};   // for day-by-day table
  const topCalls  = [];   // most expensive individual calls

  let runningTotal = 0;
  let recordsInWindow = 0;
  let windowStart = null;
  let windowEnd   = null;

  // === Phase 1: walk until we hit $20 ===
  for (const doc of snap.docs) {
    const cost   = Number(doc.get('costEstimateUsd') || 0);
    const agent  = doc.get('agentName') || 'unknown';
    const model  = doc.get('model')     || 'unknown';
    const ts     = doc.get('timestamp');
    const date   = ts?.toDate ? ts.toDate().toISOString().split('T')[0] : 'unknown';
    const inTok  = Number(doc.get('inputTokens')  || 0);
    const outTok = Number(doc.get('outputTokens') || 0);
    const tools  = doc.get('toolCallCount') || 0;
    const latMs  = doc.get('totalLatencyMs') || 0;

    runningTotal += cost;
    recordsInWindow++;

    if (!windowEnd)   windowEnd   = ts?.toDate ? ts.toDate() : new Date();
    windowStart = ts?.toDate ? ts.toDate() : windowStart;

    // By agent
    byAgent[agent] = byAgent[agent] || { cost: 0, calls: 0, inputTok: 0, outputTok: 0 };
    byAgent[agent].cost     += cost;
    byAgent[agent].calls    += 1;
    byAgent[agent].inputTok += inTok;
    byAgent[agent].outputTok+= outTok;

    // By model
    byModel[model] = byModel[model] || { cost: 0, calls: 0, inputTok: 0, outputTok: 0 };
    byModel[model].cost     += cost;
    byModel[model].calls    += 1;
    byModel[model].inputTok += inTok;
    byModel[model].outputTok+= outTok;

    // By date
    byDate[date] = byDate[date] || { cost: 0, calls: 0 };
    byDate[date].cost  += cost;
    byDate[date].calls += 1;

    // Top individual calls (keep top 10)
    topCalls.push({ agent, model, cost, inTok, outTok, tools, latMs, date });
    topCalls.sort((a, b) => b.cost - a.cost);
    if (topCalls.length > 10) topCalls.pop();

    if (runningTotal >= TARGET_USD) break;
  }

  // === Phase 2: ALL-TIME totals (separate pass) ===
  // We'll use the full snapshot to compute total-ever spend
  let allTimeCost = 0;
  let allTimeCalls = 0;
  for (const doc of snap.docs) {
    allTimeCost  += Number(doc.get('costEstimateUsd') || 0);
    allTimeCalls += 1;
  }

  // === Output ===
  console.log(`Window: ${windowStart?.toLocaleString()} → ${windowEnd?.toLocaleString()}`);
  console.log(`Records in window: ${recordsInWindow}`);
  console.log(`Accumulated spend: $${runningTotal.toFixed(4)}`);
  console.log(`All-time (sampled, last 2000 calls): $${allTimeCost.toFixed(4)} across ${allTimeCalls} calls`);

  // --- By Agent ---
  console.log('\n--- By Agent ---');
  const agentRows = Object.entries(byAgent)
    .sort(([,a],[,b]) => b.cost - a.cost);
  console.log('Agent'.padEnd(20) + 'Spend'.padEnd(12) + 'Calls'.padEnd(8) + 'In Tok'.padEnd(12) + 'Out Tok');
  for (const [name, v] of agentRows) {
    console.log(
      name.padEnd(20) +
      `$${v.cost.toFixed(4)}`.padEnd(12) +
      String(v.calls).padEnd(8) +
      String(v.inputTok.toLocaleString()).padEnd(12) +
      v.outputTok.toLocaleString()
    );
  }

  // --- By Model ---
  console.log('\n--- By Model ---');
  const modelRows = Object.entries(byModel)
    .sort(([,a],[,b]) => b.cost - a.cost);
  console.log('Model'.padEnd(30) + 'Spend'.padEnd(12) + 'Calls'.padEnd(8) + 'In Tok'.padEnd(12) + 'Out Tok');
  for (const [name, v] of modelRows) {
    console.log(
      name.padEnd(30) +
      `$${v.cost.toFixed(4)}`.padEnd(12) +
      String(v.calls).padEnd(8) +
      String(v.inputTok.toLocaleString()).padEnd(12) +
      v.outputTok.toLocaleString()
    );
  }

  // --- By Date ---
  console.log('\n--- By Date (newest first) ---');
  const dateRows = Object.entries(byDate).sort(([a],[b]) => b.localeCompare(a));
  console.log('Date'.padEnd(14) + 'Spend'.padEnd(12) + 'Calls');
  for (const [date, v] of dateRows) {
    const bar = '|'.repeat(Math.round(v.cost / 0.50));
    console.log(`${date.padEnd(14)}$${v.cost.toFixed(4).padEnd(10)} ${String(v.calls).padEnd(6)} ${bar}`);
  }

  // --- Top 10 Most Expensive Calls ---
  console.log('\n--- Top 10 Most Expensive Individual Calls ---');
  console.log('Agent'.padEnd(18) + 'Model'.padEnd(22) + 'Cost'.padEnd(10) + 'InTok'.padEnd(8) + 'OutTok'.padEnd(8) + 'Tools'.padEnd(6) + 'Date');
  for (const c of topCalls) {
    console.log(
      c.agent.padEnd(18) +
      c.model.padEnd(22) +
      `$${c.cost.toFixed(4)}`.padEnd(10) +
      String(c.inTok).padEnd(8) +
      String(c.outTok).padEnd(8) +
      String(c.tools).padEnd(6) +
      c.date
    );
  }
}

// ── Gemini Audit (GCP Cloud Billing via gcloud) ───────────────────────────────
function auditGeminiSpend() {
  console.log('\n=== GEMINI API SPEND AUDIT (GCP Billing) ===\n');

  // Try: gcloud billing accounts list first to confirm auth
  let billingLines = '';
  try {
    billingLines = execSync(
      `gcloud billing accounts list --format="table(name,displayName,open)" 2>&1`,
      { encoding: 'utf8', timeout: 15000 }
    );
    console.log('GCP Billing accounts accessible:');
    console.log(billingLines.trim());
  } catch (e) {
    console.log('gcloud billing accounts list failed:', e.message.slice(0, 200));
    console.log('>> Gemini spend must be checked via GCP Console > Billing > Reports');
    console.log('>> Filter by: Service = "Vertex AI API" or "Generative Language API"');
    return;
  }

  // Try to get recent Gemini usage from Cloud Monitoring (metrics)
  try {
    const now   = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().split('T')[0];
    const endStr   = now.toISOString().split('T')[0];

    console.log(`\nQuerying GCP billing for AI services (${startStr} → ${endStr})...`);

    // gcloud billing budgets / reports aren't easily CLI-accessible without BigQuery export.
    // Best we can do is list recent Vertex AI operations.
    const vertexOps = execSync(
      `gcloud ai operations list --project=${GCP_PROJECT} --region=us-central1 --limit=20 --format="table(name,metadata.createTime,metadata.genericMetadata.state)" 2>&1`,
      { encoding: 'utf8', timeout: 15000 }
    );
    console.log('Recent Vertex AI operations:');
    console.log(vertexOps.trim() || '(none)');
  } catch (e) {
    console.log('Vertex AI ops query failed (may not be enabled):', e.message.slice(0, 150));
  }

  // Try Google Generative AI API usage
  try {
    console.log('\n--- Checking gcloud active project / auth ---');
    const authInfo = execSync(
      `gcloud auth list --format="table(account,status)" 2>&1`,
      { encoding: 'utf8', timeout: 10000 }
    );
    console.log(authInfo.trim());

    const projInfo = execSync(
      `gcloud config get-value project 2>&1`,
      { encoding: 'utf8', timeout: 5000 }
    );
    console.log('Active project:', projInfo.trim());
  } catch (e) {
    console.log('gcloud auth check failed:', e.message.slice(0, 100));
  }

  console.log(`
GEMINI BILLING NOTE:
  Gemini/Genkit calls in this codebase are NOT instrumented in agent_telemetry.
  MODEL_PRICING only covers Claude models (Sonnet/Opus).

  To see Gemini costs:
    1. GCP Console > Billing > Reports
       Filter: Service = "Vertex AI API" or "Generative Language API (Gemini)"
    2. Or run: gcloud alpha billing accounts describe <BILLING_ACCOUNT_ID>
    3. Or check: https://console.cloud.google.com/billing (project: ${GCP_PROJECT})

  Gemini models in use (from prime.md):
    - gemini-2.5-flash  (scraping, extraction, high-volume)
    - gemini-2.5-pro    (strategic analysis, exec reasoning)
    - glm-4-flash / glm-4.7 (z.ai DevPack - flat rate, ~$0 marginal)
  `);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await auditClaudeSpend();
  } catch (e) {
    console.error('Claude audit failed:', e.message);
  }

  try {
    auditGeminiSpend();
  } catch (e) {
    console.error('Gemini audit failed:', e.message);
  }
})();
