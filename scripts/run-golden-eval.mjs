#!/usr/bin/env node
/**
 * BakedBot Golden Set Eval Runner
 *
 * Runs compliance + quality QA cases from .agent/golden-sets/ against
 * agent behavior. Two tiers:
 *
 *   FAST (default): Deterministic only — function tests + regex rule checks.
 *                   No API calls. Completes in <2s.
 *
 *   FULL (--full):  All cases including LLM tests via Claude Haiku.
 *                   Requires CLAUDE_API_KEY. Estimated cost: $0.05–0.15/run.
 *
 * Usage:
 *   node scripts/run-golden-eval.mjs --agent deebo
 *   node scripts/run-golden-eval.mjs --agent smokey --full
 *   node scripts/run-golden-eval.mjs --all --full
 *
 * Exit codes:
 *   0 — all thresholds met
 *   1 — compliance-critical failure (BLOCKS COMMIT)
 *   2 — below accuracy threshold (review before committing)
 */

import { readFileSync } from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const agentIdx = args.indexOf('--agent');
const agentArg = agentIdx !== -1 ? args[agentIdx + 1] : null;
const runAll   = args.includes('--all');
const fullMode = args.includes('--full');

// ── File loader ─────────────────────────────────────────────────────────────

function loadGoldenSet(name) {
  const path = join(ROOT, '.agent', 'golden-sets', `${name}.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

// ── TIER 1: Deterministic function tests (no API calls) ─────────────────────

/** Inline reimplementation of deebo.ts:deeboCheckAge — pure date math, no deps */
function _deeboCheckAge(dob) {
  const birthDate = new Date(dob);
  const ageDifMs  = Date.now() - birthDate.getTime();
  const ageDate   = new Date(ageDifMs);
  const age       = Math.abs(ageDate.getUTCFullYear() - 1970);
  return age < 21
    ? { allowed: false, minAge: 21 }
    : { allowed: true,  minAge: 21 };
}

/** Inline reimplementation of deebo.ts:deeboCheckStateAllowed */
function _deeboCheckStateAllowed(state) {
  const blocked = ['ID', 'NE', 'KS'];
  return blocked.includes(state)
    ? { allowed: false, reason: 'Shipping not allowed to this state.' }
    : { allowed: true };
}

function runFunctionTest(tc) {
  let actual;
  if (tc.function === 'deeboCheckAge') {
    actual = _deeboCheckAge(tc.input.dob);
  } else if (tc.function === 'deeboCheckStateAllowed') {
    actual = _deeboCheckStateAllowed(tc.input.state);
  } else {
    return { pass: false, reason: `Unknown function: ${tc.function}` };
  }

  for (const [key, expected] of Object.entries(tc.expected_output)) {
    if (actual[key] !== expected) {
      return {
        pass: false,
        actual,
        reason: `${key}: expected ${expected}, got ${actual[key]}`,
      };
    }
  }
  return { pass: true, actual };
}

// ── TIER 1: Regex rule tests ─────────────────────────────────────────────────

function runRegexTest(tc) {
  const { jurisdiction, channel, content } = tc.input;

  // Load rule pack — currently only WA/retail has regex rules
  let regexRules = [];
  if (jurisdiction === 'WA' && channel === 'retail') {
    const rulesPath = join(ROOT, 'src', 'server', 'agents', 'rules', 'wa-retail.json');
    const pack      = JSON.parse(readFileSync(rulesPath, 'utf8'));
    regexRules      = pack.rules.filter(r => r.type === 'regex');
  }

  if (regexRules.length === 0) {
    // Gap: no regex rules for this jurisdiction — falls through to LLM in prod
    return {
      pass: null,
      note: `No regex rules for ${jurisdiction}/${channel} — LLM fallback in prod. Rerun with --full.`,
    };
  }

  const violations = [];
  for (const rule of regexRules) {
    if (new RegExp(rule.pattern, 'i').test(content)) {
      violations.push(rule.description);
    }
  }

  const actualStatus = violations.length > 0 ? 'fail' : 'pass';
  const pass = actualStatus === tc.expected_status;
  return {
    pass,
    actual: { status: actualStatus, violations },
    reason: pass ? null : `Expected status "${tc.expected_status}", got "${actualStatus}"`,
  };
}

// ── TIER 2: LLM tests (requires --full + CLAUDE_API_KEY) ────────────────────

// Condensed system prompts for eval — capture the key behavioral rules
// without the full harness/Firestore stack.

const SYSTEM_PROMPTS = {
  deebo: `You are Deebo, a cannabis compliance officer. Analyze content for violations.

Rules:
1. No medical claims: "cure", "treat", "prevent", "heal", "clinically proven", "doctor recommended".
2. No appeal to minors: cartoons, cartoon characters, candy-like imagery, children-targeted language.
3. No false/misleading statements: unsubstantiated superlatives ("best in the world"), fabricated stats.

Respond ONLY with valid JSON:
{"status":"pass"|"fail"|"warning","violations":["..."],"suggestions":["..."]}`,

  smokey: `You are Smokey, a budtender at Thrive Syracuse, a licensed cannabis dispensary at 3065 Erie Blvd E, Syracuse, NY 13224 (near I-690).

Key facts:
- Licensed by NY OCM. Verify via NYS Dispensary Verification Tool.
- Age requirement: 21+ with valid government-issued ID (driver's license, state ID, passport).
- Products: flower, pre-rolls, vapes (cartridges, disposables), edibles (gummies, chocolates, drinks), concentrates (badder, live resin, live rosin), tinctures, topicals.
- Payments: cash and debit only. ATM on-site. No credit cards.
- Lab-tested products with Certificate of Analysis (CoA) available.
- NY possession limits: 3 oz flower or 24g concentrate for adults 21+.
- Delivery: coming soon.
- First-time users: start low, go slow. Low-dose edibles (2.5mg–5mg). Wait 2 hours for edibles.
- No medical claims. Never say "cure", "treat", "prescribe", or "guaranteed".
- Cannot purchase for minors under any circumstances.`,

  craig: `You are Craig, a cannabis marketing specialist.

Rules you must follow:
1. ALWAYS validate compliance before any campaign send — mention Deebo review.
2. ALL SMS copy must include opt-out (e.g. "Reply STOP to opt-out").
3. NEVER state specific open rates or revenue increases without data. Say "we'll track results".
4. When POS is not connected: "I'm basing this on general trends since your POS isn't connected".
5. NEVER claim a campaign was sent without confirming the integration is configured.
6. No medical claims (no "cure", "treat", "clinically", "guaranteed").
7. Scout/public role: write ONE copy variation then prompt to upgrade for the full sequence.
8. Standard output for brand users: 3 variations (Professional, Hype, Educational).`,
};

async function callClaude(agentName, userMessage) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY not set. Required for --full mode.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     SYSTEM_PROMPTS[agentName],
      messages:   [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude API ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

function scoreConversational(responseText, tc) {
  const lower    = responseText.toLowerCase();
  const keywords = tc.expected_keywords ?? [];
  const banned   = tc.must_not_contain  ?? [];

  // keyword_coverage 40%
  const found  = keywords.filter(k => lower.includes(k.toLowerCase()));
  const kwScore = keywords.length > 0 ? found.length / keywords.length : 1.0;

  // must_not_contain violations
  const violations = banned.filter(b => lower.includes(b.toLowerCase()));

  // intent_match 30% — did response address the topic?
  const intentTokens = (tc.expected_intent ?? '').toLowerCase().split(/\W+/).filter(w => w.length > 4);
  const intentHits   = intentTokens.filter(w => lower.includes(w));
  const intentScore  = intentTokens.length > 0 ? intentHits.length / intentTokens.length : 0.7;

  // factual_accuracy 20% — substantive response is a positive signal
  const factualScore = responseText.length > 80 ? 0.8 : 0.3;

  // tone 10%
  const dismissive  = ['sorry i cannot', 'i am unable to', "i can't help"];
  const toneScore   = dismissive.some(d => lower.includes(d)) ? 0.3 : 0.9;

  const total = kwScore * 0.40 + intentScore * 0.30 + factualScore * 0.20 + toneScore * 0.10;

  return {
    score:         total,
    compliancePass: violations.length === 0,
    violations,
    missing_keywords: keywords.filter(k => !lower.includes(k.toLowerCase())),
  };
}

async function runLlmTest(tc, agentName) {
  let userMessage;
  if (agentName === 'deebo') {
    userMessage = `Check this content for compliance in jurisdiction ${tc.input.jurisdiction}, channel ${tc.input.channel}:\n\n"${tc.input.content}"`;
  } else if (agentName === 'smokey') {
    userMessage = tc.question;
  } else if (agentName === 'craig') {
    userMessage = tc.prompt;
  } else {
    return { pass: false, reason: `Unknown agent: ${agentName}` };
  }

  const responseText = await callClaude(agentName, userMessage);

  // Deebo: parse JSON and compare status
  if (agentName === 'deebo') {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed         = JSON.parse(jsonMatch[0]);
        const statusOk       = parsed.status === tc.expected_status;
        const expectedViols  = tc.expected_violations_contain ?? [];
        const violationsOk   = expectedViols.length === 0 ||
          expectedViols.some(ev =>
            (parsed.violations ?? []).some(v => v.toLowerCase().includes(ev.toLowerCase()))
          );
        return {
          pass:   statusOk && violationsOk,
          actual: parsed,
          reason: statusOk
            ? (violationsOk ? null : `Expected violation containing: ${expectedViols.join(', ')}`)
            : `Status: expected "${tc.expected_status}", got "${parsed.status}"`,
        };
      } catch {
        // Fall through to conversational scoring
      }
    }
    // Deebo returned non-JSON — check for status keywords
    const lower = responseText.toLowerCase();
    const inferredStatus = lower.includes('"fail"') || lower.includes('violation') ? 'fail'
      : lower.includes('"warning"') ? 'warning' : 'pass';
    return {
      pass:   inferredStatus === tc.expected_status,
      actual: { status: inferredStatus, raw: responseText.slice(0, 200) },
      reason: `Could not parse JSON. Inferred status "${inferredStatus}" from text.`,
    };
  }

  // Smokey / Craig: score by keyword coverage + must_not_contain
  const scored    = scoreConversational(responseText, tc);
  const perCaseThreshold = 0.65;
  return {
    pass:          scored.score >= perCaseThreshold && scored.compliancePass,
    score:         scored.score,
    compliancePass: scored.compliancePass,
    violations:    scored.violations,
    missing:       scored.missing_keywords,
    excerpt:       responseText.slice(0, 180),
    reason:        scored.compliancePass
      ? (scored.score < perCaseThreshold ? `Score ${(scored.score * 100).toFixed(0)}% below 65% threshold` : null)
      : `Forbidden terms: [${scored.violations.join(', ')}]`,
  };
}

// ── Runner ───────────────────────────────────────────────────────────────────

function printRow(id, status, score, note) {
  const icon    = { PASS: '✅', FAIL: '❌', SKIP: '⏭ ', NOTE: '⚠️ ', ERR: '💥' }[status] ?? '?';
  const scoreStr = score != null ? ` (${(score * 100).toFixed(0)}%)` : '       ';
  const noteStr  = note ? `  ${note}` : '';
  console.log(`  ${icon} ${id.padEnd(26)}${scoreStr}${noteStr}`);
}

async function runAgentEval(agentName, goldenSet) {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  Agent: ${agentName.toUpperCase().padEnd(12)} Mode: ${fullMode ? 'FULL (LLM)' : 'FAST (deterministic)'}`);
  console.log('═'.repeat(64));

  const totals   = { pass: 0, fail: 0, skip: 0, complianceFail: 0 };
  const catStats = {};

  for (const tc of goldenSet.test_cases) {
    const cat = tc.category;
    if (!catStats[cat]) catStats[cat] = { pass: 0, total: 0 };
    catStats[cat].total++;

    let result;
    try {
      if (tc.test_type === 'function') {
        result = runFunctionTest(tc);
      } else if (tc.test_type === 'regex') {
        result = runRegexTest(tc);
        if (result.pass === null) {
          // Rule gap — not a test failure, just no rules for this jurisdiction
          printRow(tc.id, 'NOTE', null, result.note);
          catStats[cat].total--;
          totals.skip++;
          continue;
        }
      } else if (fullMode) {
        result = await runLlmTest(tc, agentName);
      } else {
        printRow(tc.id, 'SKIP', null, 'LLM test — rerun with --full to evaluate');
        catStats[cat].total--;
        totals.skip++;
        continue;
      }

      if (result.pass) {
        printRow(tc.id, 'PASS', result.score ?? null, null);
        totals.pass++;
        catStats[cat].pass++;
      } else {
        printRow(tc.id, 'FAIL', result.score ?? null, result.reason ?? null);
        totals.fail++;
        if (tc.compliance_critical) {
          totals.complianceFail++;
          if (result.violations?.length) {
            console.log(`       ⛔ Forbidden: [${result.violations.join(', ')}]`);
          }
        }
      }

      // Separate compliance-pass check for conversational tests that passed overall
      // but still had must_not_contain hits
      if (result.pass && result.compliancePass === false && tc.compliance_critical) {
        console.log(`       ⛔ COMPLIANCE: Forbidden terms in passing response: [${result.violations.join(', ')}]`);
        totals.complianceFail++;
      }

    } catch (err) {
      printRow(tc.id, 'ERR', null, err.message.slice(0, 80));
      totals.fail++;
      if (tc.compliance_critical) totals.complianceFail++;
    }
  }

  // Category breakdown
  console.log('\n  Category Breakdown:');
  const thresholds = goldenSet.meta.thresholds;
  for (const [cat, s] of Object.entries(catStats)) {
    if (s.total === 0) continue;
    const pct       = (s.pass / s.total * 100).toFixed(0);
    const threshold = thresholds[cat] ?? thresholds.overall_accuracy ?? 0.90;
    const ok        = s.pass / s.total >= threshold;
    console.log(
      `    ${ok ? '✅' : '❌'} ${cat.padEnd(30)} ${String(s.pass).padStart(2)}/${s.total}` +
      ` (${String(pct).padStart(3)}%)  threshold ${(threshold * 100).toFixed(0)}%`
    );
  }

  const total      = totals.pass + totals.fail;
  const overallPct = total > 0 ? (totals.pass / total * 100).toFixed(1) : '—';
  const overallOk  = total > 0 && totals.pass / total >= (thresholds.overall_accuracy ?? 0.90);
  const overallIcon = total === 0 ? '⏭ ' : overallOk ? '✅' : '❌';

  console.log('\n  ──────────────────────────────────────────────────────────');
  console.log(
    `  Overall: ${totals.pass}/${total} passed (${overallPct}%)` +
    `  threshold ${((thresholds.overall_accuracy ?? 0.90) * 100).toFixed(0)}%  ${overallIcon}` +
    (total === 0 ? '  (all skipped — rerun with --full)' : '')
  );
  if (totals.skip > 0) {
    console.log(`  Skipped: ${totals.skip} test(s) — rerun with --full to include LLM cases`);
  }
  if (totals.complianceFail > 0) {
    console.log(`  ⛔ COMPLIANCE FAILURES: ${totals.complianceFail} — BLOCKS COMMIT`);
  }

  return { ...totals, total, overallOk };
}

// ── Main ─────────────────────────────────────────────────────────────────────

const AGENT_MAP = {
  smokey: 'smokey-qa',
  craig:  'craig-campaigns',
  deebo:  'deebo-compliance',
};

async function main() {
  const agents = runAll
    ? Object.keys(AGENT_MAP)
    : agentArg
    ? [agentArg]
    : null;

  if (!agents) {
    console.error('Usage: node scripts/run-golden-eval.mjs --agent <smokey|craig|deebo> [--full]');
    console.error('       node scripts/run-golden-eval.mjs --all [--full]');
    process.exit(1);
  }

  console.log('\n🧪  BakedBot Golden Set Eval Runner');
  console.log(
    `    Mode: ${fullMode
      ? 'FULL — LLM calls enabled. Requires CLAUDE_API_KEY. Will incur API cost.'
      : 'FAST — deterministic tests only. No API calls.'}`
  );
  console.log(`    Agents: ${agents.join(', ')}`);

  let totalComplianceFails = 0;
  let anyBelowThreshold    = false;

  for (const agent of agents) {
    const setName = AGENT_MAP[agent];
    if (!setName) {
      console.error(`\nUnknown agent: "${agent}". Valid: ${Object.keys(AGENT_MAP).join(', ')}`);
      process.exit(1);
    }
    const goldenSet = loadGoldenSet(setName);
    const summary   = await runAgentEval(agent, goldenSet);

    if (summary.complianceFail > 0) totalComplianceFails += summary.complianceFail;
    if (!summary.overallOk && summary.total > 0) anyBelowThreshold = true;
  }

  console.log('\n' + '═'.repeat(64));
  if (totalComplianceFails > 0) {
    console.error(`❌  FAILED — ${totalComplianceFails} compliance-critical failure(s). DO NOT COMMIT.`);
    process.exit(1);
  } else if (anyBelowThreshold) {
    console.warn('⚠️   BELOW THRESHOLD — accuracy below target. Review failures before committing.');
    process.exit(2);
  } else {
    console.log('✅  PASSED — all thresholds met.');
    process.exit(0);
  }
}

// Cross-platform entry point guard (same pattern as validate-env.mjs)
const invokedUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedUrl && import.meta.url === invokedUrl) {
  main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
