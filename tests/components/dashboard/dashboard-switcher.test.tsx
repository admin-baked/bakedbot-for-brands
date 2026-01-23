/**
 * Unit Tests for Dashboard Switcher Component
 *
 * Tests the role-based routing and inbox redirect logic:
 * - Super Admin → Redirect to /dashboard/inbox
 * - super_user → Redirect to /dashboard/inbox
 * - brand → Redirect to /dashboard/inbox
 * - dispensary → Redirect to /dashboard/inbox
 * - specialist/empire → SpecialistDashboardClient
 * - customer → CustomerDashboardClient
 * - budtender → BudtenderDashboardClient
 * - fallback → DashboardPageComponent
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock state holders
let mockRole: string | null = null;
let mockUser: { email: string; uid: string } | null = null;
let mockIsRoleLoading = false;
let mockSuperAdminSession: { email: string } | null = null;

// Track router calls
const mockReplace = jest.fn();

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: mockReplace,
        push: jest.fn(),
    }),
}));

// Mock user role hook
jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: () => ({
        role: mockRole,
        user: mockUser,
        isLoading: mockIsRoleLoading,
    }),
}));

// Mock super admin session check
jest.mock('@/lib/super-admin-config', () => ({
    getSuperAdminSession: () => mockSuperAdminSession,
}));

// Mock dashboard client components
jest.mock('../../../src/app/dashboard/components/agent-interface', () => ({
    __esModule: true,
    default: () => <div data-testid="agent-interface">AgentInterface</div>,
}));

jest.mock('../../../src/app/dashboard/page-client', () => ({
    __esModule: true,
    default: ({ brandId }: { brandId: string }) => (
        <div data-testid="dashboard-page-component" data-brand-id={brandId}>
            DashboardPageComponent
        </div>
    ),
}));

jest.mock('../../../src/app/dashboard/dispensary/dashboard-client', () => ({
    __esModule: true,
    default: () => <div data-testid="dispensary-dashboard">DispensaryDashboardClient</div>,
}));

jest.mock('../../../src/app/dashboard/brand/dashboard-client', () => ({
    __esModule: true,
    default: () => <div data-testid="brand-dashboard">BrandDashboardClient</div>,
}));

jest.mock('../../../src/app/dashboard/customer/dashboard-client', () => ({
    __esModule: true,
    default: () => <div data-testid="customer-dashboard">CustomerDashboardClient</div>,
}));

jest.mock('../../../src/app/dashboard/specialist/dashboard-client', () => ({
    __esModule: true,
    default: () => <div data-testid="specialist-dashboard">SpecialistDashboardClient</div>,
}));

jest.mock('../../../src/app/dashboard/budtender/dashboard-client', () => ({
    __esModule: true,
    default: () => <div data-testid="budtender-dashboard">BudtenderDashboardClient</div>,
}));

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
    Loader2: () => <span data-testid="loader">Loading...</span>,
}));

// Import after mocks
import DashboardSwitcher from '@/app/dashboard/components/dashboard-switcher';

describe('DashboardSwitcher', () => {
    beforeEach(() => {
        // Reset all mocks
        mockRole = null;
        mockUser = null;
        mockIsRoleLoading = false;
        mockSuperAdminSession = null;
        mockReplace.mockClear();

        // Mock console.log to prevent noise in tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Loading State', () => {
        it('shows loading spinner while role is loading', () => {
            mockIsRoleLoading = true;

            render(<DashboardSwitcher />);

            expect(screen.getByTestId('loader')).toBeInTheDocument();
        });
    });

    describe('Super Admin Redirect', () => {
        it('redirects to /dashboard/inbox when super admin session exists', async () => {
            mockSuperAdminSession = { email: 'admin@example.com' };
            mockUser = { email: 'admin@example.com', uid: 'admin-uid' };
            mockRole = 'super_user';

            render(<DashboardSwitcher />);

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/dashboard/inbox');
            });
        });

        it('shows redirect message when redirecting super admin to inbox', async () => {
            mockSuperAdminSession = { email: 'admin@example.com' };
            mockUser = { email: 'admin@example.com', uid: 'admin-uid' };
            mockRole = 'super_user';

            render(<DashboardSwitcher />);

            await waitFor(() => {
                expect(screen.getByText('Redirecting to Inbox...')).toBeInTheDocument();
            });
        });

        it('does NOT grant super admin when session email does not match user email', async () => {
            mockSuperAdminSession = { email: 'admin@example.com' };
            mockUser = { email: 'different@example.com', uid: 'different-uid' };
            mockRole = 'customer';

            render(<DashboardSwitcher />);

            await waitFor(() => {
                // Should render customer dashboard, not redirect to inbox
                expect(screen.getByTestId('customer-dashboard')).toBeInTheDocument();
            });
        });
    });

    describe('Role-Based Inbox Redirects', () => {
        it('redirects super_user role to /dashboard/inbox', async () => {
            mockRole = 'super_user';
            mockUser = { email: 'user@example.com', uid: 'user-uid' };

            render(<DashboardSwitcher />);

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/dashboard/inbox');
            });

            expect(screen.getByText('Redirecting to Inbox...')).toBeInTheDocument();
        });

        it('redirects brand role to /dashboard/inbox', async () => {
            mockRole = 'brand';
            mockUser = { email: 'brand@example.com', uid: 'brand-uid' };

            render(<DashboardSwitcher />);

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/dashboard/inbox');
            });

            expect(screen.getByText('Redirecting to Inbox...')).toBeInTheDocument();
        });

        it('redirects dispensary role to /dashboard/inbox', async () => {
            mockRole = 'dispensary';
            mockUser = { email: 'disp@example.com', uid: 'disp-uid' };

            render(<DashboardSwitcher />);

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/dashboard/inbox');
            });

            expect(screen.getByText('Redirecting to Inbox...')).toBeInTheDocument();
        });
    });

    describe('Direct Dashboard Renders (No Redirect)', () => {
        it('renders SpecialistDashboardClient for specialist role', async () => {
            mockRole = 'specialist';
            mockUser = { email: 'specialist@example.com', uid: 'spec-uid' };

            render(<DashboardSwitcher />);

            await waitFor(() => {
                expect(screen.getByTestId('specialist-dashboard')).toBeInTheDocument();
            });

            expect(mockReplace).not.toHaveBeenCalled();
        });

        it('renders SpecialistDashboardClient for empire role', async () => {
            mockRole = 'empire';
            mockUser = { email: 'empire@example.com', uid: 'empire-uid' };

            render(<DashboardSwitcher />);

            await waitFor(() => {
                expect(screen.getByTestId('specialist-dashboard')).toBeInTheDocument();
            });

            expect(mockReplace).not.toHaveBeenCalled();
        });

        it('renders CustomerDashboardClient for customer role', async () => {
            mockRole = 'customer';
            mockUser = { email: 'customer@example.com', uid: 'cust-uid' };

            render(<DashboardSwitcher />);

            await waitFor(() => {
                expect(screen.getByTestId('customer-dashboard')).toBeInTheDocument();
            });

            expect(mockReplace).not.toHaveBeenCalled();
        });

        it('renders BudtenderDashboardClient for budtender role', async () => {
            mockRole = 'budtender';
            mockUser = { email: 'bud@example.com', uid: 'bud-uid' };

            render(<DashboardSwitcher />);

            await waitFor(() => {
                expect(screen.getByTestId('budtender-dashboard')).toBeInTheDocument();
            });

            expect(mockReplace).not.toHaveBeenCalled();
        });
    });

    describe('Fallback Behavior', () => {
        it('renders DashboardPageComponent for unknown role', async () => {
            mockRole = 'unknown_role';
            mockUser = { email: 'unknown@example.com', uid: 'unknown-uid' };

            render(<DashboardSwitcher />);

            await waitFor(() => {
                expect(screen.getByTestId('dashboard-page-component')).toBeInTheDocument();
            });
        });

        it('renders DashboardPageComponent for null role', async () => {
            mockRole = null;
            mockUser = { email: 'null@example.com', uid: 'null-uid' };

            render(<DashboardSwitcher />);

            await waitFor(() => {
                expect(screen.getByTestId('dashboard-page-component')).toBeInTheDocument();
            });
        });

        it('passes user uid as brandId to fallback component', async () => {
            mockRole = null;
            mockUser = { email: 'user@example.com', uid: 'test-user-uid' };

            render(<DashboardSwitcher />);

            await waitFor(() => {
                const component = screen.getByTestId('dashboard-page-component');
                expect(component).toHaveAttribute('data-brand-id', 'test-user-uid');
            });
        });
    });

    describe('Redirect Priority Order', () => {
        it('super admin session takes priority over role', async () => {
            // User has brand role but also super admin session
            mockSuperAdminSession = { email: 'admin@example.com' };
            mockUser = { email: 'admin@example.com', uid: 'admin-uid' };
            mockRole = 'brand'; // Would normally redirect to inbox, but super admin should take priority

            render(<DashboardSwitcher />);

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/dashboard/inbox');
            });
        });

        it('specialist/empire renders component instead of redirecting', async () => {
            // Even though other roles redirect, specialist should NOT
            mockRole = 'specialist';
            mockUser = { email: 'spec@example.com', uid: 'spec-uid' };

            render(<DashboardSwitcher />);

            await waitFor(() => {
                expect(screen.getByTestId('specialist-dashboard')).toBeInTheDocument();
            });

            // Ensure no redirect was called
            expect(mockReplace).not.toHaveBeenCalled();
        });
    });

    describe('Security: Super Admin Session Validation', () => {
        it('invalidates super admin session when user email mismatches', async () => {
            mockSuperAdminSession = { email: 'admin@example.com' };
            mockUser = { email: 'hacker@example.com', uid: 'hacker-uid' };
            mockRole = 'customer';

            render(<DashboardSwitcher />);

            await waitFor(() => {
                // Should NOT redirect to inbox (super admin access denied)
                expect(mockReplace).not.toHaveBeenCalled();
                // Should render customer dashboard
                expect(screen.getByTestId('customer-dashboard')).toBeInTheDocument();
            });

            // Security warning should have been logged
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Security Alert')
            );
        });
    });
});
