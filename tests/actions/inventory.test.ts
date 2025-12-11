/**
 * Unit Tests: Inventory Server Actions
 */

import { syncInventoryAction } from '@/app/actions/inventory';
import { iheartService } from '@/server/services/iheart';
import { revalidatePath } from 'next/cache';

// Mock dependencies
jest.mock('@/server/services/iheart', () => ({
    iheartService: {
        syncMenu: jest.fn()
    }
}));

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

describe('Inventory Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('syncInventoryAction', () => {
        it('should sync menu successfully', async () => {
            (iheartService.syncMenu as jest.Mock).mockResolvedValueOnce({
                success: true,
                count: 10
            });

            const result = await syncInventoryAction('org_123');

            expect(result.success).toBe(true);
            expect(result.count).toBe(10);
            expect(iheartService.syncMenu).toHaveBeenCalledWith('org_123');
            expect(revalidatePath).toHaveBeenCalledWith('/dashboard/inventory');
        });

        it('should handle validation error (missing orgId)', async () => {
            const result = await syncInventoryAction('');

            expect(result.success).toBe(false);
            expect(result.error).toContain('required');
            expect(iheartService.syncMenu).not.toHaveBeenCalled();
        });

        it('should handle service failures', async () => {
            (iheartService.syncMenu as jest.Mock).mockResolvedValueOnce({
                success: false,
                count: 0,
                error: 'Service unavailable'
            });

            const result = await syncInventoryAction('org_123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Service unavailable');
            expect(revalidatePath).not.toHaveBeenCalled();
        });

        it('should handle exceptions', async () => {
            (iheartService.syncMenu as jest.Mock).mockRejectedValueOnce(new Error('Crash'));

            const result = await syncInventoryAction('org_123');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Crash');
        });
    });
});
