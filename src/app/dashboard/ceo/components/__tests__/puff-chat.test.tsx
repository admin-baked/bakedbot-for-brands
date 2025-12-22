import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PuffChat } from '../puff-chat';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() })
}));

jest.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({ push: jest.fn() })
}));

jest.mock('@/lib/store/agent-chat-store', () => {
    const mockStore = {
        currentMessages: [],
        addMessage: jest.fn(),
        updateMessage: jest.fn(),
        createSession: jest.fn(),
        hydrateSessions: jest.fn(),
        sessions: [],
        activeSessionId: null
    };
    // Cast to any to avoid type check issues in mock
    const useAgentChatStoreMock: any = () => mockStore;
    useAgentChatStoreMock.getState = () => mockStore;
    useAgentChatStoreMock.setState = jest.fn();
    return {
        useAgentChatStore: useAgentChatStoreMock
    };
});

jest.mock('@/server/actions/chat-persistence', () => ({
    getChatSessions: jest.fn().mockResolvedValue({ success: true, sessions: [] }),
    saveChatSession: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('@/firebase/auth/use-user', () => ({
    useUser: () => ({ user: { email: 'test@example.com' } })
}));

jest.mock('@/app/dashboard/ceo/agents/actions', () => ({
    runAgentChat: jest.fn()
}));

describe('PuffChat Component', () => {
    it('renders the chat interface', () => {
        render(<PuffChat />);
        expect(screen.getByPlaceholderText('Ask Baked HQ anything...')).toBeInTheDocument();
    });

    // Note: Testing the internal state change for permissions is tricky without triggering the full agent flow.
    // However, we can test that the UI handles the grant button if we could simulate the state.
    // Since we can't easily inject state into the component from outside, we rely on the integration test path.
    // But we can verify the component doesn't crash.
});
