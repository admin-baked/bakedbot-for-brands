/**
 * Discovery-First Configuration
 * 
 * Generates configuration checklists for complex tasks before execution.
 * Inspired by Tasklet.ai's discovery-first approach.
 */

export interface TaskConfiguration {
    /** Questions that MUST be answered before proceeding */
    required: ConfigurationQuestion[];
    /** Questions with sensible defaults */
    optional: ConfigurationQuestion[];
    /** Assumptions the agent is making */
    assumptions: string[];
    /** Suggested defaults if user chooses to proceed */
    suggestedDefaults: Record<string, unknown>;
}

export interface ConfigurationQuestion {
    id: string;
    question: string;
    type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
    options?: string[];  // For select/multiselect
    default?: unknown;
    required: boolean;
}

export interface TaskType {
    id: string;
    name: string;
    description: string;
    category: string;
    configurationTemplate: TaskConfiguration;
}

// =============================================================================
// TASK TYPE DEFINITIONS
// =============================================================================

export const TASK_TYPES: TaskType[] = [
    // Competitor Monitoring
    {
        id: 'competitor_monitor',
        name: 'Competitor Price Monitoring',
        description: 'Track competitor pricing and alert on changes',
        category: 'intelligence',
        configurationTemplate: {
            required: [
                {
                    id: 'competitors',
                    question: 'Which competitors should I monitor?',
                    type: 'text',
                    required: true,
                },
                {
                    id: 'products',
                    question: 'What products/services should I track?',
                    type: 'text',
                    required: true,
                },
                {
                    id: 'alert_threshold',
                    question: 'What price change % should trigger an alert?',
                    type: 'number',
                    default: 10,
                    required: true,
                },
            ],
            optional: [
                {
                    id: 'data_source',
                    question: 'Where do I find their pricing? (websites/APIs)',
                    type: 'text',
                    required: false,
                },
                {
                    id: 'frequency',
                    question: 'How often should I check?',
                    type: 'select',
                    options: ['hourly', 'daily', 'weekly'],
                    default: 'daily',
                    required: false,
                },
                {
                    id: 'alert_method',
                    question: 'How should I alert you?',
                    type: 'multiselect',
                    options: ['email', 'slack', 'sms', 'in-app'],
                    default: ['email'],
                    required: false,
                },
            ],
            assumptions: [
                'I will scrape publicly available pricing data',
                'Alerts will be sent immediately when threshold is exceeded',
                'Historical data will be stored for trend analysis',
            ],
            suggestedDefaults: {
                frequency: 'daily',
                alert_threshold: 10,
                alert_method: ['email'],
            },
        },
    },
    // Email Campaign
    {
        id: 'email_campaign',
        name: 'Email Campaign',
        description: 'Create and send email campaigns',
        category: 'marketing',
        configurationTemplate: {
            required: [
                {
                    id: 'audience',
                    question: 'Who should receive this email?',
                    type: 'select',
                    options: ['all_customers', 'active_customers', 'inactive_customers', 'vip', 'custom_segment'],
                    required: true,
                },
                {
                    id: 'purpose',
                    question: 'What is the purpose of this email?',
                    type: 'text',
                    required: true,
                },
            ],
            optional: [
                {
                    id: 'send_time',
                    question: 'When should I send it?',
                    type: 'text',
                    default: 'immediately',
                    required: false,
                },
                {
                    id: 'variations',
                    question: 'Should I create A/B test variations?',
                    type: 'boolean',
                    default: false,
                    required: false,
                },
            ],
            assumptions: [
                'Email will be reviewed before sending',
                'Unsubscribed users will be excluded',
                'Open/click tracking will be enabled',
            ],
            suggestedDefaults: {
                send_time: 'immediately',
                variations: false,
            },
        },
    },
    // Playbook Creation
    {
        id: 'playbook_create',
        name: 'Create Automation Playbook',
        description: 'Set up a recurring automation workflow',
        category: 'automation',
        configurationTemplate: {
            required: [
                {
                    id: 'playbook_name',
                    question: 'What should I call this playbook?',
                    type: 'text',
                    required: true,
                },
                {
                    id: 'trigger',
                    question: 'When should this run?',
                    type: 'text',
                    required: true,
                },
                {
                    id: 'actions',
                    question: 'What actions should it perform?',
                    type: 'text',
                    required: true,
                },
            ],
            optional: [
                {
                    id: 'notifications',
                    question: 'Should I notify you when it runs?',
                    type: 'boolean',
                    default: true,
                    required: false,
                },
                {
                    id: 'approval_required',
                    question: 'Should actions require your approval?',
                    type: 'boolean',
                    default: false,
                    required: false,
                },
            ],
            assumptions: [
                'Playbook will be saved and can be edited later',
                'You can pause or delete the playbook at any time',
                'Execution logs will be available for review',
            ],
            suggestedDefaults: {
                notifications: true,
                approval_required: false,
            },
        },
    },
];

