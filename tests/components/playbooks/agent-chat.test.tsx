import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgentChat } from '@/app/dashboard/playbooks/components/agent-chat';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';

const mockRunAgentChat = jest.fn();
const mockCancelAgentJob = jest.fn();

jest.mock('react-markdown', () => ({ children }: { children: React.ReactNode }) => (
    <div data-testid="markdown-content">{children}</div>
));
jest.mock('remark-gfm', () => () => undefined);
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() }),
}));
jest.mock('@/app/dashboard/ceo/agents/actions', () => ({
    runAgentChat: (...args: unknown[]) => mockRunAgentChat(...args),
    cancelAgentJob: (...args: unknown[]) => mockCancelAgentJob(...args),
}));
jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: () => ({ role: 'super_user', orgId: 'org-test' }),
}));
jest.mock('@/firebase/auth/use-user', () => ({
    useUser: () => ({ user: { uid: 'user-test', email: 'test@example.com', planId: 'pro' } }),
}));
jest.mock('@/hooks/use-job-poller', () => ({
    useJobPoller: () => ({ job: null, thoughts: [], isComplete: false, error: null }),
}));
jest.mock('@/components/ui/audio-recorder', () => ({
    AudioRecorder: () => <div data-testid="audio-recorder" />,
}));
jest.mock('@/components/dashboard/project-selector', () => ({
    ProjectSelector: () => <div data-testid="project-selector" />,
}));
jest.mock('@/app/dashboard/ceo/components/model-selector', () => ({
    ModelSelector: () => <div data-testid="model-selector" />,
}));
jest.mock('@/components/artifacts', () => ({
    ArtifactPanel: () => <div data-testid="artifact-panel" />,
    ArtifactCard: () => <div data-testid="artifact-card" />,
}));
jest.mock('@/components/chat/chat-media-preview', () => ({
    ChatMediaPreview: () => <div data-testid="chat-media-preview" />,
    extractMediaFromToolResponse: jest.fn(() => null),
}));
jest.mock('@/server/actions/artifacts', () => ({
    shareArtifact: jest.fn(),
}));
jest.mock('@/server/actions/agent-vm', () => ({
    resolveVmToolApproval: jest.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
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

window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('AgentChat Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.localStorage.clear();
        act(() => {
            useAgentChatStore.setState({
                sessions: [],
                activeSessionId: null,
                currentMessages: [],
                currentRole: null,
                currentProjectId: null,
                queuedPrompt: null,
                currentArtifacts: [],
                activeArtifactId: null,
                isArtifactPanelOpen: false,
            });
        });

        mockRunAgentChat.mockResolvedValue({
            content: 'Processed attachment.',
            metadata: {},
            toolCalls: [],
        });
    });

    it('renders the input placeholder', () => {
        render(<AgentChat placeholder="Type a workflow request" />);

        expect(screen.getByPlaceholderText('Type a workflow request')).toBeInTheDocument();
    });

    it('renders sent attachments in the transcript after submit', async () => {
        const { container } = render(<AgentChat placeholder="Type a workflow request" />);

        const textarea = screen.getByPlaceholderText('Type a workflow request');
        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;

        expect(fileInput).not.toBeNull();

        const file = new File(['# Notes'], 'notes.md', { type: '' });

        await act(async () => {
            fireEvent.change(fileInput!, {
                target: { files: [file] },
            });
        });

        await waitFor(() => {
            expect(screen.getByText('notes.md')).toBeInTheDocument();
        });

        await act(async () => {
            fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
        });

        await waitFor(() => {
            expect(mockRunAgentChat).toHaveBeenCalledTimes(1);
        });

        expect(screen.getByText('Sent 1 attachment(s)')).toBeInTheDocument();

        const transcriptAttachments = await screen.findByTestId('agent-chat-message-attachments');
        expect(within(transcriptAttachments).getByText('notes.md')).toBeInTheDocument();
    });
});
