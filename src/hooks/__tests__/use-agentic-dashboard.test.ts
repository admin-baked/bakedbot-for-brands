import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgenticDashboard } from '@/hooks/use-agentic-dashboard';

// Mock dependencies
jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: () => ({ role: 'brand' }),
}));

jest.mock('@/lib/chat/role-chat-config', () => ({
    getChatConfigForRole: (role: string) => ({
        role,
        title: 'Test Config',
        agentPersona: 'craig', // matches id in hook
    }),
}));

describe('useAgenticDashboard Hook', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('initializes with default state', () => {
        const { result } = renderHook(() => useAgenticDashboard());

        expect(result.current.role).toBe('brand');
        expect(result.current.activeAgent.name).toBe('Craig');
        expect(result.current.messages.length).toBeGreaterThan(0);
        expect(result.current.taskFeed.status).toBe('live');
    });

    it('updates input value', () => {
        const { result } = renderHook(() => useAgenticDashboard());

        act(() => {
            result.current.setInputValue('Hello world');
        });

        expect(result.current.inputValue).toBe('Hello world');
    });

    it('sends a message and simulates response', async () => {
        const { result } = renderHook(() => useAgenticDashboard());

        act(() => {
            result.current.setInputValue('Do something');
        });

        // Send
        act(() => {
            result.current.sendMessage();
        });

        // Input should be cleared
        expect(result.current.inputValue).toBe('');

        // User message added
        expect(result.current.messages[result.current.messages.length - 1].message).toBe('Do something');

        // Simulate timeouts
        act(() => {
            jest.advanceTimersByTime(500); // Progress update
        });

        expect(result.current.taskFeed.progress).toBe(40);

        act(() => {
            jest.advanceTimersByTime(1050); // Completion
        });

        // Response message added
        const lastMsg = result.current.messages[result.current.messages.length - 1];
        expect(lastMsg.actions).toBe(true);
        expect(result.current.taskFeed.status).toBe('completed');
    });
});
