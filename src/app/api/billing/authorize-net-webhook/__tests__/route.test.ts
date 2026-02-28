/**
 * Tests for Authorize.net Webhook Route
 *
 * Critical Fix Test Coverage:
 * - AUTHNET_SIGNATURE_KEY validation (missing secret → 500)
 * - HMAC-SHA512 signature validation (invalid/missing → 401)
 * - Event processing and subscription status updates
 * - Slack alerts on payment failures
 */

jest.mock('next/server', () => {
    class MockNextRequest {
        private readonly rawBody: string;
        readonly headers: { get: (name: string) => string | null };

        constructor(_url: string, init?: { body?: unknown; headers?: Record<string, string>; method?: string }) {
            this.rawBody = typeof init?.body === 'string'
                ? init.body
                : init?.body
                    ? JSON.stringify(init.body)
                    : '';

            const normalized = new Map<string, string>();
            Object.entries(init?.headers || {}).forEach(([key, value]) => {
                normalized.set(String(key).toLowerCase(), String(value));
            });

            this.headers = {
                get: (name: string) => normalized.get(name.toLowerCase()) || null,
            };
        }

        async text() {
            return this.rawBody;
        }
    }

    return {
        NextRequest: MockNextRequest,
        NextResponse: {
            json: (body: any, init?: any) => ({
                status: init?.status || 200,
                json: async () => body,
            }),
        },
    };
});

