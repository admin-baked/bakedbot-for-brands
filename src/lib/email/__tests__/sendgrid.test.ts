

// We don't import at top level to allow env var mocking
// import { sendGenericEmail } from '../sendgrid'; 

describe('SendGrid Email Provider', () => {
    let sendGenericEmail: any;
    let sgMail: any;

    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        process.env.SENDGRID_API_KEY = 'test-key';
        process.env.SENDGRID_FROM_EMAIL = 'test@example.com';
        process.env.SENDGRID_FROM_NAME = 'Test Bot';

        // Re-mock dependencies for each test
        jest.mock('@sendgrid/mail', () => ({
            setApiKey: jest.fn(),
            send: jest.fn(),
        }));
        
        jest.mock('@/lib/monitoring', () => ({
            logger: {
                warn: jest.fn(),
                info: jest.fn(),
                error: jest.fn(),
            }
        }));

        sgMail = require('@sendgrid/mail');
        const mod = require('../sendgrid');
        sendGenericEmail = mod.sendGenericEmail;
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
    });

    it('should send generic email successfully', async () => {
        (sgMail.send as jest.Mock).mockResolvedValue([{}, {}]);

        const result = await sendGenericEmail({
            to: 'recipient@example.com',
            subject: 'Test Subject',
            htmlBody: '<p>Test Body</p>'
        });

        expect(result.success).toBe(true);
        expect(sgMail.send).toHaveBeenCalledWith(expect.objectContaining({
            to: 'recipient@example.com',
            from: { email: 'test@example.com', name: 'Test Bot' },
            subject: 'Test Subject',
            html: '<p>Test Body</p>',
            text: 'Test Body'
        }));
    });

    it('should return error if API key is missing', async () => {
        jest.resetModules();
        delete process.env.SENDGRID_API_KEY;
        // Re-require to trigger the "API_KEY string" evaluation to undefined
        const mod = require('../sendgrid');
        const sendGenericEmailMissingKey = mod.sendGenericEmail;

        const result = await sendGenericEmailMissingKey({
            to: 'recipient@example.com',
            subject: 'Test',
            htmlBody: 'Body'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('SendGrid API key is missing');
    });

    it('should handle API failure gracefully', async () => {
        (sgMail.send as jest.Mock).mockRejectedValue(new Error('API Failure'));

        const result = await sendGenericEmail({
            to: 'recipient@example.com',
            subject: 'Fail',
            htmlBody: 'Fail'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('API Failure');
    });
});

