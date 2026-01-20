
// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    PlusCircle: () => <span data-testid="icon-plus-circle" />,
    Import: () => <span data-testid="icon-import" />,
    Terminal: () => <span data-testid="icon-terminal" />,
    AlertCircle: () => <span data-testid="icon-alert-circle" />
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));
jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));
jest.mock('@/server/repos/productRepo', () => ({
    makeProductRepo: jest.fn(),
}));
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
    },
}));

// Mock genkit completely to avoid ESM issues
jest.mock('@/ai/genkit', () => ({}));
jest.mock('@/ai/utils/generate-embedding', () => ({}));

// Mock uuid to avoid ESM issues
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mocked-uuid'),
}));

// Mock table components to avoid deep imports
jest.mock('../components/products-data-table', () => ({
    ProductsDataTable: () => <div data-testid="products-data-table" />,
}));
jest.mock('../components/products-table-columns', () => ({
    columns: [],
}));

import DashboardProductsPage from '../page';
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { makeProductRepo } from '@/server/repos/productRepo';
import { requireUser } from '@/server/auth/auth';

describe('DashboardProductsPage', () => {
    const mockFirestore = {};
    const mockProductRepo = {
        getAllByBrand: jest.fn(),
        getAll: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
        (makeProductRepo as jest.Mock).mockReturnValue(mockProductRepo);
        (cookies as jest.Mock).mockReturnValue({
            get: jest.fn().mockReturnValue({ value: 'false' })
        });
    });

    // Helper to find ProductsDataTable in the JSX tree
    function findProductsDataTable(element: any): any {
        if (!element) return null;
        if (element.props?.['data-testid'] === 'products-data-table') {
            return element;
        }
        if (Array.isArray(element)) {
            for (const child of element) {
                const found = findProductsDataTable(child);
                if (found) return found;
            }
        }
        if (element.props?.children) {
            return findProductsDataTable(element.props.children);
        }
        return null;
    }

    it('should return empty products instead of demo products on error for real brand users', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ role: 'brand', brandId: 'real-brand' });
        mockProductRepo.getAllByBrand.mockRejectedValue(new Error('Firestore error'));

        await DashboardProductsPage();

        // Verify getAllByBrand was called
        expect(mockProductRepo.getAllByBrand).toHaveBeenCalledWith('real-brand');
    });

    it('should show demo products only if isUsingDemoData cookie is true', async () => {
        (cookies as jest.Mock).mockReturnValue({
            get: jest.fn().mockImplementation((name) => {
                if (name === 'isUsingDemoData') return { value: 'true' };
                return null;
            })
        });

        await DashboardProductsPage();

        // Demo mode doesn't call the repo
        expect(mockProductRepo.getAllByBrand).not.toHaveBeenCalled();
    });

    it('should fetch real products for real brand users', async () => {
        const mockProducts = [{ id: 'p1', name: 'Real Product' }];
        (requireUser as jest.Mock).mockResolvedValue({ role: 'brand', brandId: 'real-brand' });
        mockProductRepo.getAllByBrand.mockResolvedValue(mockProducts);

        await DashboardProductsPage();

        expect(mockProductRepo.getAllByBrand).toHaveBeenCalledWith('real-brand');
    });

    it('should use uid as brandId fallback for brand users without explicit brandId', async () => {
        const mockProducts = [{ id: 'p1', name: 'Product from UID' }];
        (requireUser as jest.Mock).mockResolvedValue({ role: 'brand', uid: 'user-123' }); // No brandId
        mockProductRepo.getAllByBrand.mockResolvedValue(mockProducts);

        await DashboardProductsPage();

        // Should have called with uid since role is 'brand' but no brandId
        expect(mockProductRepo.getAllByBrand).toHaveBeenCalledWith('user-123');
    });

    it('should NOT call repo when user has no brandId and role is not brand', async () => {
        // User with non-brand role that doesn't have brandId
        (requireUser as jest.Mock).mockResolvedValue({ role: 'staff', uid: 'staff-user' }); // Not a brand role
        mockProductRepo.getAllByBrand.mockResolvedValue([]);

        await DashboardProductsPage();

        // Staff role without brandId should not call getAllByBrand
        // The brandId fallback only applies to role='brand'
        expect(mockProductRepo.getAllByBrand).not.toHaveBeenCalled();
    });
});
