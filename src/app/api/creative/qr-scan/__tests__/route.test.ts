/**
 * Tests for QR Scan Tracking API Route
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/firebase/server-client';

// Mock dependencies
jest.mock('@/firebase/server-client');
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('POST /api/creative/qr-scan', () => {
    const mockContentId = '550e8400-e29b-41d4-a716-446655440000';
    const mockTenantId = 'test-tenant';

    let mockFirestore: any;
    let mockRunTransaction: jest.Mock;
    let mockGet: jest.Mock;
    let mockUpdate: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockGet = jest.fn();
        mockUpdate = jest.fn();
        mockRunTransaction = jest.fn();

        // Mock Firestore document
        const mockDoc = {
            exists: true,
            data: () => ({
                id: mockContentId,
                tenantId: mockTenantId,
                status: 'approved',
                qrStats: {
                    scans: 0,
                    scansByPlatform: {},
                    scansByLocation: {},
                },
            }),
        };

        mockFirestore = {
            collection: jest.fn(() => ({
                listDocuments: jest.fn().mockResolvedValue([
                    { path: `tenants/${mockTenantId}` },
                ]),
            })),
            doc: jest.fn(() => ({
                get: mockGet.mockResolvedValue(mockDoc),
                update: mockUpdate,
            })),
            runTransaction: mockRunTransaction.mockImplementation(async (callback) => {
                await callback({
                    get: mockGet,
                    update: mockUpdate,
                });
            }),
        };

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: mockFirestore,
        });
    });

    it('should track QR scan successfully', async () => {
        const request = new NextRequest('http://localhost/api/creative/qr-scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
            },
            body: JSON.stringify({
                contentId: mockContentId,
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.scans).toBeDefined();
    });

    it('should return 400 if contentId is missing', async () => {
        const request = new NextRequest('http://localhost/api/creative/qr-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('contentId is required');
    });

    it('should detect platform from User-Agent', async () => {
        const request = new NextRequest('http://localhost/api/creative/qr-scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Instagram 123.0.0.0 (iPhone; iOS 15_0)',
            },
            body: JSON.stringify({
                contentId: mockContentId,
            }),
        });

        await POST(request);

        // Should detect Instagram from User-Agent
        expect(mockRunTransaction).toHaveBeenCalled();
    });

    it('should handle platform parameter override', async () => {
        const request = new NextRequest('http://localhost/api/creative/qr-scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contentId: mockContentId,
                platform: 'tiktok',
            }),
        });

        await POST(request);

        expect(mockRunTransaction).toHaveBeenCalled();
    });

    it('should return 404 if content not found', async () => {
        mockGet.mockResolvedValue({ exists: false });

        const request = new NextRequest('http://localhost/api/creative/qr-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contentId: 'non-existent-id',
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Content not found');
    });

    it('should handle rate limiting', async () => {
        // Make first request
        const request1 = new NextRequest('http://localhost/api/creative/qr-scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-forwarded-for': '192.168.1.1',
            },
            body: JSON.stringify({
                contentId: mockContentId,
            }),
        });

        const response1 = await POST(request1);
        expect(response1.status).toBe(200);

        // Make second request immediately (should be rate limited)
        const request2 = new NextRequest('http://localhost/api/creative/qr-scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-forwarded-for': '192.168.1.1',
            },
            body: JSON.stringify({
                contentId: mockContentId,
            }),
        });

        const response2 = await POST(request2);
        const data2 = await response2.json();

        expect(response2.status).toBe(429);
        expect(data2.success).toBe(false);
        expect(data2.error).toBe('Rate limit exceeded');
    });

    it('should increment scan count', async () => {
        const request = new NextRequest('http://localhost/api/creative/qr-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contentId: mockContentId,
            }),
        });

        await POST(request);

        expect(mockRunTransaction).toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalled();
    });

    it('should track scans by platform', async () => {
        const request = new NextRequest('http://localhost/api/creative/qr-scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Android 10; Mobile)',
            },
            body: JSON.stringify({
                contentId: mockContentId,
            }),
        });

        await POST(request);

        // Should update scansByPlatform
        expect(mockUpdate).toHaveBeenCalled();
    });

    it('should track scans by location when provided', async () => {
        const request = new NextRequest('http://localhost/api/creative/qr-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contentId: mockContentId,
                location: 'US',
            }),
        });

        await POST(request);

        // Should update scansByLocation
        expect(mockUpdate).toHaveBeenCalled();
    });

    it('should handle Firestore transaction errors', async () => {
        mockRunTransaction.mockRejectedValue(new Error('Transaction failed'));

        const request = new NextRequest('http://localhost/api/creative/qr-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contentId: mockContentId,
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Internal server error');
    });

    it('should extract IP from x-real-ip header', async () => {
        const request = new NextRequest('http://localhost/api/creative/qr-scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-real-ip': '203.0.113.1',
            },
            body: JSON.stringify({
                contentId: mockContentId,
            }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
    });

    it('should handle missing headers gracefully', async () => {
        const request = new NextRequest('http://localhost/api/creative/qr-scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contentId: mockContentId,
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
