/**
 * Service Worker Registration
 * Registers the PWA service worker on client side
 */

'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('[PWA] Service Worker registered:', registration);

                    // Check for updates periodically
                    setInterval(() => {
                        registration.update();
                    }, 60000); // Check every minute
                })
                .catch((error) => {
                    console.error('[PWA] Service Worker registration failed:', error);
                });
        }
    }, []);

    return null; // This component doesn't render anything
}
