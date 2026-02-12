/**
 * Unit Tests for Campaign Tools (Craig, Mrs. Parker, Money Mike agents)
 *
 * Tests campaign CRUD, audience suggestion, performance retrieval,
 * compliance submission, and per-agent tool def exports.
 */

import {
    createCampaignDraft,
    getCampaignsForAgent,
    getCampaignPerformance,
    suggestAudience,
    submitCampaignForReview,
    craigCampaignToolDefs,
    mrsParkerCampaignToolDefs,
    moneyMikeCampaignToolDefs,
} from '../campaign-tools';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// Mock the dynamic import of campaign-compliance
jest.mock('@/server/services/campaign-compliance', () => ({
    runComplianceCheck: jest.fn().mockResolvedValue({ overallStatus: 'passed', results: {} }),
}));

import { getAdminFirestore } from '@/firebase/admin';

// ---------------------------------------------------------------------------
// Firestore mock helpers
// ---------------------------------------------------------------------------

const mockAdd = jest.fn().mockResolvedValue({ id: 'campaign-123' });
const mockGet = jest.fn();
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn().mockReturnValue({ get: mockGet, update: mockUpdate });
const mockCollection = jest.fn().mockReturnValue({
    add: mockAdd,
    doc: mockDoc,
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: mockGet,
});

(getAdminFirestore as jest.Mock).mockReturnValue({ collection: mockCollection });

// ---------------------------------------------------------------------------
// Reset between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
    jest.clearAllMocks();
    (getAdminFirestore as jest.Mock).mockReturnValue({ collection: mockCollection });
});

// ===========================================================================
// createCampaignDraft
// ===========================================================================

describe('createCampaignDraft', () => {
    const baseParams = {
        orgId: 'org-test',
        name: 'Spring Sale',
        description: 'A spring promo',
        goal: 'drive_sales' as const,
        channels: ['email' as const, 'sms' as const],
        segments: ['loyal', 'vip'],
        emailSubject: 'Spring deals!',
        emailBody: 'Hey {{firstName}}, check out our spring deals.',
        smsBody: 'Spring sale at Thrive!',
        agentName: 'craig',
    };

    it('creates a document in Firestore with correct fields', async () => {
        const result = await createCampaignDraft(baseParams);

        expect(mockCollection).toHaveBeenCalledWith('campaigns');
        expect(mockAdd).toHaveBeenCalledTimes(1);

        const addedDoc = mockAdd.mock.calls[0][0];
        expect(addedDoc.orgId).toBe('org-test');
        expect(addedDoc.name).toBe('Spring Sale');
        expect(addedDoc.goal).toBe('drive_sales');
        expect(addedDoc.channels).toEqual(['email', 'sms']);
        expect(addedDoc.createdBy).toBe('agent');
        expect(addedDoc.createdByAgent).toBe('craig');

        expect(result.campaignId).toBe('campaign-123');
    });

    it('sets status to draft', async () => {
        await createCampaignDraft(baseParams);

        const addedDoc = mockAdd.mock.calls[0][0];
        expect(addedDoc.status).toBe('draft');
    });

    it('summary includes :::campaign:draft: marker', async () => {
        const result = await createCampaignDraft(baseParams);

        expect(result.summary).toContain(':::campaign:draft:');
    });

    it('summary includes campaign name and goal label', async () => {
        const result = await createCampaignDraft(baseParams);

        expect(result.summary).toContain('Spring Sale');
        expect(result.summary).toContain('Drive Sales');
    });

    it('builds email content when channel includes email', async () => {
        await createCampaignDraft(baseParams);

        const addedDoc = mockAdd.mock.calls[0][0];
        expect(addedDoc.content.email).toBeDefined();
        expect(addedDoc.content.email.subject).toBe('Spring deals!');
        expect(addedDoc.content.email.body).toBe(baseParams.emailBody);
        expect(addedDoc.content.email.htmlBody).toContain(baseParams.emailBody.replace(/\n/g, '<br>'));
    });

    it('builds sms content when channel includes sms', async () => {
        await createCampaignDraft(baseParams);

        const addedDoc = mockAdd.mock.calls[0][0];
        expect(addedDoc.content.sms).toBeDefined();
        expect(addedDoc.content.sms.body).toBe('Spring sale at Thrive!');
    });

    it('uses campaign name as email subject when none provided', async () => {
        const params = { ...baseParams, emailSubject: undefined };
        await createCampaignDraft(params);

        const addedDoc = mockAdd.mock.calls[0][0];
        expect(addedDoc.content.email.subject).toBe('Spring Sale');
    });

    it('defaults agentName to craig when not provided', async () => {
        const params = { ...baseParams, agentName: undefined };
        await createCampaignDraft(params);

        const addedDoc = mockAdd.mock.calls[0][0];
        expect(addedDoc.createdByAgent).toBe('craig');
    });
});

// ===========================================================================
// getCampaignsForAgent
// ===========================================================================

