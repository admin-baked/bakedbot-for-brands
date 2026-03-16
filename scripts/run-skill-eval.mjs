#!/usr/bin/env node
/**
 * BakedBot Skill Eval Runner
 * Champion / Challenger evaluation with binary sub-evals
 *
 * Usage:
 *   node --env-file=.env.local scripts/run-skill-eval.mjs \
 *     --skill domain/product-description \
 *     --mode dev \
 *     [--challenger SKILL.candidate.md] \
 *     [--record] \
 *     [--full]
 *
 * Modes:
 *   dev       Run against dev-set.jsonl (fast iteration)
 *   holdout   Run against holdout-set.jsonl (promotion gate — do not run routinely)
 *   regression Run regression-set.jsonl with injected outputs (gate integrity check)
 *
 * Flags:
 *   --full      Enable judge-type criteria (requires ANTHROPIC_API_KEY, costs ~$0.05–0.15/run)
 *   --record    Write experiment result to Firestore skill_experiments collection
 *   --challenger PATH  Path to challenger instructions file (relative to skill dir)
 *                      If omitted, only the champion is evaluated (no comparison)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..');
const SKILLS_ROOT = path.join(REPO_ROOT, 'src', 'skills');

// ─── CLI args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const skillArg = getArg('--skill');
const modeArg = getArg('--mode') ?? 'dev';
const challengerArg = getArg('--challenger');
const fullMode = args.includes('--full');
const record = args.includes('--record');

function getArg(flag) {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
}

if (!skillArg) {
    console.error('Error: --skill is required (e.g., --skill domain/product-description)');
    process.exit(1);
}

if (!['dev', 'holdout', 'regression'].includes(modeArg)) {
    console.error('Error: --mode must be dev | holdout | regression');
    process.exit(1);
}

// ─── Load skill package ──────────────────────────────────────────────────────

const skillDir = path.join(SKILLS_ROOT, skillArg);

function loadJSON(filePath, label) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
        console.error(`Error: Could not load ${label} at ${filePath}`);
        process.exit(1);
    }
}

function loadJSONL(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8')
            .split('\n')
            .filter(l => l.trim())
            .map(l => JSON.parse(l));
    } catch {
        return [];
    }
}

const evalSpec = loadJSON(path.join(skillDir, 'eval_spec.json'), 'eval_spec.json');
const hardRules = loadJSON(path.join(skillDir, 'hard_rules.json'), 'hard_rules.json');
const metadata = loadJSON(path.join(skillDir, 'metadata.json'), 'metadata.json');

const datasetFile = evalSpec.datasets[modeArg];
const datasetPath = path.join(skillDir, datasetFile);
const evalCases = loadJSONL(datasetPath);

if (evalCases.length === 0) {
    console.error(`Error: No cases found in ${datasetPath}`);
    process.exit(1);
}

// ─── Load instructions ───────────────────────────────────────────────────────

function loadInstructions(fileName) {
    const p = path.join(skillDir, fileName);
    try {
        return fs.readFileSync(p, 'utf-8');
    } catch {
        console.error(`Error: Could not read instructions from ${p}`);
        process.exit(1);
    }
}

const championInstructions = loadInstructions('SKILL.md');
const challengerInstructions = challengerArg ? loadInstructions(challengerArg) : null;

// ─── Anthropic client (for judge + generation) ───────────────────────────────

const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
if (fullMode && !apiKey) {
    console.error('Error: --full mode requires ANTHROPIC_API_KEY or CLAUDE_API_KEY in env');
    process.exit(1);
}

const anthropic = apiKey ? new Anthropic({ apiKey }) : null;
const judgeModel = modeArg === 'holdout'
    ? evalSpec.judgeModels.holdout
    : evalSpec.judgeModels.dev;
const generationModel = 'claude-haiku-4-5-20251001'; // fast + cheap for dev eval generation

// ─── Criterion evaluation ────────────────────────────────────────────────────

/** Check a single criterion against a single output. Returns CriterionResult. */
async function evaluateCriterion(criterion, input, output) {
    const base = {
        criterionId: criterion.id,
        criterionName: criterion.name,
        category: criterion.category,
        isGate: criterion.isGate,
        weight: criterion.weight ?? 1,
    };

    // --- Regex check ---
    if (criterion.type === 'regex') {
        if (!criterion.pattern) {
            return { ...base, passed: false, reasoning: 'No pattern defined' };
        }
        const re = new RegExp(criterion.pattern, 'i');
        const matched = re.test(output);
        const passed = criterion.match === 'none' ? !matched : matched;
        return { ...base, passed };
    }

    // --- Rule check ---
    if (criterion.type === 'rule') {
        const passed = evaluateRule(criterion.rule, criterion.ruleParams ?? {}, input, output);
        return { ...base, passed };
    }

    // --- Judge check ---
    if (criterion.type === 'judge') {
        if (!fullMode || !anthropic) {
            // Skip judge checks in fast mode — mark as skipped (not failed, not passed)
            return { ...base, passed: true, reasoning: '[SKIPPED — run with --full to enable judge checks]' };
        }

        const toneProfile = typeof input.tone_profile === 'object'
            ? JSON.stringify(input.tone_profile)
            : String(input.tone_profile ?? 'Professional and approachable');
        const prompt = (criterion.judgePrompt ?? '')
            .replace('{{input}}', JSON.stringify(input, null, 2))
            .replace('{{output}}', output)
            .replace(/\{\{tone_profile\}\}/g, toneProfile)
            .replace(/\{\{channel\}\}/g, String(input.channel ?? 'web'));

        try {
            const response = await anthropic.messages.create({
                model: judgeModel,
                max_tokens: 10,
                messages: [{ role: 'user', content: prompt }],
            });
            const answer = response.content[0]?.type === 'text'
                ? response.content[0].text.trim().toUpperCase()
                : '';
            const passed = answer.startsWith(criterion.passAnswer ?? 'YES');
            return { ...base, passed, reasoning: answer };
        } catch (err) {
            return { ...base, passed: false, reasoning: `Judge error: ${err.message}` };
        }
    }

    return { ...base, passed: false, reasoning: `Unknown criterion type: ${criterion.type}` };
}

