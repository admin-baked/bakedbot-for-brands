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
});
