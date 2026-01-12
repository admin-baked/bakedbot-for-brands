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

jest.mock('@/server/actions/artifacts', () => ({
    saveArtifact: jest.fn().mockResolvedValue({ success: true }),
    getUserArtifacts: jest.fn().mockResolvedValue({ success: true, artifacts: [] })
}));

jest.mock('@/server/actions/gmail', () => ({
    checkGmailConnection: jest.fn().mockResolvedValue({ isConnected: false })
}));

jest.mock('@/server/actions/integrations', () => ({
    checkIntegrationsStatus: jest.fn().mockResolvedValue({})
}));

jest.mock('@/components/ui/audio-recorder', () => ({
    AudioRecorder: () => <div data-testid="audio-recorder">Recorder</div>
}));

jest.mock('@/components/landing/typewriter-text', () => ({
    TypewriterText: ({ text, className }: any) => <div className={className}>{text}</div>
}));

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
        
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
        window.scrollTo = jest.fn();
        global.fetch = jest.fn() as jest.Mock;
    });

    it('renders the chat interface', () => {
        render(<PuffChat />);
        expect(screen.getByPlaceholderText('Ask Smokey anything...')).toBeInTheDocument();
    });

    describe('Super User & Permissions', () => {
        it('auto-detects pending intent and resumes after reload', async () => {
             const mockSessionStorage = {
                 getItem: jest.fn().mockImplementation((key) => key === 'pending_intent' ? 'Send draft email' : null),
                 removeItem: jest.fn(),
                 setItem: jest.fn()
             };
             Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage, writable: true });

             render(<PuffChat isAuthenticated={true} isSuperUser={true} />);

             await waitFor(() => {
                 expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('pending_intent');
             });
        });

        it('sniffs intent for missing email permission and halts', async () => {
            const { checkIntegrationsStatus } = require('@/server/actions/integrations');
            (checkIntegrationsStatus as jest.Mock).mockResolvedValue({
                gmail: 'disconnected',
                drive: 'active'
            });

            render(<PuffChat isAuthenticated={true} isSuperUser={false} />);
            await waitFor(() => expect(checkIntegrationsStatus).toHaveBeenCalled());

            const textarea = screen.getByPlaceholderText('Ask Smokey anything...');
            fireEvent.change(textarea, { target: { value: 'Draft an email to the team' } });
            
            const submitButton = screen.getByTestId('submit-button');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/I'd love to handle that email for you, but I need access to your Gmail first/i)).toBeInTheDocument();
            });
        });

        it('sniffs intent for missing drive permission and halts', async () => {
            const { checkIntegrationsStatus } = require('@/server/actions/integrations');
            (checkIntegrationsStatus as jest.Mock).mockResolvedValue({
                gmail: 'active',
                drive: 'disconnected',
                sheets: 'disconnected'
            });

            render(<PuffChat isAuthenticated={true} isSuperUser={false} />);
            await waitFor(() => expect(checkIntegrationsStatus).toHaveBeenCalled());

            const textarea = screen.getByPlaceholderText('Ask Smokey anything...');
            fireEvent.change(textarea, { target: { value: 'Create a new spreadsheet' } });
            fireEvent.click(screen.getByTestId('submit-button'));

            await waitFor(() => {
                expect(screen.getByText(/I need access to your Google Drive\/Sheets/i)).toBeInTheDocument();
            });
        });
    });
});