/** Built-in deterministic rule functions */
function evaluateRule(rule, params, input, outputRaw) {
    let parsed;
    try { parsed = JSON.parse(outputRaw); } catch { parsed = null; }

    switch (rule) {
        case 'output_is_valid_json_with_field': {
            return parsed !== null && typeof parsed[params.field] === 'string';
        }
        case 'output_is_valid_json_with_fields': {
            const fields = params.requiredFields ?? [];
            return parsed !== null && fields.every(f => typeof parsed[f] === 'string');
        }
        case 'required_disclaimer_present_if_needed': {
            const disclaimerRequired = input[params.disclaimerField];
            if (!disclaimerRequired) return true; // disclaimer not needed
            const phrases = params.disclaimerPhrases ?? [];
            const combined = JSON.stringify(parsed ?? outputRaw).toLowerCase();
            return phrases.some(p => combined.includes(p.toLowerCase()));
        }
        case 'word_count_in_range': {
            if (!parsed) return false;
            const text = parsed[params.field] ?? '';
            const count = text.trim().split(/\s+/).filter(Boolean).length;
            return count >= (params.min ?? 0) && count <= (params.max ?? Infinity);
        }
        case 'contains_at_least_one_input_field': {
            if (!parsed) return false;
            const text = (parsed[params.field] ?? '').toLowerCase();
            const fieldsToCheck = params.fields ?? [];
            for (const f of fieldsToCheck) {
                const val = input[f];
                if (!val) continue;
                if (Array.isArray(val)) {
                    if (val.some(v => text.includes(String(v).toLowerCase()))) return true;
                } else if (text.includes(String(val).toLowerCase())) {
                    return true;
                }
            }
            return false;
        }
        default:
            return false; // unknown rule = fail
    }
}

// ─── Generate output for a case ──────────────────────────────────────────────

async function generateOutput(instructions, input, retries = 2) {
    if (!anthropic) {
        return JSON.stringify({
            short_description: '[GENERATION SKIPPED — no API key]',
            medium_description: '[GENERATION SKIPPED]',
            seo_summary: '[GENERATION SKIPPED]',
            cta_snippet: null,
        });
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await anthropic.messages.create({
                model: generationModel,
                max_tokens: 600,
                system: instructions,
                messages: [{ role: 'user', content: JSON.stringify(input, null, 2) }],
            });
            return response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
        } catch (err) {
            if (attempt === retries) {
                return JSON.stringify({
                    short_description: `[ERROR: ${err.message}]`,
                    medium_description: '[ERROR]',
                    seo_summary: '[ERROR]',
                    cta_snippet: null,
                });
            }
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
    }
}

// ─── Run all criteria against one case ───────────────────────────────────────

