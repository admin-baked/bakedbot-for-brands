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
        
        expect(screen.getByText('Assistant')).toBeInTheDocument();
        expect(screen.getByText('Operations')).toBeInTheDocument();
        expect(screen.getByText('Insights')).toBeInTheDocument();
        expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('renders Deep Research link', () => {
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <SuperAdminSidebar />
                </SidebarProvider>
            </TooltipProvider>
        );
        const link = screen.getByText('Deep Research');
        expect(link).toBeInTheDocument();
        expect(link.closest('a')).toHaveAttribute('href', '/dashboard/ceo?tab=research');
    });

    it('renders Page Generator link', () => {
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <SuperAdminSidebar />
                </SidebarProvider>
            </TooltipProvider>
        );
        expect(screen.getByText('Page Generator')).toBeInTheDocument();
    });
});
