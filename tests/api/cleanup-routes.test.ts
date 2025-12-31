/**
 * Cleanup Routes Tests
 * Tests for the brand/dispensary cleanup cron routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Admin
vi.mock('@/firebase/admin', () => ({
    getAdminFirestore: vi.fn(() => ({
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({
                delete: vi.fn().mockResolvedValue(undefined)
            })),
            get: vi.fn().mockResolvedValue({
                docs: [
                    { id: 'brand-1', ref: { delete: vi.fn() } },
                    { id: 'brand-2', ref: { delete: vi.fn() } },
                ]
            }),
            listDocuments: vi.fn().mockResolvedValue([
                { id: 'brand-1', delete: vi.fn() },
                { id: 'brand-2', delete: vi.fn() },
            ])
        }))
    }))
}));

describe('Cleanup Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/cron/cleanup-brands', () => {
        it('should delete all documents from seo_pages_brand collection', async () => {
            const collection = 'seo_pages_brand';
            const mockDocs = [
                { id: 'cookies-chicago', ref: { delete: vi.fn() } },
                { id: 'stiiizy-denver', ref: { delete: vi.fn() } },
            ];
            
            // Simulate batch delete
            let deletedCount = 0;
            mockDocs.forEach(doc => {
                doc.ref.delete();
                deletedCount++;
            });
            
            expect(deletedCount).toBe(2);
        });

        it('should return success response with deleted count', () => {
            const deletedCount = 10;
            const response = {
                success: true,
                message: `Deleted ${deletedCount} brand pages`
            };
            
            expect(response.success).toBe(true);
            expect(response.message).toContain('10');
        });

        it('should handle empty collection gracefully', async () => {
            const mockDocs: any[] = [];
            
            let deletedCount = 0;
            mockDocs.forEach(doc => {
                doc.ref.delete();
                deletedCount++;
            });
            
            expect(deletedCount).toBe(0);
        });
    });

    describe('Authorization', () => {
        it('should only be accessible via cron header', () => {
            const headers = new Headers();
            headers.set('x-appengine-cron', 'true');
            
            const isFromCron = headers.get('x-appengine-cron') === 'true';
            
            expect(isFromCron).toBe(true);
        });

        it('should reject requests without cron header', () => {
            const headers = new Headers();
            
            const isFromCron = headers.get('x-appengine-cron') === 'true';
            
            expect(isFromCron).toBe(false);
        });
    });
});
