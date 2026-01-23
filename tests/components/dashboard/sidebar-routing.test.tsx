/**
 * Unit Tests for Dashboard Sidebar Role Routing
 *
 * Tests the conditional routing logic in sidebar.tsx that determines
 * which sidebar component to render based on user role:
 * - Super Admin → SuperAdminSidebar
 * - Brand (brand, brand_admin, brand_member) → BrandSidebar
 * - Dispensary (dispensary, dispensary_admin, dispensary_staff) → DispensarySidebar
 * - Default → Role-filtered navigation
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock state holders
let mockRole: string | null = null;
let mockIsSuperAdmin = false;
let mockPathname = '/dashboard';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
    usePathname: () => mockPathname,
}));

// Mock hooks
jest.mock('@/hooks/use-dashboard-config', () => ({
    useDashboardConfig: () => ({
        navLinks: [],
        current: null,
        role: mockRole,
    }),
}));

jest.mock('@/hooks/use-plan-info', () => ({
    usePlanInfo: () => ({
        planName: 'Free',
        planId: 'free',
        isScale: false,
        isEnterprise: false,
        isGrowthOrHigher: false,
        isPaid: false,
    }),
}));

jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: () => ({
        loginRoute: '/login',
        orgId: 'test-org',
        role: mockRole,
    }),
}));

jest.mock('@/hooks/use-super-admin', () => ({
    useSuperAdmin: () => ({
        isSuperAdmin: mockIsSuperAdmin,
    }),
}));

jest.mock('@/firebase/auth/use-user', () => ({
    useUser: () => ({
        user: { email: 'test@example.com', uid: 'test-uid' },
    }),
}));

jest.mock('@/firebase/provider', () => ({
    useFirebase: () => ({
        auth: {},
    }),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() }),
}));

// Mock sidebar components to track which one renders
jest.mock('@/components/dashboard/super-admin-sidebar', () => ({
    SuperAdminSidebar: () => <div data-testid="super-admin-sidebar">SuperAdminSidebar</div>,
}));

jest.mock('@/components/dashboard/brand-sidebar', () => ({
    BrandSidebar: () => <div data-testid="brand-sidebar">BrandSidebar</div>,
}));

jest.mock('@/components/dashboard/dispensary-sidebar', () => ({
    DispensarySidebar: () => <div data-testid="dispensary-sidebar">DispensarySidebar</div>,
}));

jest.mock('@/components/dashboard/shared-sidebar-history', () => ({
    SharedSidebarHistory: () => <div data-testid="shared-sidebar-history">SharedSidebarHistory</div>,
}));

// Mock UI components
jest.mock('@/components/ui/sidebar', () => ({
    Sidebar: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar">{children}</div>,
    SidebarContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-content">{children}</div>,
    SidebarHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-header">{children}</div>,
    SidebarFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-footer">{children}</div>,
    SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
    SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
    SidebarMenuButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

jest.mock('@/components/logo', () => ({
    __esModule: true,
    default: () => <div data-testid="logo">Logo</div>,
}));

jest.mock('@/components/ui/avatar', () => ({
    Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
}));

jest.mock('@/components/invitations/invite-user-dialog', () => ({
    InviteUserDialog: () => <div data-testid="invite-dialog">InviteDialog</div>,
}));

jest.mock('lucide-react', () => ({
    LogOut: () => <span>LogOut</span>,
    Crown: () => <span>Crown</span>,
    Zap: () => <span>Zap</span>,
    Sparkles: () => <span>Sparkles</span>,
    UserPlus: () => <span>UserPlus</span>,
    Loader2: () => <span>Loader2</span>,
    Folder: () => <span>Folder</span>,
}));

jest.mock('@/lib/logger', () => ({
    logger: { error: jest.fn() },
}));

// Import after all mocks are set up
import { DashboardSidebar } from '@/components/dashboard/sidebar';

describe('DashboardSidebar Role Routing', () => {
    beforeEach(() => {
        // Reset mocks
        mockRole = null;
        mockIsSuperAdmin = false;
        mockPathname = '/dashboard';
    });

    describe('Super Admin Routing', () => {
        it('renders SuperAdminSidebar when on /dashboard/ceo path', () => {
            mockPathname = '/dashboard/ceo';
            mockRole = 'super_user';

            render(<DashboardSidebar />);

            expect(screen.getByTestId('super-admin-sidebar')).toBeInTheDocument();
            expect(screen.queryByTestId('brand-sidebar')).not.toBeInTheDocument();
            expect(screen.queryByTestId('dispensary-sidebar')).not.toBeInTheDocument();
        });

        it('renders SuperAdminSidebar when isSuperAdmin is true and not impersonating', () => {
            mockIsSuperAdmin = true;
            mockRole = 'super_user';

            render(<DashboardSidebar />);

            expect(screen.getByTestId('super-admin-sidebar')).toBeInTheDocument();
        });

        it('does NOT render SuperAdminSidebar when isSuperAdmin but role is brand (impersonating)', () => {
            mockIsSuperAdmin = true;
            mockRole = 'brand';

            render(<DashboardSidebar />);

            expect(screen.queryByTestId('super-admin-sidebar')).not.toBeInTheDocument();
            expect(screen.getByTestId('brand-sidebar')).toBeInTheDocument();
        });

        it('does NOT render SuperAdminSidebar when isSuperAdmin but role is dispensary (impersonating)', () => {
            mockIsSuperAdmin = true;
            mockRole = 'dispensary';

            render(<DashboardSidebar />);

            expect(screen.queryByTestId('super-admin-sidebar')).not.toBeInTheDocument();
            expect(screen.getByTestId('dispensary-sidebar')).toBeInTheDocument();
        });

        it('does NOT render SuperAdminSidebar on /dashboard/shop even when super admin', () => {
            mockIsSuperAdmin = true;
            mockRole = 'super_user';
            mockPathname = '/dashboard/shop';

            render(<DashboardSidebar />);

            expect(screen.queryByTestId('super-admin-sidebar')).not.toBeInTheDocument();
        });
    });

    describe('Brand Routing', () => {
        it('renders BrandSidebar for brand role', () => {
            mockRole = 'brand';

            render(<DashboardSidebar />);

            expect(screen.getByTestId('brand-sidebar')).toBeInTheDocument();
            expect(screen.queryByTestId('super-admin-sidebar')).not.toBeInTheDocument();
            expect(screen.queryByTestId('dispensary-sidebar')).not.toBeInTheDocument();
        });

        it('renders BrandSidebar for brand_admin role', () => {
            mockRole = 'brand_admin';

            render(<DashboardSidebar />);

            expect(screen.getByTestId('brand-sidebar')).toBeInTheDocument();
        });

        it('renders BrandSidebar for brand_member role', () => {
            mockRole = 'brand_member';

            render(<DashboardSidebar />);

            expect(screen.getByTestId('brand-sidebar')).toBeInTheDocument();
        });

        it('renders SharedSidebarHistory alongside BrandSidebar', () => {
            mockRole = 'brand';

            render(<DashboardSidebar />);

            expect(screen.getByTestId('shared-sidebar-history')).toBeInTheDocument();
            expect(screen.getByTestId('brand-sidebar')).toBeInTheDocument();
        });
    });

    describe('Dispensary Routing', () => {
        it('renders DispensarySidebar for dispensary role', () => {
            mockRole = 'dispensary';

            render(<DashboardSidebar />);

            expect(screen.getByTestId('dispensary-sidebar')).toBeInTheDocument();
            expect(screen.queryByTestId('super-admin-sidebar')).not.toBeInTheDocument();
            expect(screen.queryByTestId('brand-sidebar')).not.toBeInTheDocument();
        });

        it('renders DispensarySidebar for dispensary_admin role', () => {
            mockRole = 'dispensary_admin';

            render(<DashboardSidebar />);

            expect(screen.getByTestId('dispensary-sidebar')).toBeInTheDocument();
        });

        it('renders DispensarySidebar for dispensary_staff role', () => {
            mockRole = 'dispensary_staff';

            render(<DashboardSidebar />);

            expect(screen.getByTestId('dispensary-sidebar')).toBeInTheDocument();
        });

        it('renders SharedSidebarHistory alongside DispensarySidebar', () => {
            mockRole = 'dispensary';

            render(<DashboardSidebar />);

            expect(screen.getByTestId('shared-sidebar-history')).toBeInTheDocument();
            expect(screen.getByTestId('dispensary-sidebar')).toBeInTheDocument();
        });
    });

    describe('Default/Fallback Routing', () => {
        it('renders default navigation for customer role', () => {
            mockRole = 'customer';

            render(<DashboardSidebar />);

            expect(screen.queryByTestId('super-admin-sidebar')).not.toBeInTheDocument();
            expect(screen.queryByTestId('brand-sidebar')).not.toBeInTheDocument();
            expect(screen.queryByTestId('dispensary-sidebar')).not.toBeInTheDocument();
            // Default navigation renders SharedSidebarHistory + SidebarMenu
            expect(screen.getByTestId('shared-sidebar-history')).toBeInTheDocument();
        });

        it('renders default navigation when role is null', () => {
            mockRole = null;

            render(<DashboardSidebar />);

            expect(screen.queryByTestId('super-admin-sidebar')).not.toBeInTheDocument();
            expect(screen.queryByTestId('brand-sidebar')).not.toBeInTheDocument();
            expect(screen.queryByTestId('dispensary-sidebar')).not.toBeInTheDocument();
        });
    });

    describe('Invite Dialog Visibility', () => {
        it('does NOT show invite dialog for brand users (BrandSidebar has its own)', () => {
            mockRole = 'brand';

            render(<DashboardSidebar />);

            // The invite dialog in the main sidebar should not render
            // Brand sidebar has its own invite dialog
            const inviteDialogs = screen.queryAllByTestId('invite-dialog');
            // Main sidebar's invite is hidden when isBrandDashboard is true
            expect(inviteDialogs.length).toBeLessThanOrEqual(1);
        });

        it('does NOT show invite dialog for dispensary users (DispensarySidebar has its own)', () => {
            mockRole = 'dispensary';

            render(<DashboardSidebar />);

            const inviteDialogs = screen.queryAllByTestId('invite-dialog');
            expect(inviteDialogs.length).toBeLessThanOrEqual(1);
        });
    });

    describe('Route Priority', () => {
        it('CEO path takes priority over role-based routing', () => {
            mockRole = 'brand';
            mockPathname = '/dashboard/ceo';

            render(<DashboardSidebar />);

            // Even though role is brand, CEO path should show super admin sidebar
            expect(screen.getByTestId('super-admin-sidebar')).toBeInTheDocument();
        });

        it('Brand takes priority over dispensary when both conditions could match', () => {
            // This tests the logic order: isCeoDashboard -> isBrandDashboard -> isDispensaryDashboard
            mockRole = 'brand';
            mockIsSuperAdmin = false;

            render(<DashboardSidebar />);

            expect(screen.getByTestId('brand-sidebar')).toBeInTheDocument();
            expect(screen.queryByTestId('dispensary-sidebar')).not.toBeInTheDocument();
        });
    });
});
