/**
 * Tests for campaign-sender.ts
 *
 * Covers:
 * - personalize() — pure function, no mocks needed
 * - resolveAudience() — mocked Firestore
 * - executeCampaign() — mocked Firestore + email/SMS providers
 */

import type { Campaign } from '@/types/campaign';
import type { CustomerSegment } from '@/types/customers';

// ---------------------------------------------------------------------------
// Mocks — must be declared before the module under test is imported
// ---------------------------------------------------------------------------

const mockGet = jest.fn();
const mockDoc = jest.fn();
const mockWhere = jest.fn();
const mockUpdate = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn();
const mockCollection = jest.fn();

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: (...args: unknown[]) => mockCollection(...args),
        },
    }),
}));

jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/notifications/blackleaf-service', () => {
    const sendCustomMessage = jest.fn().mockResolvedValue(true);
    return {
        BlackleafService: jest.fn().mockImplementation(() => ({
            sendCustomMessage,
        })),
        __mockSendCustomMessage: sendCustomMessage,
    };
});

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { personalize, resolveAudience, executeCampaign } from '../campaign-sender';
import { sendGenericEmail } from '@/lib/email/dispatcher';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ResolvedRecipient {
    customerId: string;
    email: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    segment: CustomerSegment;
    totalSpent: number;
    orderCount: number;
    daysSinceLastOrder?: number;
    loyaltyPoints?: number;
}

function makeRecipient(overrides: Partial<ResolvedRecipient> = {}): ResolvedRecipient {
    return {
        customerId: 'cust_1',
        email: 'jane@example.com',
        phone: '+15551234567',
        firstName: 'Jane',
        lastName: 'Doe',
        segment: 'loyal' as CustomerSegment,
        totalSpent: 1250,
        orderCount: 12,
        daysSinceLastOrder: 15,
        loyaltyPoints: 450,
        ...overrides,
    };
}

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
    return {
        id: 'camp_1',
        orgId: 'org_test',
        createdBy: 'user_1',
        name: 'Test Campaign',
        goal: 'drive_sales',
        status: 'scheduled',
        channels: ['email'],
        audience: { type: 'all', estimatedCount: 10 },
        content: {
            email: {
                channel: 'email',
                subject: 'Hello {{firstName}}!',
                body: 'Thanks for your {{orderCount}} orders.',
            },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    } as Campaign;
}

// Helper to build a mock Firestore doc snapshot
function mockDocSnap(id: string, data: Record<string, unknown>, exists = true) {
    return { id, exists, data: () => data };
}

// ---------------------------------------------------------------------------
// personalize() — Pure function tests
// ---------------------------------------------------------------------------

