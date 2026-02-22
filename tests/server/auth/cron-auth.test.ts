import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';

jest.mock('@/lib/logger');

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
    it('returns 500 Server misconfiguration when CRON_SECRET is missing', async () => {
      const mockReq = {
        headers: new Map([['authorization', 'Bearer valid-secret']]),
      } as any as NextRequest;

      const result = await requireCronSecret(mockReq, 'test-service');

      expect(result).not.toBeNull();
      expect(result?.status).toBe(500);
      const json = await result?.json();
      expect(json).toEqual({ error: 'Server misconfiguration' });
    });

    it('returns 500 when CRON_SECRET is empty string', async () => {
      process.env.CRON_SECRET = '';
      const mockReq = {
        headers: new Map([['authorization', 'Bearer something']]),
      } as any as NextRequest;

      const result = await requireCronSecret(mockReq, 'test-service');

      expect(result?.status).toBe(500);
    });

    it('logs error with service name when CRON_SECRET missing', async () => {
      const mockReq = {
        headers: new Map(),
      } as any as NextRequest;

      await requireCronSecret(mockReq, 'campaign-sender');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('CRON_SECRET environment variable is not configured'),
        expect.objectContaining({ service: 'campaign-sender' })
      );
    });

    it('uses default service name in log when not provided', async () => {
      const mockReq = {
        headers: new Map(),
      } as any as NextRequest;

      await requireCronSecret(mockReq);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('CRON_SECRET'),
        expect.objectContaining({ service: 'CRON' })
      );
    });
  });

  describe('Authorization header validation', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = 'valid-secret-key-12345';
    });

    it('returns null (authorized) when Authorization header matches Bearer token', async () => {
      const mockReq = {
        headers: new Map([['authorization', 'Bearer valid-secret-key-12345']]),
      } as any as NextRequest;

      const result = await requireCronSecret(mockReq, 'test-service');

      expect(result).toBeNull();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('returns 401 Unauthorized when Authorization header is missing', async () => {
      const mockReq = {
        headers: new Map(),
      } as any as NextRequest;

      const result = await requireCronSecret(mockReq, 'test-service');

      expect(result?.status).toBe(401);
      const json = await result?.json();
      expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('returns 401 Unauthorized when token value is incorrect', async () => {
      const mockReq = {
        headers: new Map([['authorization', 'Bearer wrong-secret']]),
      } as any as NextRequest;

      const result = await requireCronSecret(mockReq, 'test-service');

      expect(result?.status).toBe(401);
    });

    it('returns 401 Unauthorized when Bearer prefix is missing', async () => {
      const mockReq = {
        headers: new Map([['authorization', 'valid-secret-key-12345']]),
      } as any as NextRequest;

      const result = await requireCronSecret(mockReq, 'test-service');

      expect(result?.status).toBe(401);
    });

    it('returns 401 Unauthorized when using Basic auth instead of Bearer', async () => {
      const mockReq = {
        headers: new Map([['authorization', 'Basic dXNlcjpwYXNz']]),
      } as any as NextRequest;

      const result = await requireCronSecret(mockReq, 'test-service');

      expect(result?.status).toBe(401);
    });

    it('returns 401 Unauthorized when token has extra spaces', async () => {
      const mockReq = {
        headers: new Map([['authorization', 'Bearer  valid-secret-key-12345']]),
      } as any as NextRequest;

      const result = await requireCronSecret(mockReq, 'test-service');

      expect(result?.status).toBe(401);
    });

    it('logs warning with service name on unauthorized access attempt', async () => {
      const mockReq = {
        headers: new Map([['authorization', 'Bearer wrong-token']]),
      } as any as NextRequest;

      await requireCronSecret(mockReq, 'playbook-runner');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unauthorized cron access attempt'),
        expect.objectContaining({
          service: 'playbook-runner',
          hasHeader: true,
        })
      );
    });

    it('logs warning with partial header preview for security', async () => {
      const mockReq = {
        headers: new Map([['authorization', 'Bearer some-long-token-here']]),
      } as any as NextRequest;

      await requireCronSecret(mockReq, 'test-service');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headerPrefix: 'Bearer some-long-token',
        })
      );
    });

    it('logs warning indicating missing header when not present', async () => {
      const mockReq = {
        headers: new Map(),
      } as any as NextRequest;

      await requireCronSecret(mockReq, 'test-service');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          hasHeader: false,
        })
      );
    });
  });

  describe('Header case sensitivity', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = 'my-secret';
    });

    it('matches Authorization header case-insensitively (standard HTTP behavior)', async () => {
      // Note: Next.js headers are case-insensitive internally, so we test both cases
      const mockReq = {
        headers: new Map([['Authorization', 'Bearer my-secret']]),
      } as any as NextRequest;

      // headers.get() in Next.js normalizes to lowercase
      jest.spyOn(mockReq.headers, 'get').mockReturnValue('Bearer my-secret');

      const result = await requireCronSecret(mockReq);

      expect(result).toBeNull();
    });
  });

  describe('Integration: Cron route pattern', () => {
    it('demonstrates correct usage in a cron route handler', async () => {
      process.env.CRON_SECRET = 'production-secret';

      // Simulate a valid Cloud Scheduler request
      const validReq = {
        headers: new Map([['authorization', 'Bearer production-secret']]),
      } as any as NextRequest;

      const authResult = await requireCronSecret(validReq, 'analytics-rollup');

      expect(authResult).toBeNull(); // Proceed with cron logic
    });

    it('demonstrates early return on auth failure', async () => {
      process.env.CRON_SECRET = 'production-secret';

      const invalidReq = {
        headers: new Map([['authorization', 'Bearer wrong']]),
      } as any as NextRequest;

      const authResult = await requireCronSecret(invalidReq, 'analytics-rollup');

      expect(authResult).not.toBeNull();
      expect(authResult?.status).toBe(401);
    });

    it('demonstrates Cloud Scheduler integration with correct Bearer token', async () => {
      const SECRET = 'cloud-scheduler-token-abc123';
      process.env.CRON_SECRET = SECRET;

      // Simulate Cloud Scheduler headers
      const cloudSchedulerReq = {
        headers: new Map([
          ['authorization', `Bearer ${SECRET}`],
          ['user-agent', 'AppEngine-Google'],
        ]),
      } as any as NextRequest;

      const result = await requireCronSecret(cloudSchedulerReq, 'schedule-test');

      expect(result).toBeNull();
    });
  });

  describe('Error response format', () => {
    it('returns proper JSON error response for 500', async () => {
      const mockReq = {
        headers: new Map(),
      } as any as NextRequest;

      const result = await requireCronSecret(mockReq);

      expect(result?.headers.get('content-type')).toContain('application/json');
      expect(result?.status).toBe(500);
    });

    it('returns proper JSON error response for 401', async () => {
      process.env.CRON_SECRET = 'secret';
      const mockReq = {
        headers: new Map([['authorization', 'Bearer wrong']]),
      } as any as NextRequest;

      const result = await requireCronSecret(mockReq);

      expect(result?.headers.get('content-type')).toContain('application/json');
      expect(result?.status).toBe(401);
    });
  });

  describe('No side effects during authorization check', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = 'my-secret';
    });

    it('does not modify request or response on successful auth', async () => {
      const originalHeaders = new Map([['authorization', 'Bearer my-secret']]);
      const mockReq = {
        headers: originalHeaders,
      } as any as NextRequest;

      await requireCronSecret(mockReq);

      // Headers should not be modified
      expect(mockReq.headers).toBe(originalHeaders);
    });

    it('does not modify environment variables', async () => {
      const originalSecret = process.env.CRON_SECRET;
      const mockReq = {
        headers: new Map([['authorization', `Bearer ${originalSecret}`]]),
      } as any as NextRequest;

      await requireCronSecret(mockReq);

      expect(process.env.CRON_SECRET).toBe(originalSecret);
    });
  });
});
