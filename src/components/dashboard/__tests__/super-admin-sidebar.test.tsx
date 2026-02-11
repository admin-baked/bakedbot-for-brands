import { render, screen, fireEvent } from '@testing-library/react';
import { SuperAdminSidebar } from '../super-admin-sidebar';
import { useSearchParams, usePathname } from 'next/navigation';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useToast } from '@/hooks/use-toast';

jest.mock('next/navigation', () => ({
    useSearchParams: jest.fn(),
    usePathname: jest.fn(),
}));

jest.mock('next/link', () => {
    return ({ children, href }: any) => <a href={href}>{children}</a>;
});

jest.mock('@/lib/store/agent-chat-store', () => ({
    useAgentChatStore: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: jest.fn(),
}));

jest.mock('@/components/dashboard/admin/invite-user-dialog', () => ({
    InviteUserDialog: ({ trigger }: any) => <div data-testid="invite-dialog-trigger">{trigger}</div>
}));

jest.mock('@/components/ui/collapsible', () => ({
    Collapsible: ({ children }: any) => <div>{children}</div>,
    CollapsibleContent: ({ children }: any) => <div>{children}</div>,
    CollapsibleTrigger: ({ children }: any) => <button>{children}</button>,
}));

jest.mock('@/components/ui/sidebar', () => ({
    SidebarGroup: ({ children }: any) => <div>{children}</div>,
    SidebarGroupContent: ({ children }: any) => <div>{children}</div>,
    SidebarGroupLabel: ({ children }: any) => <div>{children}</div>,
    SidebarMenu: ({ children }: any) => <div>{children}</div>,
    SidebarMenuItem: ({ children }: any) => <div>{children}</div>,
    SidebarMenuButton: ({ children, onClick }: any) => (
        <button onClick={onClick}>{children}</button>
    ),
    SidebarMenuAction: ({ children }: any) => <div>{children}</div>,
    SidebarMenuSub: ({ children }: any) => <div>{children}</div>,
    SidebarMenuSubItem: ({ children }: any) => <div>{children}</div>,
    SidebarMenuSubButton: ({ children, onClick }: any) => (
        <button onClick={onClick}>{children}</button>
    ),
}));

describe('SuperAdminSidebar', () => {
    const mockToast = jest.fn();
    const mockClearCurrentSession = jest.fn();
    const mockSetActiveSession = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useSearchParams as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue('boardroom'),
        });
        (usePathname as jest.Mock).mockReturnValue('/dashboard/ceo');
        (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
        (useAgentChatStore as jest.Mock).mockReturnValue({
            sessions: [],
            activeSessionId: null,
            clearCurrentSession: mockClearCurrentSession,
            setActiveSession: mockSetActiveSession,
        });
    });

    it('renders key navigation links', () => {
        render(<SuperAdminSidebar />);

        expect(screen.getByText('Boardroom')).toBeInTheDocument();
        expect(screen.getByText('BakedBot Drive')).toBeInTheDocument();
        expect(screen.getByText('Invite Team Member')).toBeInTheDocument();
    });

    it('wires New Chat action', () => {
        render(<SuperAdminSidebar />);

        fireEvent.click(screen.getByText('New Chat'));

        expect(mockClearCurrentSession).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalled();
    });

    it('contains drive link to CEO tab', () => {
        render(<SuperAdminSidebar />);

        const driveLink = screen.getByText('BakedBot Drive').closest('a');
        expect(driveLink).toHaveAttribute('href', '/dashboard/ceo?tab=drive');
    });
});
