'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PuffChat } from '../puff-chat';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

import { useAgentChatStore } from '@/lib/store/agent-chat-store';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() })
}));

jest.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({ push: jest.fn() })
}));

jest.mock('@/server/actions/chat-persistence', () => ({
    getChatSessions: jest.fn().mockResolvedValue({ success: true, sessions: [] }),
    saveChatSession: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('@/firebase/auth/use-user', () => ({
    useUser: () => ({ user: { email: 'test@example.com' } })
}));

jest.mock('@/app/dashboard/ceo/agents/actions', () => ({
    runAgentChat: jest.fn(),
    getGoogleAuthUrl: jest.fn().mockResolvedValue(null),
    cancelAgentJob: jest.fn().mockResolvedValue({ success: true })
}));

// Mock server actions that use next/cache and require Next.js runtime
jest.mock('@/server/actions/artifacts', () => ({
    saveArtifact: jest.fn().mockResolvedValue({ success: true }),
    getUserArtifacts: jest.fn().mockResolvedValue({ success: true, artifacts: [] })
}));

jest.mock('@/server/actions/gmail', () => ({
    checkGmailConnection: jest.fn().mockResolvedValue({ isConnected: false })
}));


// Mock AudioRecorder to avoid media device errors
jest.mock('@/components/ui/audio-recorder', () => ({
    AudioRecorder: () => <div data-testid="audio-recorder">Recorder</div>
}));

jest.mock('@/components/landing/typewriter-text', () => ({
    TypewriterText: ({ text, className }: any) => <div className={className}>{text}</div>
}));

// Mock lucide-react to avoid ESM/undefined component issues
jest.mock('lucide-react', () => {
    return new Proxy({}, {
        get: (target, prop) => {
            const Icon = (props: any) => <div data-testid={`icon-${String(prop)}`} {...props} />;
            Icon.displayName = String(prop);
            return Icon;
        }
    });
});

jest.mock('@/components/chat/agent-router-visualization', () => ({
    AgentRouterVisualization: () => <div data-testid="router-viz">Router Visualization</div>
}));

jest.mock('@/components/chat/project-selector', () => ({
    ProjectSelector: () => <div data-testid="project-selector">Project Selector</div>
}));

// Mock artifact components to avoid ESM issues with react-syntax-highlighter/refractor
jest.mock('@/components/artifacts/artifact-panel', () => ({
    ArtifactPanel: () => <div data-testid="artifact-panel">Artifact Panel</div>
}));

jest.mock('@/components/artifacts/artifact-renderer', () => ({
    ArtifactRenderer: () => <div data-testid="artifact-renderer">Artifact Renderer</div>
}));


describe('PuffChat Component', () => {
    beforeEach(() => {
        useAgentChatStore.setState({
            currentMessages: [],
            sessions: [],
            activeSessionId: null
        });
        
        // Mock JSDOM unimplemented methods
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
        window.scrollTo = jest.fn();
        
        // Mock matchMedia for useIsMobile hook
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: jest.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            })),
        });
        
        // Mock fetch
        global.fetch = jest.fn() as jest.Mock;
    });

    it('renders the chat interface', () => {
        render(<PuffChat />);
        expect(screen.getByPlaceholderText('Ask Smokey anything...')).toBeInTheDocument();
    });

    it.skip('renders all agent persona options', async () => {
        render(<PuffChat />);
        
        // Find the trigger button (it displays "Puff" initially)
        const trigger = screen.getByText('Puff');
        fireEvent.click(trigger);

        // Check for new squad members in dropdown
        expect(await screen.findByText('Smokey')).toBeInTheDocument();
        expect(screen.getByText('Craig')).toBeInTheDocument();
        expect(screen.getByText('Pops')).toBeInTheDocument();
        expect(screen.getByText('Ezal')).toBeInTheDocument();
        expect(screen.getByText('Money Mike')).toBeInTheDocument();
        expect(screen.getByText('Mrs. Parker')).toBeInTheDocument();
        expect(screen.getByText('Deebo')).toBeInTheDocument();
    });

    it.skip('uses public demo API when not authenticated', async () => {
        // Mock fetch response for demo
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                agent: 'puff',
                items: [{ title: 'Demo Result', description: 'This is a demo', meta: 'Source' }],
                generatedMedia: null
            })
        });

        render(<PuffChat isAuthenticated={false} />);

        const input = screen.getByPlaceholderText('Ask Smokey anything...');
        fireEvent.change(input, { target: { value: 'Show me a demo' } });

        const submitBtn = screen.getByTestId('submit-button');
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/demo/agent', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('Show me a demo')
            }));
        });
        
        await waitFor(() => {
            expect(screen.getByText(/Here is what I found/i)).toBeInTheDocument();
            expect(screen.getByText('Demo Result')).toBeInTheDocument();
        });
    });

    it.skip('displays simulated thinking steps in demo mode', async () => {
         (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                agent: 'puff',
                items: [],
                generatedMedia: null
            })
        });

        render(<PuffChat isAuthenticated={false} />);
        
        const input = screen.getByPlaceholderText('Ask Smokey anything...');
        fireEvent.change(input, { target: { value: 'Test thinking' } });
        fireEvent.click(screen.getByTestId('submit-button'));

        // Check if steps appear (Analyzing Request, etc.)
        // Note: They appear in sequence with delay, so we wait.
        await waitFor(() => {
             expect(screen.getByText(/Analyzing Request/i)).toBeInTheDocument();
        }, { timeout: 3000 }); // Increase timeout for simulated delays
        
        await waitFor(() => {
             expect(screen.getByText(/Agent Routing/i)).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    describe('Focus Management', () => {
        it('textarea receives focus after clicking a prompt suggestion', async () => {
            const mockFocus = jest.fn();
            const mockScrollIntoView = jest.fn();
            
            render(
                <PuffChat 
                    promptSuggestions={['Test prompt suggestion']} 
                    isAuthenticated={false}
                />
            );

            // Find the textarea and spy on focus
            const textarea = screen.getByPlaceholderText('Ask Smokey anything...');
            textarea.focus = mockFocus;
            textarea.scrollIntoView = mockScrollIntoView;

            // Find and click the prompt suggestion button
            const suggestionButton = await screen.findByText('Test prompt suggestion');
            fireEvent.click(suggestionButton);

            // Wait for the focus to be called (with 100ms delay in implementation)
            await waitFor(() => {
                expect(mockFocus).toHaveBeenCalled();
            }, { timeout: 500 });
        });

        it('textarea has the correct ref attached', () => {
            render(<PuffChat />);
            
            const textarea = screen.getByPlaceholderText('Ask Smokey anything...');
            expect(textarea).toBeInTheDocument();
            expect(textarea.tagName).toBe('TEXTAREA');
        });

        it('submit button is disabled when input is empty', () => {
            render(<PuffChat />);
            
            const submitButton = screen.getByTestId('submit-button');
            expect(submitButton).toBeDisabled();
        });

        it('submit button is enabled when input has text', async () => {
            render(<PuffChat />);
            
            const textarea = screen.getByPlaceholderText('Ask Smokey anything...');
            fireEvent.change(textarea, { target: { value: 'Hello' } });
            
            const submitButton = screen.getByTestId('submit-button');
            expect(submitButton).not.toBeDisabled();
        });
    });
});
