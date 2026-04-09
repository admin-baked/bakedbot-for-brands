'use client';

import { useState, useEffect, useCallback } from 'react';

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

/**
 * Detects if the app is running in standalone (installed PWA) mode.
 */
function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        // Android TWA / WebAPK
        document.referrer.includes('android-app://') ||
        // iOS standalone
        ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone)
    );
}

/**
 * Detects if the device is Android (for tailored install instructions).
 */
function isAndroid(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /android/i.test(navigator.userAgent);
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showAutoBanner, setShowAutoBanner] = useState(false);
    const [showManualGuide, setShowManualGuide] = useState(false);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        if (isStandalone()) {
            setInstalled(true);
            return;
        }

        // Pick up the early-captured event if it fired before React mounted
        if (earlyPromptEvent) {
            setDeferredPrompt(earlyPromptEvent);
            setShowAutoBanner(true);
            earlyPromptEvent = null;
            return;
        }

        // Otherwise listen for it normally
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowAutoBanner(true);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // Listen for successful install
        const onInstalled = () => {
            setInstalled(true);
            setShowAutoBanner(false);
            setShowManualGuide(false);
        };
        window.addEventListener('appinstalled', onInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === 'accepted') {
            setInstalled(true);
            setShowAutoBanner(false);
        }
        setDeferredPrompt(null);
    }, [deferredPrompt]);

    // Already installed — show nothing
    if (installed) return null;

    const android = isAndroid();

    return (
        <>
            {/* ── Auto banner (fires when beforeinstallprompt is available) ── */}
            {showAutoBanner && (
                <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-emerald-600 px-4 py-2 text-white text-sm">
                    <span>Install for full-screen mode + better mic access</span>
                    <div className="flex gap-2">
                        <button onClick={handleInstall} className="rounded bg-white px-3 py-1 text-emerald-700 font-semibold text-xs">
                            Install App
                        </button>
                        <button onClick={() => setShowAutoBanner(false)} className="text-white/70 text-xs">
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* ── Persistent floating install button (always visible when not installed) ── */}
            {!showAutoBanner && !showManualGuide && (
                <button
                    onClick={() => {
                        if (deferredPrompt) {
                            handleInstall();
                        } else {
                            setShowManualGuide(true);
                        }
                    }}
                    className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-white text-sm font-medium shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"
                    aria-label="Install app on tablet"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M12 1.5v10.5m0 0 3-3m-3 3-3-3" />
                    </svg>
                    Install App
                </button>
            )}

            {/* ── Manual install guide overlay ── */}
            {showManualGuide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
                    <div className="w-full max-w-md rounded-2xl bg-[#1a1a2e] p-6 text-white shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">Install Check-In App</h2>
                            <button
                                onClick={() => setShowManualGuide(false)}
                                className="rounded-full p-1 hover:bg-white/10"
                                aria-label="Close"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <p className="text-sm text-white/70 mb-5">
                            Install this page as an app for a full-screen kiosk experience with better mic access.
                        </p>

                        {android ? (
                            <ol className="space-y-4 text-sm">
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-600 text-xs font-bold">1</span>
                                    <span>Tap the <strong>three-dot menu</strong> (⋮) in the top-right corner of Chrome</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-600 text-xs font-bold">2</span>
                                    <span>Tap <strong>&quot;Add to Home screen&quot;</strong> or <strong>&quot;Install app&quot;</strong></span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-600 text-xs font-bold">3</span>
                                    <span>Tap <strong>&quot;Install&quot;</strong> in the confirmation dialog</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-600 text-xs font-bold">4</span>
                                    <span>Open the <strong>&quot;Check-In&quot;</strong> app from your home screen — it runs in full-screen mode</span>
                                </li>
                            </ol>
                        ) : (
                            <ol className="space-y-4 text-sm">
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-600 text-xs font-bold">1</span>
                                    <span>Tap the <strong>Share</strong> button (↑) in the browser toolbar</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-600 text-xs font-bold">2</span>
                                    <span>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-600 text-xs font-bold">3</span>
                                    <span>Tap <strong>&quot;Add&quot;</strong> to confirm</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-600 text-xs font-bold">4</span>
                                    <span>Open the <strong>&quot;Check-In&quot;</strong> app from your home screen</span>
                                </li>
                            </ol>
                        )}

                        <div className="mt-6 rounded-lg bg-white/5 p-3 text-xs text-white/60">
                            <strong className="text-white/80">Tip:</strong> Once installed, the app launches in full-screen mode without browser chrome — perfect for a front-counter tablet.
                        </div>

                        <button
                            onClick={() => setShowManualGuide(false)}
                            className="mt-5 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
