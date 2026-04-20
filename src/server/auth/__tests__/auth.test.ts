/**
 * Authentication Module Tests
 *
 * Tests for:
 * - requireUser() — validates authenticated users
 * - requireSuperUser() — validates super user access
 * - roleMatches() — verifies role hierarchy and matching
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Override the global next/navigation mock so redirect throws (like real Next.js)
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), forward: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
  useParams: jest.fn(() => ({})),
  redirect: jest.fn((url: string) => { throw new Error(`NEXT_REDIRECT: ${url}`); }),
  notFound: jest.fn(),
}));

// Mock server dependencies
jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

describe('Auth Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset NODE_ENV for each test
    process.env.NODE_ENV = 'production';
  });

  describe('requireUser()', () => {
    it('should redirect to login when no session cookie found in production', async () => {
      const mockCookies = {
        get: jest.fn((name) => {
          if (name === '__session') return undefined;
          return { value: '' };
        }),
        getAll: jest.fn(() => []),
      };

      jest.mocked(cookies).mockResolvedValueOnce(mockCookies as any);

      const { requireUser } = await import('../auth');

      await expect(requireUser()).rejects.toThrow('NEXT_REDIRECT: /login');
    });

    it('should allow dev bypass with x-simulated-role cookie in development', async () => {
      process.env.NODE_ENV = 'development';

      const mockCookies = {
        get: jest.fn((name) => {
          if (name === '__session') return undefined;
          if (name === 'x-simulated-role') return { value: 'brand_admin' };
          return undefined;
        }),
        getAll: jest.fn(() => [
          { name: 'x-simulated-role', value: 'brand_admin' },
        ]),
      };

      jest.mocked(cookies).mockResolvedValueOnce(mockCookies as any);

      const { requireUser } = await import('../auth');

      const token = await requireUser();

      expect(token.role).toBe('brand_admin');
      expect(token.uid).toBe('dev-user-id');
      expect(token.email).toBe('dev@bakedbot.ai');
    });

    it('should enforce role requirements with dev bypass', async () => {
      process.env.NODE_ENV = 'development';

      const mockCookies = {
        get: jest.fn((name) => {
          if (name === 'x-simulated-role') return { value: 'brand_member' };
          return undefined;
        }),
        getAll: jest.fn(() => [
          { name: 'x-simulated-role', value: 'brand_member' },
        ]),
      };

      jest.mocked(cookies).mockResolvedValueOnce(mockCookies as any);

      const { requireUser } = await import('../auth');

      // Should pass with matching role
      const token = await requireUser(['brand_member']);
      expect(token.role).toBe('brand_member');

      // Reset for next test
      jest.clearAllMocks();
      jest.mocked(cookies).mockResolvedValueOnce(mockCookies as any);

      // Should fail with insufficient role
      await expect(requireUser(['super_user'])).rejects.toThrow(
        'missing required permissions'
      );
    });
  });

  describe('roleMatches()', () => {
    it('should match direct role', async () => {
      const { roleMatches } = await import('../role-utils');

      expect(roleMatches('brand_admin', ['brand_admin'])).toBe(true);
      expect(roleMatches('super_user', ['super_user'])).toBe(true);
    });

    it('should match role group: brand', async () => {
      const { roleMatches } = await import('../role-utils');

      expect(roleMatches('brand_admin', ['brand'])).toBe(true);
      expect(roleMatches('brand_member', ['brand'])).toBe(true);
      expect(roleMatches('brand', ['brand'])).toBe(true);
    });

    it('should match role group: dispensary', async () => {
      const { roleMatches } = await import('../role-utils');

      expect(roleMatches('dispensary_admin', ['dispensary'])).toBe(true);
      expect(roleMatches('dispensary_staff', ['dispensary'])).toBe(true);
      expect(roleMatches('dispensary', ['dispensary'])).toBe(true);
    });

    it('should support role hierarchy: admin qualifies for staff', async () => {
      const { roleMatches } = await import('../role-utils');

      // brand_admin should qualify for brand_member requirement
      expect(roleMatches('brand_admin', ['brand_member'])).toBe(true);

      // dispensary_admin should qualify for dispensary_staff requirement
      expect(roleMatches('dispensary_admin', ['dispensary_staff'])).toBe(true);
    });

    it('should reject cross-domain role matching', async () => {
      const { roleMatches } = await import('../role-utils');

      expect(roleMatches('brand_admin', ['dispensary'])).toBe(false);
      expect(roleMatches('dispensary_admin', ['brand'])).toBe(false);
      expect(roleMatches('brand_admin', ['dispensary_staff'])).toBe(false);
    });

    it('should support multiple required roles (OR logic)', async () => {
      const { roleMatches } = await import('../role-utils');

      // User with brand_admin should match either brand or super_user requirement
      expect(roleMatches('brand_admin', ['super_user', 'brand'])).toBe(true);

      // User with dispensary_staff should match either dispensary or brand requirement
      expect(roleMatches('dispensary_staff', ['brand', 'dispensary'])).toBe(true);

      // User with no matching role should fail
      expect(roleMatches('dispensary_staff', ['brand', 'super_user'])).toBe(false);
    });
  });

  describe('Security Behaviors', () => {
    it('should not allow dev bypass in production', async () => {
      process.env.NODE_ENV = 'production';

      const mockCookies = {
        get: jest.fn((name) => {
          if (name === 'x-simulated-role') return { value: 'super_user' };
          return undefined;
        }),
        getAll: jest.fn(() => []),
      };

      jest.mocked(cookies).mockResolvedValueOnce(mockCookies as any);

      const { requireUser } = await import('../auth');

      // Should redirect to login because we're in production with no real session
      await expect(requireUser()).rejects.toThrow('NEXT_REDIRECT: /login');
    });

    it('should handle missing role field gracefully', async () => {
      process.env.NODE_ENV = 'development';

      const mockCookies = {
        get: jest.fn((name) => {
          if (name === 'x-simulated-role') return undefined;
          return undefined;
        }),
        getAll: jest.fn(() => []),
      };

      jest.mocked(cookies).mockResolvedValueOnce(mockCookies as any);

      const { requireUser } = await import('../auth');

      // Should throw when no role is provided in dev
      await expect(requireUser()).rejects.toThrow();
    });
  });
});
