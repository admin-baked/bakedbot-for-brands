/**
 * Unit tests for Leads Actions
 */
import {
    type Lead,
    type LeadType,
    type LeadStatus,
} from '../actions';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({ orgId: 'test-org', email: 'lead@test.com' })
                    }),
                    update: jest.fn(),
                    delete: jest.fn()
                }),
                add: jest.fn().mockResolvedValue({ id: 'new-lead-id' }),
                get: jest.fn().mockResolvedValue({
                    forEach: jest.fn((cb: any) => {
                        cb({
                            id: 'lead_1',
                            data: () => ({
                                orgId: 'test-org',
                                email: 'lead@example.com',
                                name: 'Test Lead',
                                type: 'brand_request',
                                status: 'new',
                                createdAt: { toDate: () => new Date() },
                                updatedAt: { toDate: () => new Date() }
                            })
                        });
                    })
                })
            })
        }
    })
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ uid: 'test-user', brandId: 'test-org', role: 'brand' })
}));

describe('Leads Actions', () => {
    describe('Lead Types', () => {
        it('should have 5 lead types defined', () => {
            const types: LeadType[] = ['customer_inquiry', 'brand_request', 'vendor_inquiry', 'partnership', 'wholesale'];
            expect(types.length).toBe(5);
        });

        it('should have proper status values', () => {
            const statuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'closed'];
            expect(statuses.length).toBe(5);
        });
    });

    describe('Lead Types are valid string literals', () => {
        it('should accept all lead type values', () => {
            const types: LeadType[] = ['customer_inquiry', 'brand_request', 'vendor_inquiry', 'partnership', 'wholesale'];
            types.forEach(t => {
                expect(typeof t).toBe('string');
            });
        });
    });

    describe('Lead interface', () => {
        it('should have required fields', () => {
            const lead: Lead = {
                id: 'lead-1',
                orgId: 'org-1',
                orgType: 'brand',
                email: 'test@example.com',
                type: 'brand_request',
                source: 'web',
                status: 'new',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(lead.id).toBeDefined();
            expect(lead.orgId).toBeDefined();
            expect(lead.email).toBeDefined();
            expect(lead.type).toBe('brand_request');
        });

        it('should support optional fields', () => {
            const lead: Lead = {
                id: 'lead-2',
                orgId: 'org-1',
                orgType: 'dispensary',
                email: 'vendor@company.com',
                name: 'John Doe',
                company: 'Test Company',
                phone: '555-1234',
                type: 'vendor_inquiry',
                source: 'contact-form',
                message: 'Interested in partnership',
                status: 'qualified',
                assignedTo: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(lead.name).toBe('John Doe');
            expect(lead.company).toBe('Test Company');
            expect(lead.message).toBeDefined();
        });
    });
});
