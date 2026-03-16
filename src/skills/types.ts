
import { ToolDefinition } from '@/types/agent-toolkit';

/**
 * A Skill is a portable, modular capability bundle for an agent.
 * It combines system prompt instructions ("how/when to use") with
 * the actual tool definitions ("what can be done").
 */
export interface Skill {
    /** Unique identifier (e.g., 'core.search', 'domain.cannmenus') */
    id: string;

    /** Human-readable name (e.g., 'Web Search') */
    name: string;

    /** Brief description of what this skill enables */
    description: string;

    /**
     * The instructional prompt content.
     * This is usually loaded from a SKILL.md file.
     * It teaches the agent heuristics, policy, and usage patterns for the tools.
     */
    instructions: string;

    /** The tools provided by this skill */
    tools: SkillTool[];

    /** Semantic version of the skill */
    version: string;
}

/**
 * A handy wrapper merging the schema and the code.
 */
export interface SkillTool {
    definition: ToolDefinition;
    implementation: (ctx: any, inputs: any) => Promise<any>;
}

/**
 * Interface that the `index.ts` of a Skill folder must default export.
 */
export interface SkillManifest {
    tools: SkillTool[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Champion / Challenger Optimization Layer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single binary eval criterion.
 * Every check produces YES or NO — no fuzzy scales.
 * Criteria are grouped as hard gates or quality checks.
 */
export interface EvalCriterion {
    /** Unique criterion ID within the skill's eval spec (e.g. "gate-001") */
    id: string;

    /** Human-readable name shown in reports */
    name: string;

    /**
     * Evaluation method:
     * - "regex"   — pattern match against output text (fast, no LLM)
     * - "rule"    — deterministic code check (word count, field presence, etc.)
     * - "judge"   — binary YES/NO prompt evaluated by a judge model
     */
    type: 'regex' | 'rule' | 'judge';

    /**
     * Regex pattern string (required when type === "regex").
     * Interpreted as a case-insensitive RegExp.
     */
    pattern?: string;

    /**
     * Whether a regex match means PASS or FAIL.
     * - "none"  — output must NOT match the pattern (e.g. banned phrases)
     * - "any"   — output must match the pattern (e.g. required disclaimer)
     */
    match?: 'none' | 'any';

    /**
     * Named rule identifier (required when type === "rule").
     * The eval runner resolves this to a built-in check function.
     * Examples: "output_is_valid_json", "word_count_lte_100", "contains_input_field"
     */
    rule?: string;

    /** Additional params passed to the rule function */
    ruleParams?: Record<string, unknown>;

    /**
     * Judge prompt template (required when type === "judge").
     * Must end with "Answer YES or NO."
     * Use {{output}} and {{input}} placeholders.
     */
    judgePrompt?: string;

    /** Expected answer from judge: "YES" or "NO" */
    passAnswer?: 'YES' | 'NO';

    /**
     * Hard gate: if true, a single failure immediately rejects the candidate.
     * Hard gates are checked before composite scoring.
     * Default: false (contributes to composite score instead)
     */
    isGate: boolean;

    /**
     * Weight in the composite score for non-gate criteria.
     * All non-gate criteria default to weight 1.
     * Hard gates have no weight (pass/fail only).
     */
    weight?: number;

    /** Category label for grouping in reports (e.g. "compliance", "quality", "format") */
    category: string;
}

/**
 * Eval specification for an optimizable skill.
 * Lives in eval_spec.yaml alongside the skill's SKILL.md.
 */
export interface EvalSpec {
    version: string;
    skillId: string;

    /** All binary criteria (gates + quality checks) */
    criteria: EvalCriterion[];

    /** Minimum pass rate across non-gate criteria to be considered for promotion */
    minCriteriaPassRate: number;

    /**
     * Minimum composite score delta above the current champion.
     * Challenger must beat champion by at least this margin on holdout set.
     */
    promotionDelta: number;

    /** Paths to eval datasets, relative to the skill directory */
    datasets: {
        dev: string;       // used during iteration
        holdout: string;   // used only for promotion decisions
        regression: string; // historical failures — must all pass
    };

    /** Judge model config */
    judgeModels: {
        dev: string;      // faster/cheaper model for dev set runs
        holdout: string;  // stronger model for promotion gate
    };
}

/**
 * Non-editable compliance and safety constraints.
 * The mutation engine is architecturally blocked from modifying these.
 * Lives in hard_rules.json alongside the skill's SKILL.md.
 */
export interface HardRules {
    version: string;
    skillId: string;

    /** Phrases that must never appear in any output (regex strings) */
    bannedPhrases: string[];

    /** Phrases that must always appear in outputs for the given conditions */
    requiredPhrases: Array<{
        phrase: string;
        condition: string; // e.g. "when jurisdiction is a recreational state"
    }>;

    /** Absolute prohibitions stated as plain English for auditability */
    prohibitions: string[];

    /** Owner of this file — must approve any changes via PR */
    owner: string;

    /** ISO timestamp of last review */
    lastReviewed: string;
}

/**
 * Versioning and promotion tracking metadata for a skill package.
 * Lives in metadata.json alongside the skill's SKILL.md.
 */
export interface SkillMetadata {
    skillId: string;
    name: string;
    description: string;

    /** Role this skill targets: "dispensary" | "brand" | "grower" | "super_user" */
    targetRole: 'dispensary' | 'brand' | 'grower' | 'super_user';

    /** Functional domains served (e.g. ["content", "compliance"]) */
    domains: string[];

    /** Current champion version (semver) */
    championVersion: string;

    /**
     * Promotion status:
     * - "draft"     — not yet evaluated
     * - "dev"       — in active optimization
     * - "shadow"    — challenger running against shadow traffic
     * - "limited"   — rolled out to internal users
     * - "champion"  — full production champion
     */
    promotionStatus: 'draft' | 'dev' | 'shadow' | 'limited' | 'champion';

    /** ISO timestamp of last champion promotion */
    lastPromotionDate: string | null;

    /** Owner agent or team */
    owner: string;
}

/**
 * A fully loaded optimizable skill package.
 * Extends the base Skill with all optimization layer files.
 */
export interface OptimizableSkill extends Skill {
    evalSpec: EvalSpec;
    hardRules: HardRules;
    metadata: SkillMetadata;

    /** Few-shot examples loaded from examples.jsonl */
    examples: SkillExample[];
}

/**
 * A single labeled example for the skill.
 * Positive examples show ideal output; negative examples show what to avoid.
 */
export interface SkillExample {
    input: Record<string, unknown>;
    output: string;
    label: 'positive' | 'negative';

    /**
     * Which dataset this example belongs to.
     * "prompt" examples are injected as few-shots into the skill instructions.
     */
    split: 'prompt' | 'dev' | 'holdout' | 'regression';

    /** Optional note explaining why this is a good/bad example */
    note?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Eval Run Types
// ─────────────────────────────────────────────────────────────────────────────

/** Result of evaluating a single criterion against a single output */
export interface CriterionResult {
    criterionId: string;
    criterionName: string;
    category: string;
    isGate: boolean;
    passed: boolean;
    weight: number;
    /** Explanation for judge-type criteria */
    reasoning?: string;
}

/** Result of running all criteria against a single eval case */
export interface CaseResult {
    caseId: string;
    input: Record<string, unknown>;
    output: string;
    gatesPassed: boolean; // true only if ALL gates passed
    criteriaResults: CriterionResult[];
    /** Sum of weights for passed non-gate criteria */
    score: number;
    /** Maximum possible score for non-gate criteria */
    maxScore: number;
    /** score / maxScore */
    passRate: number;
}

/** Aggregated results for a full eval run across all cases in a dataset */
export interface EvalRunResult {
    skillId: string;
    instructionsVersion: string;
    dataset: 'dev' | 'holdout' | 'regression';
    model: string;
    runAt: string; // ISO timestamp

    totalCases: number;
    gatesPassedCount: number;     // cases where ALL gates passed
    gatesFailedCount: number;
    compositeScore: number;       // sum of all case scores / sum of all maxScores
    criteriaPassRates: Record<string, number>; // per-criterion pass rate

    /** Any gate failures block promotion regardless of composite score */
    anyGateFailure: boolean;
    caseResults: CaseResult[];
}

/** Champion vs challenger comparison summary */
export interface ChampionChallengerResult {
    skillId: string;
    dataset: 'dev' | 'holdout';
    runAt: string;

    champion: EvalRunResult;
    challenger: EvalRunResult;

    scoreDelta: number;          // challenger.compositeScore - champion.compositeScore
    meetsPromotionDelta: boolean; // scoreDelta >= evalSpec.promotionDelta

    recommendation: 'promote' | 'reject' | 'needs_human_review';
    rejectionReasons: string[];   // populated when recommendation !== "promote"
}
