import { getCustomerDetail, getCustomerOrders } from '../actions';
import { createServerClient } from '@/firebase/server-client';
import { getCustomerCommunications, getUpcomingCommunications } from '@/server/actions/customer-communications';
import { getDispensaryPlaybookAssignments } from '@/server/actions/dispensary-playbooks';
import { ALLeavesClient } from '@/lib/pos/adapters/alleaves';
import { posCache } from '@/lib/cache/pos-cache';

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        uid: 'user-1',
        role: 'dispensary_admin',
        orgId: 'org-a',
        currentOrgId: 'org-a',
    }),
}));

jest.mock('@/server/actions/customer-communications', () => ({
    getCustomerCommunications: jest.fn(),
    getUpcomingCommunications: jest.fn(),
}));

jest.mock('@/server/actions/dispensary-playbooks', () => ({
    getDispensaryPlaybookAssignments: jest.fn(),
}));

jest.mock('@/lib/pos/adapters/alleaves', () => ({
    ALLeavesClient: jest.fn(),
}));

jest.mock('@/lib/cache/pos-cache', () => ({
    posCache: {
        get: jest.fn(),
        set: jest.fn(),
    },
    cacheKeys: {
        customers: jest.fn(() => 'customers:org-a'),
        orders: jest.fn(() => 'orders:org-a'),
    },
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('customer detail actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'customers') {
                    return {
                        doc: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({
                                exists: true,
                                data: () => ({
                                    orgId: 'org-a',
                                    email: 'customer_2518@alleaves.local',
                                    firstName: 'Michael',
                                    lastName: 'Green Joseph',
                                    displayName: '',
                                    totalSpent: 983,
                                    orderCount: 12,
                                    avgOrderValue: 82,
                                    priceRange: 'budget',
                                    customTags: ['VIP'],
                                    createdAt: { toDate: () => new Date('2025-11-28T00:00:00Z') },
                                    updatedAt: { toDate: () => new Date('2026-03-11T00:00:00Z') },
                                    firstOrderDate: { toDate: () => new Date('2025-11-28T00:00:00Z') },
                                    lastOrderDate: { toDate: () => new Date('2026-03-11T00:00:00Z') },
                                    source: 'manual',
                                }),
                            }),
                            set: jest.fn(),
                            update: jest.fn(),
                        })),
                    };
                }

                if (name === 'organizations') {
                    return {
                        doc: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({
                                exists: true,
                                data: () => ({ name: 'Allo' }),
                            }),
                        })),
                    };
                }

                if (name === 'playbooks') {
                    return {
                        where: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnThis(),
                        get: jest.fn().mockResolvedValue({
                            docs: [
                                { id: 'playbook-welcome', data: () => ({ templateId: 'welcome_email_template' }) },
                                { id: 'playbook-winback', data: () => ({ templateId: 'winback_campaign_template' }) },
                                { id: 'playbook-vip', data: () => ({ templateId: 'vip_appreciation_template' }) },
                            ],
                        }),
                    };
                }

                if (name === 'locations') {
                    return {
                        where: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnThis(),
                        get: jest.fn().mockResolvedValue({
                            empty: false,
                            docs: [
                                {
                                    data: () => ({
                                        posConfig: {
                                            provider: 'alleaves',
                                            status: 'active',
                                            apiKey: 'key',
                                            username: 'user',
                                            password: 'pass',
                                            pin: '1234',
                                            storeId: 'store-1',
                                            locationId: 'store-1',
                                        },
                                    }),
                                },
                            ],
                        }),
                    };
                }

                if (name === 'pricing_rules') {
                    return {
                        where: jest.fn().mockReturnThis(),
                        get: jest.fn().mockResolvedValue({ forEach: jest.fn() }),
                    };
                }

                throw new Error(`Unexpected collection: ${name}`);
            }),
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore });
        (getCustomerCommunications as jest.Mock).mockResolvedValue([
            {
                id: 'comm-1',
                customerId: 'customer-1',
                customerEmail: 'customer_2518@alleaves.local',
                orgId: 'org-a',
                channel: 'email',
                direction: 'outbound',
                type: 'welcome',
                subject: 'Welcome back',
                preview: 'Email preview',
                status: 'sent',
                sentAt: new Date('2026-03-10T10:00:00Z'),
                createdAt: new Date('2026-03-10T10:00:00Z'),
                updatedAt: new Date('2026-03-10T10:00:00Z'),
            },
        ]);
        (getUpcomingCommunications as jest.Mock).mockResolvedValue([
            {
                id: 'scheduled-1',
                customerEmail: 'customer_2518@alleaves.local',
                type: 'welcome',
                subject: 'Welcome to Allo, Michael',
                scheduledFor: new Date('2026-03-12T10:00:00Z'),
                status: 'pending',
                channel: 'email',
                playbookId: 'playbook-welcome',
                preview: 'Next email preview',
                metadata: { playbookKind: 'welcome' },
            },
        ]);
        (getDispensaryPlaybookAssignments as jest.Mock).mockResolvedValue({
            assignments: [
                { playbookId: 'playbook-welcome', status: 'active' },
            ],
            activeIds: ['playbook-welcome'],
            tierId: 'empire',
            totalAvailable: 3,
            totalActive: 1,
            customConfigs: {},
        });
        (posCache.get as jest.Mock).mockReturnValue(undefined);
        (ALLeavesClient as jest.Mock).mockImplementation(() => ({
            getCustomerOrders: jest.fn().mockRejectedValue(new Error('customer endpoint unavailable')),
            getAllOrders: jest.fn().mockResolvedValue([
                {
                    id: 'order-1',
                    id_customer: 'customer-1',
                    order_number: '1001',
                    date_created: '2026-03-11T12:00:00Z',
                    items: [
                        {
                            product_name: 'Blue Dream',
                            quantity: 2,
                            unit_price: 20,
                            total: 40,
                            category: 'flower',
                            product_id: 'prod-1',
                        },
                    ],
                    subtotal: 40,
                    tax: 4,
                    discount: 0,
                    total: 44,
                    status: 'completed',
                    payment_method: 'cash',
                },
            ]),
        }));
    });

    it('resolves customer names from first and last name and returns lifecycle detail', async () => {
        const result = await getCustomerDetail('customer-1');

        expect(result.customer?.displayName).toBe('Michael Green Joseph');
        expect(result.communications).toHaveLength(1);
        expect(result.upcoming).toHaveLength(1);
        expect(result.playbooks).toHaveLength(3);
        expect(result.playbooks[0]).toEqual(expect.objectContaining({
            playbookKind: 'welcome',
            assignmentStatus: 'active',
        }));
    });

    it('hydrates placeholder CRM identities from cached Alleaves customers', async () => {
        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'customers') {
                    return {
                        doc: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({
                                exists: true,
                                data: () => ({
                                    orgId: 'org-a',
                                    email: 'alleaves_2730@unknown.local',
                                    firstName: '',
                                    lastName: '',
                                    displayName: 'alleaves_2730',
                                    totalSpent: 125,
                                    orderCount: 4,
                                    avgOrderValue: 31,
                                    priceRange: 'mid',
                                    createdAt: { toDate: () => new Date('2026-03-11T00:00:00Z') },
                                    updatedAt: { toDate: () => new Date('2026-03-12T00:00:00Z') },
                                    source: 'manual',
                                }),
                            }),
                            set: jest.fn(),
                            update: jest.fn(),
                        })),
                    };
                }

                if (name === 'organizations') {
                    return {
                        doc: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({
                                exists: true,
                                data: () => ({ name: 'Allo' }),
                            }),
                        })),
                    };
                }

                if (name === 'playbooks') {
                    return {
                        where: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnThis(),
                        get: jest.fn().mockResolvedValue({ docs: [] }),
                    };
                }

                if (name === 'locations') {
                    return {
                        where: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnThis(),
                        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    };
                }

                if (name === 'pricing_rules') {
                    return {
                        where: jest.fn().mockReturnThis(),
                        get: jest.fn().mockResolvedValue({ forEach: jest.fn() }),
                    };
                }

                throw new Error(`Unexpected collection: ${name}`);
            }),
        };

        (createServerClient as jest.Mock).mockResolvedValueOnce({ firestore });
        (posCache.get as jest.Mock).mockImplementation((key: string) => {
            if (key === 'customers:org-a') {
                return [
                    {
                        id: 'alleaves_2730',
                        orgId: 'org-a',
                        email: 'michael.green@example.com',
                        firstName: 'Michael',
                        lastName: 'Green Joseph',
                        displayName: 'Michael Green Joseph',
                        phone: '555-000-0000',
                        points: 124,
                        birthDate: '1998-01-25',
                    },
                ];
            }

            return undefined;
        });

        const result = await getCustomerDetail('alleaves_2730');

        expect(result.customer?.displayName).toBe('Michael Green Joseph');
        expect(result.customer?.firstName).toBe('Michael');
        expect(result.customer?.lastName).toBe('Green Joseph');
        expect(result.customer?.email).toBe('michael.green@example.com');
    });

    it('derives customer preferences and auto tags from fallback order history', async () => {
        const result = await getCustomerOrders('customer-1');

        expect(result.source).toBe('all_orders_live');
        expect(result.preferences.categories).toContain('flower');
        expect(result.preferences.products).toContain('Blue Dream');
        expect(result.autoTags).toEqual(expect.arrayContaining(['Prefers Flower', 'Buys Blue Dream']));
        expect(posCache.set).toHaveBeenCalled();
    });
});
