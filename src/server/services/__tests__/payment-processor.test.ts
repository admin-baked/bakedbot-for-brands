/**
 * Payment Processor Unit Tests
 *
 * Tests for unified payment processing (Authorize.net, Stripe, Square CBD)
 */

import {
  processUnifiedPayment,
  getAvailableProviders,
  refundUnifiedPayment,
} from '../payment-processor';

// Mock dependencies
jest.mock('../authorize-net');
jest.mock('stripe');

describe('Payment Processor', () => {
  describe('getAvailableProviders', () => {
    beforeEach(() => {
      // Set environment variables for testing
      process.env.AUTHORIZENET_API_LOGIN_ID = 'test_login';
      process.env.AUTHORIZENET_TRANSACTION_KEY = 'test_key';
      process.env.AUTHORIZENET_CLIENT_KEY = 'test_client_key';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.SQUARE_ACCESS_TOKEN = 'sq_test_123';
    });

    it('should return all providers when all are configured', () => {
      const providers = getAvailableProviders();

      expect(providers).toHaveLength(3);
      expect(providers.map((p) => p.id)).toContain('authorize_net');
      expect(providers.map((p) => p.id)).toContain('stripe');
      expect(providers.map((p) => p.id)).toContain('square');
    });

    it('should filter cannabis-incompatible providers', () => {
      const providers = getAvailableProviders(true); // Cannabis product

      const providerIds = providers.map((p) => p.id);
      expect(providerIds).toContain('authorize_net');
      expect(providerIds).toContain('square');
      expect(providerIds).not.toContain('stripe'); // Stripe doesn't allow cannabis
    });

    it('should mark providers as unavailable when not configured', () => {
      delete process.env.STRIPE_SECRET_KEY;

      const providers = getAvailableProviders();
      const stripe = providers.find((p) => p.id === 'stripe');

      expect(stripe?.available).toBe(false);
    });
  });

  describe('processUnifiedPayment', () => {
    it('should process Authorize.net payment', async () => {
      const request = {
        provider: 'authorize_net' as const,
        amount: 99.99,
        customerEmail: 'test@example.com',
        description: 'Test payment',
        authorizeNetData: {
          opaqueDataDescriptor: 'test_descriptor',
          opaqueDataValue: 'test_value',
        },
      };

      // Mock will be handled by jest.mock
      const result = await processUnifiedPayment(request);

      expect(result.provider).toBe('authorize_net');
      // Add more specific assertions based on mock implementation
    });

    it('should return error for missing payment data', async () => {
      const request = {
        provider: 'authorize_net' as const,
        amount: 99.99,
        customerEmail: 'test@example.com',
        description: 'Test payment',
        // Missing authorizeNetData
      };

      const result = await processUnifiedPayment(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing');
    });

    it('should handle invalid provider', async () => {
      const request = {
        provider: 'invalid' as any,
        amount: 99.99,
        customerEmail: 'test@example.com',
        description: 'Test payment',
      };

      const result = await processUnifiedPayment(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('refundUnifiedPayment', () => {
    it('should handle refunds for each provider', async () => {
      // Test Authorize.net refund
      const authNetResult = await refundUnifiedPayment(
        'authorize_net',
        'test_transaction_id',
        50.00
      );

      expect(authNetResult).toHaveProperty('success');

      // Test Stripe refund
      const stripeResult = await refundUnifiedPayment(
        'stripe',
        'test_transaction_id',
        50.00
      );

      expect(stripeResult).toHaveProperty('success');

      // Test Square refund (pending implementation)
      const squareResult = await refundUnifiedPayment(
        'square',
        'test_transaction_id',
        50.00
      );

      expect(squareResult.success).toBe(false);
      expect(squareResult.error).toContain('pending');
    });
  });
});
