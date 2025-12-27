
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
        expect(screen.getByPlaceholderText('Ask Smokey anything...')).toBeInTheDocument();
        
        // Check for quick starter chips
        expect(screen.getByText('What can you do?')).toBeInTheDocument();
        expect(screen.getByText('Analyze my revenue')).toBeInTheDocument();
    });

    it('sends a message when typed and submitted', async () => {
        const user = userEvent.setup();
        const onSendMessage = jest.fn();
        
        render(<PuffChat onSendMessage={onSendMessage} />);
        
        const input = screen.getByPlaceholderText('Ask Smokey anything...');
        await user.type(input, 'Hello Smokey');
        
        const sendButton = screen.getByRole('button', { name: /send/i });
        await user.click(sendButton);
        
        expect(onSendMessage).toHaveBeenCalledWith('Hello Smokey');
        expect(input).toHaveValue(''); // Should clear after sending
    });

    it('handles quick starter clicks', async () => {
        const user = userEvent.setup();
        const onSendMessage = jest.fn();
        
        render(<PuffChat onSendMessage={onSendMessage} />);
        
        const chip = screen.getByText('Analyze my revenue');
        await user.click(chip);
        
        expect(onSendMessage).toHaveBeenCalledWith('Analyze my revenue');
    });

    it('disables input while processing', () => {
        render(<PuffChat isProcessing={true} />);
        
        const input = screen.getByPlaceholderText('Ask Smokey anything...');
        fireEvent.change(input, { target: { value: 'Send email' } });

        const submitBtn = screen.getByTestId('send-button');
        fireEvent.click(submitBtn);

        expect(input).toBeDisabled();
        expect(submitBtn).toBeDisabled();
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

        const input = screen.getByPlaceholderText('Ask Smokey anything...');
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

        const input = screen.getByPlaceholderText('Ask Smokey anything...');
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
