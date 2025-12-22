
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PuffChat } from '../puff-chat';
import '@testing-library/jest-dom';

import { useAgentChatStore } from '@/lib/store/agent-chat-store';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() })
}));

jest.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({ push: jest.fn() })
}));

// Mock server actions but not the store
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
    beforeEach(() => {
        // Reset store state
        useAgentChatStore.setState({
            currentMessages: [],
            sessions: [],
            activeSessionId: null
        });
    });

    it('renders the chat interface', () => {
        render(<PuffChat />);
        expect(screen.getByPlaceholderText('Ask Baked HQ anything...')).toBeInTheDocument();
    });

    it('handles user input and shows response', async () => {
        // Mock runAgentChat response
        const mockRunAgentChat = require('@/app/dashboard/ceo/agents/actions').runAgentChat;
        mockRunAgentChat.mockResolvedValueOnce({
            content: 'I can help you send that email.',
            metadata: {},
            toolCalls: []
        });

        render(<PuffChat />);

        const input = screen.getByPlaceholderText('Ask Baked HQ anything...');
        fireEvent.change(input, { target: { value: 'Send an email to team' } });

        const submitBtn = screen.getByTestId('send-button');
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockRunAgentChat).toHaveBeenCalledWith('Send an email to team', 'puff');
        });

        await waitFor(() => {
            expect(screen.getByText('I can help you send that email.')).toBeInTheDocument();
        });
    });

    it('shows permission card when agent requests tools', async () => {
        const mockRunAgentChat = require('@/app/dashboard/ceo/agents/actions').runAgentChat;
        mockRunAgentChat.mockResolvedValueOnce({
            content: 'I need Gmail access to send that.',
            metadata: {},
            toolCalls: []
        });

        render(<PuffChat />);

        const input = screen.getByPlaceholderText('Ask Baked HQ anything...');
        fireEvent.change(input, { target: { value: 'Send email' } });

        const submitBtn = screen.getByTestId('send-button');
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockRunAgentChat).toHaveBeenCalled();
        });

        await waitFor(() => {
            // "email" trigger should activate Gmail permission logic in PuffChat code
            expect(screen.getByText('Grant permissions to agent?')).toBeInTheDocument();
            expect(screen.getByText('Gmail')).toBeInTheDocument();
        });
    });
});