describe('getCampaignsForAgent', () => {
    it('returns "No campaigns found." when empty', async () => {
        mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

        const result = await getCampaignsForAgent({ orgId: 'org-test' });

        expect(result.summary).toBe('No campaigns found.');
        expect(result.campaigns).toEqual([]);
    });

    it('returns formatted markdown table with campaign data', async () => {
        mockGet.mockResolvedValueOnce({
            empty: false,
            docs: [
                {
                    id: 'c-1',
                    data: () => ({
                        name: 'Summer Promo',
                        goal: 'drive_sales',
                        status: 'sent',
                        channels: ['email'],
                        audience: { type: 'segment', segments: ['vip'] },
                        performance: { sent: 100, openRate: 45.3 },
                        createdAt: { toDate: () => new Date('2026-01-15') },
                    }),
                },
                {
                    id: 'c-2',
                    data: () => ({
                        name: 'Birthday Blast',
                        goal: 'birthday',
                        status: 'draft',
                        channels: ['sms'],
                        audience: { type: 'all', segments: [] },
                        performance: undefined,
                        createdAt: { toDate: () => new Date('2026-02-01') },
                    }),
                },
            ],
        });

        const result = await getCampaignsForAgent({ orgId: 'org-test' });

        expect(result.summary).toContain('Campaigns');
        expect(result.summary).toContain('2 found');
        expect(result.summary).toContain('Summer Promo');
        expect(result.summary).toContain('Birthday Blast');
        // Table headers
        expect(result.summary).toContain('| Name |');
        expect(result.summary).toContain('| Goal |');
        // Performance values
        expect(result.summary).toContain('100');
        expect(result.summary).toContain('45.3%');
        expect(result.campaigns).toHaveLength(2);
    });

    it('limits results via limit param', async () => {
        mockGet.mockResolvedValueOnce({
            empty: false,
            docs: [
                {
                    id: 'c-1',
                    data: () => ({
                        name: 'Only One',
                        goal: 'awareness',
                        status: 'draft',
                        channels: ['email'],
                        audience: { type: 'all' },
                        performance: undefined,
                        createdAt: { toDate: () => new Date() },
                    }),
                },
            ],
        });

        const result = await getCampaignsForAgent({ orgId: 'org-test', limit: 1 });

        expect(result.campaigns).toHaveLength(1);
    });
});

// ===========================================================================
// getCampaignPerformance
// ===========================================================================

describe('getCampaignPerformance', () => {
    it('returns "Campaign not found." when doc does not exist', async () => {
        mockGet.mockResolvedValueOnce({ exists: false });

        const result = await getCampaignPerformance({ campaignId: 'missing-id' });

        expect(result.summary).toBe('Campaign not found.');
        expect(result.performance).toBeNull();
    });

    it('returns performance marker for a sent campaign', async () => {
        mockGet.mockResolvedValueOnce({
            exists: true,
            id: 'c-perf',
            data: () => ({
                name: 'Holiday Blast',
                status: 'sent',
                performance: {
                    totalRecipients: 500,
                    sent: 480,
                    delivered: 470,
                    opened: 200,
                    clicked: 50,
                    bounced: 10,
                    revenue: 3500,
                    openRate: 42.6,
                    clickRate: 10.6,
                },
            }),
        });

        const result = await getCampaignPerformance({ campaignId: 'c-perf' });

        expect(result.summary).toContain(':::campaign:performance:Holiday Blast');
        expect(result.summary).toContain('Campaign Performance: Holiday Blast');
        expect(result.summary).toContain('500');
        expect(result.summary).toContain('480');
        expect(result.summary).toContain('42.6%');
        expect(result.summary).toContain('10.6%');
        expect(result.summary).toContain('3,500');
        expect(result.performance).not.toBeNull();
    });

    it('returns "has not been sent yet" for unsent campaign', async () => {
        mockGet.mockResolvedValueOnce({
            exists: true,
            id: 'c-draft',
            data: () => ({
                name: 'Pending Campaign',
                status: 'draft',
                performance: undefined,
            }),
        });

        const result = await getCampaignPerformance({ campaignId: 'c-draft' });

        expect(result.summary).toContain('has not been sent yet');
        expect(result.summary).toContain('Pending Campaign');
        expect(result.performance).toBeNull();
    });

    it('treats performance with sent=0 as unsent', async () => {
        mockGet.mockResolvedValueOnce({
            exists: true,
            id: 'c-zero',
            data: () => ({
                name: 'Zero Send',
                status: 'scheduled',
                performance: { sent: 0 },
            }),
        });

        const result = await getCampaignPerformance({ campaignId: 'c-zero' });

        expect(result.summary).toContain('has not been sent yet');
        expect(result.performance).toBeNull();
    });
});

// ===========================================================================
// suggestAudience
// ===========================================================================

