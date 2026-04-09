'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Global capture: Chrome fires beforeinstallprompt early — often before React
 * hydrates. If the event fires before useEffect attaches a listener, it's lost
 * forever for that page load. This module-level variable catches it.
 */
let earlyPromptEvent: BeforeInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        earlyPromptEvent = e as BeforeInstallPromptEvent;
    });
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Already in standalone mode — no install needed
        if (window.matchMedia('(display-mode: standalone)').matches) return;

        // Pick up the early-captured event if it fired before React mounted
        if (earlyPromptEvent) {
            setDeferredPrompt(earlyPromptEvent);
            setShowBanner(true);
            earlyPromptEvent = null;
            return;
        }

        // Otherwise listen for it normally
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowBanner(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    if (!showBanner) return null;

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === 'accepted') {
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-emerald-600 px-4 py-2 text-white text-sm">
            <span>Install for full-screen mode + better mic access</span>
            <div className="flex gap-2">
                <button onClick={handleInstall} className="rounded bg-white px-3 py-1 text-emerald-700 font-semibold text-xs">
                    Install
                </button>
                <button onClick={() => setShowBanner(false)} className="text-white/70 text-xs">
                    Dismiss
                </button>
            </div>
        </div>
    );
}
