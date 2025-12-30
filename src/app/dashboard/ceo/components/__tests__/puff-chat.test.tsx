```
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    runAgentChat: jest.fn()
}));

// Mock AudioRecorder to avoid media device errors
jest.mock('@/components/ui/audio-recorder', () => ({
    AudioRecorder: () => <div data-testid="audio-recorder">Recorder</div>
}));

describe('PuffChat Component', () => {
    beforeEach(() => {
        useAgentChatStore.setState({
            currentMessages: [],
            sessions: [],
            activeSessionId: null
        });
        
        // Mock fetch
        global.fetch = jest.fn() as jest.Mock;
    });

    it('renders the chat interface', () => {
        render(<PuffChat />);
        expect(screen.getByPlaceholderText('Ask Smokey anything...')).toBeInTheDocument();
    });

    it('uses public demo API when not authenticated', async () => {
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
});
```
