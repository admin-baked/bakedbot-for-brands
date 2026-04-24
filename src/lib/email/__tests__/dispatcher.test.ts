const mockSendSes = jest.fn();
const mockSendMJ = jest.fn();
const mockSendSG = jest.fn();
const mockSettingsGet = jest.fn();
const mockCreateOutboundThread = jest.fn();
const mockLogCommunication = jest.fn();
const mockIsOrgOnFreePlan = jest.fn();

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => ({
        collection: jest.fn((name: string) => {
            if (name === 'settings') {
                return {
                    doc: jest.fn(() => ({
                        get: mockSettingsGet,
                    })),
                };
            }
            return {
                doc: jest.fn(() => ({
                    get: jest.fn(),
                })),
            };
        }),
    })),
}));

jest.mock('../ses', () => ({
    sendSesEmail: (...args: unknown[]) => mockSendSes(...args),
}));

jest.mock('../mailjet', () => ({
    sendGenericEmail: (...args: unknown[]) => mockSendMJ(...args),
}));

jest.mock('../sendgrid', () => ({
    sendGenericEmail: (...args: unknown[]) => mockSendSG(...args),
}));

jest.mock('@/lib/get-org-tier', () => ({
    isOrgOnFreePlan: (...args: unknown[]) => mockIsOrgOnFreePlan(...args),
}));

jest.mock('@/server/services/email-thread-service', () => ({
    createOutboundThread: (...args: unknown[]) => mockCreateOutboundThread(...args),
}));

jest.mock('@/server/actions/customer-communications', () => ({
    logCommunication: (...args: unknown[]) => mockLogCommunication(...args),
}));

jest.mock('@/server/integrations/gmail/token-storage', () => ({
    getGmailToken: jest.fn(),
}));

jest.mock('@/server/integrations/google-workspace/token-storage', () => ({
    getWorkspaceToken: jest.fn(),
}));

jest.mock('@/server/integrations/gmail/send', () => ({
    sendGmail: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Email Dispatcher', () => {
    let sendGenericEmail: typeof import('../dispatcher').sendGenericEmail;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();

        process.env = {
            ...originalEnv,
            AWS_SES_ACCESS_KEY_ID: 'ses-key',
            AWS_SES_SECRET_ACCESS_KEY: 'ses-secret',
        };

        mockSendSes.mockResolvedValue({ messageId: 'ses-1' });
        mockSendMJ.mockResolvedValue({ success: true });
        mockSendSG.mockResolvedValue({ success: true });
        mockSettingsGet.mockResolvedValue({ data: () => ({ emailProvider: 'mailjet' }) });
        mockCreateOutboundThread.mockResolvedValue(undefined);
        mockLogCommunication.mockResolvedValue(undefined);
        mockIsOrgOnFreePlan.mockResolvedValue(true);

        ({ sendGenericEmail } = require('../dispatcher') as typeof import('../dispatcher'));
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('uses SES by default when AWS credentials are present', async () => {
        const result = await sendGenericEmail({
            to: 'test@example.com',
            subject: 'Hello',
            htmlBody: '<p>Body</p>',
        });

        expect(result).toEqual({ success: true, messageId: 'ses-1' });
        expect(mockSendSes).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'test@example.com',
                subject: 'Hello',
            })
        );
        expect(mockSendMJ).not.toHaveBeenCalled();
        expect(mockSendSG).not.toHaveBeenCalled();
    });

    it('returns an SES-only error when SES fails and credentials are present', async () => {
        mockSendSes.mockRejectedValueOnce(new Error('SES down'));

        const result = await sendGenericEmail({
            to: 'test@example.com',
            subject: 'Hello',
            htmlBody: '<p>Body</p>',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('SES unavailable');
        expect(mockSendMJ).not.toHaveBeenCalled();
        expect(mockSendSG).not.toHaveBeenCalled();
    });

    it('uses the configured platform Mailjet provider when SES credentials are absent', async () => {
        process.env.AWS_SES_ACCESS_KEY_ID = '';
        process.env.AWS_SES_SECRET_ACCESS_KEY = '';

        const result = await sendGenericEmail({
            to: 'test@example.com',
            subject: 'Platform',
            htmlBody: '<p>Body</p>',
        });

        expect(result.success).toBe(true);
        expect(mockSendMJ).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'test@example.com',
                subject: 'Platform',
            })
        );
        expect(mockSendSG).not.toHaveBeenCalled();
    });

    it('falls back to SendGrid when platform Mailjet fails', async () => {
        process.env.AWS_SES_ACCESS_KEY_ID = '';
        process.env.AWS_SES_SECRET_ACCESS_KEY = '';
        mockSendMJ.mockResolvedValueOnce({ success: false, error: 'MJ Error' });
        mockSendSG.mockResolvedValueOnce({ success: true });

        const result = await sendGenericEmail({
            to: 'test@example.com',
            subject: 'Fallback',
            htmlBody: '<p>Body</p>',
        });

        expect(mockSendMJ).toHaveBeenCalled();
        expect(mockSendSG).toHaveBeenCalled();
        expect(result.success).toBe(true);
    });

    it('returns a combined error when Mailjet and SendGrid both fail', async () => {
        process.env.AWS_SES_ACCESS_KEY_ID = '';
        process.env.AWS_SES_SECRET_ACCESS_KEY = '';
        mockSendMJ.mockResolvedValueOnce({ success: false, error: 'MJ Error' });
        mockSendSG.mockResolvedValueOnce({ success: false, error: 'SG Error' });

        const result = await sendGenericEmail({
            to: 'test@example.com',
            subject: 'Failure',
            htmlBody: '<p>Body</p>',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Mailjet: MJ Error');
        expect(result.error).toContain('SendGrid: SG Error');
    });
});
