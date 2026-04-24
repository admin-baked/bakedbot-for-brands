
import { leaflinkAction } from '../leaflink';

// Mock auth
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ uid: 'test-user', role: 'brand' }),
}));

// Mock token storage — leaflinkAction now calls getLeafLinkKey(uid)
jest.mock('@/server/integrations/leaflink/token-storage', () => ({
    getLeafLinkKey: jest.fn(),
}));

import { getLeafLinkKey } from '@/server/integrations/leaflink/token-storage';

// Mock global fetch
global.fetch = jest.fn();

describe('leaflinkAction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fail if authentication is missing', async () => {
        // Mock missing API key
        (getLeafLinkKey as jest.Mock).mockResolvedValue(null);

        const result = await leaflinkAction({ action: 'list_orders' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('not connected');
    });

    it('should list orders successfully', async () => {
        (getLeafLinkKey as jest.Mock).mockResolvedValue('test-key');

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
        (getLeafLinkKey as jest.Mock).mockResolvedValue('test-key');

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
        (getLeafLinkKey as jest.Mock).mockResolvedValue('test-key');

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
        (getLeafLinkKey as jest.Mock).mockResolvedValue('test-key');

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            statusText: 'Internal Server Error'
        });

        const result = await leaflinkAction({ action: 'list_orders' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('LeafLink API error');
    });
});
