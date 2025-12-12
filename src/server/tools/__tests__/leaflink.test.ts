
import { leaflinkAction } from '../leaflink';
import { getAdminFirestore } from '@/firebase/admin';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));

// Mock global fetch
global.fetch = jest.fn();

describe('leaflinkAction', () => {
    const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);
    });

    it('should fail if authentication is missing', async () => {
        // Mock missing API key
        mockDb.get.mockResolvedValue({
            data: () => ({}) // No apiKey
        });

        const result = await leaflinkAction({ action: 'list_orders' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('Authentication required');
    });

    it('should list orders successfully', async () => {
        // Mock valid API key
        mockDb.get.mockResolvedValue({
            data: () => ({ apiKey: 'test-key' })
        });

        // Mock fetch response
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                results: [
                    { number: '123', status: 'Accepted', total: 100 }
                ]
            })
        });

        const result = await leaflinkAction({ action: 'list_orders' });
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe('123');
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/orders-received/'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': 'Token test-key'
                })
            })
        );
    });

    it('should list products successfully', async () => {
        mockDb.get.mockResolvedValue({
            data: () => ({ apiKey: 'test-key' })
        });

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                results: [
                    { id: 'prod-1', name: 'Product A', inventory_quantity: 50 }
                ]
            })
        });

        const result = await leaflinkAction({ action: 'list_products' });
        expect(result.success).toBe(true);
        expect(result.data[0].name).toBe('Product A');
    });

    it('should update inventory successfully', async () => {
        mockDb.get.mockResolvedValue({
            data: () => ({ apiKey: 'test-key' })
        });

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                id: 'prod-1',
                inventory_quantity: 100
            })
        });

        const result = await leaflinkAction({
            action: 'update_inventory',
            productId: 'prod-1',
            quantity: 100
        });

        expect(result.success).toBe(true);
        expect(result.data.new_inventory).toBe(100);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/products/prod-1/'),
            expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({ inventory_quantity: 100 })
            })
        );
    });

    it('should handle API errors gracefully', async () => {
        mockDb.get.mockResolvedValue({
            data: () => ({ apiKey: 'test-key' })
        });

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            statusText: 'Internal Server Error'
        });

        const result = await leaflinkAction({ action: 'list_orders' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('LeafLink API error');
    });
});
