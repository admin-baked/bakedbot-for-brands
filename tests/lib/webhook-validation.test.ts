import { createHmac } from 'crypto';
import { verifyAuthorizeNetSignature } from '@/lib/payments/webhook-validation';

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    critical: jest.fn(),
  },
}));

describe('verifyAuthorizeNetSignature', () => {
  const payload = JSON.stringify({
    eventType: 'net.authorize.payment.authcapture.created',
    payload: { id: '1234567890', responseCode: 1 },
  });

  it('validates SHA512 signatures with Authorize.Net header format', () => {
    const hexSignatureKey = '00112233445566778899AABBCCDDEEFF00112233445566778899AABBCCDDEEFF';
    const computed = createHmac('sha512', Buffer.from(hexSignatureKey, 'hex'))
      .update(payload)
      .digest('hex')
      .toUpperCase();

    const result = verifyAuthorizeNetSignature(payload, `SHA512=${computed}`, hexSignatureKey);

    expect(result.valid).toBe(true);
  });

  it('rejects invalid signatures', () => {
    const hexSignatureKey = '00112233445566778899AABBCCDDEEFF00112233445566778899AABBCCDDEEFF';
    const result = verifyAuthorizeNetSignature(payload, 'SHA512=deadbeef', hexSignatureKey);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('supports non-hex signature keys for local test environments', () => {
    const plainSecret = 'local-webhook-secret';
    const computed = createHmac('sha512', Buffer.from(plainSecret, 'utf8'))
      .update(payload)
      .digest('hex');

    const result = verifyAuthorizeNetSignature(payload, computed, plainSecret);

    expect(result.valid).toBe(true);
  });
});
