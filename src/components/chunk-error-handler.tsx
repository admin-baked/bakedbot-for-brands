'use client';

import { useEffect } from 'react';

/**
 * Global handler for chunk loading errors that occur outside React's error boundary.
 * These can happen during dynamic imports before React catches them.
 *
 * This component should be mounted early in the app tree.
 */
export function ChunkErrorHandler() {
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            const error = event.error;
            const message = error?.message?.toLowerCase() || event.message?.toLowerCase() || '';

            const isChunkError =
                error?.name === 'ChunkLoadError' ||
                message.includes('loading chunk') ||
                message.includes('failed to fetch dynamically imported module') ||
                message.includes('failed to load chunk');

            if (isChunkError) {
                event.preventDefault(); // Prevent default error handling

                // Check if we recently reloaded to avoid infinite loops
                const lastReload = sessionStorage.getItem('bakedbot_last_chunk_reload');
                const now = Date.now();

                if (!lastReload || (now - parseInt(lastReload, 10)) > 30000) {
                    sessionStorage.setItem('bakedbot_last_chunk_reload', now.toString());
                    // Hard reload to get fresh chunks
                    window.location.reload();
                }
            }
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const message = reason?.message?.toLowerCase() || String(reason).toLowerCase();

            const isChunkError =
                reason?.name === 'ChunkLoadError' ||
                message.includes('loading chunk') ||
                message.includes('failed to fetch dynamically imported module') ||
                message.includes('failed to load chunk');

            if (isChunkError) {
                event.preventDefault();

                const lastReload = sessionStorage.getItem('bakedbot_last_chunk_reload');
                const now = Date.now();

                if (!lastReload || (now - parseInt(lastReload, 10)) > 30000) {
                    sessionStorage.setItem('bakedbot_last_chunk_reload', now.toString());
                    window.location.reload();
                }
            }
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    return null; // This component renders nothing
}
