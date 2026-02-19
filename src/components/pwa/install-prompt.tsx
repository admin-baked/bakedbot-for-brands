/**
 * PWA Install Prompt Component
 * 
 * Prompts users to install the app when PWA criteria are met.
 * Shows a custom install banner with better UX than browser default.
 * 
 * NOTE: Hidden on auth/onboarding pages per onboarding v2 spec.
 */

'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download } from 'lucide-react';

import { logger } from '@/lib/logger';
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Routes where PWA prompt should NOT appear (per onboarding v2 spec)
const AUTH_ROUTES = ['/onboarding', '/login', '/brand-login', '/customer-login', '/dispensary-login', '/get-started', '/super-admin'];

const DISMISSED_KEY = 'pwa-install-dismissed';

function isPermanentlyDismissed(): boolean {
    try {
        return localStorage.getItem(DISMISSED_KEY) === 'true';
    } catch {
        return false;
    }
}

export function PWAInstallPrompt() {
    const pathname = usePathname();
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    // Hide on auth/onboarding pages
    const isAuthPage = AUTH_ROUTES.some(route => pathname?.startsWith(route));

    useEffect(() => {
        // Never show again if user dismissed it
        if (isPermanentlyDismissed()) return;

        // Never show if already installed as PWA
        if (window.matchMedia('(display-mode: standalone)').matches) return;

        const handler = (e: Event) => {
            e.preventDefault();
            // Double-check dismissal in handler (guards against race conditions)
            if (isPermanentlyDismissed()) return;
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            logger.info('User accepted the install prompt');
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Permanently dismissed — never show again on this device
        try {
            localStorage.setItem(DISMISSED_KEY, 'true');
        } catch {
            // localStorage not available (private mode etc.) — just hide for session
        }
    };

    // Hide on auth pages or if prompt not showing
    if (isAuthPage || !showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:right-auto md:left-4 md:w-96 animate-in slide-in-from-bottom-5">
            <Card className="border-2 border-primary shadow-lg">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Download className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-sm mb-1">Install BakedBot</h3>
                            <p className="text-xs text-muted-foreground mb-3">
                                Install our app for a faster, more reliable experience with offline access.
                            </p>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleInstall} className="flex-1">
                                    Install
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleDismiss}>
                                    Not Now
                                </Button>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
