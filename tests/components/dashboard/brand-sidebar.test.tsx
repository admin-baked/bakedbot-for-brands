/**
 * Unit Tests for Brand Sidebar Navigation
 *
 * Tests the grouped navigation structure for brand users:
 * - Workspace: Inbox, Projects, Playbooks
 * - Marketing: Creative Center
 * - Catalog: Products, Menu, Orders
 * - Customers: Customers, Segments, Leads, Loyalty
 * - Intelligence (collapsible): Competitive Intel, Deep Research
 * - Distribution (collapsible): Dispensaries
 * - Admin (collapsible): Brand Page, App Store, CannSchemas, Settings, Invite
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrandSidebar } from '@/components/dashboard/brand-sidebar';

// Mock Agent Squad Data
jest.mock('@/hooks/use-agentic-dashboard', () => ({
    AGENT_SQUAD: [
        { id: '1', name: 'Agent 1', role: 'Role 1', status: 'online', img: 'img1' },
        { id: '2', name: 'Agent 2', role: 'Role 2', status: 'working', img: 'img2' },
    ]
}));

// Mock Next.js navigation
const mockPathname = jest.fn();
jest.mock('next/navigation', () => ({
    usePathname: () => mockPathname(),
}));

// Mock user role hook
jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: () => ({
        orgId: 'brand_test-org',
        role: 'brand',
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
jest.mock('@/components/dashboard/admin/invite-user-dialog', () => ({
    InviteUserDialog: ({ defaultRole, trigger }: { defaultRole?: string; trigger?: React.ReactNode }) => (
        <div data-testid="invite-user-dialog" data-default-role={defaultRole || ''}>
            {trigger}
        </div>
    )
}));

// Mock Next.js Link
jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href} data-testid="link">{children}</a>
    );
});

describe('BrandSidebar', () => {
    beforeEach(() => {
        mockPathname.mockReturnValue('/dashboard');
    });

    describe('Navigation Groups', () => {
        it('renders Workspace group with Inbox, Projects, and Playbooks', () => {
            render(<BrandSidebar />);

            expect(screen.getByText('Workspace')).toBeInTheDocument();
            expect(screen.getByText('Inbox')).toBeInTheDocument();
            expect(screen.getByText('Projects')).toBeInTheDocument();
            expect(screen.getByText('Playbooks')).toBeInTheDocument();
        });

        it('renders Marketing group with Creative Center', () => {
            render(<BrandSidebar />);

            expect(screen.getByText('Marketing')).toBeInTheDocument();
            expect(screen.getByText('Creative Center')).toBeInTheDocument();
        });

        it('renders Catalog group with Products, Menu, and Orders', () => {
            render(<BrandSidebar />);

            expect(screen.getByText('Catalog')).toBeInTheDocument();
            expect(screen.getByText('Products')).toBeInTheDocument();
            expect(screen.getByText('Menu')).toBeInTheDocument();
            expect(screen.getByText('Orders')).toBeInTheDocument();
        });

        it('renders Customers group with all CRM items', () => {
            render(<BrandSidebar />);

            // "Customers" appears twice (group label + menu item)
            const customerItems = screen.getAllByText('Customers');
            expect(customerItems.length).toBe(2); // Group label + menu item
            expect(screen.getByText('Segments')).toBeInTheDocument();
            expect(screen.getByText('Leads')).toBeInTheDocument();
            expect(screen.getByText('Loyalty')).toBeInTheDocument();
        });

        it('renders Intelligence group as collapsible', () => {
            render(<BrandSidebar />);

            expect(screen.getByText('Intelligence')).toBeInTheDocument();
            expect(screen.getByText('Competitive Intel')).toBeInTheDocument();
            expect(screen.getByText('Deep Research')).toBeInTheDocument();
            expect(screen.getByText('BETA')).toBeInTheDocument();
        });

        it('renders Distribution group as collapsible', () => {
            render(<BrandSidebar />);

            expect(screen.getByText('Distribution')).toBeInTheDocument();
            expect(screen.getByText('Dispensaries')).toBeInTheDocument();
        });

        it('renders Admin group as collapsible with all settings', () => {
            render(<BrandSidebar />);

            expect(screen.getByText('Admin')).toBeInTheDocument();
            expect(screen.getByText('Brand Page')).toBeInTheDocument();
            expect(screen.getByText('App Store')).toBeInTheDocument();
            expect(screen.getByText('CannSchemas')).toBeInTheDocument();
            expect(screen.getByText('Settings')).toBeInTheDocument();
            expect(screen.getByText('Invite Team Member')).toBeInTheDocument();
        });

        it('renders Agent Squad group with agents', () => {
            render(<BrandSidebar />);

            expect(screen.getByText('Agent Squad')).toBeInTheDocument();
            expect(screen.getByText('Agent 1')).toBeInTheDocument();
            expect(screen.getByText('Role 1')).toBeInTheDocument();
            expect(screen.getByText('Agent 2')).toBeInTheDocument();
        });
    });

    describe('Navigation Links', () => {
        it('links to correct paths for Workspace items', () => {
            render(<BrandSidebar />);

            const links = screen.getAllByTestId('link');
            const hrefs = links.map(link => link.getAttribute('href'));

            expect(hrefs).toContain('/dashboard/inbox');
            expect(hrefs).toContain('/dashboard/projects');
            expect(hrefs).toContain('/dashboard/playbooks');
        });

        it('links to correct paths for Catalog items', () => {
            render(<BrandSidebar />);

            const links = screen.getAllByTestId('link');
            const hrefs = links.map(link => link.getAttribute('href'));

            expect(hrefs).toContain('/dashboard/products');
            expect(hrefs).toContain('/dashboard/menu');
            expect(hrefs).toContain('/dashboard/orders');
        });

        it('links to correct paths for Customer items', () => {
            render(<BrandSidebar />);

            const links = screen.getAllByTestId('link');
            const hrefs = links.map(link => link.getAttribute('href'));

            expect(hrefs).toContain('/dashboard/customers');
            expect(hrefs).toContain('/dashboard/segments');
            expect(hrefs).toContain('/dashboard/leads');
            expect(hrefs).toContain('/dashboard/loyalty');
        });

        it('links to correct paths for Distribution items', () => {
            render(<BrandSidebar />);

            const links = screen.getAllByTestId('link');
            const hrefs = links.map(link => link.getAttribute('href'));

            expect(hrefs).toContain('/dashboard/dispensaries');
        });

        it('links to correct paths for Admin items', () => {
            render(<BrandSidebar />);

            const links = screen.getAllByTestId('link');
            const hrefs = links.map(link => link.getAttribute('href'));

            expect(hrefs).toContain('/dashboard/content/brand-page');
            expect(hrefs).toContain('/dashboard/apps');
            expect(hrefs).toContain('/dashboard/menu-sync');
            expect(hrefs).toContain('/dashboard/settings');
        });
    });

    describe('Active State Detection', () => {
        it('marks Inbox as active when on /dashboard/inbox', () => {
            mockPathname.mockReturnValue('/dashboard/inbox');
            render(<BrandSidebar />);

            const activeButtons = screen.getAllByTestId('sidebar-menu-button');
            const inboxButton = activeButtons.find(btn => btn.textContent?.includes('Inbox'));
            expect(inboxButton).toHaveAttribute('data-active', 'true');
        });

        it('marks Products as active when on /dashboard/products', () => {
            mockPathname.mockReturnValue('/dashboard/products');
            render(<BrandSidebar />);

            const activeButtons = screen.getAllByTestId('sidebar-menu-button');
            const productsButton = activeButtons.find(btn => btn.textContent?.includes('Products'));
            expect(productsButton).toHaveAttribute('data-active', 'true');
        });

        it('marks Dispensaries as active when on nested route /dashboard/dispensaries/abc', () => {
            mockPathname.mockReturnValue('/dashboard/dispensaries/abc');
            render(<BrandSidebar />);

            const activeButtons = screen.getAllByTestId('sidebar-menu-button');
            const dispensariesButton = activeButtons.find(btn => btn.textContent?.includes('Dispensaries'));
            expect(dispensariesButton).toHaveAttribute('data-active', 'true');
        });

        it('marks Brand Page as active on /dashboard/content/brand-page', () => {
            mockPathname.mockReturnValue('/dashboard/content/brand-page');
            render(<BrandSidebar />);

            const activeButtons = screen.getAllByTestId('sidebar-menu-button');
            const brandPageButton = activeButtons.find(btn => btn.textContent?.includes('Brand Page'));
            expect(brandPageButton).toHaveAttribute('data-active', 'true');
        });
    });

    describe('Collapsible Sections', () => {
        it('Intelligence section defaults to collapsed', () => {
            render(<BrandSidebar />);

            const collapsibles = screen.getAllByTestId('collapsible');
            expect(collapsibles[0]).toHaveAttribute('data-default-open', 'false');
        });

        it('Distribution section defaults to collapsed', () => {
            render(<BrandSidebar />);

            const collapsibles = screen.getAllByTestId('collapsible');
            expect(collapsibles[2]).toHaveAttribute('data-default-open', 'false');
        });

        it('Admin section defaults to collapsed', () => {
            render(<BrandSidebar />);

            // Intelligence (0), Agent Squad (1), Distribution (2), Admin (3)
            // Note: The order depends on implementation. Based on file:
            // Work, Marketing, Catalog, Customers, Intelligence, Agent Squad, Distribution, Admin
            // Collapsibles: Intelligence, Agent Squad, Distribution, Admin

            // We need to find the specific collapsible. 
            // Since we mock it to just render children, we can check logic or attributes if we identified them.
            // Our mock renders <div data-testid="collapsible" data-default-open={defaultOpen}>

            const collapsibles = screen.getAllByTestId('collapsible');
            // Assuming order: Intelligence, Agent Squad, Distribution, Admin
            expect(collapsibles[3]).toHaveAttribute('data-default-open', 'false');
        });

        it('Agent Squad section defaults to open', () => {
            render(<BrandSidebar />);
            const collapsibles = screen.getAllByTestId('collapsible');
            // Agent Squad is the 2nd collapsible (index 1)
            expect(collapsibles[1]).toHaveAttribute('data-default-open', 'true');
        });
    });

    describe('Invite User Dialog', () => {
        it('passes brand_admin as defaultRole', () => {
            render(<BrandSidebar />);

            const inviteDialog = screen.getByTestId('invite-user-dialog');
            expect(inviteDialog).toHaveAttribute('data-default-role', 'brand_admin');
        });

        it('renders invite trigger inside wrapper', () => {
            render(<BrandSidebar />);

            const inviteDialog = screen.getByTestId('invite-user-dialog');
            expect(inviteDialog).toHaveTextContent('Invite Team Member');
        });
    });

    describe('Beta Badges', () => {
        it('shows BETA badge on Deep Research', () => {
            render(<BrandSidebar />);

            expect(screen.getByText('BETA')).toBeInTheDocument();
        });
    });

    describe('Differences from Dispensary Sidebar', () => {
        it('includes Leads link (brand-specific)', () => {
            render(<BrandSidebar />);

            expect(screen.getByText('Leads')).toBeInTheDocument();
        });

        it('includes Products link (brand-specific)', () => {
            render(<BrandSidebar />);

            expect(screen.getByText('Products')).toBeInTheDocument();
        });

        it('includes Dispensaries link under Distribution (brand-specific)', () => {
            render(<BrandSidebar />);

            expect(screen.getByText('Dispensaries')).toBeInTheDocument();
        });

        it('includes Brand Page link (brand-specific)', () => {
            render(<BrandSidebar />);

            expect(screen.getByText('Brand Page')).toBeInTheDocument();
        });

        it('does NOT include Carousels link (dispensary-specific)', () => {
            render(<BrandSidebar />);

            expect(screen.queryByText('Carousels')).not.toBeInTheDocument();
        });

        it('does NOT include Bundles link (dispensary-specific)', () => {
            render(<BrandSidebar />);

            expect(screen.queryByText('Bundles')).not.toBeInTheDocument();
        });
    });
});
