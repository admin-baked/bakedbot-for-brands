'use server';
/**
 * Skill Optimization Server Actions
 * Super User only — provides read/write access to the skill optimization platform.
 *
 * Capabilities:
 * - getSkillRegistry()       List all optimizable skills with status
 * - getSkillDetail()         Full skill package: instructions, eval spec, hard rules
 * - saveChallenger()         Write challenger instructions to SKILL.candidate.md
 * - runFastEval()            Run regex/rule criteria only (no LLM cost)
 * - getExperiments()         Query skill_experiments Firestore collection
 * - promoteChallenger()      Copy candidate → champion (requires explicit confirmation)
 */

import fs from 'fs';
import path from 'path';
import { requireSuperUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import type {
    EvalSpec,
    HardRules,
    SkillMetadata,
    EvalCriterion,
    CriterionResult,
    CaseResult,
    EvalRunResult,
} from '@/skills/types';
import type { SkillExperiment } from '@/types/skill-experiment';

const SKILLS_ROOT = path.join(process.cwd(), 'src', 'skills');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function readJSON<T>(filePath: string): T | null {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    } catch {
        return null;
    }
}

function readFile(filePath: string): string | null {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch {
        return null;
    }
}

function readJSONL<T>(filePath: string): T[] {
    try {
        return fs.readFileSync(filePath, 'utf-8')
            .split('\n')
            .filter(l => l.trim())
            .map(l => JSON.parse(l) as T);
    } catch {
        return [];
    }
}

