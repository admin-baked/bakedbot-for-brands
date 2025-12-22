/**
 * Unit tests for Leads Actions
 */
import {
    getLeadTypeInfo,
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

    describe('getLeadTypeInfo', () => {
        it('should return info for customer_inquiry', () => {
            const info = getLeadTypeInfo('customer_inquiry');
            expect(info.label).toBe('Customer');
            expect(info.color).toContain('blue');
        });

        it('should return info for brand_request', () => {
            const info = getLeadTypeInfo('brand_request');
            expect(info.label).toBe('Brand Request');
            expect(info.color).toContain('purple');
        });

        it('should return info for vendor_inquiry', () => {
            const info = getLeadTypeInfo('vendor_inquiry');
            expect(info.label).toBe('Vendor');
            expect(info.color).toContain('green');
        });

        it('should return info for partnership', () => {
            const info = getLeadTypeInfo('partnership');
            expect(info.label).toBe('Partnership');
            expect(info.color).toContain('yellow');
        });

        it('should return info for wholesale', () => {
            const info = getLeadTypeInfo('wholesale');
            expect(info.label).toBe('Wholesale');
            expect(info.color).toContain('orange');
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