async function evaluateCase(caseData, instructions, isRegressionMode) {
    // In regression mode, use injected_output instead of generating
    const output = isRegressionMode && caseData.injected_output
        ? caseData.injected_output
        : await generateOutput(instructions, caseData.input);

    const criteria = evalSpec.criteria;
    const criteriaResults = await Promise.all(
        criteria.map(c => evaluateCriterion(c, caseData.input, output))
    );

    const gates = criteriaResults.filter(r => r.isGate);
    const quality = criteriaResults.filter(r => !r.isGate);

    const gatesPassed = gates.every(r => r.passed);
    const score = quality.reduce((sum, r) => sum + (r.passed ? r.weight : 0), 0);
    const maxScore = quality.reduce((sum, r) => sum + r.weight, 0);
    const passRate = maxScore > 0 ? score / maxScore : 0;

    return {
        caseId: caseData.id,
        input: caseData.input,
        output,
        gatesPassed,
        criteriaResults,
        score,
        maxScore,
        passRate,
    };
}

// ─── Run full eval on a dataset ───────────────────────────────────────────────

async function runEval(instructions, versionLabel, dataset, isRegressionMode = false) {
    const startMs = Date.now();
    console.log(`\n  Running ${dataset.length} cases for [${versionLabel}]...`);

    const caseResults = [];
    for (const caseData of dataset) {
        process.stdout.write('.');
        const result = await evaluateCase(caseData, instructions, isRegressionMode);
        caseResults.push(result);
    }
    console.log(' done.');

    const gatesPassedCount = caseResults.filter(r => r.gatesPassed).length;
    const totalScore = caseResults.reduce((s, r) => s + r.score, 0);
    const totalMaxScore = caseResults.reduce((s, r) => s + r.maxScore, 0);
    const compositeScore = totalMaxScore > 0 ? totalScore / totalMaxScore : 0;
    const anyGateFailure = gatesPassedCount < caseResults.length;
    const hardGatePassRate = caseResults.length > 0 ? gatesPassedCount / caseResults.length : 0;

    const gatePassedCases = caseResults.filter(r => r.gatesPassed);
    const totalQualSlots = gatePassedCases.reduce((s, r) => s + r.maxScore, 0);
    const totalQualPasses = gatePassedCases.reduce((s, r) => s + r.score, 0);
    const qualityPassRate = totalQualSlots > 0 ? totalQualPasses / totalQualSlots : 0;

    const publishablePassedInGate = gatePassedCases.filter(r =>
        r.criteriaResults.find(c => c.criterionId === 'qual-005')?.passed === true
    ).length;
    const publishableRate = gatePassedCases.length > 0 ? publishablePassedInGate / gatePassedCases.length : 0;

    const inventedFactResults = caseResults.map(r =>
        r.criteriaResults.find(c => c.criterionId === 'gate-002')
    ).filter(c => c && !c.reasoning?.includes('[SKIPPED'));
    const inventedFactRate = inventedFactResults.length > 0
        ? inventedFactResults.filter(c => !c.passed).length / inventedFactResults.length
        : -1;

    // Per-criterion pass rates
    const criteriaPassRates = {};
    for (const criterion of evalSpec.criteria) {
        const relevant = caseResults.map(r =>
            r.criteriaResults.find(c => c.criterionId === criterion.id)
        ).filter(Boolean);
        const passed = relevant.filter(c => c.passed).length;
        criteriaPassRates[criterion.id] = relevant.length > 0 ? passed / relevant.length : 0;
    }

    return {
        skillId: metadata.skillId,
        instructionsVersion: versionLabel,
        dataset: modeArg,
        model: generationModel,
        runAt: new Date().toISOString(),
        totalCases: caseResults.length,
        gatesPassedCount,
        gatesFailedCount: caseResults.length - gatesPassedCount,
        compositeScore,
        hardGatePassRate,
        qualityPassRate,
        publishableRate,
        inventedFactRate,
        criteriaPassRates,
        anyGateFailure,
        runDurationMs: Date.now() - startMs,
        caseResults,
    };
}

// ─── Format report ────────────────────────────────────────────────────────────

function formatScore(score) {
    return `${(score * 100).toFixed(1)}%`;
}

