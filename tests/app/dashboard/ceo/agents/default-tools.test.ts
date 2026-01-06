
import { defaultEzalTools, defaultSmokeyTools } from '@/app/dashboard/ceo/agents/default-tools';

// Mock dependencies
jest.mock('@/server/services/firecrawl', () => ({
    discovery: {
        isConfigured: jest.fn().mockReturnValue(false),
        search: jest.fn(),
        discoverUrl: jest.fn()
    }
}));

jest.mock('@/server/tools/web-search', () => ({
    searchWeb: jest.fn().mockResolvedValue([{ title: 'Test Result', link: 'example.com', snippet: 'Test snippet' }]),
    formatSearchResults: jest.fn().mockReturnValue('Formatted Results')
}));

// Mock missing top-level dependencies
jest.mock('@/ai/genkit', () => ({
    ai: {
        generate: jest.fn()
    }
}));

jest.mock('@/server/agents/deebo', () => ({
    deebo: {
        checkContent: jest.fn()
    }
}));

jest.mock('@/lib/notifications/blackleaf-service', () => ({
    blackleafService: {
        sendCustomMessage: jest.fn()
    }
}));

// Mock CannMenusService
const mockSearchProducts = jest.fn();
jest.mock('@/server/services/cannmenus', () => {
    return {
        CannMenusService: jest.fn().mockImplementation(() => ({
            searchProducts: mockSearchProducts
        }))
    };
});

// Mock Browser Tool
const mockBrowserAction = jest.fn();
jest.mock('@/server/tools/browser', () => ({
    browserAction: mockBrowserAction
}));

// Mock Firebase & Auth & Repos for Smokey
const mockGetAllByLocation = jest.fn();
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({ firestore: { collection: jest.fn() } })
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ locationId: 'loc_123', uid: 'user_123' })
}));

jest.mock('@/server/repos/productRepo', () => ({
    makeProductRepo: jest.fn().mockReturnValue({
        getAllByLocation: mockGetAllByLocation
    })
}));

describe('defaultEzalTools', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('searchProducts', () => {
        it('should call CannMenusService.searchProducts and format results', async () => {
             mockSearchProducts.mockResolvedValue({
                 products: [
                     { product_name: 'Vape 1', brand_name: 'Brand A', latest_price: 20, retailer_name: 'Retailer X', menu_url: 'http://test.com' }
                 ]
             });

             const result = await defaultEzalTools.searchProducts({ search: 'vape', near: '60601' });

             expect(mockSearchProducts).toHaveBeenCalledWith({ search: 'vape', near: '60601' });
             expect(result.success).toBe(true);
             expect(result.count).toBe(1);
             expect(result.products[0].name).toBe('Vape 1');
        });

        it('should return message when no products found', async () => {
            mockSearchProducts.mockResolvedValue({ products: [] });

            const result = await defaultEzalTools.searchProducts({ search: 'missing' });

            expect(result.success).toBe(true);
            expect(result.count).toBe(0);
            expect(result.message).toContain('No products found');
        });

         it('should return error if service throws', async () => {
            mockSearchProducts.mockRejectedValue(new Error('API fail'));

            const result = await defaultEzalTools.searchProducts({ search: 'fail' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('API fail');
        });
    });

    describe('browse', () => {
        it('should call browserAction with correct steps for "screenshot"', async () => {
            mockBrowserAction.mockResolvedValue({ success: true, screenshot: 'base64image' });

            const result = await defaultEzalTools.browse('http://example.com', 'screenshot');

            expect(mockBrowserAction).toHaveBeenCalledWith({
                steps: [
                    { action: 'goto', url: 'http://example.com' },
                    { action: 'screenshot' }
                ],
                headless: true
            });
            expect(result.success).toBe(true);
            expect(result.screenshot).toBe('base64image');
        });

        it('should call browserAction with correct steps for "discover" with selector', async () => {
            mockBrowserAction.mockResolvedValue({ success: true, data: 'Extracted text' });

            const result = await defaultEzalTools.browse('http://example.com', 'discover', 'h1');

            expect(mockBrowserAction).toHaveBeenCalledWith({
                steps: [
                    { action: 'goto', url: 'http://example.com' },
                    { action: 'discover', selector: 'h1' }
                ],
                headless: true
            });
            expect(result.success).toBe(true);
            expect(result.data).toBe('Extracted text');
        });

        it('should handle errors from browserAction', async () => {
            mockBrowserAction.mockResolvedValue({ success: false, error: 'Timeout' });

            const result = await defaultEzalTools.browse('http://bad.com');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Timeout');
        });
    });
    });
});

describe('defaultSmokeyTools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('searchMenu', () => {
        it('should search products by name/brand/category and return top results', async () => {
            mockGetAllByLocation.mockResolvedValue([
                { name: 'Sativa Gummies', brandName: 'Wana', category: 'Edibles', inStock: true, price: 20, description: 'Yummy' },
                { name: 'Indica Gummies', brandName: 'Kiva', category: 'Edibles', inStock: false, price: 22 },
                { name: 'Sleep Vape', brandName: 'Pax', category: 'Vape', inStock: true, price: 50 },
                { name: 'Blue Dream', brandName: 'Wana', category: 'Flower', inStock: true, price: 35 }
            ]);

            const result = await defaultSmokeyTools.searchMenu('gummies');

            // Should find only Sativa Gummies (Indica Gummies is out of stock)
            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
            expect(result.products[0].name).toBe('Sativa Gummies');
        });

        it('should return empty result if no matches', async () => {
             mockGetAllByLocation.mockResolvedValue([
                { name: 'Sativa Gummies', brandName: 'Wana', category: 'Edibles', inStock: true, price: 20 }
             ]);
             
             const result = await defaultSmokeyTools.searchMenu('topical');
             expect(result.success).toBe(true);
             expect(result.count).toBe(0);
        });
    });
});
