/**
 * @jest-environment node
 */
import { POST } from '@/app/api/drop-alerts/route';
import { NextRequest } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

// Mock getAdminFirestore
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

describe('POST /api/drop-alerts', () => {
    let mockFirestore: any;
    let mockCollection: any;
    let mockAdd: any;
    let mockWhere: any;
    let mockLimit: any;
    let mockGet: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Firestore mocks
        mockAdd = jest.fn().mockResolvedValue({ id: 'new-alert-id' });
        mockGet = jest.fn().mockResolvedValue({ empty: true }); // Default: no existing alert
        mockLimit = jest.fn().mockReturnValue({ get: mockGet });
        mockWhere = jest.fn().mockReturnValue({ where: mockWhere, limit: mockLimit }); // Chaining
        mockCollection = jest.fn().mockReturnValue({
            add: mockAdd,
            where: mockWhere
        });

        mockFirestore = {
            collection: mockCollection
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    });

    it('should return 400 if required fields are missing', async () => {
        const req = new NextRequest('http://localhost/api/drop-alerts', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com' }), // Missing zip/brand
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid email format', async () => {
        const req = new NextRequest('http://localhost/api/drop-alerts', {
            method: 'POST',
            body: JSON.stringify({
                email: 'invalid-email',
                zipCode: '12345',
                brandName: 'TestBrand'
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('should return 400 for invalid zip code', async () => {
        const req = new NextRequest('http://localhost/api/drop-alerts', {
            method: 'POST',
            body: JSON.stringify({
                email: 'test@example.com',
                zipCode: '123', // Too short
                brandName: 'TestBrand'
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('should save a new alert and return success', async () => {
        const req = new NextRequest('http://localhost/api/drop-alerts', {
            method: 'POST',
            body: JSON.stringify({
                email: 'test@example.com',
                zipCode: '12345',
                brandName: 'TestBrand'
            }),
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockCollection).toHaveBeenCalledWith('drop_alerts');
        expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
            email: 'test@example.com',
            zipCode: '12345',
            brandName: 'TestBrand',
            status: 'active'
        }));
    });

    it('should return success but skipping save if alert already exists', async () => {
        // Setup isolated mock chain for this test to ensure it returns found
        const mockFoundGet = jest.fn().mockResolvedValue({ empty: false });
        const mockLocalLimit = jest.fn().mockReturnValue({ get: mockFoundGet });
        const mockLocalWhere = jest.fn();
        // Make where return itself and expose limit
        mockLocalWhere.mockReturnValue({ where: mockLocalWhere, limit: mockLocalLimit });

        const mockLocalCollection = jest.fn().mockReturnValue({
            add: mockAdd,
            where: mockLocalWhere
        });

        (getAdminFirestore as jest.Mock).mockReturnValue({
            collection: mockLocalCollection
        });

        const req = new NextRequest('http://localhost/api/drop-alerts', {
            method: 'POST',
            body: JSON.stringify({
                email: 'test@example.com',
                zipCode: '12345',
                brandName: 'TestBrand'
            }),
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.message).toContain('Already subscribed');
        expect(mockAdd).not.toHaveBeenCalled();
    });
});
