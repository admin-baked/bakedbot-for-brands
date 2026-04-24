const mockSendSes = jest.fn();
const mockSendMJ = jest.fn();
const mockSendSG = jest.fn();
const mockSettingsGet = jest.fn();
const mockIsOrgOnFreePlan = jest.fn();

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: mockSettingsGet,
            })),
        })),
    })),
}));

jest.mock('@/lib/email/ses', () => ({
    sendSesEmail: (...args: unknown[]) => mockSendSes(...args),
}));

jest.mock('@/lib/email/mailjet', () => ({
    sendGenericEmail: (...args: unknown[]) => mockSendMJ(...args),
}));

jest.mock('@/lib/email/sendgrid', () => ({
    sendGenericEmail: (...args: unknown[]) => mockSendSG(...args),
}));

jest.mock('@/lib/get-org-tier', () => ({
    isOrgOnFreePlan: (...args: unknown[]) => mockIsOrgOnFreePlan(...args),
}));

jest.mock('@/server/services/email-thread-service', () => ({
    createOutboundThread: jest.fn(),
}));

jest.mock('@/server/actions/customer-communications', () => ({
    logCommunication: jest.fn(),
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

describe('EmailDispatcher', () => {
    let sendGenericEmail: typeof import('@/lib/email/dispatcher').sendGenericEmail;
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
        mockSettingsGet.mockResolvedValue({ data: () => ({ emailProvider: 'sendgrid' }) });
        mockIsOrgOnFreePlan.mockResolvedValue(true);

        ({ sendGenericEmail } = require('@/lib/email/dispatcher') as typeof import('@/lib/email/dispatcher'));
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('defaults to SES when AWS credentials are configured', async () => {
        const result = await sendGenericEmail({
            to: 'test@test.com',
            subject: 'Hi',
            htmlBody: '<p>Body</p>',
        });

        expect(result).toEqual({ success: true, messageId: 'ses-1' });
        expect(mockSendSes).toHaveBeenCalled();
        expect(mockSendMJ).not.toHaveBeenCalled();
        expect(mockSendSG).not.toHaveBeenCalled();
    });

    it('uses SendGrid as the configured platform provider when SES credentials are missing', async () => {
        process.env.AWS_SES_ACCESS_KEY_ID = '';
        process.env.AWS_SES_SECRET_ACCESS_KEY = '';

        const result = await sendGenericEmail({
            to: 'test@test.com',
            subject: 'Hi',
            htmlBody: '<p>Body</p>',
        });

        expect(result.success).toBe(true);
        expect(mockSendSG).toHaveBeenCalled();
        expect(mockSendMJ).not.toHaveBeenCalled();
    });

    it('strips tenant subdomain senders before platform Mailjet sends', async () => {
        process.env.AWS_SES_ACCESS_KEY_ID = '';
        process.env.AWS_SES_SECRET_ACCESS_KEY = '';
        mockSettingsGet.mockResolvedValueOnce({ data: () => ({ emailProvider: 'mailjet' }) });

        await sendGenericEmail({
            to: 'test@test.com',
            subject: 'Hi',
            htmlBody: '<p>Body</p>',
            fromEmail: 'hello@brand-test.bakedbot.ai',
        });

        expect(mockSendMJ).toHaveBeenCalledWith(
            expect.objectContaining({
                fromEmail: undefined,
            })
        );
    });
});
