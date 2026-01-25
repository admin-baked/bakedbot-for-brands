/**
 * InboxTaskFeed Component Tests
 *
 * Tests for the real-time agent activity visualization component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { InboxTaskFeed, AGENT_PULSE_CONFIG } from '@/components/inbox/inbox-task-feed';
import type { Thought } from '@/hooks/use-job-poller';
import '@testing-library/jest-dom';

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Utils
jest.mock('@/lib/utils', () => ({
    cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Loader2: () => <div data-testid="loader-icon" />,
    CheckCircle2: () => <div data-testid="check-icon" />,
    AlertCircle: () => <div data-testid="alert-icon" />,
    Clock: () => <div data-testid="clock-icon" />,
}));

// Mock ShadCN UI components
jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
    CardContent: ({ children, className }: any) => <div data-testid="card-content" className={className}>{children}</div>,
    CardHeader: ({ children, className }: any) => <div data-testid="card-header" className={className}>{children}</div>,
    CardTitle: ({ children, className }: any) => <div data-testid="card-title" className={className}>{children}</div>,
}));

jest.mock('@/components/ui/avatar', () => ({
    Avatar: ({ children, className }: any) => <div data-testid="avatar" className={className}>{children}</div>,
    AvatarFallback: ({ children, className }: any) => <span data-testid="avatar-fallback" className={className}>{children}</span>,
}));

jest.mock('@/components/ui/progress', () => ({
    Progress: ({ value, className }: any) => <div data-testid="progress-bar" data-value={value} className={className} />,
}));

describe('InboxTaskFeed', () => {
    const mockThoughts: Thought[] = [
        { id: '1', title: 'Analyzing product data', status: 'completed', durationMs: 1500 },
        { id: '2', title: 'Generating recommendations', status: 'completed', durationMs: 2000 },
        { id: '3', title: 'Checking compliance', status: 'in-progress', durationMs: undefined },
    ];

    describe('Agent Persona Rendering', () => {
        it('renders Smokey agent with correct name and avatar', () => {
            render(<InboxTaskFeed agentPersona="smokey" />);
            expect(screen.getByText('Smokey')).toBeInTheDocument();
            expect(screen.getByText('🌿')).toBeInTheDocument();
        });

        it('renders Money Mike agent with correct name and avatar', () => {
            render(<InboxTaskFeed agentPersona="money_mike" />);
            expect(screen.getByText('Money Mike')).toBeInTheDocument();
            expect(screen.getByText('💰')).toBeInTheDocument();
        });

        it('renders Craig agent with correct name and avatar', () => {
            render(<InboxTaskFeed agentPersona="craig" />);
            expect(screen.getByText('Craig')).toBeInTheDocument();
            expect(screen.getByText('📣')).toBeInTheDocument();
        });

        it('renders Ezal agent with correct name and avatar', () => {
            render(<InboxTaskFeed agentPersona="ezal" />);
            expect(screen.getByText('Ezal')).toBeInTheDocument();
            expect(screen.getByText('🔍')).toBeInTheDocument();
        });

        it('renders Deebo agent with correct name and avatar', () => {
            render(<InboxTaskFeed agentPersona="deebo" />);
            expect(screen.getByText('Deebo')).toBeInTheDocument();
            expect(screen.getByText('🛡️')).toBeInTheDocument();
        });

        it('renders auto persona as Assistant', () => {
            render(<InboxTaskFeed agentPersona="auto" />);
            expect(screen.getByText('Assistant')).toBeInTheDocument();
            expect(screen.getByText('🤖')).toBeInTheDocument();
        });
    });

    describe('AGENT_PULSE_CONFIG', () => {
        it('contains all required agents', () => {
            const requiredAgents = [
                'smokey', 'money_mike', 'craig', 'ezal', 'deebo', 'pops',
                'day_day', 'mrs_parker', 'big_worm', 'roach',
                'leo', 'jack', 'linus', 'glenda', 'mike', 'auto'
            ];

            requiredAgents.forEach(agent => {
                expect(AGENT_PULSE_CONFIG).toHaveProperty(agent);
                expect(AGENT_PULSE_CONFIG[agent as keyof typeof AGENT_PULSE_CONFIG]).toHaveProperty('name');
                expect(AGENT_PULSE_CONFIG[agent as keyof typeof AGENT_PULSE_CONFIG]).toHaveProperty('avatar');
                expect(AGENT_PULSE_CONFIG[agent as keyof typeof AGENT_PULSE_CONFIG]).toHaveProperty('color');
                expect(AGENT_PULSE_CONFIG[agent as keyof typeof AGENT_PULSE_CONFIG]).toHaveProperty('bgColor');
                expect(AGENT_PULSE_CONFIG[agent as keyof typeof AGENT_PULSE_CONFIG]).toHaveProperty('textColor');
            });
        });

        it('has unique colors for each agent category', () => {
            // Field agents should have unique colors
            expect(AGENT_PULSE_CONFIG.smokey.color).toBe('bg-emerald-500');
            expect(AGENT_PULSE_CONFIG.money_mike.color).toBe('bg-amber-500');
            expect(AGENT_PULSE_CONFIG.craig.color).toBe('bg-blue-500');
            expect(AGENT_PULSE_CONFIG.ezal.color).toBe('bg-purple-500');
            expect(AGENT_PULSE_CONFIG.deebo.color).toBe('bg-red-500');
        });
    });

    describe('Activity States', () => {
        it('shows loader icon when running', () => {
            render(<InboxTaskFeed agentPersona="smokey" isRunning={true} />);
            expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
        });

        it('hides loader icon when not running', () => {
            render(<InboxTaskFeed agentPersona="smokey" isRunning={false} />);
            expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
        });

        it('shows live indicator', () => {
            render(<InboxTaskFeed agentPersona="smokey" isRunning={true} />);
            expect(screen.getByText('Live')).toBeInTheDocument();
        });
    });

    describe('Custom Actions', () => {
        it('displays custom action text', () => {
            render(<InboxTaskFeed agentPersona="smokey" currentAction="Scanning inventory levels..." />);
            expect(screen.getByText('Scanning inventory levels...')).toBeInTheDocument();
        });

        it('displays default action when no custom action provided', () => {
            render(<InboxTaskFeed agentPersona="smokey" />);
            expect(screen.getByText('Analyzing product recommendations...')).toBeInTheDocument();
        });

        it('displays correct default action for Deebo', () => {
            render(<InboxTaskFeed agentPersona="deebo" />);
            expect(screen.getByText('Checking compliance requirements...')).toBeInTheDocument();
        });

        it('displays correct default action for Craig', () => {
            render(<InboxTaskFeed agentPersona="craig" />);
            expect(screen.getByText('Drafting marketing content...')).toBeInTheDocument();
        });
    });

    describe('Progress Bar', () => {
        it('shows progress bar when progress is provided', () => {
            render(<InboxTaskFeed agentPersona="smokey" progress={75} />);
            const progressBar = screen.getByTestId('progress-bar');
            expect(progressBar).toBeInTheDocument();
            expect(progressBar).toHaveAttribute('data-value', '75');
        });

        it('shows progress percentage text', () => {
            render(<InboxTaskFeed agentPersona="smokey" progress={50} />);
            expect(screen.getByText('50%')).toBeInTheDocument();
        });

        it('hides progress bar when progress is undefined', () => {
            render(<InboxTaskFeed agentPersona="smokey" />);
            expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
        });
    });

    describe('Thought Stream', () => {
        it('renders thought items when provided', () => {
            render(<InboxTaskFeed agentPersona="smokey" thoughts={mockThoughts} />);
            expect(screen.getByText('Analyzing product data')).toBeInTheDocument();
            expect(screen.getByText('Generating recommendations')).toBeInTheDocument();
        });

        it('displays thought duration when available', () => {
            render(<InboxTaskFeed agentPersona="smokey" thoughts={mockThoughts} />);
            expect(screen.getByText('1.5s')).toBeInTheDocument();
            expect(screen.getByText('2.0s')).toBeInTheDocument();
        });

        it('limits displayed thoughts to last 5', () => {
            const manyThoughts: Thought[] = Array.from({ length: 10 }, (_, i) => ({
                id: `thought_${i}`,
                title: `Thought ${i + 1}`,
                status: 'completed' as const,
                durationMs: 1000,
            }));

            render(<InboxTaskFeed agentPersona="smokey" thoughts={manyThoughts} />);

            // Should show thoughts 6-10 (last 5)
            expect(screen.queryByText('Thought 1')).not.toBeInTheDocument();
            expect(screen.getByText('Thought 6')).toBeInTheDocument();
            expect(screen.getByText('Thought 10')).toBeInTheDocument();
        });

        it('does not render thought section when no thoughts', () => {
            const { container } = render(<InboxTaskFeed agentPersona="smokey" thoughts={[]} />);
            expect(container.querySelector('.border-t')).not.toBeInTheDocument();
        });
    });

    describe('Card Structure', () => {
        it('renders card container', () => {
            render(<InboxTaskFeed agentPersona="smokey" />);
            expect(screen.getByTestId('card')).toBeInTheDocument();
        });

        it('renders Task Feed title', () => {
            render(<InboxTaskFeed agentPersona="smokey" />);
            expect(screen.getByText('Task Feed')).toBeInTheDocument();
        });

        it('applies custom className', () => {
            render(<InboxTaskFeed agentPersona="smokey" className="custom-class" />);
            const card = screen.getByTestId('card');
            expect(card.className).toContain('custom-class');
        });
    });
});
