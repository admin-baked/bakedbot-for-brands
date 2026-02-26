jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/lib/pos/adapters/alleaves', () => ({
  ALLeavesClient: jest.fn(),
}));

jest.mock('@/lib/cache/pos-cache', () => ({
  posCache: { invalidate: jest.fn() },
  cacheKeys: {
    customers: jest.fn(),
    orders: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/cache', () => ({
  invalidateCache: jest.fn(),
  CachePrefix: { PRODUCTS: 'PRODUCTS' },
}));

jest.mock('@/server/services/order-analytics', () => ({
  recordProductSale: jest.fn(),
}));

jest.mock('@/server/actions/pos-sync', () => ({
  syncPOSProducts: jest.fn(),
}));

import { deriveCustomerSpendingKeyFromAlleavesOrder } from '@/server/services/pos-sync-service';

describe('deriveCustomerSpendingKeyFromAlleavesOrder', () => {
  it('uses normalized email when email is valid', () => {
    const key = deriveCustomerSpendingKeyFromAlleavesOrder({
      customer: { email: 'VIP@Example.com ' },
      id_customer: 42,
    });

    expect(key).toBe('vip@example.com');
  });

  it('falls back to cid key for no-email in-store orders', () => {
    const key = deriveCustomerSpendingKeyFromAlleavesOrder({
      customer: { email: 'no-email@alleaves.local', id: '42' },
    });

    expect(key).toBe('cid_42');
  });

  it('treats any @alleaves.local email as placeholder and uses customer id', () => {
    const key = deriveCustomerSpendingKeyFromAlleavesOrder({
      email: 'customer_42@alleaves.local',
      id_customer: '42',
    });

    expect(key).toBe('cid_42');
  });

  it('returns null when both email and customer id are missing', () => {
    const key = deriveCustomerSpendingKeyFromAlleavesOrder({});
    expect(key).toBeNull();
  });
});
