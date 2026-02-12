/**
 * Unit tests for campaign-compliance.ts
 * Tests Deebo compliance checking of campaign content across channels.
 */

import { runComplianceCheck } from '../campaign-compliance';
import { deebo } from '@/server/agents/deebo';
import { createServerClient } from '@/firebase/server-client';
import type { Campaign } from '@/types/campaign';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/server/agents/deebo', () => ({
    deebo: {
        checkContent: jest.fn(),
    },
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockCheckContent = deebo.checkContent as jest.Mock;
const mockCreateServerClient = createServerClient as jest.Mock;

function setupFirestoreMock() {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
    const mockFirestore = { collection: jest.fn().mockReturnValue({ doc: mockDoc }) };
    mockCreateServerClient.mockResolvedValue({ firestore: mockFirestore });
    return { mockFirestore, mockDoc, mockUpdate };
}

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
    return {
        id: 'camp_123',
        orgId: 'org_test',
        createdBy: 'user_1',
        name: 'Test Campaign',
        goal: 'engagement',
        status: 'compliance_review',
        channels: ['email', 'sms'],
        audience: { type: 'all', estimatedCount: 100 },
        content: {
            email: {
                channel: 'email',
                subject: 'Big Sale',
                body: 'Check out our deals',
                htmlBody: '<p>Check out our <b>deals</b></p>',
            },
            sms: {
                channel: 'sms',
                body: 'Flash sale today!',
            },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    } as Campaign;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Campaign Compliance Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupFirestoreMock();
    });

    // -----------------------------------------------------------------------
    // 1. All channels pass
    // -----------------------------------------------------------------------
    it('returns overallStatus "passed" and sets campaign to pending_approval when all channels pass', async () => {
        mockCheckContent.mockResolvedValue({
            status: 'pass',
            violations: [],
            suggestions: [],
        });

        const { mockUpdate } = setupFirestoreMock();
        const campaign = makeCampaign();

        const { overallStatus, results } = await runComplianceCheck(campaign);

        expect(overallStatus).toBe('passed');
        expect(results['email'].status).toBe('pass');
        expect(results['sms'].status).toBe('pass');

        // Campaign status should be set to pending_approval
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                complianceStatus: 'passed',
                status: 'pending_approval',
            }),
        );
    });

    // -----------------------------------------------------------------------
    // 2. Any channel fails
    // -----------------------------------------------------------------------
    it('returns overallStatus "failed" and keeps campaign in compliance_review when any channel fails', async () => {
        mockCheckContent.mockResolvedValue({
            status: 'fail',
            violations: ['Health claims not allowed'],
            suggestions: ['Remove health claim language'],
        });

        const { mockUpdate } = setupFirestoreMock();
        const campaign = makeCampaign();

        const { overallStatus, results } = await runComplianceCheck(campaign);

        expect(overallStatus).toBe('failed');
        expect(results['email'].violations).toContain('Health claims not allowed');

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                complianceStatus: 'failed',
                status: 'compliance_review',
            }),
        );
    });

    // -----------------------------------------------------------------------
    // 3. Warning but no failure
    // -----------------------------------------------------------------------
    it('returns overallStatus "warning" and keeps campaign in compliance_review when warnings exist but no failures', async () => {
        mockCheckContent.mockResolvedValue({
            status: 'warning',
            violations: [],
            suggestions: ['Consider adding age verification disclaimer'],
        });

        const { mockUpdate } = setupFirestoreMock();
        const campaign = makeCampaign();

        const { overallStatus } = await runComplianceCheck(campaign);

        expect(overallStatus).toBe('warning');

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                complianceStatus: 'warning',
                status: 'compliance_review',
            }),
        );
    });

    // -----------------------------------------------------------------------
    // 4. Mixed channels (email passes, sms fails)
    // -----------------------------------------------------------------------
    it('returns "failed" when email passes but sms fails', async () => {
        mockCheckContent
            .mockResolvedValueOnce({
                status: 'pass',
                violations: [],
                suggestions: [],
            })
            .mockResolvedValueOnce({
                status: 'fail',
                violations: ['SMS contains prohibited pricing language'],
                suggestions: ['Rephrase pricing claim'],
            });

        const { mockUpdate } = setupFirestoreMock();
        const campaign = makeCampaign();

        const { overallStatus, results } = await runComplianceCheck(campaign);

        expect(overallStatus).toBe('failed');
        expect(results['email'].status).toBe('pass');
        expect(results['sms'].status).toBe('fail');
        expect(results['sms'].violations).toHaveLength(1);

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                complianceStatus: 'failed',
                status: 'compliance_review',
            }),
        );
    });

    // -----------------------------------------------------------------------
    // 5. Campaign with no content
    // -----------------------------------------------------------------------
    it('returns "passed" when campaign has no content to check', async () => {
        const { mockUpdate } = setupFirestoreMock();
        const campaign = makeCampaign({
            channels: ['email', 'sms'],
            content: {},
        });

        const { overallStatus, results } = await runComplianceCheck(campaign);

        expect(overallStatus).toBe('passed');
        expect(Object.keys(results)).toHaveLength(0);
        expect(mockCheckContent).not.toHaveBeenCalled();

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                complianceStatus: 'passed',
                status: 'pending_approval',
            }),
        );
    });

    // -----------------------------------------------------------------------
    // 6. Deebo throws error
    // -----------------------------------------------------------------------
    it('treats Deebo errors as failure with system error message', async () => {
        mockCheckContent.mockRejectedValue(new Error('Deebo service unavailable'));

        const { mockUpdate } = setupFirestoreMock();
        const campaign = makeCampaign({
            channels: ['email'],
            content: {
                email: { channel: 'email', subject: 'Test', body: 'Body' },
            },
        });

        const { overallStatus, results } = await runComplianceCheck(campaign);

        expect(overallStatus).toBe('failed');
        expect(results['email'].status).toBe('fail');
        expect(results['email'].violations).toContain(
            'Compliance check system error — manual review required.',
        );
        expect(results['email'].suggestions).toContain(
            'Try re-submitting for compliance review.',
        );

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                complianceStatus: 'failed',
                status: 'compliance_review',
            }),
        );
    });

    // -----------------------------------------------------------------------
    // 7. Builds compliance text correctly from subject + body
    // -----------------------------------------------------------------------
    it('builds compliance text with subject and body for email channel', async () => {
        mockCheckContent.mockResolvedValue({
            status: 'pass',
            violations: [],
            suggestions: [],
        });

        setupFirestoreMock();
        const campaign = makeCampaign({
            channels: ['email'],
            content: {
                email: {
                    channel: 'email',
                    subject: 'Weekend Deals',
                    body: 'Shop our best products',
                },
            },
        });

        await runComplianceCheck(campaign);

        // The text sent to Deebo should include subject and body
        expect(mockCheckContent).toHaveBeenCalledWith(
            'NY',
            'email',
            expect.stringContaining('Subject: Weekend Deals'),
        );
        expect(mockCheckContent).toHaveBeenCalledWith(
            'NY',
            'email',
            expect.stringContaining('Shop our best products'),
        );
    });

    // -----------------------------------------------------------------------
    // 8. HTML content is stripped to plain text for checking
    // -----------------------------------------------------------------------
    it('strips HTML tags to plain text when htmlBody differs from body', async () => {
        mockCheckContent.mockResolvedValue({
            status: 'pass',
            violations: [],
            suggestions: [],
        });

        setupFirestoreMock();
        const campaign = makeCampaign({
            channels: ['email'],
            content: {
                email: {
                    channel: 'email',
                    subject: 'Sale',
                    body: 'Plain body',
                    htmlBody: '<div><strong>Rich</strong> HTML <em>content</em></div>',
                },
            },
        });

        await runComplianceCheck(campaign);

        // The text should include the stripped HTML as extra content
        const callArgs = mockCheckContent.mock.calls[0];
        const textChecked = callArgs[2] as string;

        // Should contain subject
        expect(textChecked).toContain('Subject: Sale');
        // Should contain original body
        expect(textChecked).toContain('Plain body');
        // Should contain stripped HTML text (no tags)
        expect(textChecked).toContain('Rich');
        expect(textChecked).toContain('HTML');
        expect(textChecked).toContain('content');
        // Should NOT contain HTML tags
        expect(textChecked).not.toContain('<div>');
        expect(textChecked).not.toContain('<strong>');
        expect(textChecked).not.toContain('<em>');
    });
});
