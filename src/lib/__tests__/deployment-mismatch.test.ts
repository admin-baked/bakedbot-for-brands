import {
    DEPLOYMENT_RELOAD_KEY,
    DEPLOYMENT_RELOAD_WINDOW_MS,
    clearDeploymentReloadMark,
    isChunkLoadError,
    isDeploymentMismatchError,
    isServerActionMismatch,
    isServerActionMismatchResponse,
    isServerActionRequest,
    markDeploymentReload,
    shouldAttemptDeploymentReload,
    startDeploymentReload,
} from '../deployment-mismatch';

function createStorageMock() {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] ?? null,
        removeItem: (key: string) => {
            delete store[key];
        },
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
    };
}

describe('deployment mismatch helpers', () => {
    describe('error detection', () => {
        it('detects chunk loading failures', () => {
            expect(isChunkLoadError(new Error('Loading chunk 123 failed.'))).toBe(true);
            expect(isChunkLoadError(new Error('Something unrelated'))).toBe(false);
        });

        it('detects stale server action ids', () => {
            expect(
                isServerActionMismatch(
                    new Error('Failed to find Server Action "abc". This request might be from an older or newer deployment.'),
                ),
            ).toBe(true);
            expect(isServerActionMismatch(new Error('Permission denied'))).toBe(false);
        });

        it('treats known recoverable errors as deployment mismatches', () => {
            expect(isDeploymentMismatchError(new Error('INTERNAL ASSERTION FAILED: Unexpected state'))).toBe(true);
            expect(isDeploymentMismatchError(new Error('Minified React error #300'))).toBe(true);
            expect(isDeploymentMismatchError(new Error('Regular application failure'))).toBe(false);
        });
    });

    describe('server action request detection', () => {
        it('detects POST requests with the Next-Action header', () => {
            expect(
                isServerActionRequest('https://bakedbot.ai/dashboard/ceo', {
                    headers: { 'Next-Action': 'action-id' },
                    method: 'POST',
                }),
            ).toBe(true);
        });

        it('detects Request instances with a next-action header', () => {
            const request = new Request('https://bakedbot.ai/dashboard/ceo', {
                headers: { 'next-action': 'action-id' },
                method: 'POST',
            });

            expect(isServerActionRequest(request)).toBe(true);
        });

        it('ignores non-POST requests and requests without the header', () => {
            expect(
                isServerActionRequest('https://bakedbot.ai/dashboard/ceo', {
                    headers: { 'Next-Action': 'action-id' },
                    method: 'GET',
                }),
            ).toBe(false);

            expect(
                isServerActionRequest('https://bakedbot.ai/dashboard/ceo', {
                    headers: { Accept: 'application/json' },
                    method: 'POST',
                }),
            ).toBe(false);
        });
    });

    describe('server action response detection', () => {
        it('treats 404 server action responses as stale deployment mismatches', () => {
            expect(isServerActionMismatchResponse(404)).toBe(true);
        });

        it('detects mismatch messages in 5xx responses', () => {
            expect(
                isServerActionMismatchResponse(
                    500,
                    'Failed to find Server Action "abc". This request might be from an older or newer deployment.',
                ),
            ).toBe(true);
            expect(isServerActionMismatchResponse(500, 'Database timeout')).toBe(false);
        });
    });

    describe('reload throttling', () => {
        it('allows the first reload and throttles rapid repeats', () => {
            const storage = createStorageMock();

            expect(shouldAttemptDeploymentReload(storage, 1_000)).toBe(true);

            markDeploymentReload(storage, 1_000);

            expect(storage.getItem(DEPLOYMENT_RELOAD_KEY)).toBe('1000');
            expect(shouldAttemptDeploymentReload(storage, 1_000 + DEPLOYMENT_RELOAD_WINDOW_MS - 1)).toBe(false);
            expect(shouldAttemptDeploymentReload(storage, 1_000 + DEPLOYMENT_RELOAD_WINDOW_MS + 1)).toBe(true);
        });

        it('clears the throttle marker', () => {
            const storage = createStorageMock();
            markDeploymentReload(storage, 2_000);

            clearDeploymentReloadMark(storage);

            expect(storage.getItem(DEPLOYMENT_RELOAD_KEY)).toBeNull();
        });
    });

    describe('startDeploymentReload', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        afterEach(() => {
            consoleWarnSpy.mockClear();
        });

        afterAll(() => {
            consoleWarnSpy.mockRestore();
        });

        it('marks the reload, clears caches, and reloads once', async () => {
            const storage = createStorageMock();
            const clearCaches = jest.fn().mockResolvedValue(undefined);
            const reload = jest.fn();

            await expect(
                startDeploymentReload({
                    clearCaches,
                    now: 3_000,
                    reload,
                    storage,
                }),
            ).resolves.toBe(true);

            expect(storage.getItem(DEPLOYMENT_RELOAD_KEY)).toBe('3000');
            expect(clearCaches).toHaveBeenCalledTimes(1);
            expect(reload).toHaveBeenCalledTimes(1);
        });

        it('skips the reload when the throttle window is still active', async () => {
            const storage = createStorageMock();
            const clearCaches = jest.fn().mockResolvedValue(undefined);
            const reload = jest.fn();

            markDeploymentReload(storage, 4_000);

            await expect(
                startDeploymentReload({
                    clearCaches,
                    now: 4_000 + DEPLOYMENT_RELOAD_WINDOW_MS - 1,
                    reload,
                    storage,
                }),
            ).resolves.toBe(false);

            expect(clearCaches).not.toHaveBeenCalled();
            expect(reload).not.toHaveBeenCalled();
        });

        it('forces a reload even if cache cleanup fails', async () => {
            const storage = createStorageMock();
            const clearCaches = jest.fn().mockRejectedValue(new Error('cache cleanup failed'));
            const reload = jest.fn();

            await expect(
                startDeploymentReload({
                    clearCaches,
                    force: true,
                    now: 5_000,
                    reload,
                    storage,
                }),
            ).resolves.toBe(true);

            expect(clearCaches).toHaveBeenCalledTimes(1);
            expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
            expect(reload).toHaveBeenCalledTimes(1);
        });
    });
});