describe('personalize', () => {
    it('replaces {{firstName}} with recipient firstName', () => {
        const result = personalize('Hi {{firstName}}!', makeRecipient({ firstName: 'Alice' }));
        expect(result).toBe('Hi Alice!');
    });

    it('uses "there" as default when firstName is missing', () => {
        const result = personalize('Hi {{firstName}}!', makeRecipient({ firstName: undefined }));
        expect(result).toBe('Hi there!');
    });

    it('replaces {{lastName}}', () => {
        const result = personalize('Name: {{lastName}}', makeRecipient({ lastName: 'Smith' }));
        expect(result).toBe('Name: Smith');
    });

    it('replaces {{segment}} with capitalized segment (at_risk -> At Risk)', () => {
        const result = personalize(
            'Segment: {{segment}}',
            makeRecipient({ segment: 'at_risk' as CustomerSegment }),
        );
        expect(result).toBe('Segment: At Risk');
    });

    it('replaces {{segment}} for simple segments (vip -> Vip)', () => {
        const result = personalize(
            '{{segment}}',
            makeRecipient({ segment: 'vip' as CustomerSegment }),
        );
        expect(result).toBe('Vip');
    });

    it('replaces {{totalSpent}} with formatted dollar amount', () => {
        const result = personalize(
            'Spent: {{totalSpent}}',
            makeRecipient({ totalSpent: 1250 }),
        );
        // toLocaleString produces locale-dependent output; check the dollar sign and number
        expect(result).toMatch(/Spent: \$1,?250/);
    });

    it('replaces {{orderCount}}', () => {
        const result = personalize(
            'Orders: {{orderCount}}',
            makeRecipient({ orderCount: 42 }),
        );
        expect(result).toBe('Orders: 42');
    });

    it('replaces {{daysSinceLastVisit}} with value', () => {
        const result = personalize(
            'Last visit: {{daysSinceLastVisit}} days ago',
            makeRecipient({ daysSinceLastOrder: 7 }),
        );
        expect(result).toBe('Last visit: 7 days ago');
    });

    it('replaces {{daysSinceLastVisit}} with N/A when undefined', () => {
        const result = personalize(
            'Last visit: {{daysSinceLastVisit}}',
            makeRecipient({ daysSinceLastOrder: undefined }),
        );
        expect(result).toBe('Last visit: N/A');
    });

    it('replaces {{loyaltyPoints}} with value', () => {
        const result = personalize(
            'Points: {{loyaltyPoints}}',
            makeRecipient({ loyaltyPoints: 500 }),
        );
        expect(result).toBe('Points: 500');
    });

    it('replaces {{loyaltyPoints}} with 0 when undefined', () => {
        const result = personalize(
            'Points: {{loyaltyPoints}}',
            makeRecipient({ loyaltyPoints: undefined }),
        );
        expect(result).toBe('Points: 0');
    });

    it('replaces {{orgName}}', () => {
        const result = personalize(
            'Welcome to {{orgName}}!',
            makeRecipient(),
            'Thrive Syracuse',
        );
        expect(result).toBe('Welcome to Thrive Syracuse!');
    });

    it('replaces {{orgName}} with empty string when not provided', () => {
        const result = personalize('Shop at {{orgName}}', makeRecipient());
        expect(result).toBe('Shop at ');
    });

    it('handles multiple variables in one template', () => {
        const template =
            'Hi {{firstName}} {{lastName}}, you are a {{segment}} customer at {{orgName}}. ' +
            'You have {{loyaltyPoints}} points and {{orderCount}} orders totaling {{totalSpent}}.';
        const result = personalize(template, makeRecipient(), 'Thrive');
        expect(result).toContain('Hi Jane Doe');
        expect(result).toContain('Loyal customer');
        expect(result).toContain('at Thrive');
        expect(result).toContain('450 points');
        expect(result).toContain('12 orders');
        expect(result).toMatch(/\$1,?250/);
    });

    it('leaves non-variable text unchanged', () => {
        const template = 'Plain text with no variables at all.';
        const result = personalize(template, makeRecipient());
        expect(result).toBe('Plain text with no variables at all.');
    });
});

// ---------------------------------------------------------------------------
// resolveAudience() — Mocked Firestore
// ---------------------------------------------------------------------------

