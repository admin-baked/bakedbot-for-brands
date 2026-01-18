
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

    it('should return empty products instead of demo products on error for real brand users', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ role: 'brand', brandId: 'real-brand' });
        mockProductRepo.getAllByBrand.mockRejectedValue(new Error('Firestore error'));

        const result = await DashboardProductsPage();
        
        // The result is JSX, so we need to check the props of the internal component
        // But since we are testing a server component as a function:
        expect(mockProductRepo.getAllByBrand).toHaveBeenCalledWith('real-brand');
        
        // To verify it didn't use demo data, we check what was passed to ProductsDataTable
        // This is tricky with raw JSX return. Let's look at the result structure.
        // DashboardProductsPage returns <div ...><ProductsDataTable data={products} ... /></div>
        
        const productsDataTableProp = (result as any).props.children[2].props.data;
        expect(productsDataTableProp).toEqual([]);
        expect(productsDataTableProp).not.toEqual(expect.arrayContaining([{ id: 'demo-1' }]));
    });

    it('should show demo products only if isUsingDemoData cookie is true', async () => {
        (cookies as jest.Mock).mockReturnValue({
            get: jest.fn().mockImplementation((name) => {
                if (name === 'isUsingDemoData') return { value: 'true' };
                return null;
            })
        });

        const result = await DashboardProductsPage();
        const productsDataTableProp = (result as any).props.children[2].props.data;
        
        expect(productsDataTableProp.length).toBeGreaterThan(0);
        expect(productsDataTableProp[0].id).toContain('demo');
    });

    it('should fetch real products for real brand users', async () => {
        const mockProducts = [{ id: 'p1', name: 'Real Product' }];
        (requireUser as jest.Mock).mockResolvedValue({ role: 'brand', brandId: 'real-brand' });
        mockProductRepo.getAllByBrand.mockResolvedValue(mockProducts);

        const result = await DashboardProductsPage();
        const productsDataTableProp = (result as any).props.children[2].props.data;
        
        expect(productsDataTableProp).toEqual(mockProducts);
    });
});
