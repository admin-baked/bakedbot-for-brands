/**
 * Service Worker Registration
 * Registers the PWA service worker on client side
 */

'use client';

import { useEffect } from 'react';

import { logger } from '@/lib/logger';
export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        const isProduction = process.env.NODE_ENV === 'production';

        // In local/dev, ensure service workers are removed so offline fallback
        // does not hijack checkout testing on localhost.
        if (!isProduction) {
            navigator.serviceWorker.getRegistrations()
                .then(async (registrations) => {
                    await Promise.all(registrations.map((reg) => reg.unregister()));
                    if ('caches' in window) {
                        const cacheKeys = await caches.keys();
                        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
                    }
                    logger.info('[PWA] Unregistered service workers and cleared caches for local/dev.');
                })
                .catch((error) => {
                    logger.warn('[PWA] Failed to clean service workers in local/dev:', error);
                });
            return;
        }

        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                logger.info('[PWA] Service Worker registered:', registration);

                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60000); // Check every minute
            })
            .catch((error) => {
                logger.error('[PWA] Service Worker registration failed:', error);
            });
    }, []);

    return null; // This component doesn't render anything
}
