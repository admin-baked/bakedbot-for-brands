import React from 'react';
import { render, screen } from '@testing-library/react';
import { SuperAdminSidebar } from '@/components/dashboard/super-admin-sidebar';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams('?tab=dashboard'),
    usePathname: () => '/dashboard/ceo',
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    }),
}));

// Mock store
jest.mock('@/lib/store/agent-chat-store', () => ({
    useAgentChatStore: () => ({
        sessions: [],
        activeSessionId: null,
        clearCurrentSession: jest.fn(),
        setActiveSession: jest.fn(),
    }),
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

// Mock InviteUserDialog to avoid deep render tree complexity
jest.mock('@/components/dashboard/admin/invite-user-dialog', () => ({
    InviteUserDialog: ({ trigger }: any) => <div>{trigger}</div>,
}));

import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

describe('SuperAdminSidebar', () => {
    it('renders all main navigation groups', () => {
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <SuperAdminSidebar />
                </SidebarProvider>
            </TooltipProvider>
        );

        // Groups reflect the frequency-based hierarchy introduced in the refactor
        expect(screen.getByText('Daily')).toBeInTheDocument();
        expect(screen.getByText('Manage')).toBeInTheDocument();
        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(screen.getByText('Assistant')).toBeInTheDocument();
    });

    it('renders Intel & Research link', () => {
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <SuperAdminSidebar />
                </SidebarProvider>
            </TooltipProvider>
        );
        const link = screen.getByText('Intel & Research');
        expect(link).toBeInTheDocument();
        expect(link.closest('a')).toHaveAttribute(
            'href',
            '/dashboard/ceo?tab=analytics&sub=intelligence&intel=insights'
        );
    });

    it('renders Content Hub link', () => {
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <SuperAdminSidebar />
                </SidebarProvider>
            </TooltipProvider>
        );
        const link = screen.getByText('Content Hub');
        expect(link).toBeInTheDocument();
        expect(link.closest('a')).toHaveAttribute('href', '/dashboard/ceo?tab=content');
    });
});
