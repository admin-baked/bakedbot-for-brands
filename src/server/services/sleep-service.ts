
import { lettaClient } from './letta/client';
import { learningService } from './learning-service';
import { logger } from '@/lib/logger';
import { ai } from '@/ai/genkit';

/**
 * SleepService: The "Offline" Processing Loop.
 * 
 * When an agent "sleeps", it:
 * 1. Consolidates short-term memory into long-term facts (Letta).
 * 2. Runs the "Learning Loop" on recent trajectories to generate Skills.
 * 3. Updates its own Core Persona based on drift/evolution.
 */
export class SleepService {

    async runSleepCycle(agentId: string, tenantId: string): Promise<any> {
        logger.info(`[SleepService] Starting Sleep Cycle for ${agentId}...`);
        const results = {
            skillsLearned: [] as string[],
            coreMemoryUpdates: [] as string[],
        };

        // 1. FETCH RECENT CONTEXT (Simulated Trajectory for now)
        // In a real system, we'd pull from a structured log database.
        // For MVP, we'll check the 'task_log' section of Letta memory or recent blocks.
        
        // Mocking a recent trajectory for demonstration
        const mockTrajectory = {
            id: `traj-${Date.now()}`,
            agentId,
            task: "Audit Dispensary Menu for Compliance",
            timestamp: new Date().toISOString(),
            success: true,
            steps: [
                { tool: 'rtrvrScrape', input: { url: 'https://example-dispensary.com/menu' }, output: 'HTML Content...' },
                { tool: 'analyzeText', input: { text: 'HTML Content...' }, output: 'Found "THC 95%" claim.' },
                { tool: 'reportIssue', input: { issue: 'High potency claim' }, output: 'Reported.' }
            ]
        };

        // 2. TRIGGER LEARNING LOOP (Reflect -> Create Skill)
        logger.info(`[SleepService] Analyzing recent trajectory: ${mockTrajectory.task}`);
        const newSkill = await learningService.processTrajectory(mockTrajectory);
        
        if (newSkill) {
            results.skillsLearned.push(newSkill);
            
            // 3. UPDATE CORE MEMORY (Self-Improvement)
            // Tell the agent it now knows this skill
            await lettaClient.updateCoreMemory(
                agentId, 
                'persona', 
                `I have learned a new skill: [[${newSkill}]]. I should mount this skill when performing similar tasks.`
            );
            results.coreMemoryUpdates.push(`Added skill ${newSkill} to Persona.`);
        }

        logger.info(`[SleepService] Sleep Cycle Complete for ${agentId}. Results: ${JSON.stringify(results)}`);
        return results;
    }
}

export const sleepService = new SleepService();
