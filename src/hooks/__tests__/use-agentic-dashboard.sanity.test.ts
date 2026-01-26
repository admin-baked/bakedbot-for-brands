import { renderHook, act } from '@testing-library/react';
import { useAgenticDashboard } from '../use-agentic-dashboard';

// Mock dependencies
let mockRole: string | null = null;
jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: () => ({ role: mockRole }),
}));

jest.mock('@/lib/chat/role-chat-config', () => ({
    getChatConfigForRole: (r: string) => ({
        role: r,
        agentPersona: 'craig'
    })
}));

describe('useAgenticDashboard Hook Stability', () => {
    beforeEach(() => {
        mockRole = null;
    });

    it('handles role transitions without hook mismatch', () => {
        const { result, rerender } = renderHook(() => useAgenticDashboard());

        // Initial render (role is null)
        expect(result.current.role).toBeNull();

        // Update role
        mockRole = 'brand';
        rerender();

        // Should not throw and should update
        expect(result.current.role).toBe('brand');
    });
});
