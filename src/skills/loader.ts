
import fs from 'fs';
import path from 'path';
import { Skill, SkillManifest } from './types';

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
    // Note: In Next.js server components, we might need to handle the import path carefully.
    // We assume the skills are compiled/available at runtime.
    let manifest: SkillManifest;
    try {
        // We use a relative import for webpack/next.js compatibility if possible,
        // but dynamic imports with variables can be tricky in webpack.
        // A safer way for now might be a registry map if dynamic imports fail, 
        // but let's try the dynamic import first.
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
