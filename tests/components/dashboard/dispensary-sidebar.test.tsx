/**
 * Unit Tests for Dispensary Sidebar Navigation
 *
 * Tests the grouped navigation structure for dispensary users:
 * - Workspace: Inbox, Projects, Playbooks
 * - Menu & Inventory: Menu, Carousels, Bundles, Orders
 * - Customers: Customers, Segments, Loyalty
 * - Marketing: Creative Center, Campaigns (Soon)
 * - Intelligence (collapsible): Competitive Intel, Deep Research
 * - Admin (collapsible): CannSchemas, App Store, Settings, Invite
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DispensarySidebar } from '@/components/dashboard/dispensary-sidebar';

// Mock Next.js navigation
const mockPathname = jest.fn();
jest.mock('next/navigation', () => ({
    usePathname: () => mockPathname(),
}));

// Mock user role hook
jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: () => ({
        orgId: 'dispensary_test-org',
        role: 'dispensary',
    }),
}));

// Mock shadcn/ui sidebar components
jest.mock('@/components/ui/sidebar', () => ({
    SidebarGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-group">{children}</div>,
    SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-group-content">{children}</div>,
    SidebarGroupLabel: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
        <div data-testid="sidebar-group-label">{children}</div>
    ),
    SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul data-testid="sidebar-menu">{children}</ul>,
    SidebarMenuButton: ({ children, isActive, asChild, className }: { children: React.ReactNode; isActive?: boolean; asChild?: boolean; className?: string }) => (
        <button data-testid="sidebar-menu-button" data-active={isActive} className={className}>{children}</button>
    ),
    SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li data-testid="sidebar-menu-item">{children}</li>,
}));

// Mock Radix Collapsible
jest.mock('@/components/ui/collapsible', () => ({
    Collapsible: ({ children, defaultOpen, className }: { children: React.ReactNode; defaultOpen?: boolean; className?: string }) => (
        <div data-testid="collapsible" data-default-open={defaultOpen}>{children}</div>
    ),
    CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="collapsible-content">{children}</div>
    ),
    CollapsibleTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <button data-testid="collapsible-trigger">{children}</button>
    ),
}));

// Mock InviteUserDialog
jest.mock('@/components/invitations/invite-user-dialog', () => ({
    InviteUserDialog: ({ orgId, allowedRoles, trigger }: { orgId?: string; allowedRoles: string[]; trigger: React.ReactNode }) => (
        <div data-testid="invite-user-dialog" data-org-id={orgId} data-allowed-roles={allowedRoles.join(',')}>
            {trigger}
        </div>
    ),
}));

// Mock Lucide Icons - return lightweight components for any icon
jest.mock('lucide-react', () => {
    return new Proxy(
        {},
        {
            get: (_target, prop: string) => {
                if (prop === '__esModule') {
                    return true;
                }
                return () => <span data-testid={`icon-${String(prop)}`} />;
            },
        },
    );
});

// Mock Next.js Link
jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href} data-testid="link">{children}</a>
    );
});

describe('DispensarySidebar', () => {
    beforeEach(() => {
        mockPathname.mockReturnValue('/dashboard');
    });

    describe('Navigation Groups', () => {
        it('renders Workspace group with Inbox, Projects, and Playbooks', () => {
            render(<DispensarySidebar />);

            expect(screen.getByText('Workspace')).toBeInTheDocument();
            expect(screen.getByText('Inbox')).toBeInTheDocument();
            expect(screen.getByText('Projects')).toBeInTheDocument();
            expect(screen.getByText('Playbooks')).toBeInTheDocument();
        });

        it('renders Menu & Inventory group with core dispensary items', () => {
            render(<DispensarySidebar />);

            expect(screen.getByText('Menu & Inventory')).toBeInTheDocument();
            expect(screen.getByText('Menu')).toBeInTheDocument();
            expect(screen.getByText('Carousels')).toBeInTheDocument();
            expect(screen.getByText('Bundles')).toBeInTheDocument();
            expect(screen.getByText('Orders')).toBeInTheDocument();
        });

        it('renders Customers group with CRM items', () => {
            render(<DispensarySidebar />);

            // "Customers" appears twice (group label + menu item)
            const customerItems = screen.getAllByText('Customers');
            expect(customerItems.length).toBe(2); // Group label + menu item
            expect(screen.getByText('Segments')).toBeInTheDocument();
            expect(screen.getByText('Loyalty')).toBeInTheDocument();
        });

        it('renders Marketing group with Creative Center and Campaigns (Soon)', () => {
            render(<DispensarySidebar />);

            expect(screen.getByText('Marketing')).toBeInTheDocument();
            expect(screen.getByText('Creative Center')).toBeInTheDocument();
            expect(screen.getByText('Campaigns')).toBeInTheDocument();
            expect(screen.getByText('Soon')).toBeInTheDocument();
        });

        it('renders Intelligence group as collapsible', () => {
            render(<DispensarySidebar />);

            expect(screen.getByText('Intelligence')).toBeInTheDocument();
            expect(screen.getByText('Competitive Intel')).toBeInTheDocument();
            expect(screen.getByText('Deep Research')).toBeInTheDocument();
            expect(screen.getByText('BETA')).toBeInTheDocument();
        });

        it('renders Admin group as collapsible with settings and invite', () => {
            render(<DispensarySidebar />);

            expect(screen.getByText('Admin')).toBeInTheDocument();
            expect(screen.getByText('CannSchemas')).toBeInTheDocument();
            expect(screen.getByText('App Store')).toBeInTheDocument();
            expect(screen.getByText('Settings')).toBeInTheDocument();
            expect(screen.getByText('Invite Team Member')).toBeInTheDocument();
        });
    });

    describe('Navigation Links', () => {
        it('links to correct paths for Workspace items', () => {
            render(<DispensarySidebar />);

            const links = screen.getAllByTestId('link');
            const hrefs = links.map(link => link.getAttribute('href'));

            expect(hrefs).toContain('/dashboard/inbox');
            expect(hrefs).toContain('/dashboard/projects');
            expect(hrefs).toContain('/dashboard/playbooks');
        });

        it('links to correct paths for Menu & Inventory items', () => {
            render(<DispensarySidebar />);

            const links = screen.getAllByTestId('link');
            const hrefs = links.map(link => link.getAttribute('href'));

            expect(hrefs).toContain('/dashboard/menu');
            expect(hrefs).toContain('/dashboard/carousels');
            expect(hrefs).toContain('/dashboard/bundles');
            expect(hrefs).toContain('/dashboard/orders');
        });

        it('links to correct paths for Customer items', () => {
            render(<DispensarySidebar />);

            const links = screen.getAllByTestId('link');
            const hrefs = links.map(link => link.getAttribute('href'));

            expect(hrefs).toContain('/dashboard/customers');
            expect(hrefs).toContain('/dashboard/segments');
            expect(hrefs).toContain('/dashboard/loyalty');
        });

        it('links to correct paths for Admin items', () => {
            render(<DispensarySidebar />);

            const links = screen.getAllByTestId('link');
            const hrefs = links.map(link => link.getAttribute('href'));

            expect(hrefs).toContain('/dashboard/menu-sync');
            expect(hrefs).toContain('/dashboard/apps');
            expect(hrefs).toContain('/dashboard/settings');
        });
    });

    describe('Active State Detection', () => {
        it('marks Inbox as active when on /dashboard/inbox', () => {
            mockPathname.mockReturnValue('/dashboard/inbox');
            render(<DispensarySidebar />);

            const activeButtons = screen.getAllByTestId('sidebar-menu-button');
            const inboxButton = activeButtons.find(btn => btn.textContent?.includes('Inbox'));
            expect(inboxButton).toHaveAttribute('data-active', 'true');
        });

        it('marks Menu as active when on /dashboard/menu', () => {
            mockPathname.mockReturnValue('/dashboard/menu');
            render(<DispensarySidebar />);

            const activeButtons = screen.getAllByTestId('sidebar-menu-button');
            const menuButton = activeButtons.find(btn => btn.textContent?.includes('Menu') && !btn.textContent?.includes('CannSchemas'));
            expect(menuButton).toHaveAttribute('data-active', 'true');
        });

        it('marks Carousels as active when on nested route /dashboard/carousels/123', () => {
            mockPathname.mockReturnValue('/dashboard/carousels/123');
            render(<DispensarySidebar />);

            const activeButtons = screen.getAllByTestId('sidebar-menu-button');
            const carouselButton = activeButtons.find(btn => btn.textContent?.includes('Carousels'));
            expect(carouselButton).toHaveAttribute('data-active', 'true');
        });
    });

    describe('Collapsible Sections', () => {
        it('Intelligence section defaults to collapsed', () => {
            render(<DispensarySidebar />);

            const collapsibles = screen.getAllByTestId('collapsible');
            // Find the Intelligence collapsible (first one)
            expect(collapsibles[0]).toHaveAttribute('data-default-open', 'false');
        });

        it('Admin section defaults to collapsed', () => {
            render(<DispensarySidebar />);

            const collapsibles = screen.getAllByTestId('collapsible');
            // Find the Admin collapsible (second one)
            expect(collapsibles[1]).toHaveAttribute('data-default-open', 'false');
        });
    });

    describe('Invite User Dialog', () => {
        it('renders invite dialog with dispensary role restriction', () => {
            render(<DispensarySidebar />);

            const inviteDialog = screen.getByTestId('invite-user-dialog');
            expect(inviteDialog).toHaveAttribute('data-allowed-roles', 'dispensary');
        });

        it('passes orgId to invite dialog', () => {
            render(<DispensarySidebar />);

            const inviteDialog = screen.getByTestId('invite-user-dialog');
            expect(inviteDialog).toHaveAttribute('data-org-id', 'dispensary_test-org');
        });
    });

    describe('Coming Soon Items', () => {
        it('renders Campaigns as disabled with Soon badge', () => {
            render(<DispensarySidebar />);

            const campaignsItem = screen.getByText('Campaigns').closest('div');
            expect(campaignsItem).toHaveClass('cursor-not-allowed');
            expect(screen.getByText('Soon')).toBeInTheDocument();
        });
    });

    describe('Beta Badges', () => {
        it('shows BETA badge on Deep Research', () => {
            render(<DispensarySidebar />);

            expect(screen.getByText('BETA')).toBeInTheDocument();
        });
    });
});