describe('resolveAudience', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default: collection().where().get() chain
        mockCollection.mockReturnValue({ where: mockWhere });
        mockWhere.mockReturnValue({ get: mockGet });
    });

    it('returns all customers with email when audience type is "all"', async () => {
        mockGet.mockResolvedValue({
            docs: [
                mockDocSnap('c1', {
                    email: 'a@b.com',
                    phone: '+1555',
                    firstName: 'Alice',
                    segment: 'vip',
                    totalSpent: 100,
                    orderCount: 5,
                }),
                mockDocSnap('c2', {
                    email: 'b@b.com',
                    firstName: 'Bob',
                    segment: 'new',
                    totalSpent: 20,
                    orderCount: 1,
                }),
            ],
        });

        const campaign = makeCampaign({ audience: { type: 'all', estimatedCount: 2 } });
        const result = await resolveAudience(campaign);

        expect(result).toHaveLength(2);
        expect(result[0].customerId).toBe('c1');
        expect(result[1].customerId).toBe('c2');
    });

    it('filters by segment when audience type is "segment"', async () => {
        mockGet.mockResolvedValue({
            docs: [
                mockDocSnap('c1', {
                    email: 'a@b.com',
                    segment: 'vip',
                    totalSpent: 500,
                    orderCount: 20,
                }),
                mockDocSnap('c2', {
                    email: 'b@b.com',
                    segment: 'new',
                    totalSpent: 10,
                    orderCount: 1,
                }),
                mockDocSnap('c3', {
                    email: 'c@b.com',
                    segment: 'at_risk',
                    totalSpent: 50,
                    orderCount: 3,
                }),
            ],
        });

        const campaign = makeCampaign({
            audience: {
                type: 'segment',
                segments: ['vip', 'at_risk'],
                estimatedCount: 2,
            },
        });

        const result = await resolveAudience(campaign);

        expect(result).toHaveLength(2);
        expect(result.map(r => r.customerId).sort()).toEqual(['c1', 'c3']);
    });

    it('skips customers without email for email-only campaigns', async () => {
        mockGet.mockResolvedValue({
            docs: [
                mockDocSnap('c1', {
                    email: 'a@b.com',
                    segment: 'loyal',
                    totalSpent: 100,
                    orderCount: 5,
                }),
                mockDocSnap('c2', {
                    // no email, no phone
                    segment: 'loyal',
                    totalSpent: 50,
                    orderCount: 2,
                }),
            ],
        });

        const campaign = makeCampaign({
            channels: ['email'],
            audience: { type: 'all', estimatedCount: 2 },
        });

        const result = await resolveAudience(campaign);

        expect(result).toHaveLength(1);
        expect(result[0].customerId).toBe('c1');
    });

    it('skips customers without phone for sms-only campaigns', async () => {
        mockGet.mockResolvedValue({
            docs: [
                mockDocSnap('c1', {
                    email: 'a@b.com',
                    phone: '+15551111111',
                    segment: 'loyal',
                    totalSpent: 100,
                    orderCount: 5,
                }),
                mockDocSnap('c2', {
                    email: 'b@b.com',
                    // no phone
                    segment: 'loyal',
                    totalSpent: 50,
                    orderCount: 2,
                }),
            ],
        });

        const campaign = makeCampaign({
            channels: ['sms'],
            audience: { type: 'all', estimatedCount: 2 },
            content: {
                sms: { channel: 'sms', body: 'Hello {{firstName}}!' },
            },
        });

        const result = await resolveAudience(campaign);

        expect(result).toHaveLength(1);
        expect(result[0].customerId).toBe('c1');
    });
});

// ---------------------------------------------------------------------------
// executeCampaign() — Mocked Firestore + send providers
// ---------------------------------------------------------------------------

