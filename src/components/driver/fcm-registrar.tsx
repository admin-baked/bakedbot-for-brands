'use client';

/**
 * Driver FCM Push Notification Registrar
 *
 * Shown once on the driver dashboard to prompt drivers to enable push notifications.
 * On approval: registers service worker → gets FCM token → saves to driver doc.
 *
 * Dismissed state persists in localStorage.
 * Re-registers silently on subsequent visits if permission already granted.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';
import { registerDriverFcmToken } from '@/server/actions/delivery-notifications';
import { useToast } from '@/hooks/use-toast';

const DISMISSED_KEY = 'driver_fcm_dismissed';

export function DriverFcmRegistrar() {
    const [show, setShow] = useState(false);
    const [registering, setRegistering] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const dismissed = localStorage.getItem(DISMISSED_KEY) === 'true';
        const supported = 'Notification' in window && 'serviceWorker' in navigator;
        if (!supported) return;

        if (Notification.permission === 'granted' && !dismissed) {
            // Already granted — silently re-register in background
            void registerFcmToken();
        } else if (!dismissed && Notification.permission !== 'denied') {
            setShow(true);
        }
    }, []);

    const registerFcmToken = async () => {
        try {
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) return;

            const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/driver/',
            });

            // Dynamic import — firebase/messaging is client-only
            const { initializeApp, getApps } = await import('firebase/app');
            const { getMessaging, getToken } = await import('firebase/messaging');

            const firebaseConfig = {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: 'studio-567050101-bc6e8.firebaseapp.com',
                projectId: 'studio-567050101-bc6e8',
                storageBucket: 'bakedbot-global-assets',
                messagingSenderId:
                    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1016399212569',
                appId:
                    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
                    '1:1016399212569:web:d9c43842ea4d824e13ba88',
            };

            const app =
                getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
            const messaging = getMessaging(app);

            const token = await getToken(messaging, {
                vapidKey,
                serviceWorkerRegistration: sw,
            });

            if (token) {
                await registerDriverFcmToken(token);
            }
        } catch (error) {
            // Non-fatal — driver can still work without push notifications
            console.error('FCM registration failed:', error);
        }
    };

    const handleEnable = async () => {
        setRegistering(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await registerFcmToken();
                toast({
                    title: 'Delivery Alerts Enabled',
                    description:
                        "You'll be notified instantly when a new delivery is assigned.",
                });
                setShow(false);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Notifications Blocked',
                    description:
                        'Enable notifications in browser settings to receive delivery alerts.',
                });
                setShow(false);
            }
        } finally {
            setRegistering(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem(DISMISSED_KEY, 'true');
        setShow(false);
    };

    if (!show) return null;

    return (
        <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
                <div className="flex items-start gap-3">
                    <div className="bg-primary rounded-full p-2 flex-shrink-0">
                        <Bell className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Enable Delivery Alerts</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Get notified instantly when a new delivery is assigned to you.
                        </p>
                        <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={handleEnable} disabled={registering}>
                                <Bell className="mr-1.5 h-3 w-3" />
                                {registering ? 'Enabling...' : 'Enable Alerts'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleDismiss}>
                                Not now
                            </Button>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0 mt-0.5"
                        onClick={handleDismiss}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
