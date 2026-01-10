import { render } from '@testing-library/react';
import { UnifiedAgentChat } from '@/components/chat/unified-agent-chat';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useEffect } from 'react';

// Define the mock factory inline to avoid ReferenceError due to hoisting
jest.mock('@/lib/store/agent-chat-store', () => {
    const mockClearSession = jest.fn();
    const mockStore = () => ({}); // Hook behavior
    mockStore.getState = jest.fn(() => ({
        clearCurrentSession: mockClearSession
    }));
    return { useAgentChatStore: mockStore };
});

// Mock UI components
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>
}));
jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children }: any) => <span>{children}</span>
}));
jest.mock('lucide-react', () => ({
    Sparkles: () => <span>Icon</span>,
    Briefcase: () => <span>Icon</span>, 
    Store: () => <span>Icon</span>,
    ShoppingCart: () => <span>Icon</span>,
    Shield: () => <span>Icon</span>,
    MessageSquarePlus: () => <span>Icon</span>
}));

jest.mock('@/lib/chat/role-chat-config', () => ({
    getChatConfigForRole: (role: string) => ({
        role,
        title: 'Mock Chat',
        subtitle: 'Mock Subtitle',
        iconName: 'sparkles',
        themeColor: 'emerald',
        promptSuggestions: []
    })
}));

jest.mock('@/app/dashboard/ceo/components/puff-chat', () => ({
    PuffChat: () => <div data-testid="puff-chat-mock">Puff Chat Interface</div>
}));

describe('UnifiedAgentChat Security & Persistence', () => {
    beforeEach(() => {
        // Clear usage data
        const mockFn = useAgentChatStore.getState().clearCurrentSession as jest.Mock;
        mockFn.mockClear();
    });

    it('should FORCE CLEAR session when mounting with role="public"', () => {
        render(<UnifiedAgentChat role="public" />);
        // Access expectation via the imported module which is now the mock
        expect(useAgentChatStore.getState().clearCurrentSession).toHaveBeenCalledTimes(1);
    });

    it('should NOT clear session when mounting with a privileged role', () => {
        render(<UnifiedAgentChat role="brand" />);
        expect(useAgentChatStore.getState().clearCurrentSession).not.toHaveBeenCalled();
    });

    it('should NOT clear session when mounting as super user', () => {
        render(<UnifiedAgentChat role="brand" isSuperUser={true} />);
        expect(useAgentChatStore.getState().clearCurrentSession).not.toHaveBeenCalled();
    });
});
