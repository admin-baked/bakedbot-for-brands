
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '@/lib/logger';

// PATHS
const SKILL_DIR = path.join(process.cwd(), 'src', 'skills', 'generated');
const TRAJECTORY_DIR = path.join(process.cwd(), 'src', 'skills', 'trajectories');

export interface TrajectoryLog {
    id: string;
    agentId: string;
    task: string;
    steps: Array<{ tool: string; input: any; output: any }>;
    success: boolean;
    timestamp: string;
}

export class LearningService {
    
    /**
     * The "Letta Loop": Reflection -> Creation
     * 1. Analyze the trajectory.
     * 2. Reflect on success/failure.
     * 3. Create a reusable skill artifact.
     */
    async processTrajectory(trajectory: TrajectoryLog): Promise<string | null> {
        logger.info(`[LearningService] Processing trajectory ${trajectory.id} for agent ${trajectory.agentId}`);

        // 1. REFLECTION & CREATION (Teacher Model)
        // We use a stronger model (e.g. Claude 3.5 Sonnet / Gemini 1.5 Pro) to act as the Teacher.
        const prompt = `
            You are an Expert Agent Teacher. Your goal is to improve the capabilities of a junior agent.
            
            Analyze the following execution trajectory for the task: "${trajectory.task}"
            
            TRAJECTORY:
            ${JSON.stringify(trajectory.steps, null, 2)}
            
            INSTRUCTIONS:
            1. Did the agent succeed? (Look for final success markers or errors).
            2. Identify any inefficient steps, hallucinations, or correct patterns.
            3. Abstract this experience into a REUSABLE SKILL (Markdown format).
            
            The Skill Format matches our 'SKILL.md' standard:
            # [Skill Name]
            ## Description
            ## Trigger (When to use this)
            ## Steps / Instructions
            ## Common Pitfalls
        `;

        try {
            const { text } = await ai.generate({
                prompt,
                model: 'googleai/gemini-pro', // Using reliable model as "Teacher"
                config: { temperature: 0.2 } // Low temp for analytical precision
            });

            // Extract the skill content (assuming the model outputs just the markdown or wrapped in blocks)
            const skillContent = this.cleanMarkdown(text);
            const skillName = this.extractSkillName(skillContent) || `skill-${Date.now()}`;
            
            // 2. SAVE SKILL
            await this.saveSkill(trajectory.agentId, skillName, skillContent);
            
            return skillName;

        } catch (error) {
            logger.error(`[LearningService] Failed to learn from trajectory: ${error}`);
            return null;
        }
    }

    /**
     * Saves the skill to the file system.
     */
    async saveSkill(agentId: string, skillName: string, content: string): Promise<void> {
        const agentDir = path.join(SKILL_DIR, agentId);
        await fs.mkdir(agentDir, { recursive: true });
        
        const safeName = skillName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const filePath = path.join(agentDir, `${safeName}.md`);
        
        await fs.writeFile(filePath, content, 'utf-8');
        logger.info(`[LearningService] Saved new skill to ${filePath}`);
    }

    /**
     * Helper to load a skill for mounting.
     */
    async loadSkill(agentId: string, skillName: string): Promise<string | null> {
        try {
             // Search in agent's folder first
            const agentDir = path.join(SKILL_DIR, agentId);
            const safeName = skillName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            const filePath = path.join(agentDir, `${safeName}.md`);
            return await fs.readFile(filePath, 'utf-8');
        } catch (e) {
            return null;
        }
    }

    private cleanMarkdown(text: string): string {
        // Remove ```markdown wrapping if present
        return text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    }

    private extractSkillName(content: string): string | null {
        const match = content.match(/^#\s+(.+)$/m);
        return match ? match[1].trim() : null;
    }
}

export const learningService = new LearningService();
