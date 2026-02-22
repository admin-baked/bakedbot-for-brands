import { checkRateLimit } from '@/middleware/rate-limit';

// Mock Upstash modules
jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: jest.fn(),
}));

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(),
}));

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

describe('Rate Limiting Middleware', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules(); // Reset lazy initialization
    jest.clearAllMocks();

    // Spy on console methods for testing logging
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('Lazy Initialization', () => {
    it('initializes rate limiter only when Redis env vars are present', async () => {
      process.env.UPSTASH_REDIS_URL = 'https://redis.upstash.io';
      process.env.UPSTASH_REDIS_TOKEN = 'token-123';

      const mockLimiter = { limit: jest.fn().mockResolvedValue({ success: true }) };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      // Re-import to get fresh module with new env vars
      jest.resetModules();
      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');

      await checkRL('192.168.1.1');

      expect(Ratelimit).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[RateLimit] Initialized'));
    });

    it('does not initialize when Redis env vars missing', async () => {
      delete process.env.UPSTASH_REDIS_URL;
      delete process.env.UPSTASH_REDIS_TOKEN;

      jest.resetModules();
      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');

      const result = await checkRL('192.168.1.1');

      expect(result).toEqual({ success: true });
      expect(Ratelimit).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('not configured'));
    });

    it('trims whitespace from UPSTASH_REDIS_URL', async () => {
      process.env.UPSTASH_REDIS_URL = '  https://redis.upstash.io  ';
      process.env.UPSTASH_REDIS_TOKEN = 'token-123';

      const mockRedis = {};
      (Redis as jest.Mock).mockReturnValue(mockRedis);

      const mockLimiter = { limit: jest.fn().mockResolvedValue({ success: true }) };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      jest.resetModules();
      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');

      await checkRL('192.168.1.1');

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://redis.upstash.io',
        })
      );
    });

    it('trims whitespace from UPSTASH_REDIS_TOKEN', async () => {
      process.env.UPSTASH_REDIS_URL = 'https://redis.upstash.io';
      process.env.UPSTASH_REDIS_TOKEN = '  token-123  ';

      const mockRedis = {};
      (Redis as jest.Mock).mockReturnValue(mockRedis);

      const mockLimiter = { limit: jest.fn().mockResolvedValue({ success: true }) };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      jest.resetModules();
      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');

      await checkRL('192.168.1.1');

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'token-123',
        })
      );
    });
  });

  describe('Rate Limit Configuration', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_URL = 'https://redis.upstash.io';
      process.env.UPSTASH_REDIS_TOKEN = 'token-123';
    });

    it('configures sliding window with 100 requests per minute', async () => {
      const mockLimiter = { limit: jest.fn().mockResolvedValue({ success: true }) };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);
      (Ratelimit as jest.Mock).slidingWindow = jest.fn().mockReturnValue({});

      jest.resetModules();
      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');

      await checkRL('192.168.1.1');

      expect((Ratelimit as jest.Mock).slidingWindow).toHaveBeenCalledWith(100, '1 m');
    });

    it('disables analytics (Edge Runtime compatibility fix)', async () => {
      const mockLimiter = { limit: jest.fn().mockResolvedValue({ success: true }) };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);
      (Ratelimit as jest.Mock).slidingWindow = jest.fn().mockReturnValue({});

      jest.resetModules();
      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');

      await checkRL('192.168.1.1');

      expect(Ratelimit).toHaveBeenCalledWith(
        expect.objectContaining({
          analytics: false,
        })
      );
    });

    it('uses correct Redis prefix', async () => {
      const mockLimiter = { limit: jest.fn().mockResolvedValue({ success: true }) };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);
      (Ratelimit as jest.Mock).slidingWindow = jest.fn().mockReturnValue({});

      jest.resetModules();
      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');

      await checkRL('192.168.1.1');

      expect(Ratelimit).toHaveBeenCalledWith(
        expect.objectContaining({
          prefix: 'bakedbot:ratelimit',
        })
      );
    });
  });

  describe('Rate Limit Check Results', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_URL = 'https://redis.upstash.io';
      process.env.UPSTASH_REDIS_TOKEN = 'token-123';
      jest.resetModules();
    });

    it('returns success true when under rate limit', async () => {
      const mockLimiter = {
        limit: jest.fn().mockResolvedValue({
          success: true,
          limit: 100,
          remaining: 45,
          reset: Date.now() + 30000,
        }),
      };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');
      const result = await checkRL('192.168.1.1');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(45);
      expect(result.reset).toBeInstanceOf(Date);
    });

    it('returns success false when rate limit exceeded', async () => {
      const resetTime = Date.now() + 30000;
      const mockLimiter = {
        limit: jest.fn().mockResolvedValue({
          success: false,
          limit: 100,
          remaining: 0,
          reset: resetTime,
        }),
      };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');
      const result = await checkRL('192.168.1.1');

      expect(result.success).toBe(false);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(0);
      expect(result.reset).toBeInstanceOf(Date);
      expect(result.reset?.getTime()).toBeLessThanOrEqual(resetTime);
    });

    it('logs warning when rate limit exceeded', async () => {
      const mockLimiter = {
        limit: jest.fn().mockResolvedValue({
          success: false,
          limit: 100,
          remaining: 0,
          reset: Date.now() + 30000,
        }),
      };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');
      await checkRL('192.168.1.1');

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[RateLimit] Rate limit exceeded'),
        expect.objectContaining({
          ip: '192.168.1.1',
          limit: 100,
          remaining: 0,
        })
      );
    });

    it('does not log warning when under rate limit', async () => {
      const mockLimiter = {
        limit: jest.fn().mockResolvedValue({
          success: true,
          limit: 100,
          remaining: 45,
          reset: Date.now() + 30000,
        }),
      };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');
      await checkRL('192.168.1.1');

      expect(console.warn).not.toHaveBeenCalledWith(expect.stringContaining('Rate limit exceeded'));
    });

    it('handles null reset time gracefully', async () => {
      const mockLimiter = {
        limit: jest.fn().mockResolvedValue({
          success: true,
          limit: 100,
          remaining: 50,
          reset: null,
        }),
      };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');
      const result = await checkRL('192.168.1.1');

      expect(result.reset).toBeUndefined();
    });
  });

  describe('Fail-Open Behavior (Error Handling)', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_URL = 'https://redis.upstash.io';
      process.env.UPSTASH_REDIS_TOKEN = 'token-123';
      jest.resetModules();
    });

    it('returns success true if Redis throws error (fail-open)', async () => {
      const mockLimiter = {
        limit: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
      };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');
      const result = await checkRL('192.168.1.1');

      expect(result).toEqual({ success: true });
    });

    it('logs error when Redis throws', async () => {
      const mockError = new Error('Redis timeout');
      const mockLimiter = {
        limit: jest.fn().mockRejectedValue(mockError),
      };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');
      await checkRL('192.168.1.1');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[RateLimit] Failed to check rate limit'),
        expect.objectContaining({
          ip: '192.168.1.1',
          error: 'Redis timeout',
        })
      );
    });

    it('handles non-Error exception types', async () => {
      const mockLimiter = {
        limit: jest.fn().mockRejectedValue('String error'),
      };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');
      const result = await checkRL('192.168.1.1');

      expect(result).toEqual({ success: true });
      expect(console.error).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          error: 'String error',
        })
      );
    });

    it('returns success true if Redis not configured', async () => {
      delete process.env.UPSTASH_REDIS_URL;
      delete process.env.UPSTASH_REDIS_TOKEN;

      jest.resetModules();
      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');

      const result = await checkRL('192.168.1.1');

      expect(result).toEqual({ success: true });
    });
  });

  describe('IP Address Handling', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_URL = 'https://redis.upstash.io';
      process.env.UPSTASH_REDIS_TOKEN = 'token-123';
      jest.resetModules();
    });

    it('passes IP address to rate limit checker', async () => {
      const mockLimiter = {
        limit: jest.fn().mockResolvedValue({ success: true }),
      };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');
      await checkRL('203.0.113.1');

      expect(mockLimiter.limit).toHaveBeenCalledWith('203.0.113.1');
    });

    it('supports IPv6 addresses', async () => {
      const mockLimiter = {
        limit: jest.fn().mockResolvedValue({ success: true }),
      };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');
      await checkRL('2001:0db8:85a3::8a2e:0370:7334');

      expect(mockLimiter.limit).toHaveBeenCalledWith('2001:0db8:85a3::8a2e:0370:7334');
    });

    it('supports localhost addresses', async () => {
      const mockLimiter = {
        limit: jest.fn().mockResolvedValue({ success: true }),
      };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');
      await checkRL('127.0.0.1');

      expect(mockLimiter.limit).toHaveBeenCalledWith('127.0.0.1');
    });
  });

  describe('Concurrency and Caching', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_URL = 'https://redis.upstash.io';
      process.env.UPSTASH_REDIS_TOKEN = 'token-123';
      jest.resetModules();
    });

    it('reuses initialized rate limiter on subsequent calls', async () => {
      const mockLimiter = {
        limit: jest.fn().mockResolvedValue({ success: true }),
      };
      (Ratelimit as jest.Mock).mockReturnValue(mockLimiter);

      const { checkRateLimit: checkRL } = await import('@/middleware/rate-limit');

      await checkRL('192.168.1.1');
      await checkRL('192.168.1.2');
      await checkRL('192.168.1.3');

      // Ratelimit constructor should be called only once
      expect(Ratelimit).toHaveBeenCalledTimes(1);

      // But limit should be called for each IP
      expect(mockLimiter.limit).toHaveBeenCalledTimes(3);
    });
  });
});
