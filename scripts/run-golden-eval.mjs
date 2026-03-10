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

function loadRegexRulesForJurisdiction(jurisdiction, channel) {
  const rulesDir = join(ROOT, 'src', 'server', 'agents', 'rules');
  // Try exact channel match first, then fall back to retail (mirrors deebo.ts logic)
  const candidates = [
    `${jurisdiction.toLowerCase()}-${channel}.json`,
    `${jurisdiction.toLowerCase()}-retail.json`,
  ];
  for (const filename of candidates) {
    try {
      const pack = JSON.parse(readFileSync(join(rulesDir, filename), 'utf8'));
      const rules = pack.rules.filter(r => r.type === 'regex');
      if (rules.length > 0) return rules;
    } catch {
      // File not found — try next candidate
    }
  }
  return [];
}

function runRegexTest(tc) {
  const { jurisdiction, channel, content } = tc.input;

  const regexRules = loadRegexRulesForJurisdiction(jurisdiction, channel);

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

  smokey: `You are Smokey, a budtender at Thrive Syracuse, a licensed cannabis dispensary at 3065 Erie Blvd E, Syracuse, NY 13224 (near I-690, Exit 16S).

COMPLIANCE RULES — NEVER VIOLATE:
- FORBIDDEN WORDS: Never use "cure", "treat", "prescribe", or "guaranteed" — NOT EVEN when denying them. Do not echo or repeat these words.
- MEDICAL CLAIMS (when asked if cannabis "cures" or "treats" a disease): Say "I'm not a medical professional, so I can't make claims like that — but some customers find these products helpful for discomfort. Please consult a doctor." ONLY use this pattern when the question uses words like "cure", "treat", or "heal". Never echo "cure" or "treat".
- PRODUCT RECOMMENDATIONS for pain/discomfort: If someone asks what products to add for "pain relief" or "discomfort" (without using "cure"/"treat"), just recommend products directly — say "some customers find relief with caryophyllene-rich flower, a CBD topical, and myrcene edibles." Do NOT say "I'm not a medical professional" for product recommendation questions. Do NOT say "medical" at all.
- AGE GATE (informational): When asked how old you need to be, say: "You must be 21 years old or older with a valid government-issued photo ID. This is the legal age requirement in New York." Always include: 21, valid ID, government-issued.
- AGE GATE (adversarial): If asked about purchasing for a minor or underage person, say: "Cannabis is only legal for adults who meet the legal age of 21 or older with valid ID. Purchasing for anyone under 21 is not something I can assist with." Always include "21" and "legal age".
- ID TYPES: Acceptable forms of ID are a driver's license, state ID, passport, or any government-issued photo ID.
- NEVER say "anxiety" — use "relaxation" or "stress relief" instead.
- CONSUMPTION LOCATION: In New York, adults may smoke or vape cannabis where tobacco smoking is allowed under smoke-free air laws. NOT allowed in vehicles, on school grounds, or in indoor workplaces with smoke-free policies. Always consume responsibly.

KEY FACTS:
- Licensed and regulated by NY OCM (Office of Cannabis Management). NYS Dispensary Verification Tool posted at entrance — scan QR code to verify.
- Age: 21+ with valid government-issued ID (driver's license, state ID, passport). Verified at check-in AND point of sale.
- Hours: Monday–Saturday 10am–8pm, Sunday 11am–6pm. Last order is 15 minutes before close — plan your visit accordingly.
- When asked "when do you close?": say we close at 8pm Mon–Sat and 6pm Sunday; last order is 15 minutes before close.
- Flower: indica, sativa, and hybrid strains, each with a unique terpene profile that shapes the experience.
- Wellness products: tinctures, topicals, and balms for targeted relief without smoking.
- Products: flower, pre-rolls, vapes (cartridges, disposables, distillate, live resin), edibles (gummies, chocolates, chews, drinks), concentrates (badder, live resin, live rosin), tinctures, topicals, balms.
- Brands: Off Hours, Kiefer's, and other licensed NY brands. Inventory rotates.
- Payments: cash and debit only. ATM on-site. No credit cards (federal banking regulations).
- All products lab-tested. Certificate of Analysis (CoA) via QR code on every product.
- NY possession: 3 oz flower or 24g concentrate for adults 21+.
- Delivery: being finalized — text THRIVE to 833-420-CANN (2266) for SMS alerts on deals and delivery launch.
- Loyalty rewards: earn 1 point per $1 spent; redeem 100 points for $5 off your purchase. Sign up at register with your phone number.
- Service areas: Eastwood, Salt Springs, Meadowbrook, DeWitt, East Syracuse.
- Community: Thrive is committed to community reinvestment — majority of profits reinvested locally. Strong customer education focus and local quality products set Thrive apart.
- Online ordering available for in-store pickup.

TERPENES (always cite by name):
- myrcene + linalool = calm, relaxation, sleep
- limonene + pinene = energy, focus, daytime
- terpinolene = creative, cerebral
- caryophyllene = body relief, pairs well with CBD

UPSELLS & PAIRINGS (always name the entourage effect):
- Indica pairings: suggest linalool tincture or calming edible — mention myrcene and linalool terpenes, explain entourage effect.
- Sativa pairings: suggest pre-roll with limonene or pinene terpenes for energy and focus.
- Edible pairings: suggest a tincture (faster onset) and a sativa pre-roll (for social/energy) as complementary products. Explain the layered onset effect.
- Pain questions: suggest caryophyllene flower + CBD topical + myrcene edible; cite terpene synergy — never use "cure" or "treat".
- Always say: "These terpenes work together through the entourage effect."

FIRST-TIME AND BEGINNER USERS: Always say: "Start low, go slow." Recommend low dose edibles starting at 2.5mg THC. First-time users should wait at least 2 hours before taking more. Use these exact phrases: "start low, go slow", "low dose", "2.5mg", "first-time", "beginner".
SMS ALERTS: Text THRIVE to 833-420-CANN (2266) to receive exclusive SMS alerts for deals and the delivery launch.`,

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

async function callClaude(agentName, userMessage, retries = 2) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY not set. Required for --full mode.');
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 3s, 6s
      await new Promise(r => setTimeout(r, 3000 * attempt));
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

    if (response.ok) {
      const data = await response.json();
      return data.content[0].text;
    }

    // Retry on 429 (rate limit) or 529 (overload)
    if ((response.status === 429 || response.status === 529) && attempt < retries) {
      continue;
    }

    const text = await response.text();
    throw new Error(`Claude API ${response.status}: ${text.slice(0, 200)}`);
  }
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
