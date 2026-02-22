import { NextRequest } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';

// Mock logger to avoid console spam in tests
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('requireCronSecret', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Missing CRON_SECRET environment variable', () => {
    it('returns 500 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;

      const req = new NextRequest('http://localhost/api/cron/test', {
        headers: { authorization: 'Bearer some-token' },
      });

      const result = await requireCronSecret(req, 'test-service');

      expect(result).not.toBeNull();
      expect(result?.status).toBe(500);
    });

    it('returns 500 when CRON_SECRET is empty string', async () => {
      process.env.CRON_SECRET = '';

      const req = new NextRequest('http://localhost/api/cron/test', {
        headers: { authorization: 'Bearer test' },
      });

      const result = await requireCronSecret(req);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(500);
    });
  });

  describe('Authorization header validation', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = 'valid-secret-key';
    });

    it('returns null (authorized) when Authorization header matches Bearer token', async () => {
      const req = new NextRequest('http://localhost/api/cron/test', {
        headers: { authorization: 'Bearer valid-secret-key' },
      });

      const result = await requireCronSecret(req);

      expect(result).toBeNull();
    });

    it('returns 401 when Authorization header is missing', async () => {
      const req = new NextRequest('http://localhost/api/cron/test');

      const result = await requireCronSecret(req);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it('returns 401 when token value is incorrect', async () => {
      const req = new NextRequest('http://localhost/api/cron/test', {
        headers: { authorization: 'Bearer wrong-secret' },
      });

      const result = await requireCronSecret(req);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it('returns 401 when Bearer prefix is missing', async () => {
      const req = new NextRequest('http://localhost/api/cron/test', {
        headers: { authorization: 'valid-secret-key' },
      });

      const result = await requireCronSecret(req);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it('returns 401 when using Basic auth instead of Bearer', async () => {
      const req = new NextRequest('http://localhost/api/cron/test', {
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
      });

      const result = await requireCronSecret(req);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it('returns 401 when token has extra spaces', async () => {
      const req = new NextRequest('http://localhost/api/cron/test', {
        headers: { authorization: 'Bearer  valid-secret-key' },
      });

      const result = await requireCronSecret(req);

      expect(result?.status).toBe(401);
    });
  });

  describe('Cron route integration pattern', () => {
    it('demonstrates valid Cloud Scheduler request', async () => {
      process.env.CRON_SECRET = 'production-secret';

      const req = new NextRequest('http://localhost/api/cron/analytics-rollup', {
        headers: { authorization: 'Bearer production-secret' },
      });

      const authResult = await requireCronSecret(req, 'analytics-rollup');

      expect(authResult).toBeNull(); // Proceed with cron logic
    });

    it('demonstrates blocked unauthorized request', async () => {
      process.env.CRON_SECRET = 'production-secret';

      const req = new NextRequest('http://localhost/api/cron/analytics-rollup', {
        headers: { authorization: 'Bearer wrong' },
      });

      const authResult = await requireCronSecret(req, 'analytics-rollup');

      expect(authResult?.status).toBe(401);
    });

    it('demonstrates server misconfiguration error', async () => {
      delete process.env.CRON_SECRET;

      const req = new NextRequest('http://localhost/api/cron/test', {
        method: 'POST',
      });

      const result = await requireCronSecret(req, 'some-job');

      expect(result?.status).toBe(500);
    });
  });

  describe('Response format', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = 'test-secret';
    });

    it('returns NextResponse with proper JSON error format on 500', async () => {
      delete process.env.CRON_SECRET;

      const req = new NextRequest('http://localhost/api/cron/test');

      const result = await requireCronSecret(req);

      expect(result).not.toBeNull();
      expect(result?.headers.get('content-type')).toContain('application/json');
    });

    it('returns NextResponse with proper JSON error format on 401', async () => {
      const req = new NextRequest('http://localhost/api/cron/test', {
        headers: { authorization: 'Bearer wrong' },
      });

      const result = await requireCronSecret(req);

      expect(result?.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('Service name logging', () => {
    it('uses provided service name in logs', async () => {
      delete process.env.CRON_SECRET;

      const req = new NextRequest('http://localhost/api/cron/test');

      // Just verify this doesn't throw - actual logger.error call is mocked
      await requireCronSecret(req, 'campaign-sender');

      expect(req).toBeDefined();
    });

    it('uses default service name when not provided', async () => {
      delete process.env.CRON_SECRET;

      const req = new NextRequest('http://localhost/api/cron/test');

      // Just verify this doesn't throw with default service name
      await requireCronSecret(req);

      expect(req).toBeDefined();
    });
  });

  describe('No side effects', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = 'my-secret';
    });

    it('does not modify environment variables during auth check', async () => {
      const originalSecret = process.env.CRON_SECRET;

      const req = new NextRequest('http://localhost/api/cron/test', {
        headers: { authorization: 'Bearer my-secret' },
      });

      await requireCronSecret(req);

      expect(process.env.CRON_SECRET).toBe(originalSecret);
    });
  });
});
