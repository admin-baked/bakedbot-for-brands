import { afterEach, describe, expect, it } from '@jest/globals';
import { isCompanyPlanCheckoutEnabled, isShippingCheckoutEnabled } from '@/lib/feature-flags';

describe('feature flags', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('keeps shipping checkout enabled by default', () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_ENABLE_SHIPPING_CHECKOUT: undefined as any,
    };

    expect(isShippingCheckoutEnabled()).toBe(true);
  });

  it('requires both public and server flags for company plan checkout', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT: 'true',
      ENABLE_COMPANY_PLAN_CHECKOUT: 'false',
    };
    expect(isCompanyPlanCheckoutEnabled()).toBe(false);

    process.env.ENABLE_COMPANY_PLAN_CHECKOUT = 'true';
    expect(isCompanyPlanCheckoutEnabled()).toBe(true);
  });

  it('stays disabled when only server flag is true', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT: 'false',
      ENABLE_COMPANY_PLAN_CHECKOUT: 'true',
    };

    expect(isCompanyPlanCheckoutEnabled()).toBe(false);
  });

  it('is enabled in test environment when not explicitly disabled', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT: undefined as any,
      ENABLE_COMPANY_PLAN_CHECKOUT: undefined as any,
    };

    expect(isCompanyPlanCheckoutEnabled()).toBe(true);
  });

  it('can still be explicitly disabled in test environment', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT: 'false',
      ENABLE_COMPANY_PLAN_CHECKOUT: undefined as any,
    };

    expect(isCompanyPlanCheckoutEnabled()).toBe(false);
  });
});
