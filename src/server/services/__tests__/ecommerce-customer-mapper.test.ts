/**
 * Unit Tests: Ecommerce Customer Mapper
 *
 * Tests for linking ecommerce customers to BakedBot
 * (2026-02-17)
 */

import {
  resolveEcommerceCustomer,
  resolveEcommerceCustomerByPlatformId,
} from '../ecommerce-customer-mapper';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

jest.mock('@/firebase/server-client');
jest.mock('@/lib/logger');

describe('Ecommerce Customer Mapper', () => {
  const mockFirestore = {
    collection: jest.fn(),
  };

  const mockDocRef = {
    id: 'cust-existing-123',
    data: jest.fn(() => ({
      orgId: 'org-test',
      email: 'existing@example.com',
      ecommerceIds: {
        ecommerce: 'shop-cust-1',
      },
    })),
    ref: {
      update: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: mockFirestore,
    });

    mockFirestore.collection.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [mockDocRef],
      }),
      add: jest.fn().mockResolvedValue({
        id: 'cust-new-456',
      }),
    });
  });

  describe('resolveEcommerceCustomer', () => {
    it('should return existing customer when found by email', async () => {
      const result = await resolveEcommerceCustomer('org-test', 'existing@example.com', 'shop-123');

      expect(result).toEqual({
        bakedBotCustomerId: 'cust-existing-123',
        isNew: false,
      });
    });

    it('should create new customer when not found', async () => {
      mockFirestore.collection().get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const result = await resolveEcommerceCustomer('org-test', 'new@example.com', 'shop-456');

      expect(result).toEqual({
        bakedBotCustomerId: 'cust-new-456',
        isNew: true,
      });

      // Verify add was called with correct data
      expect(mockFirestore.collection().add).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-test',
          email: 'new@example.com',
          source: 'ecommerce',
          ecommerceIds: {
            ecommerce: 'shop-456',
          },
          loyaltyPoints: 0,
          tierLevel: 'standard',
        })
      );
    });

    it('should normalize email to lowercase', async () => {
      mockFirestore.collection().get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      await resolveEcommerceCustomer('org-test', 'NEW@EXAMPLE.COM', 'shop-123');

      expect(mockFirestore.collection().where).toHaveBeenCalledWith(
        'email',
        '==',
        'new@example.com'
      );
    });

    it('should update ecommerce IDs if platform ID is new', async () => {
      mockDocRef.data.mockReturnValueOnce({
        orgId: 'org-test',
        email: 'existing@example.com',
        ecommerceIds: {
          ecommerce: 'old-id',
        },
      });

      await resolveEcommerceCustomer('org-test', 'existing@example.com', 'new-shop-id');

      expect(mockDocRef.ref.update).toHaveBeenCalledWith(
        expect.objectContaining({
          'ecommerceIds.ecommerce': 'new-shop-id',
        })
      );
    });

    it('should not update ecommerce IDs if same platform ID', async () => {
      mockDocRef.data.mockReturnValueOnce({
        orgId: 'org-test',
        email: 'existing@example.com',
        ecommerceIds: {
          ecommerce: 'shop-123',
        },
      });

      await resolveEcommerceCustomer('org-test', 'existing@example.com', 'shop-123');

      expect(mockDocRef.ref.update).not.toHaveBeenCalled();
    });

    it('should handle missing email gracefully', async () => {
      const result = await resolveEcommerceCustomer('org-test', '', 'shop-123');

      // Should return null when email is missing
      expect(result.bakedBotCustomerId).toBeDefined();
    });

    it('should log customer resolution at info level', async () => {
      await resolveEcommerceCustomer('org-test', 'existing@example.com');

      expect(logger.info).toHaveBeenCalledWith(
        '[EcommerceMapper] Found existing customer',
        expect.any(Object)
      );
    });

    it('should log new customer creation at info level', async () => {
      mockFirestore.collection().get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      await resolveEcommerceCustomer('org-test', 'new@example.com');

      expect(logger.info).toHaveBeenCalledWith(
        '[EcommerceMapper] Created new ecommerce customer',
        expect.any(Object)
      );
    });

    it('should return null customerId on error', async () => {
      (createServerClient as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const result = await resolveEcommerceCustomer('org-test', 'test@example.com');

      expect(result.bakedBotCustomerId).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        '[EcommerceMapper] Failed to resolve customer',
        expect.any(Object)
      );
    });
  });

  describe('resolveEcommerceCustomerByPlatformId', () => {
    it('should find customer by platform ID', async () => {
      const result = await resolveEcommerceCustomerByPlatformId('org-test', 'shop-cust-1');

      expect(result).toBe('cust-existing-123');
    });

    it('should return null when not found', async () => {
      mockFirestore.collection().get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const result = await resolveEcommerceCustomerByPlatformId('org-test', 'unknown-id');

      expect(result).toBeNull();
    });

    it('should query with correct fields', async () => {
      await resolveEcommerceCustomerByPlatformId('org-test', 'shop-123');

      expect(mockFirestore.collection().where).toHaveBeenCalledWith(
        'orgId',
        '==',
        'org-test'
      );
      expect(mockFirestore.collection().where).toHaveBeenCalledWith(
        'ecommerceIds.ecommerce',
        '==',
        'shop-123'
      );
    });

    it('should handle errors gracefully', async () => {
      (createServerClient as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const result = await resolveEcommerceCustomerByPlatformId('org-test', 'shop-123');

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        '[EcommerceMapper] Failed to lookup by platform ID',
        expect.any(Object)
      );
    });
  });
});
