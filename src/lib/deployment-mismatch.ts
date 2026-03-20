const SERVER_ACTION_HEADER = 'next-action';

export const DEPLOYMENT_RELOAD_KEY = 'bakedbot_last_chunk_reload';
export const DEPLOYMENT_RELOAD_WINDOW_MS = 30_000;

type ErrorLike = {
    message?: unknown;
    name?: unknown;
};

type StorageLike = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

interface StartDeploymentReloadOptions {
    clearCaches?: () => Promise<void>;
    force?: boolean;
    now?: number;
    reload?: () => void;
    storage?: StorageLike;
}

function asErrorLike(value: unknown): ErrorLike | null {
    return typeof value === 'object' && value !== null ? (value as ErrorLike) : null;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && typeof error.message === 'string') {
        return error.message.toLowerCase();
    }

    const message = asErrorLike(error)?.message;
    if (typeof message === 'string') {
        return message.toLowerCase();
    }

    return String(error ?? '').toLowerCase();
}

function getErrorName(error: unknown): string {
    if (error instanceof Error && typeof error.name === 'string') {
        return error.name.toLowerCase();
    }

    const name = asErrorLike(error)?.name;
    return typeof name === 'string' ? name.toLowerCase() : '';
}

function mergeHeaders(requestHeaders?: HeadersInit, initHeaders?: HeadersInit): Headers {
    const headers = new Headers(requestHeaders);

    if (initHeaders) {
        new Headers(initHeaders).forEach((value, key) => {
            headers.set(key, value);
        });
    }

    return headers;
}

export function isChunkLoadError(error: unknown): boolean {
    const message = getErrorMessage(error);
    const name = getErrorName(error);

    return (
        name === 'chunkloaderror' ||
        message.includes('loading chunk') ||
        message.includes('failed to fetch dynamically imported module') ||
        message.includes('failed to load chunk')
    );
}

export function isServerActionMismatch(error: unknown): boolean {
    const message = getErrorMessage(error);

    return (
        message.includes('failed to find server action') ||
        message.includes('unrecognizedactionerror') ||
        message.includes('older or newer deployment') ||
        (message.includes('server action') &&
            (message.includes('not found') ||
                message.includes('was not found') ||
                message.includes('deployment')))
    );
}

export function isFirestoreAssertionError(error: unknown): boolean {
    const message = getErrorMessage(error);

    return (
        message.includes('internal assertion failed') ||
        message.includes('unexpected state') ||
        (message.includes('firestore') && message.includes('assertion'))
    );
}

export function isReactHooksError(error: unknown): boolean {
    const message = getErrorMessage(error);

    return (
        message.includes('rendered fewer hooks than expected') ||
        message.includes('rendered more hooks than expected') ||
        message.includes('minified react error #300') ||
        message.includes('minified react error #310') ||
        message.includes('minified react error #418') ||
        message.includes('minified react error #423') ||
        message.includes('react.dev/errors/300') ||
        message.includes('react.dev/errors/310')
    );
}

export function isDeploymentMismatchError(error: unknown): boolean {
    return (
        isChunkLoadError(error) ||
        isServerActionMismatch(error) ||
        isFirestoreAssertionError(error) ||
        isReactHooksError(error)
    );
}

export function shouldAttemptDeploymentReload(
    storage: Pick<StorageLike, 'getItem'>,
    now = Date.now(),
): boolean {
    const lastReload = storage.getItem(DEPLOYMENT_RELOAD_KEY);
    if (!lastReload) {
        return true;
    }

    const lastReloadTimestamp = Number(lastReload);
    if (Number.isNaN(lastReloadTimestamp)) {
        return true;
    }

    return (now - lastReloadTimestamp) > DEPLOYMENT_RELOAD_WINDOW_MS;
}

export function markDeploymentReload(
    storage: Pick<StorageLike, 'setItem'>,
    now = Date.now(),
): void {
    storage.setItem(DEPLOYMENT_RELOAD_KEY, now.toString());
}

export function clearDeploymentReloadMark(
    storage: Pick<StorageLike, 'removeItem'>,
): void {
    storage.removeItem(DEPLOYMENT_RELOAD_KEY);
}

export function isServerActionRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
    const request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
    const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
    if (method !== 'POST') {
        return false;
    }

    const headers = mergeHeaders(request?.headers, init?.headers);
    return headers.has(SERVER_ACTION_HEADER);
}

export function isServerActionMismatchResponse(status: number, bodyText = ''): boolean {
    const message = bodyText.toLowerCase();

    if (status === 404) {
        return true;
    }

    return (
        status >= 500 &&
        (message.includes('failed to find server action') ||
            message.includes('older or newer deployment') ||
            message.includes('unrecognizedactionerror'))
    );
}

export async function clearRuntimeCaches(): Promise<void> {
    const cleanupTasks: Promise<unknown>[] = [];

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        cleanupTasks.push(
            navigator.serviceWorker
                .getRegistrations()
                .then((registrations) =>
                    Promise.all(registrations.map((registration) => registration.unregister())),
                ),
        );
    }

    if (typeof caches !== 'undefined') {
        cleanupTasks.push(
            caches
                .keys()
                .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))),
        );
    }

    await Promise.allSettled(cleanupTasks);
}

export async function startDeploymentReload(
    options: StartDeploymentReloadOptions = {},
): Promise<boolean> {
    const reload =
        options.reload ??
        (typeof window !== 'undefined' ? window.location.reload.bind(window.location) : null);

    if (!reload) {
        return false;
    }

    const storage = options.storage ?? (typeof window !== 'undefined' ? window.sessionStorage : undefined);
    const now = options.now ?? Date.now();

    if (storage) {
        if (!options.force && !shouldAttemptDeploymentReload(storage, now)) {
            return false;
        }

        markDeploymentReload(storage, now);
    }

    try {
        await (options.clearCaches ?? clearRuntimeCaches)();
    } catch (error) {
        console.warn('[deployment-mismatch] Failed to clear runtime caches before reload', error);
    }

    reload();
    return true;
}