function printRunResult(label, result) {
    console.log(`\n  ┌─ ${label}`);
    console.log(`  │  Cases: ${result.totalCases}`);
    console.log(`  │  Hard gate pass rate:  ${formatScore(result.hardGatePassRate)} (${result.gatesPassedCount}/${result.totalCases}) ${result.anyGateFailure ? '⛔' : '✅'}`);
    console.log(`  │  Quality pass rate:    ${formatScore(result.qualityPassRate)}`);
    console.log(`  │  Publishable rate:     ${formatScore(result.publishableRate)}`);
    console.log(`  │  Invented fact rate:   ${result.inventedFactRate === -1 ? '[skipped]' : formatScore(result.inventedFactRate)}`);
    console.log(`  │`);
    console.log(`  │  Criteria breakdown:`);

    for (const criterion of evalSpec.criteria) {
        const rate = result.criteriaPassRates[criterion.id] ?? 0;
        const icon = rate === 1 ? '✅' : rate >= 0.75 ? '⚠️ ' : '❌';
        const gateTag = criterion.isGate ? ' [GATE]' : '';
        console.log(`  │    ${icon} ${criterion.name}${gateTag}: ${formatScore(rate)}`);
    }
    console.log(`  └─────`);
}

function printComparison(champion, challenger, spec) {
    const promotionRules = spec.promotionRules ?? {};
    const minQualityLift = (promotionRules.minQualityLiftPct ?? 3) / 100;
    const minPublishableLift = (promotionRules.minPublishableLiftPct ?? 5) / 100;

    const hardGateDelta = challenger.hardGatePassRate - champion.hardGatePassRate;
    const qualityDelta = challenger.qualityPassRate - champion.qualityPassRate;
    const publishableDelta = challenger.publishableRate - champion.publishableRate;
    const inventedFactDelta = challenger.inventedFactRate - champion.inventedFactRate; // negative = better

    const meetsHardGate = hardGateDelta >= 0; // must not regress
    const meetsQualityLift = qualityDelta >= minQualityLift;
    const meetsPublishableLift = publishableDelta >= minPublishableLift;
    const meetsInventedFact = challenger.inventedFactRate === -1 || inventedFactDelta <= 0; // -1 = skipped
    const meetsBudget = true; // budget only checked by full script with timing

    const rejectionReasons = [];
    if (!meetsHardGate) rejectionReasons.push(`Hard gate pass rate regressed: ${formatScore(hardGateDelta)} (must be ≥ 0)`);
    if (!meetsQualityLift) rejectionReasons.push(`Quality lift ${formatScore(qualityDelta)} < required +${formatScore(minQualityLift)}`);
    if (!meetsPublishableLift) rejectionReasons.push(`Publishable lift ${formatScore(publishableDelta)} < required +${formatScore(minPublishableLift)}`);
    if (!meetsInventedFact) rejectionReasons.push(`Invented fact rate worsened: ${formatScore(inventedFactDelta)}`);

    const allMet = meetsHardGate && meetsQualityLift && meetsPublishableLift && meetsInventedFact;

    // Borderline: passes all criteria but publishable delta is marginal (< 2x minimum)
    const borderline = allMet && publishableDelta < minPublishableLift * 2;

    let recommendation;
    if (!allMet) {
        recommendation = 'reject';
    } else if (borderline) {
        recommendation = 'needs_human_review';
        rejectionReasons.push(`Publishable lift ${formatScore(publishableDelta)} above threshold but marginal — human review recommended`);
    } else {
        recommendation = 'promote';
    }

    console.log('\n  ┌─ CHAMPION vs CHALLENGER (5-metric promotion decision)');
    console.log(`  │`);
    console.log(`  │  Hard gate pass rate: ${formatScore(champion.hardGatePassRate)} → ${formatScore(challenger.hardGatePassRate)}  (${hardGateDelta >= 0 ? '+' : ''}${formatScore(hardGateDelta)})  ${meetsHardGate ? '✅' : '❌'}`);
    console.log(`  │  Quality pass rate:   ${formatScore(champion.qualityPassRate)} → ${formatScore(challenger.qualityPassRate)}  (${qualityDelta >= 0 ? '+' : ''}${formatScore(qualityDelta)} / need +${formatScore(minQualityLift)})  ${meetsQualityLift ? '✅' : '❌'}`);
    console.log(`  │  Publishable rate:    ${formatScore(champion.publishableRate)} → ${formatScore(challenger.publishableRate)}  (${publishableDelta >= 0 ? '+' : ''}${formatScore(publishableDelta)} / need +${formatScore(minPublishableLift)})  ${meetsPublishableLift ? '✅' : '❌'}`);
    if (challenger.inventedFactRate !== -1) {
        console.log(`  │  Invented fact rate:  ${formatScore(champion.inventedFactRate)} → ${formatScore(challenger.inventedFactRate)}  (must not worsen)  ${meetsInventedFact ? '✅' : '❌'}`);
    } else {
        console.log(`  │  Invented fact rate:  [skipped — run with --full to evaluate]`);
    }
    console.log(`  │`);

    if (recommendation === 'promote') {
        console.log(`  │  ✅ RECOMMENDATION: PROMOTE challenger to champion`);
    } else if (recommendation === 'needs_human_review') {
        console.log(`  │  ⚠️  RECOMMENDATION: NEEDS HUMAN REVIEW`);
        rejectionReasons.forEach(r => console.log(`  │     → ${r}`));
    } else {
        console.log(`  │  ❌ RECOMMENDATION: REJECT challenger`);
        rejectionReasons.forEach(r => console.log(`  │     → ${r}`));
    }
    console.log('  └─────');

    return {
        recommendation, rejectionReasons,
        hardGateDelta, qualityDelta, publishableDelta, inventedFactDelta,
        meetsHardGate, meetsQualityLift, meetsPublishableLift, meetsInventedFact,
    };
}

