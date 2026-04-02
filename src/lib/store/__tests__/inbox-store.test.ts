import { useInboxStore } from '../inbox-store';
import type { InboxThread } from '@/types/inbox';
import type { ChatMessage } from '../agent-chat-store';

function buildThread(message: ChatMessage): InboxThread {
    const now = new Date('2026-04-01T12:00:00.000Z');

    return {
        id: 'thread-1',
        orgId: 'org-1',
        userId: 'user-1',
        type: 'general',
        status: 'active',
        title: 'Inbox test thread',
        preview: 'Original preview',
        primaryAgent: 'smokey',
        assignedAgents: ['smokey'],
        artifactIds: [],
        messages: [message],
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now,
    };
}

describe('useInboxStore updateMessageInThread', () => {
    beforeEach(() => {
        useInboxStore.setState({
            threads: [],
            inboxArtifacts: [],
            activeThreadId: null,
            selectedArtifactId: null,
            isArtifactPanelOpen: false,
        });
    });

    it('updates the placeholder message in place without rewriting thread preview state', () => {
        const placeholderMessage: ChatMessage = {
            id: 'thinking-1',
            type: 'agent',
            content: '',
            timestamp: new Date('2026-04-01T12:00:00.000Z'),
            thinking: {
                isThinking: true,
                steps: [],
                plan: [],
            },
        };

        useInboxStore.setState({
            threads: [buildThread(placeholderMessage)],
        });

        useInboxStore.getState().updateMessageInThread('thread-1', 'thinking-1', {
            id: 'msg-1',
            content: 'Final response from the assistant',
            thinking: {
                isThinking: false,
                steps: [],
                plan: [],
            },
        });

        const updatedThread = useInboxStore.getState().threads[0];
        expect(updatedThread.preview).toBe('Original preview');
        expect(updatedThread.messages[0].id).toBe('msg-1');
        expect(updatedThread.messages[0].content).toBe('Final response from the assistant');
    });

    it('preserves the existing preview for live thought-only updates', () => {
        const placeholderMessage: ChatMessage = {
            id: 'thinking-2',
            type: 'agent',
            content: '',
            timestamp: new Date('2026-04-01T12:05:00.000Z'),
            thinking: {
                isThinking: true,
                steps: [],
                plan: [],
            },
        };

        useInboxStore.setState({
            threads: [buildThread(placeholderMessage)],
        });

        useInboxStore.getState().updateMessageInThread('thread-1', 'thinking-2', {
            thinking: {
                isThinking: true,
                steps: [{ action: 'Searching inventory' }],
                plan: [],
            },
        });

        const updatedThread = useInboxStore.getState().threads[0];
        expect(updatedThread.preview).toBe('Original preview');
        expect(updatedThread.messages[0].thinking?.steps).toEqual([{ action: 'Searching inventory' }]);
    });
});
