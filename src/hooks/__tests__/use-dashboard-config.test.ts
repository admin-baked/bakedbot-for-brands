import { renderHook } from '@testing-library/react';
import { useDashboardConfig } from '../use-dashboard-config';
import { useUserRole } from '@/hooks/use-user-role';
import { usePathname } from 'next/navigation';

// Mock dependencies
jest.mock('@/hooks/use-user-role');
jest.mock('next/navigation');

describe('useDashboardConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should filter links based on brand role', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });
        (usePathname as jest.Mock).mockReturnValue('/dashboard');

        const { result } = renderHook(() => useDashboardConfig());

        // Brand should see 'Products'
        const hasProducts = result.current.navLinks.some(link => link.label === 'Products');
        expect(hasProducts).toBe(true);

        // Brand should NOT see 'Customers' (dispensary specific)
        const hasCustomers = result.current.navLinks.some(link => link.label === 'Customers');
        expect(hasCustomers).toBe(false);
    });

    it('should filter links based on dispensary role', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'dispensary' });
        (usePathname as jest.Mock).mockReturnValue('/dashboard');

        const { result } = renderHook(() => useDashboardConfig());

        // Dispensary should see 'Customers'
        const hasCustomers = result.current.navLinks.some(link => link.label === 'Customers');
        expect(hasCustomers).toBe(true);

        // Dispensary should NOT see 'Products' (brand specific)
        const hasProducts = result.current.navLinks.some(link => link.label === 'Products');
        expect(hasProducts).toBe(false);
    });

    it('should mark the active link correctly', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });
        (usePathname as jest.Mock).mockReturnValue('/dashboard/projects');

        const { result } = renderHook(() => useDashboardConfig());

        const projectsLink = result.current.navLinks.find(link => link.label === 'Projects');
        expect(projectsLink?.active).toBe(true);

        const overviewLink = result.current.navLinks.find(link => link.label === 'Overview');
        expect(overviewLink?.active).toBe(false);
    });

    it('should allow super_user to access restricted areas', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'super_user' });
        (usePathname as jest.Mock).mockReturnValue('/dashboard');

        const { result } = renderHook(() => useDashboardConfig());

        // Super User should see Admin Console
        const hasAdminConsole = result.current.navLinks.some(link => link.label === 'Admin Console');
        expect(hasAdminConsole).toBe(true);

        // Super User should see Brand links
        const hasProducts = result.current.navLinks.some(link => link.label === 'Products');
        expect(hasProducts).toBe(true);
    });

    it('should show Creative Center to authorized roles', () => {
        const authorizedRoles = ['brand', 'super_user', 'dispensary'];

        authorizedRoles.forEach(role => {
            (useUserRole as jest.Mock).mockReturnValue({ role });
            const { result } = renderHook(() => useDashboardConfig());
            const hasCreative = result.current.navLinks.some(link => link.label === 'Creative Center');
            expect(hasCreative).toBe(true);
        });
    });

    it('should HIDE Creative Center from unauthorized roles', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'customer' });
        const { result } = renderHook(() => useDashboardConfig());
        const hasCreative = result.current.navLinks.some(link => link.label === 'Creative Center');
        expect(hasCreative).toBe(false);
    });
});