describe('suggestAudience', () => {
    it('returns segment counts and estimated reach', async () => {
        mockGet.mockResolvedValueOnce({
            size: 100,
            docs: [
                { data: () => ({ segment: 'loyal' }) },
                { data: () => ({ segment: 'loyal' }) },
                { data: () => ({ segment: 'frequent' }) },
                { data: () => ({ segment: 'vip' }) },
                { data: () => ({ segment: 'vip' }) },
                { data: () => ({ segment: 'vip' }) },
                { data: () => ({ segment: 'new' }) },
            ],
        });

        const result = await suggestAudience({ orgId: 'org-test', goal: 'drive_sales' });

        // drive_sales suggests: loyal, frequent, vip
        expect(result.summary).toContain('Drive Sales');
        expect(result.summary).toContain('Loyal');
        expect(result.summary).toContain('Frequent');
        expect(result.summary).toContain('VIP');
        expect(result.summary).toContain('Estimated reach:');
        // loyal=2, frequent=1, vip=3 => total 6
        expect(result.summary).toContain('6 customers');
        expect(result.segments).toHaveLength(3);
    });

    it('uses goals suggestedSegments', async () => {
        mockGet.mockResolvedValueOnce({
            size: 50,
            docs: [
                { data: () => ({ segment: 'at_risk' }) },
                { data: () => ({ segment: 'slipping' }) },
                { data: () => ({ segment: 'churned' }) },
                { data: () => ({ segment: 'churned' }) },
            ],
        });

        // winback suggests: at_risk, slipping, churned
        const result = await suggestAudience({ orgId: 'org-test', goal: 'winback' });

        expect(result.summary).toContain('Win Back');
        expect(result.summary).toContain('At Risk');
        expect(result.summary).toContain('Slipping');
        expect(result.summary).toContain('Churned');
        expect(result.segments).toHaveLength(3);
        // at_risk=1, slipping=1, churned=2 => 4
        expect(result.summary).toContain('4 customers');
    });

    it('returns zero counts for segments with no customers', async () => {
        mockGet.mockResolvedValueOnce({
            size: 0,
            docs: [],
        });

        const result = await suggestAudience({ orgId: 'org-empty', goal: 'loyalty' });

        // loyalty suggests: vip, loyal, high_value
        expect(result.summary).toContain('0 customers');
        expect(result.segments.every(s => (s as { count: number }).count === 0)).toBe(true);
    });
});

// ===========================================================================
// submitCampaignForReview
// ===========================================================================

describe('submitCampaignForReview', () => {
    it('returns success for draft campaigns', async () => {
        mockGet.mockResolvedValueOnce({
            exists: true,
            id: 'c-draft-review',
            data: () => ({
                name: 'Draft Campaign',
                status: 'draft',
                channels: ['email'],
                content: { email: { body: 'Test' } },
            }),
        });

        const result = await submitCampaignForReview({ campaignId: 'c-draft-review' });

        expect(result.success).toBe(true);
        expect(result.summary).toContain('submitted for compliance review');
        expect(result.summary).toContain('Draft Campaign');
    });

    it('updates status to compliance_review', async () => {
        mockGet.mockResolvedValueOnce({
            exists: true,
            id: 'c-update',
            data: () => ({
                name: 'Update Test',
                status: 'draft',
                channels: ['sms'],
                content: { sms: { body: 'Sale!' } },
            }),
        });

        await submitCampaignForReview({ campaignId: 'c-update' });

        expect(mockDoc).toHaveBeenCalledWith('c-update');
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        const updateArg = mockUpdate.mock.calls[0][0];
        expect(updateArg.status).toBe('compliance_review');
        expect(updateArg.updatedAt).toBeInstanceOf(Date);
    });

    it('returns failure for non-draft campaigns', async () => {
        mockGet.mockResolvedValueOnce({
            exists: true,
            id: 'c-sent',
            data: () => ({
                name: 'Already Sent',
                status: 'sent',
            }),
        });

        const result = await submitCampaignForReview({ campaignId: 'c-sent' });

        expect(result.success).toBe(false);
        expect(result.summary).toContain('already in status: sent');
        expect(result.summary).toContain('Only draft campaigns');
    });

    it('returns failure when campaign is not found', async () => {
        mockGet.mockResolvedValueOnce({ exists: false });

        const result = await submitCampaignForReview({ campaignId: 'nonexistent' });

        expect(result.success).toBe(false);
        expect(result.summary).toBe('Campaign not found.');
    });
});

// ===========================================================================
// Tool def exports
// ===========================================================================

describe('tool def exports', () => {
    it('craigCampaignToolDefs has 5 tools', () => {
        expect(craigCampaignToolDefs).toHaveLength(5);
        const names = craigCampaignToolDefs.map(t => t.name);
        expect(names).toContain('createCampaignDraft');
        expect(names).toContain('getCampaigns');
        expect(names).toContain('getCampaignPerformance');
        expect(names).toContain('suggestAudience');
        expect(names).toContain('submitCampaignForReview');
    });

    it('mrsParkerCampaignToolDefs has 2 tools', () => {
        expect(mrsParkerCampaignToolDefs).toHaveLength(2);
        const names = mrsParkerCampaignToolDefs.map(t => t.name);
        expect(names).toContain('createCampaignDraft');
        expect(names).toContain('getCampaigns');
    });

    it('moneyMikeCampaignToolDefs has 2 tools', () => {
        expect(moneyMikeCampaignToolDefs).toHaveLength(2);
        const names = moneyMikeCampaignToolDefs.map(t => t.name);
        expect(names).toContain('getCampaigns');
        expect(names).toContain('getCampaignPerformance');
    });
});
