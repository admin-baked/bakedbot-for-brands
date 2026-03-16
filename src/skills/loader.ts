
import fs from 'fs';
import path from 'path';
import {
    Skill,
    SkillManifest,
    OptimizableSkill,
    EvalSpec,
    HardRules,
    SkillMetadata,
    SkillExample,
} from './types';

const SKILLS_ROOT = path.join(process.cwd(), 'src', 'skills');

/**
 * Loads a specific skill by its path identifier (e.g., 'core/search').
 * Expects the directory to contain:
 * 1. SKILL.md (Instructions)
 * 2. index.ts (Tool definitions)
 */
export async function loadSkill(skillPath: string): Promise<Skill> {
    const fullPath = path.join(SKILLS_ROOT, skillPath);

    // 1. Read Instructions
    const mdPath = path.join(fullPath, 'SKILL.md');
    let instructions = '';
    try {
        instructions = await fs.promises.readFile(mdPath, 'utf-8');
    } catch (error) {
        console.warn(`[SkillLoader] No SKILL.md found for ${skillPath}`);
        instructions = `You have the ${skillPath} capability.`;
    }

    // 2. Load Tools (dynamic import)
    let manifest: SkillManifest;
    try {
        // @ts-ignore - Dynamic import of local module
        manifest = await import(`@/skills/${skillPath}/index`);
    } catch (error: any) {
        throw new Error(`[SkillLoader] Failed to import tools for ${skillPath}: ${error.message}`);
    }

    if (!manifest || !manifest.tools) {
        throw new Error(`[SkillLoader] Skill ${skillPath} does not export 'tools'.`);
    }

    const id = skillPath.replace(/\//g, '.'); // core/search -> core.search

    return {
        id,
        name: id, // Default name, can be parsed from frontmatter in future
        description: 'Loaded skill',
        instructions,
        tools: manifest.tools,
        version: '1.0.0'
    };
}

/**
 * Loads multiple skills in parallel.
 */
export async function loadSkills(skillPaths: string[]): Promise<Skill[]> {
    return Promise.all(skillPaths.map(p => loadSkill(p)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Optimizable Skill Loader
// Loads the full skill package: instructions + eval spec + hard rules + metadata
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads a fully optimizable skill package by path (e.g., 'domain/product-description').
 *
 * Expected directory structure:
 *   SKILL.md            — mutable instructions (champion version)
 *   hard_rules.json     — immutable compliance constraints
 *   eval_spec.yaml      — binary eval criteria + thresholds
 *   metadata.json       — version tracking, champion status
 *   examples.jsonl      — labeled few-shot and eval examples (optional)
 *   index.ts            — SkillManifest (tools, may be empty for content skills)
 *
 * The optimizer may only rewrite SKILL.md.
 * hard_rules.json is separately owned and must never be mutated by the engine.
 */
export async function loadOptimizableSkill(skillPath: string): Promise<OptimizableSkill> {
    const fullPath = path.join(SKILLS_ROOT, skillPath);

    // 1. Load base skill (instructions + tools)
    const base = await loadSkill(skillPath);

    // 2. Load hard rules (required — safety prerequisite)
    const hardRulesPath = path.join(fullPath, 'hard_rules.json');
    let hardRules: HardRules;
    try {
        const raw = await fs.promises.readFile(hardRulesPath, 'utf-8');
        hardRules = JSON.parse(raw) as HardRules;
    } catch {
        throw new Error(`[SkillLoader] hard_rules.json is required for optimizable skill: ${skillPath}`);
    }

    // 3. Load eval spec (required — defines all criteria and thresholds)
    const evalSpecPath = path.join(fullPath, 'eval_spec.json');
    let evalSpec: EvalSpec;
    try {
        const raw = await fs.promises.readFile(evalSpecPath, 'utf-8');
        evalSpec = JSON.parse(raw) as EvalSpec;
    } catch {
        throw new Error(`[SkillLoader] eval_spec.json is required for optimizable skill: ${skillPath}`);
    }

    // 4. Load metadata (required — tracks champion version and promotion status)
    const metadataPath = path.join(fullPath, 'metadata.json');
    let metadata: SkillMetadata;
    try {
        const raw = await fs.promises.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(raw) as SkillMetadata;
    } catch {
        throw new Error(`[SkillLoader] metadata.json is required for optimizable skill: ${skillPath}`);
    }

    // 5. Load examples (optional)
    const examplesPath = path.join(fullPath, 'examples.jsonl');
    let examples: SkillExample[] = [];
    try {
        const raw = await fs.promises.readFile(examplesPath, 'utf-8');
        examples = raw
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line) as SkillExample);
    } catch {
        // Optional — no examples file is fine
    }

    return {
        ...base,
        evalSpec,
        hardRules,
        metadata,
        examples,
    };
}

/**
 * Loads the instructions for a specific version of a skill.
 * Used by the eval runner to load both champion and challenger instructions.
 *
 * @param skillPath  Skill path (e.g., 'domain/product-description')
 * @param filePath   Specific file to load relative to skill dir (default: 'SKILL.md')
 */
export async function loadSkillInstructions(
    skillPath: string,
    filePath: string = 'SKILL.md'
): Promise<string> {
    const fullPath = path.join(SKILLS_ROOT, skillPath, filePath);
    try {
        return await fs.promises.readFile(fullPath, 'utf-8');
    } catch {
        throw new Error(`[SkillLoader] Could not read instructions from: ${fullPath}`);
    }
}

/**
 * Loads eval cases from a .jsonl file at the given path.
 * Path is resolved relative to the skill's directory.
 */
export async function loadEvalCases(
    skillPath: string,
    datasetFile: string
): Promise<Array<{ id: string; input: Record<string, unknown>; expectedOutput?: string; note?: string }>> {
    const fullPath = path.join(SKILLS_ROOT, skillPath, datasetFile);
    try {
        const raw = await fs.promises.readFile(fullPath, 'utf-8');
        return raw
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
    } catch {
        throw new Error(`[SkillLoader] Could not load eval dataset: ${fullPath}`);
    }
}
