
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
