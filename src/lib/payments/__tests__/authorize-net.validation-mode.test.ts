jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('authorize-net profile creation guardrails', () => {
    const originalEnv = process.env;
    const originalFetch = global.fetch;

    beforeEach(() => {
        jest.resetModules();
        process.env = {
            ...originalEnv,
            AUTHNET_API_LOGIN_ID: 'login-id',
            AUTHNET_TRANSACTION_KEY: 'transaction-key',
            AUTHNET_ENV: 'production',
        };
    });

    afterEach(() => {
        global.fetch = originalFetch;
        process.env = originalEnv;
    });

    it('uses validationMode=none to avoid auth-only validation transactions', async () => {
        (global as any).fetch = jest.fn().mockResolvedValue({
            json: async () => ({
                messages: { resultCode: 'Ok' },
                customerProfileId: 'cp_123',
                customerPaymentProfileIdList: ['pp_123'],
            }),
        });

        const { createCustomerProfile } = await import('../authorize-net');

        await createCustomerProfile(
            'merchant_customer_1',
            'owner@example.com',
            {
                firstName: 'Owner',
                lastName: 'Example',
                zip: '13224',
            },
            {
                opaqueData: {
                    dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                    dataValue: 'opaque',
                },
            },
        );

        const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(fetchArgs[1].body);

        expect(requestBody.createCustomerProfileRequest.validationMode).toBe('none');
    });
});

