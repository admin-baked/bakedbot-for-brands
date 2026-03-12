import { getSuggestedSegments, launchLifecyclePlaybook } from '../actions';
import { createServerClient } from '@/firebase/server-client';
import {
    getDispensaryPlaybookAssignments,
    updatePlaybookAssignmentConfig,
} from '@/server/actions/dispensary-playbooks';
import { createWelcomeEmailPlaybook } from '@/server/actions/pilot-setup';

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        uid: 'user-1',
        role: 'brand_admin',
        brandId: 'test-org',
    }),
}));

jest.mock('@/server/actions/dispensary-playbooks', () => ({
    getDispensaryPlaybookAssignments: jest.fn(),
    updatePlaybookAssignmentConfig: jest.fn(),
}));

jest.mock('@/server/actions/pilot-setup', () => ({
    createWelcomeEmailPlaybook: jest.fn(),
    createWinbackEmailPlaybook: jest.fn(),
    createVIPPlaybook: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

function createSnapshot(docs: Array<{ id: string; data: () => Record<string, unknown> }>) {
    return {
        docs,
        empty: docs.length === 0,
        size: docs.length,
        forEach: (callback: (doc: { id: string; data: () => Record<string, unknown> }) => void) => docs.forEach(callback),
    };
}

function createQuery(snapshot: ReturnType<typeof createSnapshot>) {
    return {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(snapshot),
    };
}

describe('customer CRM actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        const now = new Date('2026-03-11T10:00:00Z');
        const oldDate = new Date('2025-11-01T10:00:00Z');
        const atRiskDate = new Date('2025-12-20T10:00:00Z');
        const vipDate = new Date('2026-03-10T10:00:00Z');

        const customerDocs = [
            {
                id: 'customer-new',
                data: () => ({
                    orgId: 'test-org',
                    email: 'new@example.com',
                    firstName: 'New',
                    lastName: 'Customer',
                    totalSpent: 0,
                    orderCount: 0,
                    avgOrderValue: 0,
                    createdAt: { toDate: () => now },
                    updatedAt: { toDate: () => now },
                    firstOrderDate: { toDate: () => now },
                }),
            },
            ...Array.from({ length: 4 }, (_, index) => ({
                id: `customer-risk-${index}`,
                data: () => ({
                    orgId: 'test-org',
                    email: `risk-${index}@example.com`,
                    firstName: 'Risk',
                    lastName: `${index}`,
                    totalSpent: 120,
                    orderCount: 3,
                    avgOrderValue: 40,
                    lastOrderDate: { toDate: () => atRiskDate },
                    firstOrderDate: { toDate: () => oldDate },
                    createdAt: { toDate: () => oldDate },
                    updatedAt: { toDate: () => now },
                }),
            })),
            {
                id: 'customer-vip',
                data: () => ({
                    orgId: 'test-org',
                    email: 'vip@example.com',
                    firstName: 'VIP',
                    lastName: 'Customer',
                    totalSpent: 982,
                    orderCount: 12,
                    avgOrderValue: 81.83,
                    lastOrderDate: { toDate: () => vipDate },
                    firstOrderDate: { toDate: () => oldDate },
                    createdAt: { toDate: () => oldDate },
                    updatedAt: { toDate: () => now },
                }),
            },
        ];

        const emptySnapshot = createSnapshot([]);
        const customersSnapshot = createSnapshot(customerDocs);
        const playbooksSnapshot = createSnapshot([
            {
                id: 'playbook-welcome',
                data: () => ({ orgId: 'test-org', templateId: 'welcome_email_template' }),
            },
        ]);

        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'customers') return createQuery(customersSnapshot);
                if (name === 'playbooks') return createQuery(playbooksSnapshot);
                if (name === 'locations' || name === 'orders') return createQuery(emptySnapshot);
                throw new Error(`Unexpected collection: ${name}`);
            }),
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore });
        (getDispensaryPlaybookAssignments as jest.Mock).mockResolvedValue({
            assignments: [],
            activeIds: [],
            tierId: 'empire',
            totalAvailable: 0,
            totalActive: 0,
            customConfigs: {},
        });
    });

    it('returns lifecycle playbook suggestions with launch metadata', async () => {
        const suggestions = await getSuggestedSegments('test-org');

        expect(suggestions).toHaveLength(3);
        expect(suggestions.map((suggestion) => suggestion.playbookKind)).toEqual(['welcome', 'winback', 'vip']);
        suggestions.forEach((suggestion) => {
            expect(suggestion.ctaLabel).toBe('Launch Playbook');
        });
    });

    it('does not claim customers were already auto-added by an agent', async () => {
        const suggestions = await getSuggestedSegments('test-org');

        suggestions.forEach((suggestion) => {
            expect(suggestion.reasoning).not.toContain('automatically added');
            expect(suggestion.reasoning).not.toContain('Craig has automatically added');
        });
    });

    it('exposes lifecycle status hints based on existing playbooks', async () => {
        const suggestions = await getSuggestedSegments('test-org');
        const hints = Object.fromEntries(suggestions.map((suggestion) => [suggestion.playbookKind, suggestion.statusHint]));

        expect(hints.welcome).toBe('paused');
        expect(hints.winback).toBe('missing');
        expect(hints.vip).toBe('missing');
    });

    it('launches lifecycle playbooks for the requested org context', async () => {
        const emptySnapshot = createSnapshot([]);
        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'playbooks') return createQuery(emptySnapshot);
                if (name === 'customers' || name === 'locations' || name === 'orders') return createQuery(emptySnapshot);
                throw new Error(`Unexpected collection: ${name}`);
            }),
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore });
        const { requireUser } = jest.requireMock('@/server/auth/auth') as { requireUser: jest.Mock };
        requireUser.mockResolvedValue({
            uid: 'super-1',
            role: 'super_user',
            currentOrgId: 'org-super',
        });
        (createWelcomeEmailPlaybook as jest.Mock).mockResolvedValue({
            success: true,
            playbookId: 'playbook-welcome',
        });
        (getDispensaryPlaybookAssignments as jest.Mock).mockResolvedValue({
            assignments: [],
            activeIds: [],
            tierId: 'empire',
            totalAvailable: 0,
            totalActive: 0,
            customConfigs: {},
        });
        (updatePlaybookAssignmentConfig as jest.Mock).mockResolvedValue({
            success: true,
        });

        const result = await launchLifecyclePlaybook('welcome', 'org-target');

        expect(result).toEqual(expect.objectContaining({
            success: true,
            playbookId: 'playbook-welcome',
            status: 'paused',
        }));
        expect(createWelcomeEmailPlaybook).toHaveBeenCalledWith(
            'org-target',
            'org-target',
            expect.objectContaining({
                provider: 'mailjet',
                senderEmail: 'hello@bakedbot.ai',
            }),
        );
        expect(updatePlaybookAssignmentConfig).toHaveBeenCalledWith('org-target', 'playbook-welcome', {});
    });
});
