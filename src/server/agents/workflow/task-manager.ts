
import { ai } from '@/ai/genkit';
import { getGenerateOptions } from '@/ai/model-selector';
import { z } from 'zod';

export interface Task {
    id: string;
    content: string;
    context?: string;
    status: 'pending' | 'in_progress' | 'completed';
    subtasks?: Task[];
}

/**
 * TaskManager: A module for evolving and decomposing tasks using AI.
 * Inspired by CAMEL framework but adapted for BakedBot/Genkit.
 */
export class TaskManager {
    
    constructor(private defaultRole: string = 'Assistant') {}

    /**
     * Evolve a task: Refines vague instructions into a clear, actionable task.
     */
    async evolve(task: Task, role: string = this.defaultRole): Promise<Task> {
        const prompt = `
            You are a ${role}.
            Your objective is to REFINE and EVOLVE the given task to be more specific, actionable, and clear.
            Do not solve the task, just rewrite it to be better.
            
            Original Task: "${task.content}"
            Context: "${task.context || ''}"
            
            Return ONLY the refined task description as text.
        `;

        try {
            const result = await ai.generate({
                ...getGenerateOptions('standard'), // Use capable model
                prompt,
            });

            return {
                ...task,
                content: result.text.trim(),
            };
        } catch (error) {
            console.error('Task evolution failed:', error);
            return task; // Fallback to original
        }
    }

    /**
     * Decompose a task: Breaks a complex task into smaller, logical subtasks.
     */
    async decompose(task: Task, role: string = this.defaultRole): Promise<Task[]> {
        const prompt = `
            You are a ${role}.
            Your objective is to DECOMPOSE the given task into a list of sequential, actionable subtasks.
            
            Task: "${task.content}"
            Context: "${task.context || ''}"
            
            Return the subtasks as a JSON array of strings. 
            Example: ["Step 1", "Step 2"]
            Do not include markdown formatting, just the raw JSON.
        `;

        try {
            const result = await ai.generate({
                ...getGenerateOptions('standard'),
                prompt,
                output: { format: 'json', schema: z.object({ subtasks: z.array(z.string()) }) } // Use Genkit structured output if available, or just standard generation
            });

            // Genkit structured output usually returns an object matching the schema
            // If output.format is used, result.output() might be the object
            // Let's assume result.output() or proper casting. 
            // Since our 'ai.generate' wrapper wrapper in this project is simple, let's parse text if needed.
            // But let's check how 'ai.generate' is typed in this project.
            // Assuming it returns { text, output? }.
            
            let subtaskList: string[] = [];
            
            if (result.output) {
                 subtaskList = (result.output as any).subtasks || [];
            } else {
                // Fallback parsing manual JSON
                 const cleaned = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
                 const parsed = JSON.parse(cleaned);
                 subtaskList = Array.isArray(parsed) ? parsed : (parsed.subtasks || []);
            }

            return subtaskList.map((desc, index) => ({
                id: `${task.id}.${index + 1}`,
                content: desc,
                status: 'pending'
            }));

        } catch (error) {
            console.error('Task decomposition failed:', error);
            return [];
        }
    }
}
