/**
 * Orchestration Validator (Leo Domain)
 *
 * Validates workflow orchestration, task delegation, and multi-agent coordination.
 *
 * Used by: Leo (COO)
 */

import {
    BaseValidator,
    ValidatorConfig,
    ValidationResult
} from './base-validator';

// Valid agent IDs that can receive delegated tasks
const VALID_AGENT_IDS = [
    'leo', 'linus', 'jack', 'glenda', 'mike', 'mike_exec',
    'craig', 'smokey', 'pops', 'ezal', 'deebo',
    'mrs_parker', 'money_mike', 'day_day', 'felisha', 'big_worm', 'roach'
];

export class OrchestrationValidator extends BaseValidator {
    config: ValidatorConfig = {
        name: 'orchestration-validator',
        description: 'Workflow orchestration and task delegation validation',
        tools: [
            'delegateTask',
            'broadcastToSquad',
            'createWorkflow',
            'executeWorkflow',
            'getWorkflowStatus',
            'prioritizeTasks',
            'getAgentStatus'
        ],
        severity: 'error',
        blocking: true,
        passThreshold: 80
    };

    async validate(
        toolName: string,
        toolArgs: any,
        toolResult: any
    ): Promise<ValidationResult> {
        const issues: string[] = [];
        let score = 100;

        // === CHECK 1: Valid Agent IDs ===
        if (toolName === 'delegateTask' || toolName === 'broadcastToSquad') {
            const agentIssues = this.checkAgentIds(toolArgs);
            if (agentIssues.length > 0) {
                issues.push(...agentIssues);
                score -= 30;
            }
        }

        // === CHECK 2: Task Clarity ===
        const taskIssues = this.checkTaskClarity(toolArgs);
        if (taskIssues.length > 0) {
            issues.push(...taskIssues);
            score -= 15;
        }

        // === CHECK 3: Workflow Dependencies ===
        if (toolName === 'createWorkflow' || toolName === 'executeWorkflow') {
            const workflowIssues = this.checkWorkflowDependencies(toolArgs);
            if (workflowIssues.length > 0) {
                issues.push(...workflowIssues);
                score -= 25;
            }
        }

        // === CHECK 4: Circular Dependencies ===
        if (toolName === 'createWorkflow') {
            const circularIssues = this.checkCircularDependencies(toolArgs);
            if (circularIssues.length > 0) {
                issues.push(...circularIssues);
                score -= 40;
            }
        }

        // === CHECK 5: Execution Result ===
        const resultIssues = this.checkExecutionResult(toolResult);
        if (resultIssues.length > 0) {
            issues.push(...resultIssues);
            score -= 10;
        }

        // Clamp score
        score = Math.max(0, score);

        if (issues.length > 0) {
            return this.fail(
                issues,
                this.generateRemediation(issues),
                score,
                { toolName }
            );
        }

        return this.pass({ toolName });
    }

    private checkAgentIds(args: any): string[] {
        const issues: string[] = [];

        // Check single agent delegation
        const personaId = args?.personaId || args?.agentId;
        if (personaId && !VALID_AGENT_IDS.includes(personaId.toLowerCase())) {
            issues.push(
                `Invalid agent ID: "${personaId}". Valid agents: ${VALID_AGENT_IDS.join(', ')}`
            );
        }

        // Check broadcast recipients
        const agentIds = args?.agentIds || args?.recipients;
        if (Array.isArray(agentIds)) {
            const invalid = agentIds.filter(id => !VALID_AGENT_IDS.includes(id.toLowerCase()));
            if (invalid.length > 0) {
                issues.push(
                    `Invalid agent IDs in broadcast: ${invalid.join(', ')}`
                );
            }
        }

        return issues;
    }

    private checkTaskClarity(args: any): string[] {
        const issues: string[] = [];

        const task = args?.task || args?.message || args?.description;
        if (!task) {
            return issues; // No task to check
        }

        // Check task length (too short = unclear)
        if (task.length < 10) {
            issues.push('Task description too short - provide more context');
        }

        // Check for vague language
        const vaguePatterns = [
            /^do stuff$/i,
            /^handle this$/i,
            /^figure it out$/i,
            /^whatever$/i,
            /^something$/i,
            /^asap$/i
        ];

        for (const pattern of vaguePatterns) {
            if (pattern.test(task)) {
                issues.push('Task description is too vague - be specific about what needs to be done');
                break;
            }
        }

        // Check for missing context indicators
        if (!args?.context && task.includes('the ') && task.includes('mentioned')) {
            issues.push('Task references context that may not be passed - include relevant context');
        }

        return issues;
    }

