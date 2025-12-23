
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SuperAdminSidebar } from '@/components/dashboard/super-admin-sidebar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useSearchParams: () => ({
        get: jest.fn((param) => null), // Default no tab selected
    }),
}));

// Mock lucide-react icons to avoid rendering issues
jest.mock('lucide-react', () => ({
    Bot: () => <div data-testid="icon-bot" />,
    Briefcase: () => <div data-testid="icon-briefcase" />,
    LayoutDashboard: () => <div data-testid="icon-layout" />,
    BarChart3: () => <div data-testid="icon-bar" />,
    Footprints: () => <div data-testid="icon-foot" />,
    Ticket: () => <div data-testid="icon-ticket" />,
    Database: () => <div data-testid="icon-db" />,
    Search: () => <div data-testid="icon-search" />,
    Code: () => <div data-testid="icon-code" />,
    Utensils: () => <div data-testid="icon-utensils" />,
    Tag: () => <div data-testid="icon-tag" />,
    Activity: () => <div data-testid="icon-activity" />,
    Users: () => <div data-testid="icon-users" />,
    Factory: () => <div data-testid="icon-factory" />,
    UserMinus: () => <div data-testid="icon-user-minus" />,
}));

// Mock sidebar components from shadcn
jest.mock('@/components/ui/sidebar', () => ({
    SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SidebarMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SidebarMenuButton: ({ children, isActive }: { children: React.ReactNode, isActive: boolean }) => (
        <div data-active={isActive}>{children}</div>
    ),
}));

describe('SuperAdminSidebar', () => {
    it('renders the "User Management" link pointing to account-management tab', () => {
        render(<SuperAdminSidebar />);

        const userManagementLink = screen.getByRole('link', { name: /user management/i });
        expect(userManagementLink).toBeInTheDocument();
        expect(userManagementLink).toHaveAttribute('href', '/dashboard/ceo?tab=account-management');
        expect(screen.getByTestId('icon-user-minus')).toBeInTheDocument();
    });

    it('renders other standard admin links', () => {
        render(<SuperAdminSidebar />);
        expect(screen.getByRole('link', { name: /playbooks/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /agents/i })).toBeInTheDocument();
    });
});