describe('executeCampaign', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Wire up firestore mock chains
        mockCollection.mockImplementation((name: string) => {
            if (name === 'campaigns') {
                return { doc: mockDoc };
            }
            if (name === 'customers') {
                return { where: mockWhere };
            }
            if (name === 'tenants') {
                return { doc: mockDoc };
            }
            return { doc: mockDoc, where: mockWhere };
        });

        mockDoc.mockReturnValue({
            get: mockGet,
            update: mockUpdate,
            collection: mockCollection,
            doc: jest.fn().mockReturnValue({}),
        });

        mockUpdate.mockResolvedValue(undefined);
        mockBatchCommit.mockResolvedValue(undefined);
    });

    it('returns error when campaign is not found', async () => {
        mockGet.mockResolvedValue({ exists: false, data: () => null });

        const result = await executeCampaign('nonexistent');

        expect(result).toEqual({
            success: false,
            sent: 0,
            failed: 0,
            error: 'Campaign not found',
        });
    });

    it('returns error when campaign status is invalid (e.g. draft)', async () => {
        const campaignData = makeCampaign({ status: 'draft' });

        mockGet.mockResolvedValue({
            exists: true,
            id: 'camp_draft',
            data: () => ({ ...campaignData }),
        });

        const result = await executeCampaign('camp_draft');

        expect(result).toEqual({
            success: false,
            sent: 0,
            failed: 0,
            error: 'Invalid status: draft',
        });
    });

    it('returns success with 0 sent when audience is empty', async () => {
        // First get() call — campaign doc
        const campaignData = makeCampaign({ status: 'scheduled' });
        const campaignSnap = {
            exists: true,
            id: 'camp_empty',
            data: () => ({ ...campaignData }),
        };

        // Second get() call — customer query (empty)
        const emptyQuerySnap = { docs: [] };

        // We need to handle both campaign get AND customers get AND tenant get
        // mockDoc is called for campaigns and tenants collections
        // Campaign doc get
        let getCalls = 0;
        mockGet.mockImplementation(() => {
            getCalls++;
            if (getCalls === 1) return Promise.resolve(campaignSnap); // campaign doc
            if (getCalls === 2) return Promise.resolve(emptyQuerySnap); // customers query
            return Promise.resolve({ exists: false, data: () => null }); // anything else
        });

        mockWhere.mockReturnValue({ get: mockGet });

        const result = await executeCampaign('camp_empty');

        expect(result.success).toBe(true);
        expect(result.sent).toBe(0);
        expect(result.failed).toBe(0);
    });

    it('sends email successfully and updates performance', async () => {
        const campaignData = makeCampaign({
            status: 'approved',
            channels: ['email'],
            content: {
                email: {
                    channel: 'email',
                    subject: 'Hello {{firstName}}!',
                    body: 'Thanks for being a {{segment}} customer.',
                },
            },
        });

        const campaignSnap = {
            exists: true,
            id: 'camp_send',
            data: () => ({ ...campaignData }),
        };

        const customerDocs = {
            docs: [
                mockDocSnap('c1', {
                    email: 'alice@example.com',
                    firstName: 'Alice',
                    segment: 'vip',
                    totalSpent: 500,
                    orderCount: 10,
                }),
            ],
        };

        const tenantSnap = {
            exists: true,
            data: () => ({ name: 'Thrive Syracuse' }),
        };

        let getCalls = 0;
        mockGet.mockImplementation(() => {
            getCalls++;
            if (getCalls === 1) return Promise.resolve(campaignSnap);
            if (getCalls === 2) return Promise.resolve(customerDocs);
            if (getCalls === 3) return Promise.resolve(tenantSnap);
            return Promise.resolve({ exists: false, data: () => null });
        });

        mockWhere.mockReturnValue({ get: mockGet });

        // Mock the batch
        mockCollection.mockImplementation((name: string) => {
            if (name === 'campaigns') {
                return {
                    doc: () => ({
                        get: mockGet,
                        update: mockUpdate,
                        collection: () => ({
                            doc: jest.fn().mockReturnValue({}),
                        }),
                    }),
                };
            }
            if (name === 'customers') {
                return { where: mockWhere };
            }
            if (name === 'tenants') {
                return {
                    doc: () => ({
                        get: mockGet,
                    }),
                };
            }
            return { doc: mockDoc };
        });

        // Override firestore to include batch
        const { createServerClient } = await import('@/firebase/server-client');
        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: {
                collection: mockCollection,
                batch: () => ({
                    set: mockBatchSet,
                    commit: mockBatchCommit,
                }),
            },
        });

        (sendGenericEmail as jest.Mock).mockResolvedValue({ success: true });

        const result = await executeCampaign('camp_send');

        expect(result.success).toBe(true);
        expect(result.sent).toBe(1);
        expect(result.failed).toBe(0);

        // Verify email was sent
        expect(sendGenericEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'alice@example.com',
                subject: 'Hello Alice!',
            }),
        );

        // Verify performance update was written
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'sent',
                performance: expect.objectContaining({
                    totalRecipients: 1,
                    sent: 1,
                    bounced: 0,
                }),
            }),
        );
    });
});
