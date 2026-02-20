
describe('Cache Layer', () => {
    let mockRedis: any;
    let cacheModule: any;

    // Define methods we want to spy on
    const mockGet = jest.fn();
    const mockSet = jest.fn();
    const mockDel = jest.fn();
    const mockKeys = jest.fn();

    beforeEach(async () => {
        jest.resetModules(); // Clear cache
        jest.clearAllMocks();

        // Setup env
        process.env.UPSTASH_REDIS_URL = 'https://fake-redis.upstash.io';
        process.env.UPSTASH_REDIS_TOKEN = 'fake-token';

        // Mock Logger
        jest.doMock('@/lib/logger', () => ({
            logger: {
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                debug: jest.fn(),
            },
        }));

        // Mock Redis using doMock
        jest.doMock('@upstash/redis', () => {
            return {
                Redis: jest.fn().mockImplementation(() => ({
                    get: mockGet,
                    set: mockSet,
                    del: mockDel,
                    keys: mockKeys,
                })),
            };
        });

        // Re-import module dynamically
        // We cannot import CachePrefix at top level because it would be from a different module instance
        cacheModule = await import('@/lib/cache');
    });

    afterEach(() => {
        delete process.env.UPSTASH_REDIS_URL;
        delete process.env.UPSTASH_REDIS_TOKEN;
    });

    describe('withCache', () => {
        it('returns cached value on hit', async () => {
            const mockValue = { foo: 'bar' };
            mockGet.mockResolvedValue(mockValue);

            const fn = jest.fn();
            const result = await cacheModule.withCache(cacheModule.CachePrefix.PRODUCTS, '123', fn);

            expect(result).toEqual(mockValue);
            expect(mockGet).toHaveBeenCalledWith(`bakedbot:cache:${cacheModule.CachePrefix.PRODUCTS}:123`);
            expect(fn).not.toHaveBeenCalled();
        });

        it('executes function and caches result on miss', async () => {
            mockGet.mockResolvedValue(null);
            const mockValue = { foo: 'bar' };
            const fn = jest.fn().mockResolvedValue(mockValue);

            const result = await cacheModule.withCache(cacheModule.CachePrefix.PRODUCTS, '123', fn, 60);

            expect(result).toEqual(mockValue);
            expect(mockGet).toHaveBeenCalledWith(`bakedbot:cache:${cacheModule.CachePrefix.PRODUCTS}:123`);
            expect(fn).toHaveBeenCalled();
            expect(mockSet).toHaveBeenCalledWith(
                `bakedbot:cache:${cacheModule.CachePrefix.PRODUCTS}:123`,
                mockValue,
                { ex: 60 }
            );
        });

        it('fails open (executes function) when Redis throws error', async () => {
            mockGet.mockRejectedValue(new Error('Redis down'));
            const mockValue = { foo: 'bar' };
            const fn = jest.fn().mockResolvedValue(mockValue);

            const result = await cacheModule.withCache(cacheModule.CachePrefix.PRODUCTS, '123', fn);

            expect(result).toEqual(mockValue);
            expect(fn).toHaveBeenCalled();
            expect(mockGet).toHaveBeenCalled();
        });

        it('fails open (executes function) when Redis config is missing', async () => {
            jest.resetModules();
            delete process.env.UPSTASH_REDIS_URL;
            delete process.env.UPSTASH_REDIS_TOKEN;

            // Re-mock dependencies because resetModules cleared them
            jest.doMock('@/lib/logger', () => ({
                logger: {
                    info: jest.fn(),
                    warn: jest.fn(),
                    error: jest.fn(),
                    debug: jest.fn(),
                },
            }));

            jest.doMock('@upstash/redis', () => ({
                Redis: jest.fn(),
            }));

            cacheModule = await import('@/lib/cache');

            const mockValue = { foo: 'bar' };
            const fn = jest.fn().mockResolvedValue(mockValue);

            const result = await cacheModule.withCache(cacheModule.CachePrefix.PRODUCTS, '123', fn);

            expect(result).toEqual(mockValue);
            expect(fn).toHaveBeenCalled();
            // Should NOT attempt to use Redis
            expect(mockGet).not.toHaveBeenCalled();
        });
    });

    describe('invalidateCachePattern', () => {
        it('finds and deletes keys matching pattern', async () => {
            const pattern = 'menu:org_123:*';
            const keys = ['bakedbot:cache:menu:org_123:abc', 'bakedbot:cache:menu:org_123:def'];
            mockKeys.mockResolvedValue(keys);

            await cacheModule.invalidateCachePattern(pattern);

            expect(mockKeys).toHaveBeenCalledWith(`bakedbot:cache:${pattern}`);
            expect(mockDel).toHaveBeenCalledWith(...keys);
        });

        it('does nothing if no keys match', async () => {
            const pattern = 'menu:org_123:*';
            mockKeys.mockResolvedValue([]);

            await cacheModule.invalidateCachePattern(pattern);

            expect(mockKeys).toHaveBeenCalledWith(`bakedbot:cache:${pattern}`);
            expect(mockDel).not.toHaveBeenCalled();
        });
    });
});
