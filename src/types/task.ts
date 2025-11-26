// Task and task execution type definitions for the agentic platform

import type { ToolCategory } from '@/types/tool';

export type TaskStatus = 'draft' | 'planning' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type ToolStatus = 'queued' | 'running' | 'success' | 'error' | 'cancelled';

/**
 * Represents a multi-step task created via natural language
 * Tasks can be complex workflows that use multiple agents and tools
 */
export interface Task {
    id: string;
    name: string;
    description: string;
    originalPrompt: string; // User's natural language input

    // Ownership
    createdBy: string; // User ID
    brandId?: string;

    // Scheduling
    createdAt: Date;
    updatedAt: Date;
    scheduledFor?: Date;
    completedAt?: Date;

    // Execution
    status: TaskStatus;
    steps: TaskStep[];
    currentStepIndex: number;

    // Agents & Tools
    assignedAgents: string[]; // Agent IDs: ['craig', 'pops', etc.]
    toolsUsed: string[]; // Tool IDs used across all steps

    // Confidence & Quality
    confidenceScore: number; // 0-100, improves over time
    deeboApproved: boolean;
    complianceIssues: string[];

    // Visibility
    visibility: 'private' | 'team' | 'shared';
    tags: string[];

    // Results
    outputs: TaskOutput[];
    metrics: TaskMetrics;
}

/**
 * Individual step within a task
 * Each step is executed by a specific agent using specific tools
 */
export interface TaskStep {
    id: string;
    taskId: string;
    stepNumber: number;

    // Description
    description: string;
    objective: string;

    // Assignment
    agentId: string; // Which agent executes this step
    requiredTools: string[]; // Tools this step needs

    // Execution
    status: StepStatus;
    startedAt?: Date;
    completedAt?: Date;
    duration?: number; // milliseconds

    // Tool executions
    toolExecutions: ToolExecution[];

    // Results
    output: any;
    error?: string;

    // Quality
    confidenceScore: number;
    deeboReviewed: boolean;
    deeboFeedback?: string;

    // Dependencies
    dependsOn: string[]; // Step IDs that must complete first
    blockedBy?: string[];
}

/**
 * Individual tool execution within a step
 * This is what gets displayed in the UI for the "aha moment"
 */
export interface ToolExecution {
    id: string;
    stepId: string;

    // Tool info
    toolId: string;
    toolName: string;
    toolCategory: ToolCategory;

    // Execution
    status: ToolStatus;
    input: any;
    output: any;
    error?: string;

    // Timing
    startTime: Date;
    endTime?: Date;
    duration?: number;

    // Display (for "aha moments" in UI)
    visible: boolean; // Show in execution feed
    displayData?: ToolDisplayData;

    // Metadata
    metadata: {
        tokensUsed?: number;
        cost?: number;
        apiCalls?: number;
        [key: string]: any;
    };
}

/**
 * How to display tool execution results in the UI
 */
export interface ToolDisplayData {
    type: 'text' | 'table' | 'chart' | 'image' | 'link' | 'email' | 'document';
    title: string;
    content: any;
    preview?: string; // Short preview for collapsed view
    icon?: string;
}

/**
 * Task outputs (final deliverables)
 */
export interface TaskOutput {
    id: string;
    type: 'document' | 'email' | 'report' | 'data' | 'campaign';
    name: string;
    url?: string;
    data?: any;
    createdAt: Date;
    createdBy: string; // Agent ID that created it
}

/**
 * Task execution metrics
 */
export interface TaskMetrics {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;

    totalToolExecutions: number;
    successfulToolExecutions: number;
    failedToolExecutions: number;

    totalDuration: number; // milliseconds
    estimatedCost: number; // dollars

    confidenceGrowth: number; // How much confidence improved
}

/**
 * Real-time task execution event
 * Sent via WebSocket to UI for live updates
 */
export interface TaskExecutionEvent {
    type: 'task_started' | 'task_completed' | 'task_failed' |
    'step_started' | 'step_completed' | 'step_failed' |
    'tool_started' | 'tool_completed' | 'tool_failed' |
    'confidence_updated' | 'deebo_review';

    taskId: string;
    timestamp: Date;

    // Event-specific data
    data: {
        stepId?: string;
        toolExecutionId?: string;
        message?: string;
        confidenceScore?: number;
        error?: string;
        [key: string]: any;
    };
}

/**
 * Task template (for common workflows)
 */
export interface TaskTemplate {
    id: string;
    name: string;
    description: string;
    category: 'marketing' | 'sales' | 'analytics' | 'operations';

    // Template structure
    steps: Partial<TaskStep>[];
    suggestedAgents: string[];
    requiredTools: string[];

    // Configuration
    inputs: TaskTemplateInput[];

    // Usage
    usageCount: number;
    averageSuccessRate: number;
}

export interface TaskTemplateInput {
    name: string;
    type: 'text' | 'number' | 'date' | 'select';
    required: boolean;
    description: string;
    options?: string[];
}
