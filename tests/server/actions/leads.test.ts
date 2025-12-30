
import { captureLead, getLeads } from '@/app/dashboard/leads/actions';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn()
}));

describe('Leads Actions', () => {
    let mockFirestore: any;
    let mockCollection: any;
    let mockQuery: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockQuery = {
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn()
        };

        mockCollection = {
            add: jest.fn().mockResolvedValue({ id: 'new_lead_id' }),
            where: jest.fn(() => mockQuery),
            doc: jest.fn()
        };

        mockFirestore = {
            collection: jest.fn(() => mockCollection)
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'user_123', role: 'brand', brandId: 'brand_123' });
    });

    describe('captureLead', () => {
        it('should create a lead successfully', async () => {
            const input = {
                email: 'test@example.com',
                name: 'Test Client',
                message: 'Hello'
            };

            const result = await captureLead('brand_123', input);

            expect(result.success).toBe(true);
            expect(result.id).toBe('new_lead_id');
            expect(mockFirestore.collection).toHaveBeenCalledWith('leads');
            expect(mockCollection.add).toHaveBeenCalledWith(expect.objectContaining({
                email: 'test@example.com',
                name: 'Test Client',
                orgId: 'brand_123',
                source: 'web', // Default
                status: 'new'
            }));
        });

        it('should reject invalid email', async () => {
            await expect(captureLead('brand_123', { email: 'invalid' }))
                .rejects.toThrow('Invalid email');
        });
    });

    describe('getLeads', () => {
        it('should fetch leads for the logged in user org', async () => {
             const mockDocs = [
                 {
                     id: 'lead_1',
                     data: () => ({
                         email: 'lead1@test.com',
                         status: 'new',
                         createdAt: new Date(),
                         updatedAt: new Date()
                     })
                 }
             ];
             
             mockQuery.get.mockResolvedValue({ 
                 forEach: (cb: any) => mockDocs.forEach(cb) 
             });

             const result = await getLeads();

             expect(result.leads).toHaveLength(1);
             expect(result.stats.total).toBe(1);
             expect(result.stats.new).toBe(1);
             expect(mockCollection.where).toHaveBeenCalledWith('orgId', '==', 'brand_123'); // From mock requireUser
        });

        it('should allow fetching by specific orgId if provided', async () => {
             mockQuery.get.mockResolvedValue({ forEach: jest.fn() });

             await getLeads('disp_456');

             expect(mockCollection.where).toHaveBeenCalledWith('orgId', '==', 'disp_456');
        });
    });
});
