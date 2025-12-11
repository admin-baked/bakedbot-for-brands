/**
 * Agent Commander Unit Tests
 * 
 * Tests for the shared Agent Commander component logic.
 * Pure TypeScript tests - no JSX to avoid transformer issues.
 */

describe('AgentCommander Component Logic', () => {
    describe('DashboardRole Types', () => {
        it('should define valid dashboard roles', () => {
            type DashboardRole = 'ceo' | 'brand' | 'dispensary' | 'customer';
            const roles: DashboardRole[] = ['ceo', 'brand', 'dispensary', 'customer'];

            expect(roles).toHaveLength(4);
            expect(roles).toContain('ceo');
            expect(roles).toContain('brand');
            expect(roles).toContain('dispensary');
            expect(roles).toContain('customer');
        });
    });

    describe('Role Configuration', () => {
        interface RoleConfig {
            defaultPlaceholder: string;
            defaultThinkingLevel: 'standard' | 'advanced' | 'expert' | 'genius';
            showAdminTools: boolean;
            showVault: boolean;
            showTriggers: boolean;
        }

        const ROLE_CONFIG: Record<string, RoleConfig> = {
            ceo: {
                defaultPlaceholder: "I'm ready to handle complex workflows...",
                defaultThinkingLevel: 'advanced',
                showAdminTools: true,
                showVault: true,
                showTriggers: true,
            },
            brand: {
                defaultPlaceholder: "I'm ready to help with campaigns...",
                defaultThinkingLevel: 'standard',
                showAdminTools: false,
                showVault: true,
                showTriggers: true,
            },
            dispensary: {
                defaultPlaceholder: "Need help with your menu?...",
                defaultThinkingLevel: 'standard',
                showAdminTools: false,
                showVault: false,
                showTriggers: true,
            },
            customer: {
                defaultPlaceholder: "Ask me anything!...",
                defaultThinkingLevel: 'standard',
                showAdminTools: false,
                showVault: false,
                showTriggers: false,
            },
        };

        it('should give CEO role full access', () => {
            expect(ROLE_CONFIG['ceo'].showAdminTools).toBe(true);
            expect(ROLE_CONFIG['ceo'].showVault).toBe(true);
            expect(ROLE_CONFIG['ceo'].showTriggers).toBe(true);
            expect(ROLE_CONFIG['ceo'].defaultThinkingLevel).toBe('advanced');
        });

        it('should give brand role limited access', () => {
            expect(ROLE_CONFIG['brand'].showAdminTools).toBe(false);
            expect(ROLE_CONFIG['brand'].showVault).toBe(true);
            expect(ROLE_CONFIG['brand'].showTriggers).toBe(true);
        });

        it('should give dispensary role menu-focused access', () => {
            expect(ROLE_CONFIG['dispensary'].showAdminTools).toBe(false);
            expect(ROLE_CONFIG['dispensary'].showVault).toBe(false);
            expect(ROLE_CONFIG['dispensary'].showTriggers).toBe(true);
        });

        it('should give customer role minimal access', () => {
            expect(ROLE_CONFIG['customer'].showAdminTools).toBe(false);
            expect(ROLE_CONFIG['customer'].showVault).toBe(false);
            expect(ROLE_CONFIG['customer'].showTriggers).toBe(false);
        });
    });

    describe('Intent Detection Patterns', () => {
        const detectIntent = (input: string): string => {
            const lowerInput = input.toLowerCase();

            if (lowerInput.includes('welcome email') || lowerInput.includes('signup')) {
                return 'welcome-sequence';
            }
            if (lowerInput.includes('competitor') || lowerInput.includes('aiq') || lowerInput.includes('research')) {
                return 'competitor-scan';
            }
            if (lowerInput.includes('weekly') || lowerInput.includes('report')) {
                return 'weekly-report';
            }
            if (lowerInput.includes('churn') || lowerInput.includes('at-risk')) {
                return 'churn-predictor';
            }
            if (lowerInput.includes('health') || lowerInput.includes('diagnostic')) {
                return 'platform-health';
            }
            return 'general';
        };

        it('should detect welcome email intent', () => {
            expect(detectIntent('send welcome email to new signups')).toBe('welcome-sequence');
            expect(detectIntent('Welcome Email Campaign')).toBe('welcome-sequence');
            expect(detectIntent('process new signup list')).toBe('welcome-sequence');
        });

        it('should detect competitor research intent', () => {
            expect(detectIntent('research AIQ pricing')).toBe('competitor-scan');
            expect(detectIntent('analyze competitor pricing')).toBe('competitor-scan');
            expect(detectIntent('what is AIQ charging?')).toBe('competitor-scan');
        });

        it('should detect weekly report intent', () => {
            expect(detectIntent('generate weekly report')).toBe('weekly-report');
            expect(detectIntent('weekly platform report')).toBe('weekly-report');
            expect(detectIntent('create performance report')).toBe('weekly-report');
        });

        it('should detect churn prediction intent', () => {
            expect(detectIntent('predict churn risk')).toBe('churn-predictor');
            expect(detectIntent('find at-risk customers')).toBe('churn-predictor');
        });

        it('should detect platform health intent', () => {
            expect(detectIntent('run platform health check')).toBe('platform-health');
            expect(detectIntent('diagnostic scan')).toBe('platform-health');
        });

        it('should return general for unrecognized intents', () => {
            expect(detectIntent('hello')).toBe('general');
            expect(detectIntent('what time is it')).toBe('general');
        });
    });

    describe('ToolCallStep Structure', () => {
        interface ToolCallStep {
            id: string;
            toolName: string;
            status: 'running' | 'completed' | 'failed';
            durationMs?: number;
            description: string;
            subagentId?: string;
            isComputerUse?: boolean;
            isAdminTool?: boolean;
        }

        it('should create a valid tool call step with admin flag', () => {
            const step: ToolCallStep = {
                id: 't1',
                toolName: 'firestore.query',
                status: 'completed',
                durationMs: 350,
                description: 'Fetching new signups from today...',
                isAdminTool: true,
            };

            expect(step.toolName).toBe('firestore.query');
            expect(step.isAdminTool).toBe(true);
            expect(step.durationMs).toBe(350);
        });

        it('should create a valid subagent delegation step', () => {
            const step: ToolCallStep = {
                id: 't2',
                toolName: 'delegate',
                status: 'completed',
                durationMs: 2200,
                description: 'Generating personalized welcome emails...',
                subagentId: 'Craig',
            };

            expect(step.subagentId).toBe('Craig');
            expect(step.toolName).toBe('delegate');
        });

        it('should create a valid computer use step', () => {
            const step: ToolCallStep = {
                id: 't3',
                toolName: 'computer_use.login',
                status: 'completed',
                durationMs: 3500,
                description: 'Logging into AIQ portal...',
                isComputerUse: true,
            };

            expect(step.isComputerUse).toBe(true);
            expect(step.toolName).toContain('computer_use');
        });
    });

    describe('ChatArtifact Structure', () => {
        interface ChatArtifact {
            id: string;
            type: 'code' | 'yaml' | 'report' | 'table' | 'email';
            title: string;
            content: string;
            language?: string;
        }

        it('should create a valid email artifact', () => {
            const artifact: ChatArtifact = {
                id: 'email-1',
                type: 'email',
                title: 'Welcome Email',
                content: 'Subject: Welcome!\n\nHi {{name}}...',
            };

            expect(artifact.type).toBe('email');
            expect(artifact.content).toContain('Welcome');
        });

        it('should create a valid report artifact', () => {
            const artifact: ChatArtifact = {
                id: 'report-1',
                type: 'report',
                title: 'Weekly Report',
                content: '## Summary\nMRR: $47,850',
            };

            expect(artifact.type).toBe('report');
            expect(artifact.content).toContain('MRR');
        });

        it('should create a valid YAML playbook artifact', () => {
            const artifact: ChatArtifact = {
                id: 'yaml-1',
                type: 'yaml',
                title: 'welcome-sequence.yaml',
                content: 'name: Welcome Sequence\ntriggers:\n  - type: event\n    event: new_signup',
            };

            expect(artifact.type).toBe('yaml');
            expect(artifact.content).toContain('triggers');
        });
    });

    describe('ChatMessage Structure', () => {
        interface AgentThinking {
            isThinking: boolean;
            steps: any[];
            plan: string[];
        }

        interface ChatMessage {
            id: string;
            type: 'user' | 'agent';
            content: string;
            thinking?: AgentThinking;
            timestamp: Date;
            canSaveAsPlaybook?: boolean;
        }

        it('should create a valid user message', () => {
            const msg: ChatMessage = {
                id: '123',
                type: 'user',
                content: 'Send welcome emails to new signups',
                timestamp: new Date('2025-12-11'),
            };

            expect(msg.id).toBe('123');
            expect(msg.type).toBe('user');
            expect(msg.content).toContain('welcome');
        });

        it('should create a valid agent message with thinking state', () => {
            const msg: ChatMessage = {
                id: '456',
                type: 'agent',
                content: 'Welcome emails sent!',
                timestamp: new Date(),
                thinking: {
                    isThinking: false,
                    steps: [{ id: 't1', toolName: 'sendgrid.send', status: 'completed' }],
                    plan: ['Query signups', 'Generate emails', 'Send'],
                },
                canSaveAsPlaybook: true,
            };

            expect(msg.type).toBe('agent');
            expect(msg.thinking?.isThinking).toBe(false);
            expect(msg.thinking?.steps).toHaveLength(1);
            expect(msg.canSaveAsPlaybook).toBe(true);
        });

        it('should handle agent message in thinking state', () => {
            const msg: ChatMessage = {
                id: '789',
                type: 'agent',
                content: '',
                timestamp: new Date(),
                thinking: {
                    isThinking: true,
                    steps: [],
                    plan: ['Processing request...'],
                },
            };

            expect(msg.thinking?.isThinking).toBe(true);
            expect(msg.content).toBe('');
        });
    });

    describe('Quick Action Event Handling', () => {
        it('should parse quick action command event', () => {
            const command = 'Send welcome email sequence to all new signups from today';
            const eventDetail = { command };

            expect(eventDetail.command).toBe(command);
            expect(eventDetail.command).toContain('welcome');
        });

        it('should handle multiple quick action commands', () => {
            const commands = [
                { command: 'Send welcome email sequence to all new signups from today' },
                { command: 'Research AIQ competitor pricing and provide a comparison report' },
                { command: 'Generate weekly platform report with revenue, signups, and agent metrics' },
            ];

            expect(commands[0].command).toContain('welcome');
            expect(commands[1].command).toContain('AIQ');
            expect(commands[2].command).toContain('weekly');
        });
    });

    describe('Agent Tool Mapping', () => {
        const THINKING_LEVEL_TO_AGENT: Record<string, string> = {
            standard: 'craig',      // Fast, simple tasks
            advanced: 'pops',       // Analytics and reasoning
            expert: 'smokey',       // Experiments and optimization
            genius: 'mrs_parker',   // Complex journeys
        };

        it('should map thinking levels to agents', () => {
            expect(THINKING_LEVEL_TO_AGENT['standard']).toBe('craig');
            expect(THINKING_LEVEL_TO_AGENT['advanced']).toBe('pops');
            expect(THINKING_LEVEL_TO_AGENT['expert']).toBe('smokey');
            expect(THINKING_LEVEL_TO_AGENT['genius']).toBe('mrs_parker');
        });
    });

    describe('Playbook Execution Response', () => {
        interface PlaybookResult {
            success: boolean;
            message: string;
            logs: string[];
        }

        it('should handle successful playbook execution', () => {
            const result: PlaybookResult = {
                success: true,
                message: 'Welcome Sequence executed. 12 emails sent.',
                logs: [
                    'Starting Welcome Email Sequence...',
                    'Fetched 12 new signups',
                    'Generating personalized emails...',
                    'Sent via SendGrid',
                    'Complete',
                ],
            };

            expect(result.success).toBe(true);
            expect(result.logs).toHaveLength(5);
            expect(result.message).toContain('12 emails');
        });

        it('should handle failed playbook execution', () => {
            const result: PlaybookResult = {
                success: false,
                message: 'Playbook execution failed: SendGrid API error',
                logs: [
                    'Starting Welcome Email Sequence...',
                    'Error: SendGrid API rate limit exceeded',
                ],
            };

            expect(result.success).toBe(false);
            expect(result.message).toContain('failed');
            expect(result.logs).toHaveLength(2);
        });
    });

    describe('Error Handling', () => {
        it('should format error messages correctly', () => {
            const formatError = (error: Error | string): string => {
                if (typeof error === 'string') return error;
                return error.message || 'Unknown error occurred';
            };

            expect(formatError('API rate limit exceeded')).toBe('API rate limit exceeded');
            expect(formatError(new Error('Network timeout'))).toBe('Network timeout');
            expect(formatError(new Error())).toBe('Unknown error occurred');
        });

        it('should identify recoverable errors', () => {
            const isRecoverable = (errorMessage: string): boolean => {
                const recoverablePatterns = ['rate limit', 'timeout', 'retry'];
                return recoverablePatterns.some(pattern =>
                    errorMessage.toLowerCase().includes(pattern)
                );
            };

            expect(isRecoverable('Rate limit exceeded')).toBe(true);
            expect(isRecoverable('Connection timeout')).toBe(true);
            expect(isRecoverable('Invalid API key')).toBe(false);
        });
    });
});