import { POST } from '../route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
    },
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('POST /api/billing/authorize-net-webhook', () => {
    let mockDb: any;
    let mockSubscriptionRef: any;
    let mockHistoryRef: any;
    let mockForensicsAdd: jest.Mock;
    const originalEnv = process.env;
    const TEST_SIGNATURE_KEY = 'test-signature-key-123';

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset process.env to a fresh copy
        process.env = { ...originalEnv };

        // Setup mock Firestore
        mockSubscriptionRef = {
            set: jest.fn().mockResolvedValue(undefined),
        };

        mockHistoryRef = {
            set: jest.fn().mockResolvedValue(undefined),
        };

        mockForensicsAdd = jest.fn().mockResolvedValue(undefined);

        mockDb = {
            collection: jest.fn((name: string) => {
                if (name === 'organizations') {
                    return {
                        doc: (orgId: string) => ({
                            collection: (subName: string) => {
                                if (subName === 'subscription') {
                                    return {
                                        doc: () => mockSubscriptionRef,
                                    };
                                }
                                if (subName === 'subscriptionHistory') {
                                    return {
                                        doc: () => mockHistoryRef,
                                    };
                                }
                                return {};
                            },
                        }),
                    };
                }
                if (name === 'payment_forensics') {
                    return {
                        add: mockForensicsAdd,
                    };
                }
                return {};
            }),
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });
    });

    afterEach(() => {
        // Restore original env
        process.env = originalEnv;
    });

    /**
     * Helper to create HMAC-SHA512 signature for webhook payload
     */
    function createSignature(body: string, key: string = TEST_SIGNATURE_KEY): string {
        return crypto
            .createHmac('sha512', key)
            .update(body)
            .digest('hex')
            .toUpperCase();
    }

    /**
     * Helper to create test webhook payload
     */
    function createWebhookPayload(
        eventType: string,
        orgId: string = 'org_test',
    ): string {
        return JSON.stringify({
            webhookId: 'wh_test_123',
            eventType,
            payload: {
                merchantReferenceId: orgId,
                profile: {
                    merchantCustomerId: orgId,
                },
            },
        });
    }

    // =========================================================================
    // AUTHNET_SIGNATURE_KEY VALIDATION (Critical Fix)
    // =========================================================================

    describe('AUTHNET_SIGNATURE_KEY validation', () => {
        it('returns 500 when AUTHNET_SIGNATURE_KEY is undefined', async () => {
            delete process.env.AUTHNET_SIGNATURE_KEY;

            const payload = createWebhookPayload('net.authorize.payment.authcapture.created');

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': 'sha512=test',
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Server misconfiguration');
        });

        it('returns 500 when AUTHNET_SIGNATURE_KEY is empty string', async () => {
            process.env.AUTHNET_SIGNATURE_KEY = '';

            const payload = createWebhookPayload('net.authorize.payment.authcapture.created');

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': 'sha512=test',
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Server misconfiguration');
        });
    });

    // =========================================================================
    // SIGNATURE VALIDATION (Critical Fix)
    // =========================================================================

    describe('HMAC-SHA512 signature validation', () => {
        beforeEach(() => {
            process.env.AUTHNET_SIGNATURE_KEY = TEST_SIGNATURE_KEY;
        });

        it('returns 401 when X-Anet-Signature header is missing', async () => {
            const payload = createWebhookPayload('net.authorize.payment.authcapture.created');

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Missing signature');
        });

        it('returns 401 when X-Anet-Signature header is empty', async () => {
            const payload = createWebhookPayload('net.authorize.payment.authcapture.created');

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': '',
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Missing signature');
        });

        it('returns 401 when signature is invalid', async () => {
            const payload = createWebhookPayload('net.authorize.payment.authcapture.created');

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': 'sha512=INVALID_SIGNATURE_HASH',
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Invalid signature');
        });

        it('returns 401 when signature is for different payload', async () => {
            const payload = createWebhookPayload('net.authorize.payment.authcapture.created');
            const differentPayload = createWebhookPayload('net.authorize.payment.declined');
            const signatureForDifferentPayload = createSignature(differentPayload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${signatureForDifferentPayload}`,
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Invalid signature');
        });

        it('accepts request when signature is valid', async () => {
            const payload = createWebhookPayload('net.authorize.payment.authcapture.created');
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.received).toBe(true);
            expect(data.processed).toBe(true);
        });

        it('handles signature with mixed case prefix (SHA512=)', async () => {
            const payload = createWebhookPayload('net.authorize.payment.authcapture.created');
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `SHA512=${validSignature}`,
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.received).toBe(true);
        });

        it('rejects signature with wrong signing key', async () => {
            const payload = createWebhookPayload('net.authorize.payment.authcapture.created');
            const wrongKeySignature = createSignature(payload, 'wrong-key');

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${wrongKeySignature}`,
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Invalid signature');
        });
    });

    // =========================================================================
    // EVENT PROCESSING AND SUBSCRIPTION STATUS UPDATES
    // =========================================================================

    describe('Event processing', () => {
        beforeEach(() => {
            process.env.AUTHNET_SIGNATURE_KEY = TEST_SIGNATURE_KEY;
        });

        it('updates subscription to "active" on payment.authcapture.created event', async () => {
            const payload = createWebhookPayload('net.authorize.payment.authcapture.created', 'org_123');
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.processed).toBe(true);

            expect(mockSubscriptionRef.set).toHaveBeenCalledWith(
                {
                    status: 'active',
                    updatedAt: 'MOCK_TIMESTAMP',
                    lastWebhookEvent: 'net.authorize.payment.authcapture.created',
                    lastWebhookAt: 'MOCK_TIMESTAMP',
                },
                { merge: true },
            );

            expect(mockHistoryRef.set).toHaveBeenCalledWith({
                event: 'webhook_status_update',
                status: 'active',
                webhookEventType: 'net.authorize.payment.authcapture.created',
                orgId: 'org_123',
                at: 'MOCK_TIMESTAMP',
            });
        });

        it('updates subscription to "payment_failed" on payment.declined event', async () => {
            const payload = createWebhookPayload('net.authorize.payment.declined', 'org_456');
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.processed).toBe(true);

            expect(mockSubscriptionRef.set).toHaveBeenCalledWith(
                {
                    status: 'payment_failed',
                    updatedAt: 'MOCK_TIMESTAMP',
                    lastWebhookEvent: 'net.authorize.payment.declined',
                    lastWebhookAt: 'MOCK_TIMESTAMP',
                },
                { merge: true },
            );
        });

        it('updates subscription to "suspended" on subscription.suspended event', async () => {
            const payload = createWebhookPayload('net.authorize.subscription.suspended', 'org_789');
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.processed).toBe(true);

            expect(mockSubscriptionRef.set).toHaveBeenCalledWith(
                {
                    status: 'suspended',
                    updatedAt: 'MOCK_TIMESTAMP',
                    lastWebhookEvent: 'net.authorize.subscription.suspended',
                    lastWebhookAt: 'MOCK_TIMESTAMP',
                },
                { merge: true },
            );
        });

        it('updates subscription to "cancelled" on subscription.terminated event', async () => {
            const payload = createWebhookPayload('net.authorize.subscription.terminated', 'org_abc');
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            const response = await POST(request);

            expect(mockSubscriptionRef.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'cancelled',
                }),
                { merge: true },
            );
        });

        it('returns 200 but does not update status for unhandled event type', async () => {
            const payload = createWebhookPayload('net.authorize.customer.updated', 'org_xyz');
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.received).toBe(true);
            expect(data.processed).toBe(false);

            expect(mockSubscriptionRef.set).not.toHaveBeenCalled();
            expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
                reason: 'unhandled_event_type',
                eventType: 'net.authorize.customer.updated',
                orgId: 'org_xyz',
            }));
        });

        it('acknowledges ping/test events with no eventType', async () => {
            const payload = JSON.stringify({
                webhookId: 'ping_123',
                // No eventType
            });
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.received).toBe(true);

            expect(mockSubscriptionRef.set).not.toHaveBeenCalled();
        });

        it('returns 200 with warning when orgId is missing in payload', async () => {
            const payload = JSON.stringify({
                webhookId: 'wh_no_org',
                eventType: 'net.authorize.payment.authcapture.created',
                payload: {
                    // No merchantReferenceId or profile
                },
            });
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.received).toBe(true);
            expect(data.warning).toBe('No orgId');

            expect(mockSubscriptionRef.set).not.toHaveBeenCalled();
            expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
                reason: 'missing_org_mapping',
                eventType: 'net.authorize.payment.authcapture.created',
                orgId: null,
            }));
        });
    });

    // =========================================================================
    // SLACK ALERTS ON PAYMENT FAILURES
    // =========================================================================

    describe('Slack alerts', () => {
        beforeEach(() => {
            process.env.AUTHNET_SIGNATURE_KEY = TEST_SIGNATURE_KEY;
            process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test-webhook';
        });

        it('sends Slack alert on payment_failed status', async () => {
            const payload = createWebhookPayload('net.authorize.payment.declined', 'org_failed');
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            await POST(request);

            expect(global.fetch).toHaveBeenCalledWith(
                'https://hooks.slack.com/test-webhook',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: expect.stringContaining('org_failed'),
                }),
            );

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const slackBody = JSON.parse(fetchCall[1].body);
            expect(slackBody.text).toContain('payment_failed');
            expect(slackBody.text).toContain('net.authorize.payment.declined');
        });

        it('sends Slack alert on suspended status', async () => {
            const payload = createWebhookPayload('net.authorize.subscription.suspended', 'org_suspended');
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            await POST(request);

            expect(global.fetch).toHaveBeenCalledWith(
                'https://hooks.slack.com/test-webhook',
                expect.objectContaining({
                    method: 'POST',
                }),
            );

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const slackBody = JSON.parse(fetchCall[1].body);
            expect(slackBody.text).toContain('suspended');
        });

        it('does not send Slack alert on active status', async () => {
            const payload = createWebhookPayload('net.authorize.payment.authcapture.created', 'org_active');
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            await POST(request);

            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('continues processing even if Slack alert fails', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Slack API error'));

            const payload = createWebhookPayload('net.authorize.payment.declined', 'org_slack_fail');
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            const response = await POST(request);
            const data = await response.json();

            // Should still return 200 and process the webhook
            expect(response.status).toBe(200);
            expect(data.processed).toBe(true);

            // Subscription should still be updated
            expect(mockSubscriptionRef.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'payment_failed',
                }),
                { merge: true },
            );
        });

        it('does not send Slack alert when SLACK_WEBHOOK_URL is not configured', async () => {
            delete process.env.SLACK_WEBHOOK_URL;

            const payload = createWebhookPayload('net.authorize.payment.declined', 'org_no_slack');
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            await POST(request);

            expect(global.fetch).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // ERROR HANDLING
    // =========================================================================

    describe('Error handling', () => {
        beforeEach(() => {
            process.env.AUTHNET_SIGNATURE_KEY = TEST_SIGNATURE_KEY;
        });

        it('returns 400 when request body is not valid JSON', async () => {
            const invalidJson = 'not valid json {';
            const validSignature = createSignature(invalidJson);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: invalidJson,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid JSON');
        });

        it('returns 500 on database error and retries webhook', async () => {
            mockSubscriptionRef.set.mockRejectedValueOnce(new Error('Firestore connection failed'));

            const payload = createWebhookPayload('net.authorize.payment.authcapture.created', 'org_db_error');
            const validSignature = createSignature(payload);

            const request = new NextRequest('http://localhost/api/billing/authorize-net-webhook', {
                method: 'POST',
                body: payload,
                headers: {
                    'X-Anet-Signature': `sha512=${validSignature}`,
                },
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal error');
        });
    });
});
