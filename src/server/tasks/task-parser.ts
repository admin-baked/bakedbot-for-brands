// Task Parser - converts natural language to structured task plans using Claude

import Anthropic from '@anthropic-ai/sdk';
import type { Task, TaskStep } from '@/types/task';
import { getAgentConfigLoader } from '@/ai/agent-config-loader';
import { v4 as uuidv4 } from 'uuid';

/**
 * Task Parser
 * Converts natural language requests into structured, multi-step task plans
 */
export class TaskParser {
    private anthropic: Anthropic;

    constructor() {
        const apiKey = process.env.CLAUDE_API_KEY;
        if (!apiKey) {
            throw new Error('CLAUDE_API_KEY environment variable is required');
        }
        this.anthropic = new Anthropic({ apiKey });
    }

    /**
     * Parse natural language input into a structured task
     */
    async parseTask(
        input: string,
        context: {
            userId: string;
            brandId?: string;
        }
    ): Promise<Task> {
        // Load agent configurations
        const agentLoader = getAgentConfigLoader();
        await agentLoader.loadAll();

        // Build prompt for Claude
        const prompt = this.buildPrompt(input, agentLoader);

        // Call Claude API
        const response = await this.anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        // Extract task plan from response
        const content = response.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response type from Claude');
        }

        const taskPlan = this.extractTaskPlan(content.text);

        // Create structured task
        const taskId = uuidv4();
        const steps = taskPlan.steps.map((step, index) => ({
            id: uuidv4(),
            taskId,
            stepNumber: index + 1,
            description: step.description,
            objective: step.objective,
            agentId: step.agentId,
            requiredTools: step.tools,
            status: 'pending' as const,
            toolExecutions: [],
            output: null, // Initialize as null
            confidenceScore: 0.7, // Initial confidence
            deeboReviewed: false,
            dependsOn: [] as string[] // Will be filled in next step
        }));

        // Now convert dependsOn from step numbers to step IDs
        taskPlan.steps.forEach((planStep, index) => {
            if (planStep.dependsOn && planStep.dependsOn.length > 0) {
                steps[index].dependsOn = planStep.dependsOn.map((stepNum: number) => steps[stepNum].id);
            }
        });

        const task: Task = {
            id: taskId,
            name: taskPlan.name,
            description: taskPlan.description,
            originalPrompt: input,
            createdBy: context.userId,
            brandId: context.brandId,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'draft',
            steps,
            currentStepIndex: 0,
            assignedAgents: Array.from(new Set(taskPlan.steps.map(s => s.agentId))),
            toolsUsed: [],
            confidenceScore: 0.7,
            deeboApproved: false,
            complianceIssues: [],
            visibility: 'private',
            tags: taskPlan.tags || [],
            outputs: [],
            metrics: {
                totalSteps: taskPlan.steps.length,
                completedSteps: 0,
                failedSteps: 0,
                totalToolExecutions: 0,
                successfulToolExecutions: 0,
                failedToolExecutions: 0,
                totalDuration: 0,
                estimatedCost: 0,
                confidenceGrowth: 0
            }
        };

        return task;
    }

    /**
     * Build prompt for Claude to parse the task
     */
    private buildPrompt(input: string, agentLoader: ReturnType<typeof getAgentConfigLoader>): string {
        const agents = agentLoader.getAll();

        const agentDescriptions = Array.from(agents.entries())
            .map(([id, config]) => {
                return `**${id}** (${config.role}): ${config.description}
Tools: ${config.tools.join(', ')}
Capabilities: ${config.capabilities.join(', ')}`;
            })
            .join('\n\n');

        return `You are a task planning AI for BakedBot, an agentic platform for cannabis brands.

Your job is to break down user requests into structured, multi-step task plans that can be executed by our specialized agents.

# Available Agents:

${agentDescriptions}

# User Request:
"${input}"

# Instructions:

Analyze the request and create a detailed task plan. Return your response in the following JSON format:

\`\`\`json
{
  "name": "Brief task name",
  "description": "Detailed description of what this task accomplishes",
  "tags": ["tag1", "tag2"],
  "steps": [
    {
      "description": "What this step does",
      "objective": "The goal of this step",
      "agentId": "agent_id",
      "tools": ["tool1", "tool2"],
      "dependsOn": [] // Array of step numbers that must complete first (0-indexed)
    }
  ]
}
\`\`\`

# Guidelines:

1. **Agent Selection**: Choose the most appropriate agent for each step based on their expertise
2. **Tool Usage**: Only specify tools that the agent actually has access to
3. **Dependencies**: If a step requires results from a previous step, specify it in dependsOn
4. **Deebo Review**: For any step involving external communications (emails, public content), add a Deebo compliance review step BEFORE execution
5. **Collaboration**: Multiple agents can work on the same task in sequence
6. **Granularity**: Break complex tasks into clear, atomic steps

# Common Patterns:

**Research & Outreach:**
1. Ezal: web_search to find targets
2. Ezal: web_discovery to get contacts
3. Craig: generate personalized content
4. Deebo: compliance review
5. Craig: gmail_send to send emails
6. Pops: google_sheets_write to track results

**Analysis & Planning:**
1. Ezal: web_search for market data
2. Pops: google_sheets_read for internal data
3. Money Mike: analyze margins and pricing
4. Money Mike: google_docs_create strategy document
5. Deebo: review for compliance

Return ONLY the JSON, no other text.`;
    }

    /**
     * Extract task plan from Claude's response
     */
    private extractTaskPlan(response: string): {
        name: string;
        description: string;
        tags: string[];
        steps: Array<{
            description: string;
            objective: string;
            agentId: string;
            tools: string[];
            dependsOn: number[];
        }>;
    } {
        // Extract JSON from markdown code block if present
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : response;

        try {
            const plan = JSON.parse(jsonStr);

            // Validate the plan
            if (!plan.name || !plan.description || !plan.steps || !Array.isArray(plan.steps)) {
                throw new Error('Invalid task plan structure');
            }

            return plan;
        } catch (error) {
            throw new Error(`Failed to parse task plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Classify intent: is this a task creation or simple chat?
     */
    async classifyIntent(input: string): Promise<'task' | 'chat'> {
        const response = await this.anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: `Classify this user input as either "task" (requesting to create/execute a multi-step workflow) or "chat" (asking a question or requesting information).

User input: "${input}"

Respond with just one word: "task" or "chat"`
                }
            ]
        });

        const content = response.content[0];
        if (content.type !== 'text') {
            return 'chat';
        }

        const classification = content.text.toLowerCase().trim();
        return classification === 'task' ? 'task' : 'chat';
    }
}

// Singleton instance
let parser: TaskParser | null = null;

/**
 * Get the singleton task parser
 */
export function getTaskParser(): TaskParser {
    if (!parser) {
        parser = new TaskParser();
    }
    return parser;
}
