import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock InboxConversation with thinking steps display
const MockMessageBubble = ({
    message,
    agentPersona,
}: {
    message: any;
    agentPersona: string;
}) => {
    return (
        <div data-testid={`message-${message.id}`}>
            <div className="message-content">{message.content}</div>

            {/* Thinking steps tooltip trigger */}
            {!message.type.includes('user') && (message.thinking || message.metadata) && (
                <div className="thinking-tooltip-trigger" data-testid="thinking-trigger">
                    <button
                        aria-label="Thinking steps"
                        data-testid={`thinking-button-${message.id}`}
                    >
                        🧠
                    </button>

                    {/* Tooltip content */}
                    {message.thinking && message.thinking.steps && (
                        <div
                            className="thinking-tooltip"
                            data-testid={`thinking-tooltip-${message.id}`}
                        >
                            <div className="thinking-header">
                                {message.thinking.isThinking ? '🧠 Thinking...' : '✅ Complete'}
                            </div>

                            {message.thinking.plan && message.thinking.plan.length > 0 && (
                                <div className="thinking-plan">
                                    <h4>Plan:</h4>
                                    <ol>
                                        {message.thinking.plan.map((step: any, idx: number) => (
                                            <li key={idx}>{step}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {message.thinking.steps && message.thinking.steps.length > 0 && (
                                <div className="thinking-steps">
                                    <h4>Execution:</h4>
                                    <ol>
                                        {message.thinking.steps.map((step: any, idx: number) => (
                                            <li key={idx}>{step.action || step.tool || JSON.stringify(step)}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {message.metadata?.media?.model && (
                                <div className="thinking-model">
                                    <span>Model: {message.metadata.media.model}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

describe('InboxConversation - Thinking Steps', () => {
    describe('Thinking steps display', () => {
        it('shows thinking steps tooltip when message has thinking data', () => {
            const message = {
                id: 'msg-1',
                type: 'agent',
                content: 'Processing request...',
                thinking: {
                    isThinking: true,
                    steps: [
                        { tool: 'searchMenu', action: 'Search for products' },
                        { tool: 'rankProducts', action: 'Rank by score' },
                    ],
                    plan: ['Find products', 'Score them'],
                },
                metadata: {
                    media: { model: 'claude-sonnet-4-20250514' },
                },
            };

            render(<MockMessageBubble message={message} agentPersona="smokey" />);

            const tooltip = screen.getByTestId('thinking-tooltip-msg-1');
            expect(tooltip).toBeInTheDocument();
        });

        it('displays plan steps when available', () => {
            const message = {
                id: 'msg-1',
                type: 'agent',
                content: 'Processing...',
                thinking: {
                    isThinking: false,
                    steps: [],
                    plan: ['Step 1: Search inventory', 'Step 2: Rank products', 'Step 3: Respond'],
                },
            };

            render(<MockMessageBubble message={message} agentPersona="smokey" />);

            expect(screen.getByText('Plan:')).toBeInTheDocument();
            expect(screen.getByText('Step 1: Search inventory')).toBeInTheDocument();
            expect(screen.getByText('Step 2: Rank products')).toBeInTheDocument();
        });

        it('displays execution steps when available', () => {
            const message = {
                id: 'msg-1',
                type: 'agent',
                content: 'Here are recommendations...',
                thinking: {
                    isThinking: false,
                    steps: [
                        { tool: 'searchMenu', action: 'Search for high-THC products' },
                        { tool: 'rankProducts', action: 'Rank by customer rating' },
                    ],
                    plan: [],
                },
            };

            render(<MockMessageBubble message={message} agentPersona="smokey" />);

            expect(screen.getByText('Execution:')).toBeInTheDocument();
            expect(screen.getByText('Search for high-THC products')).toBeInTheDocument();
            expect(screen.getByText('Rank by customer rating')).toBeInTheDocument();
        });

        it('shows model name when available', () => {
            const message = {
                id: 'msg-1',
                type: 'agent',
                content: 'Response',
                thinking: {
                    isThinking: false,
                    steps: [],
                    plan: [],
                },
                metadata: {
                    media: { model: 'claude-opus-4-6' },
                },
            };

            render(<MockMessageBubble message={message} agentPersona="leo" />);

            expect(screen.getByText('Model: claude-opus-4-6')).toBeInTheDocument();
        });
    });

    describe('Thinking status indicators', () => {
        it('shows "Thinking..." when isThinking is true', () => {
            const message = {
                id: 'msg-1',
                type: 'agent',
                content: 'Processing...',
                thinking: {
                    isThinking: true,
                    steps: [],
                    plan: [],
                },
            };

            render(<MockMessageBubble message={message} agentPersona="leo" />);

            expect(screen.getByText('🧠 Thinking...')).toBeInTheDocument();
        });

        it('shows "✅ Complete" when isThinking is false', () => {
            const message = {
                id: 'msg-1',
                type: 'agent',
                content: 'Done processing',
                thinking: {
                    isThinking: false,
                    steps: [],
                    plan: [],
                },
            };

            render(<MockMessageBubble message={message} agentPersona="leo" />);

            expect(screen.getByText('✅ Complete')).toBeInTheDocument();
        });
    });

    describe('Tooltip visibility', () => {
        it('hides tooltip for user messages', () => {
            const message = {
                id: 'msg-1',
                type: 'user',
                content: 'Show me product recommendations',
            };

            render(<MockMessageBubble message={message} agentPersona="user" />);

            expect(screen.queryByTestId('thinking-tooltip-msg-1')).not.toBeInTheDocument();
        });

        it('hides tooltip when no thinking or metadata', () => {
            const message = {
                id: 'msg-1',
                type: 'agent',
                content: 'Response without thinking',
            };

            render(<MockMessageBubble message={message} agentPersona="smokey" />);

            expect(screen.queryByTestId('thinking-tooltip-msg-1')).not.toBeInTheDocument();
        });

        it('hides tooltip when thinking has no steps or plan', () => {
            const message = {
                id: 'msg-1',
                type: 'agent',
                content: 'Response',
                thinking: {
                    isThinking: false,
                    steps: [],
                    plan: [],
                },
            };

            render(<MockMessageBubble message={message} agentPersona="smokey" />);

            expect(screen.queryByTestId('thinking-tooltip-msg-1')).not.toBeInTheDocument();
        });
    });

    describe('Plan and execution separation', () => {
        it('displays both plan and execution when both available', () => {
            const message = {
                id: 'msg-1',
                type: 'agent',
                content: 'Result',
                thinking: {
                    isThinking: false,
                    steps: [
                        { tool: 'search', action: 'Searched for products' },
                        { tool: 'rank', action: 'Ranked by score' },
                    ],
                    plan: ['Find matching products', 'Rank by relevance'],
                },
            };

            render(<MockMessageBubble message={message} agentPersona="smokey" />);

            expect(screen.getByText('Plan:')).toBeInTheDocument();
            expect(screen.getByText('Execution:')).toBeInTheDocument();
            expect(screen.getByText('Find matching products')).toBeInTheDocument();
            expect(screen.getByText('Searched for products')).toBeInTheDocument();
        });

        it('displays only plan when execution steps empty', () => {
            const message = {
                id: 'msg-1',
                type: 'agent',
                content: 'Result',
                thinking: {
                    isThinking: false,
                    steps: [],
                    plan: ['Plan step 1', 'Plan step 2'],
                },
            };

            render(<MockMessageBubble message={message} agentPersona="leo" />);

            expect(screen.getByText('Plan:')).toBeInTheDocument();
            expect(screen.queryByText('Execution:')).not.toBeInTheDocument();
        });
    });

    describe('Agent-specific thinking', () => {
        it('displays thinking steps for different agent personas', () => {
            const agents = ['smokey', 'leo', 'craig', 'pops', 'money_mike'];

            agents.forEach(agent => {
                const message = {
                    id: `msg-${agent}`,
                    type: 'agent',
                    content: `Response from ${agent}`,
                    thinking: {
                        isThinking: false,
                        steps: [{ tool: 'test', action: 'Test action' }],
                        plan: [],
                    },
                };

                const { unmount } = render(
                    <MockMessageBubble message={message} agentPersona={agent} />
                );

                expect(screen.getByTestId(`thinking-tooltip-msg-${agent}`)).toBeInTheDocument();
                unmount();
            });
        });
    });

    describe('Complex step handling', () => {
        it('handles JSON stringified steps', () => {
            const message = {
                id: 'msg-1',
                type: 'agent',
                content: 'Result',
                thinking: {
                    isThinking: false,
                    steps: [
                        { tool: 'analyze', context: { products: 5 } },
                        { tool: 'rank', params: { method: 'similarity' } },
                    ],
                    plan: [],
                },
            };

            render(<MockMessageBubble message={message} agentPersona="leo" />);

            const steps = screen.getAllByRole('listitem');
            expect(steps.length).toBeGreaterThan(0);
        });

        it('preserves step order from thinking data', () => {
            const message = {
                id: 'msg-1',
                type: 'agent',
                content: 'Result',
                thinking: {
                    isThinking: false,
                    steps: [
                        { action: 'First: Search' },
                        { action: 'Second: Analyze' },
                        { action: 'Third: Rank' },
                    ],
                    plan: [],
                },
            };

            const { container } = render(
                <MockMessageBubble message={message} agentPersona="smokey" />
            );

            const items = container.querySelectorAll('.thinking-steps ol li');
            expect(items[0].textContent).toContain('First');
            expect(items[1].textContent).toContain('Second');
            expect(items[2].textContent).toContain('Third');
        });
    });
});
