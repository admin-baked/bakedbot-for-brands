'use client';

import { useEffect } from 'react';

import {
    isDeploymentMismatchError,
    isServerActionMismatchResponse,
    isServerActionRequest,
    shouldAttemptDeploymentReload,
    startDeploymentReload,
} from '@/lib/deployment-mismatch';
import { logger } from '@/lib/logger';

/**
 * Global handler for chunk loading errors that occur outside React's error boundary.
 * These can happen during dynamic imports before React catches them.
 *
 * This component should be mounted early in the app tree.
 */
export function ChunkErrorHandler() {
    useEffect(() => {
        const attemptDeploymentReload = (error: unknown, source: string) => {
            if (!isDeploymentMismatchError(error)) {
                return false;
            }

            if (!shouldAttemptDeploymentReload(window.sessionStorage)) {
                return false;
            }

            logger.info('Deployment mismatch detected in global handler, reloading fresh assets', {
                error: error instanceof Error ? error.message : String(error ?? ''),
                source,
            });
            void startDeploymentReload();
            return true;
        };

        const handleError = (event: ErrorEvent) => {
            if (attemptDeploymentReload(event.error ?? event.message, 'window.error')) {
                event.preventDefault();
            }
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            if (attemptDeploymentReload(event.reason, 'window.unhandledrejection')) {
                event.preventDefault();
            }
        };

        const originalFetch = window.fetch.bind(window);
        const patchedFetch: typeof window.fetch = async (input, init) => {
            const response = await originalFetch(input, init);

            if (!response.ok && response.status >= 404 && isServerActionRequest(input, init)) {
                const inspectionResponse = response.clone();

                void inspectionResponse
                    .text()
                    .then((bodyText) => {
                        if (!isServerActionMismatchResponse(response.status, bodyText)) {
                            return;
                        }

                        if (!shouldAttemptDeploymentReload(window.sessionStorage)) {
                            return;
                        }

                        const requestUrl =
                            typeof input === 'string'
                                ? input
                                : input instanceof URL
                                    ? input.toString()
                                    : input.url;

                        logger.info('Stale server action response detected, reloading fresh assets', {
                            status: response.status,
                            url: requestUrl,
                        });
                        void startDeploymentReload();
                    })
                    .catch((error) => {
                        logger.warn('Failed to inspect server action response for deployment mismatch', {
                            error,
                        });
                    });
            }

            return response;
        };

        window.fetch = patchedFetch;
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            if (window.fetch === patchedFetch) {
                window.fetch = originalFetch;
            }
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    return null; // This component renders nothing
}