// =============================================================================
// DISCOVERY FUNCTIONS
// =============================================================================

/**
 * Get task type definition
 */
export function getTaskType(taskTypeId: string): TaskType | undefined {
    return TASK_TYPES.find(t => t.id === taskTypeId);
}

/**
 * Detect task type from prompt
 */
export function detectTaskType(prompt: string): TaskType | null {
    const lowerPrompt = prompt.toLowerCase();
    
    // Competitor monitoring patterns
    if (
        lowerPrompt.includes('competitor') ||
        lowerPrompt.includes('monitor') ||
        lowerPrompt.includes('track') && lowerPrompt.includes('pric')
    ) {
        return TASK_TYPES.find(t => t.id === 'competitor_monitor') || null;
    }
    
    // Email campaign patterns
    if (
        lowerPrompt.includes('email') ||
        lowerPrompt.includes('campaign') ||
        lowerPrompt.includes('newsletter')
    ) {
        return TASK_TYPES.find(t => t.id === 'email_campaign') || null;
    }
    
    // Playbook patterns
    if (
        lowerPrompt.includes('playbook') ||
        lowerPrompt.includes('automat') ||
        lowerPrompt.includes('recurring') ||
        lowerPrompt.includes('schedule')
    ) {
        return TASK_TYPES.find(t => t.id === 'playbook_create') || null;
    }
    
    return null;
}

/**
 * Format configuration checklist for display
 */
export function formatConfigurationChecklist(config: TaskConfiguration): string {
    let output = '🎯 **To set up this task, I need to understand:**\n\n';
    
    // Required questions
    config.required.forEach((q, i) => {
        output += `${i + 1}. ${q.question}\n`;
    });
    
    // Optional questions
    if (config.optional.length > 0) {
        output += '\n**Optional (I can use defaults):**\n';
        config.optional.forEach((q, i) => {
            const defaultText = q.default ? ` (default: ${q.default})` : '';
            output += `${config.required.length + i + 1}. ${q.question}${defaultText}\n`;
        });
    }
    
    // Assumptions
    if (config.assumptions.length > 0) {
        output += '\n**My assumptions:**\n';
        config.assumptions.forEach(a => {
            output += `• ${a}\n`;
        });
    }
    
    output += '\nPlease provide these details, or I can start with defaults and you can refine later.';
    
    return output;
}

/**
 * Check if a task is complex enough to require discovery-first
 */
export function requiresDiscoveryFirst(prompt: string): boolean {
    const complexIndicators = [
        'monitor', 'track', 'alert', 'notify',
        'recurring', 'schedule', 'automate', 'playbook',
        'campaign', 'sequence', 'workflow',
        'all', 'every', 'competitors', 'customers',
        'compare', 'analyze', 'report',
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    const matchCount = complexIndicators.filter(i => lowerPrompt.includes(i)).length;
    
    // If 2+ complex indicators, use discovery-first
    return matchCount >= 2;
}