    private checkWorkflowDependencies(args: any): string[] {
        const issues: string[] = [];

        const steps = args?.steps || [];
        if (!Array.isArray(steps) || steps.length === 0) {
            return issues;
        }

        // Build a map of step names/ids
        const stepIds = new Set<string>();
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const id = step.id || step.name || `step_${i}`;
            stepIds.add(id);
        }

        // Check that dependencies reference valid steps
        for (const step of steps) {
            const depends = step.dependsOn || step.dependencies || [];
            if (Array.isArray(depends)) {
                for (const dep of depends) {
                    if (!stepIds.has(dep)) {
                        issues.push(
                            `Workflow step "${step.name || step.id}" depends on unknown step: "${dep}"`
                        );
                    }
                }
            }

            // Check that step has an agent assigned
            if (!step.agentId && !step.agent && !step.assignee) {
                issues.push(`Workflow step "${step.name || step.id}" has no agent assigned`);
            }

            // Check agent ID validity
            const agentId = step.agentId || step.agent || step.assignee;
            if (agentId && !VALID_AGENT_IDS.includes(agentId.toLowerCase())) {
                issues.push(
                    `Workflow step "${step.name || step.id}" has invalid agent: "${agentId}"`
                );
            }
        }

        return issues;
    }

    private checkCircularDependencies(args: any): string[] {
        const issues: string[] = [];

        const steps = args?.steps || [];
        if (!Array.isArray(steps) || steps.length === 0) {
            return issues;
        }

        // Build dependency graph
        const graph = new Map<string, string[]>();
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const id = step.id || step.name || `step_${i}`;
            const deps = step.dependsOn || step.dependencies || [];
            graph.set(id, Array.isArray(deps) ? deps : []);
        }

        // DFS to detect cycles
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (node: string, path: string[] = []): boolean => {
            if (recursionStack.has(node)) {
                issues.push(
                    `Circular dependency detected: ${[...path, node].join(' -> ')}`
                );
                return true;
            }

            if (visited.has(node)) {
                return false;
            }

            visited.add(node);
            recursionStack.add(node);
            path.push(node);

            const deps = graph.get(node) || [];
            for (const dep of deps) {
                if (hasCycle(dep, [...path])) {
                    return true;
                }
            }

            recursionStack.delete(node);
            return false;
        };

        for (const [id] of graph) {
            if (!visited.has(id)) {
                hasCycle(id);
            }
        }

        return issues;
    }

    private checkExecutionResult(result: any): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // Check for failed delegation/execution
        if (result.status === 'failed' || result.error || result.success === false) {
            issues.push(`Orchestration failed: ${result.error || result.message || 'Unknown error'}`);
        }

        // Check for partial completion
        if (result.partial === true || result.incomplete === true) {
            issues.push('Workflow partially completed - some steps may have failed');
        }

        // Check for timeout
        if (result.timedOut === true || result.status === 'timeout') {
            issues.push('Workflow timed out - consider breaking into smaller tasks');
        }

        return issues;
    }

    private generateRemediation(issues: string[]): string {
        const remediations: string[] = [
            'Please fix the following orchestration issues:\n'
        ];

        for (const issue of issues) {
            if (issue.includes('Invalid agent ID')) {
                remediations.push(
                    `- Use valid agent IDs: ${VALID_AGENT_IDS.slice(0, 8).join(', ')}...`
                );
            } else if (issue.includes('too short') || issue.includes('vague')) {
                remediations.push('- Provide clear, specific task descriptions with context');
            } else if (issue.includes('depends on unknown')) {
                remediations.push('- Ensure workflow step dependencies reference existing steps');
            } else if (issue.includes('Circular dependency')) {
                remediations.push('- Remove circular dependencies - steps cannot depend on themselves or create loops');
            } else if (issue.includes('no agent assigned')) {
                remediations.push('- Assign an agent to each workflow step');
            } else if (issue.includes('failed') || issue.includes('error')) {
                remediations.push('- Review the error and retry with corrected parameters');
            } else if (issue.includes('timed out')) {
                remediations.push('- Break the workflow into smaller, faster tasks');
            }
        }

        return remediations.join('\n');
    }
}

export default OrchestrationValidator;
