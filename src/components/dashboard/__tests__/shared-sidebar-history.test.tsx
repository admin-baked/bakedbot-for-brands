import { render, screen, fireEvent } from '@testing-library/react';
import { SharedSidebarHistory } from '../shared-sidebar-history';
import { useRouter, usePathname } from 'next/navigation';
import { useUserRole } from '@/hooks/use-user-role';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useInboxStore } from '@/lib/store/inbox-store';
import { useUnifiedHistory } from '@/hooks/use-unified-history';

jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    usePathname: jest.fn(),
}));

jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: jest.fn(),
}));

jest.mock('@/lib/store/agent-chat-store', () => ({
    useAgentChatStore: jest.fn(),
}));

jest.mock('@/lib/store/inbox-store', () => ({
    useInboxStore: jest.fn(),
}));

jest.mock('@/hooks/use-unified-history', () => ({
    useUnifiedHistory: jest.fn(),
}));

describe('SharedSidebarHistory', () => {
    const mockPush = jest.fn();
    const mockClearCurrentSession = jest.fn();
    const mockSetActiveSession = jest.fn();
    const mockSetCurrentRole = jest.fn();
    const mockSetActiveThread = jest.fn();
    const mockSetFilter = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        (usePathname as jest.Mock).mockReturnValue('/some-other-page');

        (useUserRole as jest.Mock).mockReturnValue({ role: 'super-admin' });

        (useUnifiedHistory as jest.Mock).mockReturnValue({
            items: [],
            activeItemId: null,
            isEmpty: true,
            filter: 'all',
            setFilter: mockSetFilter,
            counts: { all: 0, inbox: 0, playbooks: 0 },
        });

        (useAgentChatStore as jest.Mock).mockReturnValue({
            clearCurrentSession: mockClearCurrentSession,
            setActiveSession: mockSetActiveSession,
            setCurrentRole: mockSetCurrentRole,
        });

        (useInboxStore as jest.Mock).mockReturnValue({
            setActiveThread: mockSetActiveThread,
        });
    });

    it('navigates to /dashboard/playbooks for non-business role on New Chat', () => {
        render(<SharedSidebarHistory />);

        fireEvent.click(screen.getByText('New Chat'));

        expect(mockClearCurrentSession).toHaveBeenCalled();
        expect(mockSetActiveThread).toHaveBeenCalledWith(null);
        expect(mockPush).toHaveBeenCalledWith('/dashboard/playbooks');
    });

    it('navigates to /dashboard/inbox for brand role on New Chat', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

        render(<SharedSidebarHistory />);

        fireEvent.click(screen.getByText('New Chat'));

        expect(mockClearCurrentSession).toHaveBeenCalled();
        expect(mockSetActiveThread).toHaveBeenCalledWith(null);
        expect(mockPush).toHaveBeenCalledWith('/dashboard/inbox');
    });

    it('does not navigate if already on target page (brand inbox)', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });
        (usePathname as jest.Mock).mockReturnValue('/dashboard/inbox');

        render(<SharedSidebarHistory />);

        fireEvent.click(screen.getByText('New Chat'));

        expect(mockClearCurrentSession).toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
    });
});
