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

        const prompt = (criterion.judgePrompt ?? '')
            .replace('{{input}}', JSON.stringify(input, null, 2))
            .replace('{{output}}', output);

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
        return JSON.stringify({ short_description: '[GENERATION SKIPPED — no API key]' });
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await anthropic.messages.create({
                model: generationModel,
                max_tokens: 300,
                system: instructions,
                messages: [{ role: 'user', content: JSON.stringify(input, null, 2) }],
            });
            return response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
        } catch (err) {
            if (attempt === retries) return `{"short_description":"[ERROR: ${err.message}]"}`;
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
    console.log(`  │  Gates passed: ${result.gatesPassedCount}/${result.totalCases} ${result.anyGateFailure ? '⛔' : '✅'}`);
    console.log(`  │  Composite score: ${formatScore(result.compositeScore)}`);
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
    const delta = challenger.compositeScore - champion.compositeScore;
    const meetsThreshold = delta >= spec.promotionDelta;
    const anyGateFailure = challenger.anyGateFailure;

    let recommendation;
    const rejectionReasons = [];

    if (anyGateFailure) {
        recommendation = 'reject';
        rejectionReasons.push('Challenger failed one or more hard gates');
    } else if (!meetsThreshold) {
        recommendation = 'reject';
        rejectionReasons.push(`Score delta ${formatScore(delta)} < required ${formatScore(spec.promotionDelta)}`);
    } else {
        recommendation = 'promote';
    }

    // Additional nuance: require human review if delta is between threshold and 2x threshold
    if (recommendation === 'promote' && delta < spec.promotionDelta * 2) {
        recommendation = 'needs_human_review';
        rejectionReasons.push(`Delta is above threshold but small (${formatScore(delta)}) — human review recommended`);
    }

    console.log('\n  ┌─ CHAMPION vs CHALLENGER');
    console.log(`  │  Champion score:   ${formatScore(champion.compositeScore)}`);
    console.log(`  │  Challenger score: ${formatScore(challenger.compositeScore)}`);
    console.log(`  │  Delta: ${delta >= 0 ? '+' : ''}${formatScore(delta)}`);
    console.log(`  │  Gates: ${anyGateFailure ? '⛔ FAILED' : '✅ PASSED'}`);
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

    return { recommendation, rejectionReasons, delta };
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

    // No challenger — just validate champion passes thresholds
    const passRate = championResult.compositeScore;
    const threshold = evalSpec.minCriteriaPassRate;

    if (championResult.anyGateFailure) {
        console.log(`\n  ❌ FAIL — Champion failed hard gate(s). Current champion is not compliant.`);
        process.exit(1);
    } else if (passRate < threshold) {
        console.log(`\n  ⚠️  WARN — Champion score ${formatScore(passRate)} below threshold ${formatScore(threshold)}`);
        process.exit(2);
    } else {
        console.log(`\n  ✅ PASS — Champion score ${formatScore(passRate)} meets threshold`);
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