/** Discover all domain skill directories that have metadata.json */
function discoverDomainSkills(): string[] {
    const domainDir = path.join(SKILLS_ROOT, 'domain');
    try {
        const entries = fs.readdirSync(domainDir, { withFileTypes: true });
        const skills: string[] = [];
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            // Check for nested skill dirs (e.g., domain/intel/competitor-analyzer)
            const subDir = path.join(domainDir, entry.name);
            const subEntries = fs.readdirSync(subDir, { withFileTypes: true });
            const hasMetadata = subEntries.some(e => e.name === 'metadata.json' && e.isFile());
            if (hasMetadata) {
                skills.push(`domain/${entry.name}`);
            } else {
                // Check one level deeper
                for (const sub of subEntries.filter(e => e.isDirectory())) {
                    const deepMeta = path.join(subDir, sub.name, 'metadata.json');
                    if (fs.existsSync(deepMeta)) {
                        skills.push(`domain/${entry.name}/${sub.name}`);
                    }
                }
            }
        }
        return skills;
    } catch {
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public types returned to the client
// ─────────────────────────────────────────────────────────────────────────────

export interface SkillRegistryEntry {
    skillPath: string;
    metadata: SkillMetadata;
    gateCount: number;
    criteriaCount: number;
    hasChallengerCandidate: boolean;
    devCaseCount: number;
    holdoutCaseCount: number;
}

export interface SkillDetail {
    skillPath: string;
    metadata: SkillMetadata;
    instructions: string;
    challengerInstructions: string | null;
    evalSpec: EvalSpec;
    hardRules: HardRules;
    devCases: Array<{ id: string; note?: string; input: Record<string, unknown> }>;
}

export interface FastEvalResult {
    skillPath: string;
    instructionsLabel: string;
    dataset: string;
    runAt: string;
    totalCases: number;
    gatesPassedCount: number;
    gatesFailedCount: number;
    compositeScore: number;
    anyGateFailure: boolean;
    /** % of cases with ALL hard gates passing */
    hardGatePassRate: number;
    /** quality passes / total quality slots, among gate-passed cases */
    qualityPassRate: number;
    /** % of gate-passed cases where qual-005 passed */
    publishableRate: number;
    /** % of cases failing gate-002 (no_invented_facts) — -1 if all skipped */
    inventedFactRate: number;
    criteriaPassRates: Record<string, number>;
    caseResults: Array<{
        caseId: string;
        gatesPassed: boolean;
        score: number;
        maxScore: number;
        passRate: number;
        criteriaResults: Array<{
            criterionId: string;
            criterionName: string;
            category: string;
            isGate: boolean;
            passed: boolean;
            weight: number;
            skipped?: boolean;
        }>;
    }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// getSkillRegistry
// ─────────────────────────────────────────────────────────────────────────────

export async function getSkillRegistry(): Promise<{ success: boolean; skills: SkillRegistryEntry[]; error?: string }> {
    try {
        await requireSuperUser();
        const skillPaths = discoverDomainSkills();
        const entries: SkillRegistryEntry[] = [];

        for (const skillPath of skillPaths) {
            const dir = path.join(SKILLS_ROOT, skillPath);
            const metadata = readJSON<SkillMetadata>(path.join(dir, 'metadata.json'));
            if (!metadata) continue;

            const evalSpec = readJSON<EvalSpec>(path.join(dir, 'eval_spec.json'));
            const gateCount = evalSpec?.criteria.filter(c => c.isGate).length ?? 0;
            const criteriaCount = evalSpec?.criteria.filter(c => !c.isGate).length ?? 0;

            const hasChallengerCandidate = fs.existsSync(path.join(dir, 'SKILL.candidate.md'));

            const devCases = evalSpec?.datasets.dev
                ? readJSONL<{ id: string }>(path.join(dir, evalSpec.datasets.dev))
                : [];
            const holdoutCases = evalSpec?.datasets.holdout
                ? readJSONL<{ id: string }>(path.join(dir, evalSpec.datasets.holdout))
                : [];

            entries.push({
                skillPath,
                metadata,
                gateCount,
                criteriaCount,
                hasChallengerCandidate,
                devCaseCount: devCases.length,
                holdoutCaseCount: holdoutCases.length,
            });
        }

        return { success: true, skills: entries };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, skills: [], error: msg };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// getSkillDetail
// ─────────────────────────────────────────────────────────────────────────────

export async function getSkillDetail(skillPath: string): Promise<{ success: boolean; detail?: SkillDetail; error?: string }> {
    try {
        await requireSuperUser();

        // Validate path to prevent directory traversal
        const resolvedPath = path.resolve(SKILLS_ROOT, skillPath);
        if (!resolvedPath.startsWith(SKILLS_ROOT)) {
            return { success: false, error: 'Invalid skill path' };
        }

        const dir = resolvedPath;
        const metadata = readJSON<SkillMetadata>(path.join(dir, 'metadata.json'));
        const evalSpec = readJSON<EvalSpec>(path.join(dir, 'eval_spec.json'));
        const hardRules = readJSON<HardRules>(path.join(dir, 'hard_rules.json'));
        const instructions = readFile(path.join(dir, 'SKILL.md'));
        const challengerInstructions = readFile(path.join(dir, 'SKILL.candidate.md'));

        if (!metadata || !evalSpec || !hardRules || !instructions) {
            return { success: false, error: `Skill package incomplete at: ${skillPath}` };
        }

        const devCases = evalSpec.datasets.dev
            ? readJSONL<{ id: string; note?: string; input: Record<string, unknown> }>(path.join(dir, evalSpec.datasets.dev))
            : [];

        return {
            success: true,
            detail: {
                skillPath,
                metadata,
                instructions,
                challengerInstructions,
                evalSpec,
                hardRules,
                devCases: devCases.map(c => ({ id: c.id, note: c.note, input: c.input })),
            },
        };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// saveChallenger
// Writes challenger instructions to SKILL.candidate.md
// Never overwrites SKILL.md — that's the promote step
// ─────────────────────────────────────────────────────────────────────────────

export async function saveChallenger(skillPath: string, instructions: string): Promise<{ success: boolean; error?: string }> {
    try {
        await requireSuperUser();

        if (!instructions.trim()) {
            return { success: false, error: 'Instructions cannot be empty' };
        }

        const resolvedPath = path.resolve(SKILLS_ROOT, skillPath);
        if (!resolvedPath.startsWith(SKILLS_ROOT)) {
            return { success: false, error: 'Invalid skill path' };
        }

        // Validate the skill exists
        if (!fs.existsSync(path.join(resolvedPath, 'metadata.json'))) {
            return { success: false, error: 'Skill not found' };
        }

        const candidatePath = path.join(resolvedPath, 'SKILL.candidate.md');
        fs.writeFileSync(candidatePath, instructions, 'utf-8');

        return { success: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// runFastEval
// Runs regex + rule criteria only (no LLM — zero cost, < 1s)
// Judge criteria are skipped and marked as such in results
// ─────────────────────────────────────────────────────────────────────────────

function evaluateRegexCriterion(
    criterion: EvalCriterion,
    output: string
): Pick<CriterionResult, 'passed'> & { skipped?: boolean } {
    if (!criterion.pattern) return { passed: false };
    const re = new RegExp(criterion.pattern, 'i');
    const matched = re.test(output);
    const passed = criterion.match === 'none' ? !matched : matched;
    return { passed };
}

function evaluateRuleCriterion(
    criterion: EvalCriterion,
    input: Record<string, unknown>,
    outputRaw: string
): Pick<CriterionResult, 'passed'> & { skipped?: boolean } {
    let parsed: Record<string, unknown> | null = null;
    try { parsed = JSON.parse(outputRaw); } catch { parsed = null; }

    const params = criterion.ruleParams ?? {};

    switch (criterion.rule) {
        case 'output_is_valid_json_with_field': {
            const field = params.field as string;
            return { passed: parsed !== null && typeof parsed[field] === 'string' };
        }
        case 'output_is_valid_json_with_fields': {
            const fields = params.requiredFields as string[];
            return { passed: parsed !== null && fields.every(f => typeof (parsed as Record<string, unknown>)[f] === 'string') };
        }
        case 'required_disclaimer_present_if_needed': {
            const disclaimerRequired = input[params.disclaimerField as string];
            if (!disclaimerRequired) return { passed: true }; // disclaimer not needed
            const phrases = params.disclaimerPhrases as string[];
            const combined = JSON.stringify(parsed ?? outputRaw).toLowerCase();
            return { passed: phrases.some(p => combined.includes(p.toLowerCase())) };
        }
        case 'word_count_in_range': {
            if (!parsed) return { passed: false };
            const field = params.field as string;
            const text = String((parsed as Record<string, unknown>)[field] ?? '');
            const count = text.trim().split(/\s+/).filter(Boolean).length;
            return { passed: count >= (params.min as number ?? 0) && count <= (params.max as number ?? Infinity) };
        }
        case 'contains_at_least_one_input_field': {
            if (!parsed) return { passed: false };
            const field = params.field as string;
            const text = String((parsed as Record<string, unknown>)[field] ?? '').toLowerCase();
            const fields = params.fields as string[];
            for (const f of fields) {
                const val = input[f];
                if (!val) continue;
                if (Array.isArray(val)) {
                    if (val.some(v => text.includes(String(v).toLowerCase()))) return { passed: true };
                } else if (text.includes(String(val).toLowerCase())) {
                    return { passed: true };
                }
            }
            return { passed: false };
        }
        default:
            return { passed: false };
    }
}

export async function runFastEval(
    skillPath: string,
    dataset: 'dev' | 'holdout' | 'regression',
    instructionsLabel: 'champion' | 'challenger'
): Promise<{ success: boolean; result?: FastEvalResult; error?: string }> {
    try {
        await requireSuperUser();

        const resolvedPath = path.resolve(SKILLS_ROOT, skillPath);
        if (!resolvedPath.startsWith(SKILLS_ROOT)) {
            return { success: false, error: 'Invalid skill path' };
        }

        const evalSpec = readJSON<EvalSpec>(path.join(resolvedPath, 'eval_spec.json'));
        if (!evalSpec) return { success: false, error: 'eval_spec.json not found' };

        const datasetFile = evalSpec.datasets[dataset];
        const cases = readJSONL<{ id: string; input: Record<string, unknown>; injected_output?: string; note?: string }>(
            path.join(resolvedPath, datasetFile)
        );

        if (cases.length === 0) {
            return { success: false, error: `No cases found in ${datasetFile}` };
        }

        // For regression mode, we need injected_output — we don't generate
        // For dev/holdout we'd need an LLM — in fast mode, we skip generation
        // and evaluate only if injected_output is present, otherwise mark as no-output
        const isRegressionMode = dataset === 'regression';

        const caseResults: FastEvalResult['caseResults'] = [];

        for (const caseData of cases) {
            const output = caseData.injected_output ?? (isRegressionMode ? '' : '[GENERATION_SKIPPED_NO_LLM]');

            const criteriaResults: FastEvalResult['caseResults'][0]['criteriaResults'] = [];

            for (const criterion of evalSpec.criteria) {
                let result: { passed: boolean; skipped?: boolean };

                if (criterion.type === 'regex') {
                    result = evaluateRegexCriterion(criterion, output);
                } else if (criterion.type === 'rule') {
                    result = evaluateRuleCriterion(criterion, caseData.input, output);
                } else {
                    // judge — skip in fast mode
                    result = { passed: true, skipped: true };
                }

                criteriaResults.push({
                    criterionId: criterion.id,
                    criterionName: criterion.name,
                    category: criterion.category,
                    isGate: criterion.isGate,
                    passed: result.passed,
                    weight: criterion.weight ?? 1,
                    skipped: result.skipped,
                });
            }

            const gates = criteriaResults.filter(r => r.isGate);
            const quality = criteriaResults.filter(r => !r.isGate && !r.skipped);
            const gatesPassed = gates.every(r => r.passed);
            const score = quality.reduce((s, r) => s + (r.passed ? r.weight : 0), 0);
            const maxScore = quality.reduce((s, r) => s + r.weight, 0);

            caseResults.push({
                caseId: caseData.id,
                gatesPassed,
                score,
                maxScore,
                passRate: maxScore > 0 ? score / maxScore : 0,
                criteriaResults,
            });
        }

        const gatesPassedCount = caseResults.filter(r => r.gatesPassed).length;
        const totalScore = caseResults.reduce((s, r) => s + r.score, 0);
        const totalMaxScore = caseResults.reduce((s, r) => s + r.maxScore, 0);
        const compositeScore = totalMaxScore > 0 ? totalScore / totalMaxScore : 0;

        // 5-metric promotion metrics
        const hardGatePassRate = caseResults.length > 0 ? gatesPassedCount / caseResults.length : 0;
        const gatePassed = caseResults.filter(r => r.gatesPassed);
        const totalQualitySlots = gatePassed.reduce((s, r) => s + r.maxScore, 0);
        const totalQualityPasses = gatePassed.reduce((s, r) => s + r.score, 0);
        const qualityPassRate = totalQualitySlots > 0 ? totalQualityPasses / totalQualitySlots : 0;
        const publishableCritId = 'qual-005';
        const inventedFactCritId = 'gate-002';
        const publishableGatePassed = gatePassed.filter(r =>
            r.criteriaResults.find(c => c.criterionId === publishableCritId)?.passed === true
        ).length;
        const publishableRate = gatePassed.length > 0 ? publishableGatePassed / gatePassed.length : 0;
        const inventedFactResults = caseResults.map(r =>
            r.criteriaResults.find(c => c.criterionId === inventedFactCritId)
        ).filter((c): c is NonNullable<typeof c> => c !== undefined && !c.skipped);
        const inventedFactRate = inventedFactResults.length > 0
            ? inventedFactResults.filter(c => !c.passed).length / inventedFactResults.length
            : -1; // -1 = all skipped (judge gate, fast mode)

        const criteriaPassRates: Record<string, number> = {};
        for (const criterion of evalSpec.criteria) {
            const relevant = caseResults
                .map(r => r.criteriaResults.find(c => c.criterionId === criterion.id))
                .filter((c): c is NonNullable<typeof c> => c !== undefined && !c.skipped);
            criteriaPassRates[criterion.id] = relevant.length > 0
                ? relevant.filter(c => c.passed).length / relevant.length
                : -1; // -1 = all skipped
        }

        return {
            success: true,
            result: {
                skillPath,
                instructionsLabel,
                dataset,
                runAt: new Date().toISOString(),
                totalCases: caseResults.length,
                gatesPassedCount,
                gatesFailedCount: caseResults.length - gatesPassedCount,
                compositeScore,
                anyGateFailure: gatesPassedCount < caseResults.length,
                hardGatePassRate,
                qualityPassRate,
                publishableRate,
                inventedFactRate,
                criteriaPassRates,
                caseResults,
            },
        };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// getExperiments
// ─────────────────────────────────────────────────────────────────────────────

export async function getExperiments(
    skillName: string,
    limit = 20
): Promise<{ success: boolean; experiments: SkillExperiment[]; error?: string }> {
    try {
        await requireSuperUser();
        const db = getAdminFirestore();
        const snap = await db
            .collection('skill_experiments')
            .where('skill_name', '==', skillName)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        const experiments = snap.docs.map(doc => {
            const data = doc.data();
            return { ...data, experiment_id: doc.id } as SkillExperiment;
        });

        return { success: true, experiments };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, experiments: [], error: msg };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// promoteChallenger
// Copies SKILL.candidate.md → SKILL.md and bumps metadata.json champion version
// Requires explicit confirmation string to prevent accidental promotion
// ─────────────────────────────────────────────────────────────────────────────

export async function promoteChallenger(
    skillPath: string,
    confirmationText: string
): Promise<{ success: boolean; newVersion?: string; error?: string }> {
    try {
        await requireSuperUser();

        if (confirmationText !== 'PROMOTE') {
            return { success: false, error: 'Must pass confirmation text "PROMOTE"' };
        }

        const resolvedPath = path.resolve(SKILLS_ROOT, skillPath);
        if (!resolvedPath.startsWith(SKILLS_ROOT)) {
            return { success: false, error: 'Invalid skill path' };
        }

        const candidatePath = path.join(resolvedPath, 'SKILL.candidate.md');
        const championPath = path.join(resolvedPath, 'SKILL.md');
        const metadataPath = path.join(resolvedPath, 'metadata.json');

        if (!fs.existsSync(candidatePath)) {
            return { success: false, error: 'No SKILL.candidate.md found — save a challenger first' };
        }

        const metadata = readJSON<SkillMetadata>(metadataPath);
        if (!metadata) return { success: false, error: 'metadata.json not found' };

        // Bump semver patch version
        const parts = metadata.championVersion.split('.').map(Number);
        parts[2] = (parts[2] ?? 0) + 1;
        const newVersion = parts.join('.');

        // Backup current champion
        const backupPath = path.join(resolvedPath, `SKILL.v${metadata.championVersion}.backup.md`);
        fs.copyFileSync(championPath, backupPath);

        // Promote
        fs.copyFileSync(candidatePath, championPath);
        fs.unlinkSync(candidatePath);

        // Update metadata
        const updatedMetadata: SkillMetadata = {
            ...metadata,
            championVersion: newVersion,
            lastPromotionDate: new Date().toISOString(),
            promotionStatus: 'champion',
        };
        fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2), 'utf-8');

        return { success: true, newVersion };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteChallenger
// Discards SKILL.candidate.md without promoting
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteChallenger(skillPath: string): Promise<{ success: boolean; error?: string }> {
    try {
        await requireSuperUser();

        const resolvedPath = path.resolve(SKILLS_ROOT, skillPath);
        if (!resolvedPath.startsWith(SKILLS_ROOT)) {
            return { success: false, error: 'Invalid skill path' };
        }

        const candidatePath = path.join(resolvedPath, 'SKILL.candidate.md');
        if (!fs.existsSync(candidatePath)) {
            return { success: false, error: 'No candidate file to delete' };
        }

        fs.unlinkSync(candidatePath);
        return { success: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
    }
}
