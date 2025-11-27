/**
 * PWA Install Prompt Component
 * 
 * Prompts users to install the app when PWA criteria are met.
 * Shows a custom install banner with better UX than browser default.
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show our custom install prompt
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowPrompt(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }

        // Clear the deferredPrompt
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Store dismissal in localStorage to not show again for 7 days
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    // Don't show if dismissed recently
    useEffect(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - dismissedTime < sevenDays) {
                setShowPrompt(false);
            }
        }
    }, []);

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-5">
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