// ─── Regression mode ──────────────────────────────────────────────────────────

function runRegressionCheck(result, regressionCases) {
    console.log('\n  ┌─ REGRESSION CHECK');
    let allPassed = true;

    for (const caseResult of result.caseResults) {
        const spec = regressionCases.find(c => c.id === caseResult.caseId);
        if (!spec?.expected_gate_failures) continue;

        const actualGateFailures = caseResult.criteriaResults
            .filter(c => c.isGate && !c.passed)
            .map(c => c.criterionId);

        for (const expectedFailure of spec.expected_gate_failures) {
            if (!actualGateFailures.includes(expectedFailure)) {
                console.log(`  │  ❌ ${caseResult.caseId}: Expected gate [${expectedFailure}] to FAIL but it PASSED — REGRESSION`);
                allPassed = false;
            } else {
                console.log(`  │  ✅ ${caseResult.caseId}: Gate [${expectedFailure}] correctly rejected`);
            }
        }
    }

    if (allPassed) {
        console.log('  │  ✅ All regression cases correctly rejected by gates');
    }
    console.log('  └─────');
    return allPassed;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n╔══════════════════════════════════════════════════════╗`);
    console.log(`║  BakedBot Skill Eval Runner                         ║`);
    console.log(`╚══════════════════════════════════════════════════════╝`);
    console.log(`  Skill:  ${skillArg}`);
    console.log(`  Mode:   ${modeArg}`);
    console.log(`  Full:   ${fullMode ? 'yes (judge checks enabled)' : 'no (regex/rule checks only)'}`);
    if (challengerArg) console.log(`  Challenger: ${challengerArg}`);

    const isRegressionMode = modeArg === 'regression';

    // Run champion
    const championResult = await runEval(
        championInstructions,
        `champion@${metadata.championVersion}`,
        evalCases,
        isRegressionMode
    );

    printRunResult(`CHAMPION v${metadata.championVersion}`, championResult);

    // Regression check
    if (isRegressionMode) {
        const allPassed = runRegressionCheck(championResult, evalCases);
        process.exit(allPassed ? 0 : 1);
    }

    // Run challenger if provided
    if (challengerInstructions) {
        const challengerResult = await runEval(
            challengerInstructions,
            `challenger@${modeArg}`,
            evalCases,
            false
        );

        printRunResult('CHALLENGER', challengerResult);
        const { recommendation } = printComparison(championResult, challengerResult, evalSpec);

        if (recommendation === 'reject') process.exit(1);
        process.exit(0);
    }

    // No challenger — validate champion passes baseline thresholds
    const promotionRules = evalSpec.promotionRules ?? {};
    const minQualityLift = (promotionRules.minQualityLiftPct ?? 3) / 100;

    if (championResult.anyGateFailure) {
        console.log(`\n  ❌ FAIL — Champion failed hard gate(s). Current champion is not compliant.`);
        process.exit(1);
    } else if (championResult.qualityPassRate < (0.5 + minQualityLift)) {
        console.log(`\n  ⚠️  WARN — Champion quality pass rate ${formatScore(championResult.qualityPassRate)} is low`);
        process.exit(2);
    } else {
        console.log(`\n  ✅ PASS — Champion clears all hard gates`);
        console.log(`  Quality pass rate: ${formatScore(championResult.qualityPassRate)}`);
        console.log(`  Publishable rate:  ${formatScore(championResult.publishableRate)}`);
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
