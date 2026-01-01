
import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatMessages from '../chat-messages';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('lucide-react', () => ({
    Bot: () => <div data-testid="bot-icon">Bot</div>,
    Share2: () => <div data-testid="share-icon">Share</div>,
    ThumbsDown: () => <div data-testid="thumbs-down-icon">ThumbsDown</div>,
    ThumbsUp: () => <div data-testid="thumbs-up-icon">ThumbsUp</div>,
    ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
    Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>,
    Check: () => <div data-testid="check-icon">Check</div>,
    Copy: () => <div data-testid="copy-icon">Copy</div>,
    Terminal: () => <div data-testid="terminal-icon">Terminal</div>,
}));

// Mock ReactMarkdown to verify custom component injection
jest.mock('react-markdown', () => ({
    __esModule: true,
    default: ({ children, components }: any) => {
        return (
            <div data-testid="react-markdown">
                {/* Render the text content slightly processed to allow partial matching or just raw */}
                <div data-testid="md-content">{children}</div>
                
                {/* 
                  Manually invoke the 'code' component to simulate a code block being rendered.
                  This verifies that ChatMessages passes a custom 'code' renderer that uses CodeBlock.
                */}
                {components?.code && components.code({
                    node: {},
                    inline: false,
                    className: 'language-javascript',
                    children: 'console.log("test");' // Matches what we expect in the test expectation
                })}
            </div>
        );
    },
}));

jest.mock('remark-gfm', () => () => {});

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, title, ...props }: any) => (
        <button onClick={onClick} title={title} {...props}>
            {children}
        </button>
    ),
}));

jest.mock('@/components/ui/avatar', () => ({
    Avatar: ({ children, className }: any) => <div className={className}>{children}</div>,
    AvatarFallback: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
    ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

// Mock useToast
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

// Mock CodeBlock to verify it's used
jest.mock('@/components/ui/code-block', () => ({
    CodeBlock: ({ language, value }: any) => (
        <div data-testid="code-block" data-language={language}>
            {value}
        </div>
    ),
}));

describe('ChatMessages', () => {
    const mockMessagesEndRef = { current: null };
    const mockOnAskSmokey = jest.fn();
    const mockOnAddToCart = jest.fn();
    const mockOnFeedback = jest.fn();

    it('renders user message as plain text', () => {
        const messages = [
            {
                id: 1,
                text: 'Hello world',
                sender: 'user',
            }
        ];

        render(
            <ChatMessages
                messages={messages as any}
                isBotTyping={false}
                messagesEndRef={mockMessagesEndRef}
                onAskSmokey={mockOnAskSmokey}
                onAddToCart={mockOnAddToCart}
                onFeedback={mockOnFeedback}
            />
        );

        expect(screen.getByText('Hello world')).toBeInTheDocument();
        // Should NOT render code block
        expect(screen.queryByTestId('code-block')).not.toBeInTheDocument();
    });

    it('renders bot message with markdown and code block', () => {
        const messages = [
            {
                id: 2,
                text: 'Here is code:\n```javascript\nconsole.log("test");\n```',
                sender: 'bot',
            }
        ];

        render(
            <ChatMessages
                messages={messages as any}
                isBotTyping={false}
                messagesEndRef={mockMessagesEndRef}
                onAskSmokey={mockOnAskSmokey}
                onAddToCart={mockOnAddToCart}
                onFeedback={mockOnFeedback}
            />
        );

        // Check for Markdown text parts
        expect(screen.getByText(/Here is code:/)).toBeInTheDocument();
        // Check for CodeBlock usage
        const codeBlock = screen.getByTestId('code-block');
        expect(codeBlock).toBeInTheDocument();
        expect(codeBlock).toHaveAttribute('data-language', 'javascript');
        expect(codeBlock).toHaveTextContent('console.log("test");');
    });
});
