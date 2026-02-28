import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('lib/authorize-net production guardrails', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      AUTHNET_ENV: 'production',
      AUTHNET_API_LOGIN_ID: 'login-id',
      AUTHNET_TRANSACTION_KEY: 'txn-key',
      AUTHNET_FORCE_MOCK: 'false',
    };

    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        messages: { resultCode: 'Ok' },
        transactionResponse: {
          responseCode: '1',
          transId: 'txn_123',
        },
      }),
    })) as any;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch as any;
  });

  it('rejects production charges without a valid orderId', async () => {
    const { createTransaction } = await import('../authorize-net');

    const result = await createTransaction({
      amount: 10,
      opaqueData: {
        dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
        dataValue: 'opaque',
      },
      customer: {
        email: 'owner@example.com',
        firstName: 'Owner',
        lastName: 'Example',
        address: '123 Main St',
        city: 'Syracuse',
        state: 'NY',
        zip: '13224',
      },
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('order identifier');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects production charges without tokenized payment data', async () => {
    const { createTransaction } = await import('../authorize-net');

    const result = await createTransaction({
      amount: 10,
      orderId: 'order_1',
      cardNumber: '4111111111111111',
      expirationDate: '2026-12',
      cvv: '123',
      customer: {
        email: 'owner@example.com',
        firstName: 'Owner',
        lastName: 'Example',
        address: '123 Main St',
        city: 'Syracuse',
        state: 'NY',
        zip: '13224',
      },
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('tokenized');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects production charges with incomplete billing profile', async () => {
    const { createTransaction } = await import('../authorize-net');

    const result = await createTransaction({
      amount: 10,
      orderId: 'order_1',
      opaqueData: {
        dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
        dataValue: 'opaque',
      },
      customer: {
        email: 'owner@example.com',
        firstName: 'Owner',
        lastName: 'Example',
      },
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Billing profile');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows production charge when order binding, token, and billing profile are complete', async () => {
    const { createTransaction } = await import('../authorize-net');

    const result = await createTransaction({
      amount: 10,
      orderId: 'order_1',
      opaqueData: {
        dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
        dataValue: 'opaque',
      },
      customer: {
        email: 'owner@example.com',
        firstName: 'Owner',
        lastName: 'Example',
        address: '123 Main St',
        city: 'Syracuse',
        state: 'NY',
        zip: '13224',
      },
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('txn_123');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
