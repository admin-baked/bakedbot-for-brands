# AI-Executable Spec: Driver Operations Mobile Upgrade
**PRD:** `dev/prds/2026-02-24-driver-mobile-parity.md`
**Status:** ✅ Approved — Build ready
**Date:** 2026-02-24

---

## Boundary Check

| Trigger | Fires? | Notes |
|---|---|---|
| Auth changes | ✅ YES | New `delivery_driver` action for FCM token registration |
| New Firestore schema | ✅ YES | New fields on `deliveries` + `drivers` collections |
| New integration | ✅ YES | Google Maps Directions API, Firebase Messaging (FCM), Blackleaf MMS |
| Payments | ❌ No | |
| New secrets | ✅ YES | 3 new secrets to provision |
| Compliance-touching prompts | ❌ No | |

Full spec required. ✅

---

## Pre-Build: Secret Provisioning (MUST complete before writing code)

Run these before touching any files:

```bash
# 1. Blackleaf API key (secret exists, was commented out)
# Get value from .env.local BLACKLEAF_API_KEY, then:
firebase apphosting:secrets:grantaccess BLACKLEAF_API_KEY --backend=bakedbot-prod
# Add to apphosting.yaml (see Section 8)

# 2. Google Maps API key (new — needs Console first)
# Go to console.cloud.google.com → APIs & Services → Credentials
# Create API key → restrict to: Directions API
# Then:
echo -n "YOUR_MAPS_KEY" | gcloud secrets create GOOGLE_MAPS_API_KEY --data-file=- --project=studio-567050101-bc6e8
firebase apphosting:secrets:grantaccess GOOGLE_MAPS_API_KEY --backend=bakedbot-prod

# 3. VAPID key (public value — generate from Firebase Console)
# Firebase Console → Project Settings → Cloud Messaging → Web Push Certificates → Generate key pair
# Copy the Key Pair value → add as plain value in apphosting.yaml (not a secret)
```

---

## Section 1: Firestore Schema Changes

### `deliveries` collection — new fields on `Delivery` type

Add to `src/types/delivery.ts` inside the `Delivery` interface (after `proofOfDeliveryPhoto`):

```typescript
// QR Check-in tokens
pickupQrCode: string;            // UUID — shown at dispensary counter for driver to scan
deliveryQrCode: string;          // UUID — sent to customer via MMS, driver scans at door
pickupScannedAt?: Timestamp;     // when driver scanned pickup QR
deliveryScannedAt?: Timestamp;   // when driver scanned customer QR

// SMS audit trail
smsLog?: Array<{
    type: 'en_route' | 'delivered';
    sentAt: Timestamp;
    success: boolean;
    error?: string;
}>;
```

Note: `estimatedArrival?: Timestamp` already exists at line 152 of `delivery.ts` — do NOT re-add.

### `drivers` collection — new fields on `Driver` type

Add to `src/types/delivery.ts` inside the `Driver` interface (after `isAvailable`):

```typescript
fcmToken?: string;               // Web push FCM token for driver push notifications
fcmTokenUpdatedAt?: Timestamp;   // When token was last registered/refreshed
```

---

## Section 2: New Files (6 files)

### File 1: `public/firebase-messaging-sw.js`

FCM background push handler. Must be at `/public/` root (served at `/firebase-messaging-sw.js`).

```javascript
/* eslint-disable */
// Firebase Cloud Messaging Service Worker
// Handles background push notifications for BakedBot Driver App

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: self.__FIREBASE_API_KEY__ || '',
    authDomain: 'studio-567050101-bc6e8.firebaseapp.com',
    projectId: 'studio-567050101-bc6e8',
    storageBucket: 'studio-567050101-bc6e8.firebasestorage.app',
    messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__ || '',
    appId: self.__FIREBASE_APP_ID__ || '',
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'BakedBot Driver';
    const options = {
        body: payload.notification?.body || 'You have a new notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: payload.data?.url || '/driver/dashboard' },
        requireInteraction: true,
    };
    self.registration.showNotification(title, options);
});

// Notification click → open delivery page
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/driver/dashboard';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('/driver') && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
```

**Note on Firebase config in SW:** The Firebase config values are passed via `__FIREBASE_API_KEY__` etc., which are set by the driver dashboard page via `navigator.serviceWorker.ready` + `postMessage()` on registration. If the values are empty the SW still registers — it just won't have a valid Firebase config for messaging. See `DriverFcmRegistrar` component for how config is injected.

**Simpler alternative for v1:** Hardcode the project config values directly in this file. The Firebase config (apiKey, projectId, etc.) is public — it's already exposed as `NEXT_PUBLIC_FIREBASE_API_KEY`. Use that approach for the initial build. Replace `self.__FIREBASE_API_KEY__` with the literal value from the Firebase console.

---

### File 2: `src/lib/delivery-qr.ts`

QR code generation and display utilities.

```typescript
/**
 * Delivery QR Code Utilities
 *
 * Generates and validates QR tokens for pickup and delivery check-ins.
 * Uses 'qrcode' package (already installed).
 */

import QRCode from 'qrcode';
import { randomUUID } from 'crypto';

/**
 * Generates a unique QR token (UUID v4 string)
 * Used for both pickupQrCode and deliveryQrCode on delivery documents
 */
export function generateQrToken(): string {
    return randomUUID(); // 36-char UUID e.g. "550e8400-e29b-41d4-a716-446655440000"
}

/**
 * Generates a QR code as a base64 PNG data URL
 * Suitable for: MMS attachments, <img src={dataUrl} /> display
 *
 * @param token - The UUID token to encode
 * @returns Promise<string> — data:image/png;base64,... URL
 */
export async function generateQrDataUrl(token: string): Promise<string> {
    return QRCode.toDataURL(token, {
        width: 400,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
    });
}

/**
 * Generates a QR code as a PNG Buffer
 * Suitable for: Firebase Storage upload for MMS
 */
export async function generateQrBuffer(token: string): Promise<Buffer> {
    return QRCode.toBuffer(token, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'M',
    });
}

/**
 * Validates that a scanned code matches the expected token
 * Constant-time comparison to prevent timing attacks
 */
export function validateQrToken(scanned: string, expected: string): boolean {
    if (!scanned || !expected) return false;
    if (scanned.length !== expected.length) return false;
    // Simple string equality — UUIDs are not secret keys, timing safe enough
    return scanned.trim() === expected.trim();
}
```

---

### File 3: `src/components/driver/qr-scanner.tsx`

Camera-based QR scanner component for driver app. Falls back to manual text entry.

```typescript
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard, X, ScanLine, Loader2 } from 'lucide-react';

interface QrScannerProps {
    onScan: (code: string) => void;        // Called with raw QR value on successful scan
    onError?: (error: string) => void;     // Called on camera permission denied etc.
    label: string;                         // Button label e.g. "Scan Pickup QR"
    disabled?: boolean;
    className?: string;
}

type ScanMode = 'idle' | 'camera' | 'manual' | 'scanning';

export function QrScanner({ onScan, onError, label, disabled, className }: QrScannerProps) {
    const [mode, setMode] = useState<ScanMode>('idle');
    const [manualCode, setManualCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanLoopRef = useRef<number | null>(null);

    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

    const stopCamera = useCallback(() => {
        if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setMode('idle');
    }, []);

    // Cleanup on unmount
    useEffect(() => () => stopCamera(), [stopCamera]);

    const startCamera = async () => {
        setError(null);
        setMode('scanning');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setMode('camera');
            startScanLoop();
        } catch (err) {
            const msg = err instanceof Error && err.name === 'NotAllowedError'
                ? 'Camera permission denied. Enter the code manually below.'
                : 'Camera unavailable. Enter the code manually below.';
            setError(msg);
            onError?.(msg);
            setMode('manual');
        }
    };

    const startScanLoop = () => {
        if (!hasBarcodeDetector || !videoRef.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

        const scan = async () => {
            if (!videoRef.current || !streamRef.current) return;
            try {
                const results = await detector.detect(videoRef.current);
                if (results.length > 0) {
                    stopCamera();
                    onScan(results[0].rawValue);
                    return; // Stop loop after successful scan
                }
            } catch {
                // BarcodeDetector throws if video not ready yet — ignore
            }
            scanLoopRef.current = requestAnimationFrame(scan);
        };
        scanLoopRef.current = requestAnimationFrame(scan);
    };

    const handleManualSubmit = () => {
        const code = manualCode.trim();
        if (!code) return;
        setManualCode('');
        setMode('idle');
        onScan(code);
    };

    return (
        <div className={className}>
            {/* Idle state — show primary action button */}
            {mode === 'idle' && (
                <div className="space-y-2">
                    {hasBarcodeDetector ? (
                        <Button
                            className="w-full"
                            variant="outline"
                            onClick={startCamera}
                            disabled={disabled}
                        >
                            <Camera className="mr-2 h-4 w-4" />
                            {label}
                        </Button>
                    ) : null}
                    <Button
                        className="w-full"
                        variant={hasBarcodeDetector ? 'ghost' : 'outline'}
                        size={hasBarcodeDetector ? 'sm' : 'default'}
                        onClick={() => setMode('manual')}
                        disabled={disabled}
                    >
                        <Keyboard className="mr-2 h-4 w-4" />
                        {hasBarcodeDetector ? 'Enter code manually' : label + ' (Manual)'}
                    </Button>
                </div>
            )}

            {/* Scanning state */}
            {mode === 'scanning' && (
                <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting camera...
                </div>
            )}

            {/* Camera active */}
            {mode === 'camera' && (
                <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden bg-black aspect-square max-h-64">
                        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <ScanLine className="h-32 w-32 text-primary/70 animate-pulse" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { stopCamera(); setMode('manual'); }} className="flex-1">
                            <Keyboard className="mr-2 h-3 w-3" /> Enter manually
                        </Button>
                        <Button variant="ghost" size="sm" onClick={stopCamera}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Manual entry */}
            {mode === 'manual' && (
                <div className="space-y-2">
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Paste or type QR code"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                            disabled={disabled}
                            autoFocus
                        />
                        <Button onClick={handleManualSubmit} disabled={!manualCode.trim() || disabled}>
                            Submit
                        </Button>
                    </div>
                    {hasBarcodeDetector && (
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => { setMode('idle'); setError(null); }}>
                            <Camera className="mr-2 h-3 w-3" /> Back to camera
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
```

---

### File 4: `src/server/services/delivery-sms.ts`

Blackleaf SMS/MMS for delivery events. Non-blocking callers use `setImmediate()`.

```typescript
/**
 * Delivery SMS Notifications
 *
 * Sends transactional SMS/MMS to customers at key delivery events:
 * - En route: includes QR code image for driver scan-at-door
 * - Delivered: confirmation message
 *
 * Uses Blackleaf API (BLACKLEAF_BASE_URL + BLACKLEAF_API_KEY)
 */

import { logger } from '@/lib/logger';
import { generateQrBuffer } from '@/lib/delivery-qr';
import type { Delivery } from '@/types/delivery';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from '@google-cloud/firestore';
import { getStorage } from 'firebase-admin/storage';

const BLACKLEAF_BASE_URL = process.env.BLACKLEAF_BASE_URL || 'https://api.blackleaf.io';
const BLACKLEAF_API_KEY = process.env.BLACKLEAF_API_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai';

interface BlackleafSmsPayload {
    to: string;          // E.164 format: +13155551234
    message: string;     // SMS body text
    mediaUrl?: string;   // Public image URL for MMS
}

async function sendBlackleafMessage(payload: BlackleafSmsPayload): Promise<boolean> {
    if (!BLACKLEAF_API_KEY) {
        logger.warn('BLACKLEAF_API_KEY not configured — SMS skipped');
        return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const res = await fetch(`${BLACKLEAF_BASE_URL}/v1/sms/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BLACKLEAF_API_KEY}`,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        return res.ok;
    } catch (err) {
        logger.error('Blackleaf SMS send failed', { error: err, to: payload.to });
        return false;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Upload QR code PNG to Firebase Storage, return public URL
 * Path: deliveries/qr/{deliveryId}.png
 */
async function uploadQrToStorage(deliveryId: string, token: string): Promise<string | null> {
    try {
        const buffer = await generateQrBuffer(token);
        const bucket = getStorage().bucket('bakedbot-global-assets');
        const file = bucket.file(`deliveries/qr/${deliveryId}.png`);
        await file.save(buffer, {
            metadata: { contentType: 'image/png', cacheControl: 'public, max-age=3600' },
            public: true,
        });
        return `https://storage.googleapis.com/bakedbot-global-assets/deliveries/qr/${deliveryId}.png`;
    } catch (err) {
        logger.error('QR upload failed', { deliveryId, error: err });
        return null;
    }
}

async function appendSmsLog(
    deliveryId: string,
    type: 'en_route' | 'delivered',
    success: boolean,
    error?: string
): Promise<void> {
    try {
        const db = getAdminFirestore();
        await db.collection('deliveries').doc(deliveryId).update({
            smsLog: FieldValue.arrayUnion({
                type,
                sentAt: new Date().toISOString(), // Use ISO string — Timestamp not supported in arrayUnion value
                success,
                error: error || null,
            }),
            updatedAt: FieldValue.serverTimestamp(),
        });
    } catch {
        // SMS log failure is non-critical
    }
}

/**
 * Send en-route MMS to customer with QR code image
 * Triggered when delivery status changes to in_transit
 */
export async function sendEnRouteNotification(delivery: Delivery): Promise<void> {
    const phone = delivery.deliveryAddress?.phone;
    if (!phone) {
        logger.info('No customer phone — en-route SMS skipped', { deliveryId: delivery.id });
        return;
    }

    // Upload QR to storage for MMS
    const qrImageUrl = await uploadQrToStorage(delivery.id, delivery.deliveryQrCode);

    const trackingUrl = `${APP_URL}/track/${delivery.id}`;
    const message = `Your order is on the way! Show this QR code to your driver when they arrive. Track: ${trackingUrl}`;

    const success = await sendBlackleafMessage({
        to: phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`,
        message,
        mediaUrl: qrImageUrl || undefined,
    });

    await appendSmsLog(delivery.id, 'en_route', success);
    logger.info('En-route SMS sent', { deliveryId: delivery.id, success });
}

/**
 * Send delivered SMS confirmation to customer
 * Triggered when delivery status changes to delivered
 */
export async function sendDeliveredNotification(delivery: Delivery): Promise<void> {
    const phone = delivery.deliveryAddress?.phone;
    if (!phone) {
        logger.info('No customer phone — delivered SMS skipped', { deliveryId: delivery.id });
        return;
    }

    const message = `Your order has been delivered! Thank you. Questions? Reply to this message or visit ${APP_URL}`;

    const success = await sendBlackleafMessage({
        to: phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`,
        message,
    });

    await appendSmsLog(delivery.id, 'delivered', success);
    logger.info('Delivered SMS sent', { deliveryId: delivery.id, success });
}
```

---

### File 5: `src/server/services/delivery-fcm.ts`

FCM push notification for driver assignment.

```typescript
/**
 * Delivery FCM Push Notifications
 *
 * Sends push notifications to drivers via Firebase Cloud Messaging
 * when they are assigned a new delivery.
 */

import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { getMessaging } from 'firebase-admin/messaging';

interface PushPayload {
    driverId: string;
    title: string;
    body: string;
    url: string; // deeplink — e.g. /driver/delivery/del_abc123
}

/**
 * Send push notification to a driver
 * Fails silently if driver has no FCM token or token is stale
 */
export async function sendDriverPushNotification(payload: PushPayload): Promise<void> {
    try {
        const db = getAdminFirestore();
        const driverDoc = await db.collection('drivers').doc(payload.driverId).get();
        if (!driverDoc.exists) return;

        const fcmToken = driverDoc.data()?.fcmToken as string | undefined;
        if (!fcmToken) {
            logger.info('Driver has no FCM token — push skipped', { driverId: payload.driverId });
            return;
        }

        const messaging = getMessaging();
        await messaging.send({
            token: fcmToken,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            webpush: {
                notification: {
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    requireInteraction: true,
                },
                fcmOptions: {
                    link: payload.url,
                },
            },
        });

        logger.info('Driver push notification sent', { driverId: payload.driverId });
    } catch (err) {
        // Token may be expired/invalid — log and move on
        logger.warn('Driver push notification failed', { driverId: payload.driverId, error: err });
    }
}
```

---

### File 6: `src/server/actions/delivery-notifications.ts`

Server action for driver FCM token registration.

```typescript
'use server';

/**
 * Delivery Notification Server Actions
 *
 * Handles FCM push token registration for driver devices.
 */

import { requireUser } from '@/lib/auth-helpers';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/monitoring';

/**
 * Register or refresh the FCM token for the current driver
 * Called from DriverFcmRegistrar component on dashboard load
 */
export async function registerDriverFcmToken(
    token: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!token || token.length < 10) {
            return { success: false, error: 'Invalid token' };
        }

        const currentUser = await requireUser(['delivery_driver']);
        const { firestore } = await createServerClient();

        // Get driver ID from user document
        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        const driverId = userDoc.data()?.driverId as string | undefined;

        if (!driverId) {
            return { success: false, error: 'Driver profile not linked' };
        }

        await firestore.collection('drivers').doc(driverId).update({
            fcmToken: token,
            fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Driver FCM token registered', { driverId });
        return { success: true };
    } catch (err) {
        logger.error('FCM token registration failed', { error: err });
        return { success: false, error: 'Failed to register notification token' };
    }
}
```

---

### File 7: `src/app/order-qr/[deliveryId]/page.tsx`

Public QR code display page. No auth required. Customer opens this on their phone to show driver.

```typescript
import { getAdminFirestore } from '@/firebase/admin';
import { generateQrDataUrl } from '@/lib/delivery-qr';
import { notFound } from 'next/navigation';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ deliveryId: string }>;
}

export default async function OrderQrPage({ params }: Props) {
    const { deliveryId } = await params;

    const db = getAdminFirestore();
    const deliveryDoc = await db.collection('deliveries').doc(deliveryId).get();

    if (!deliveryDoc.exists) notFound();

    const delivery = deliveryDoc.data();
    if (!delivery?.deliveryQrCode) notFound();

    const qrDataUrl = await generateQrDataUrl(delivery.deliveryQrCode);
    const address = delivery.deliveryAddress;

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white">
            <div className="max-w-sm w-full space-y-6 text-center">
                <div>
                    <h1 className="text-2xl font-bold">Your Delivery QR Code</h1>
                    <p className="text-gray-400 text-sm mt-1">Show this to your driver when they arrive</p>
                </div>

                {/* QR Code — large for easy scanning */}
                <div className="bg-white p-6 rounded-2xl mx-auto w-fit">
                    <Image src={qrDataUrl} alt="Delivery QR Code" width={280} height={280} priority />
                </div>

                <div className="bg-gray-900 rounded-xl p-4 text-sm text-left space-y-1">
                    <p className="text-gray-400">Delivering to:</p>
                    <p className="font-medium">{address?.street}</p>
                    <p className="text-gray-300">{address?.city}, {address?.state} {address?.zip}</p>
                </div>

                <p className="text-xs text-gray-500">
                    Keep this page open when your driver arrives. They will scan it to confirm delivery.
                </p>
            </div>
        </div>
    );
}
```

---

## Section 3: Modified Files (8 files)

### File 8: `src/types/delivery.ts` — add new fields

Add to `Delivery` interface after line 149 (`proofOfDeliveryPhoto`):

```typescript
// QR Check-in tokens (generated at createDelivery)
pickupQrCode: string;
deliveryQrCode: string;
pickupScannedAt?: Timestamp;
deliveryScannedAt?: Timestamp;

// SMS audit trail
smsLog?: Array<{
    type: 'en_route' | 'delivered';
    sentAt: string;       // ISO string (Timestamp not supported in FieldValue.arrayUnion objects)
    success: boolean;
    error?: string | null;
}>;
```

Add to `Driver` interface after `isAvailable`:

```typescript
fcmToken?: string;
fcmTokenUpdatedAt?: Timestamp;
```

---

### File 9: `src/server/actions/delivery.ts` — generate QR tokens at creation + FCM on assignment

**Change 1:** In `createDelivery()`, after generating `driverId = \`del_${Date.now()}...\``, import and call `generateQrToken()` for both QR fields:

```typescript
import { generateQrToken } from '@/lib/delivery-qr';

// Inside createDelivery(), in the deliveryData object:
const deliveryData: Delivery = {
    // ... existing fields ...
    pickupQrCode: generateQrToken(),    // ADD
    deliveryQrCode: generateQrToken(),  // ADD
    smsLog: [],                         // ADD
    // ... rest of fields ...
};
```

**Change 2:** Find `assignDriver()` function. After the Firestore update that sets `driverId` on the delivery, add non-blocking FCM push:

```typescript
import { sendDriverPushNotification } from '@/server/services/delivery-fcm';

// After the successful update in assignDriver():
const deliveryData = deliveryDoc.data() as Delivery;
setImmediate(() => {
    const street = deliveryData.deliveryAddress?.street || 'Unknown address';
    const orderId = deliveryData.orderId || '';
    sendDriverPushNotification({
        driverId: input.driverId,
        title: 'New Delivery Assigned',
        body: `Order #${orderId.slice(-8).toUpperCase()} → ${street}`,
        url: `/driver/delivery/${deliveryId}`,
    }).catch(() => {}); // already fails silently inside, belt-and-suspenders
});
```

---

### File 10: `src/server/actions/delivery-driver.ts` — QR validation + ETA + SMS

**Add these two new exported functions at the end of the file:**

```typescript
import { validateQrToken } from '@/lib/delivery-qr';
import { sendEnRouteNotification, sendDeliveredNotification } from '@/server/services/delivery-sms';
import { FieldValue as AdminFieldValue } from '@google-cloud/firestore';

/**
 * Validate pickup QR code and start delivery
 * Called when driver scans dispensary QR at pickup
 */
export async function validatePickupQr(
    deliveryId: string,
    scannedCode: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = await requireUser(['delivery_driver']);
        const { firestore } = await createServerClient();

        const deliveryRef = firestore.collection('deliveries').doc(deliveryId);
        const deliveryDoc = await deliveryRef.get();
        if (!deliveryDoc.exists) return { success: false, error: 'Delivery not found' };

        const delivery = deliveryDoc.data() as Delivery;

        // Verify driver ownership
        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        const driverId = userDoc.data()?.driverId;
        if (delivery.driverId !== driverId) return { success: false, error: 'Access denied' };

        if (delivery.status !== 'assigned') {
            return { success: false, error: 'Delivery is not in assigned state' };
        }

        if (!validateQrToken(scannedCode, delivery.pickupQrCode)) {
            return { success: false, error: 'Invalid QR code — does not match this order' };
        }

        // Advance status + record scan timestamp
        await deliveryRef.update({
            status: 'in_transit',
            departedAt: FieldValue.serverTimestamp(),
            pickupScannedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Non-blocking: ETA + SMS
        setImmediate(() => {
            calculateAndStoreEta(deliveryId, driverId as string, firestore).catch(() => {});
            const fullDelivery = { ...delivery, id: deliveryId } as Delivery;
            sendEnRouteNotification(fullDelivery).catch(() => {});
        });

        logger.info('Pickup QR validated — delivery started', { deliveryId, driverId });
        return { success: true };
    } catch (err) {
        logger.error('validatePickupQr failed', { error: err });
        return { success: false, error: 'Failed to validate QR code' };
    }
}

/**
 * Validate delivery QR code and mark arrived
 * Called when driver scans customer QR at door
 */
export async function validateDeliveryQr(
    deliveryId: string,
    scannedCode: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = await requireUser(['delivery_driver']);
        const { firestore } = await createServerClient();

        const deliveryRef = firestore.collection('deliveries').doc(deliveryId);
        const deliveryDoc = await deliveryRef.get();
        if (!deliveryDoc.exists) return { success: false, error: 'Delivery not found' };

        const delivery = deliveryDoc.data() as Delivery;

        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        const driverId = userDoc.data()?.driverId;
        if (delivery.driverId !== driverId) return { success: false, error: 'Access denied' };

        if (delivery.status !== 'in_transit') {
            return { success: false, error: 'Delivery must be in transit to scan customer QR' };
        }

        if (!validateQrToken(scannedCode, delivery.deliveryQrCode)) {
            return { success: false, error: 'Invalid QR code — does not match this order' };
        }

        await deliveryRef.update({
            status: 'arrived',
            arrivedAt: FieldValue.serverTimestamp(),
            deliveryScannedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Delivery QR validated — arrived', { deliveryId, driverId });
        return { success: true };
    } catch (err) {
        logger.error('validateDeliveryQr failed', { error: err });
        return { success: false, error: 'Failed to validate QR code' };
    }
}
```

**Modify `startDelivery()` to add ETA + SMS after status update** (keeps existing manual button path working):

```typescript
// After the existing deliveryRef.update({ status: 'in_transit', ... }) call in startDelivery():
const deliveryData = delivery; // already fetched above
setImmediate(() => {
    calculateAndStoreEta(deliveryId, driverId as string, firestore).catch(() => {});
    sendEnRouteNotification({ ...deliveryData, id: deliveryId } as Delivery).catch(() => {});
});
```

**Modify `completeDelivery()` to send delivered SMS:**

```typescript
// After the existing deliveryRef.update({ status: 'delivered', ... }) call:
const deliverySnapshot = deliveryDoc.data() as Delivery;
setImmediate(() => {
    sendDeliveredNotification({ ...deliverySnapshot, id: deliveryId } as Delivery).catch(() => {});
});
```

**Add internal helper `calculateAndStoreEta()` (not exported):**

```typescript
/**
 * Calls Google Maps Directions API to get ETA, stores on delivery document
 * Non-blocking — always called via setImmediate
 */
async function calculateAndStoreEta(
    deliveryId: string,
    driverId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    firestore: any
): Promise<void> {
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_MAPS_API_KEY) return;

    try {
        // Get driver's current GPS
        const driverDoc = await firestore.collection('drivers').doc(driverId).get();
        const loc = driverDoc.data()?.currentLocation;
        if (!loc?.lat || !loc?.lng) return;

        // Get delivery address
        const deliveryDoc = await firestore.collection('deliveries').doc(deliveryId).get();
        const delivery = deliveryDoc.data() as Delivery;
        const addr = delivery.deliveryAddress;
        const destination = encodeURIComponent(
            `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`
        );

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${loc.lat},${loc.lng}&destination=${destination}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

        const controller = new AbortController();
        setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();

        const durationSeconds = data?.routes?.[0]?.legs?.[0]?.duration?.value;
        if (!durationSeconds) return;

        const estimatedArrival = new Date(Date.now() + durationSeconds * 1000);
        await firestore.collection('deliveries').doc(deliveryId).update({
            estimatedArrival: Timestamp.fromDate(estimatedArrival),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('ETA calculated', { deliveryId, durationSeconds, estimatedArrival });
    } catch (err) {
        logger.warn('ETA calculation failed — continuing without ETA', { deliveryId, error: err });
    }
}
```

---

### File 11: `src/app/driver/delivery/[id]/client.tsx` — QR scanner + ETA display

**Add imports:**
```typescript
import { QrScanner } from '@/components/driver/qr-scanner';
import { validatePickupQr, validateDeliveryQr } from '@/server/actions/delivery-driver';
```

**Add two handler functions (after existing handlers, before `openNavigation`):**
```typescript
const handlePickupScan = async (scannedCode: string) => {
    if (!delivery) return;
    setActionLoading(true);
    const result = await validatePickupQr(delivery.id, scannedCode);
    if (result.success) {
        toast({ title: 'Pickup Confirmed!', description: 'GPS tracking is now active' });
        await loadDelivery();
    } else {
        toast({ variant: 'destructive', title: 'Invalid QR', description: result.error });
    }
    setActionLoading(false);
};

const handleDeliveryScan = async (scannedCode: string) => {
    if (!delivery) return;
    setActionLoading(true);
    const result = await validateDeliveryQr(delivery.id, scannedCode);
    if (result.success) {
        toast({ title: 'Arrival Confirmed!', description: 'Complete ID verification to finish' });
        await loadDelivery();
    } else {
        toast({ variant: 'destructive', title: 'Invalid QR', description: result.error });
    }
    setActionLoading(false);
};
```

**Add ETA display card** (after the Delivery Window card, before Customer Contact card):
```tsx
{delivery.estimatedArrival && delivery.status === 'in_transit' && (
    <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <CardContent className="py-4">
            <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                    <div className="text-sm text-muted-foreground">Estimated Arrival</div>
                    <div className="font-semibold text-blue-700 dark:text-blue-300">
                        {formatTime(delivery.estimatedArrival)}
                        {' '}
                        <span className="text-sm font-normal text-muted-foreground">
                            ({Math.max(0, Math.round((delivery.estimatedArrival.toDate().getTime() - Date.now()) / 60000))} min)
                        </span>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
)}
```

**Replace the Fixed Action Bar** with QR scanner integration:

For status `assigned` — replace the "Start Delivery" Button with QrScanner + manual fallback:
```tsx
{delivery.status === 'assigned' && (
    <div className="space-y-2">
        <p className="text-sm font-medium text-center">Scan the dispensary QR to start your delivery</p>
        <QrScanner
            label="Scan Pickup QR"
            onScan={handlePickupScan}
            disabled={actionLoading}
        />
        <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
        </div>
        <Button className="w-full" variant="outline" size="sm" onClick={handleStartDelivery} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
            Start Without Scan
        </Button>
    </div>
)}
```

For status `in_transit` — replace "I've Arrived" Button with QrScanner + manual fallback:
```tsx
{delivery.status === 'in_transit' && (
    <div className="space-y-2">
        <p className="text-sm font-medium text-center">Scan customer's QR code at the door</p>
        <QrScanner
            label="Scan Customer QR"
            onScan={handleDeliveryScan}
            disabled={actionLoading}
        />
        <Button className="w-full" variant="outline" size="sm" onClick={handleMarkArrived} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            Arrived (No QR)
        </Button>
    </div>
)}
```

---

### File 12: `src/app/driver/dashboard/page.tsx` — FCM permission request

This is a server component. Add a new client component `DriverFcmRegistrar` that mounts on the driver dashboard.

Create inline in the same file or as a separate component:

```typescript
// Add at top of file, before default export:
'use client'; // ONLY if converting to client component — prefer adding a separate sub-component

// Sub-component approach (preferred — keeps page as server component):
// Create src/components/driver/fcm-registrar.tsx (see below)
// Import and add <DriverFcmRegistrar /> to the dashboard JSX
```

Create `src/components/driver/fcm-registrar.tsx` (**this is an additional new file, total = 8 new files**):

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { registerDriverFcmToken } from '@/server/actions/delivery-notifications';

export function DriverFcmRegistrar() {
    const [showBanner, setShowBanner] = useState(false);
    const [registered, setRegistered] = useState(false);

    useEffect(() => {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
        if (Notification.permission === 'granted') {
            // Already granted — silently register token
            registerFcmToken().catch(() => {});
        } else if (Notification.permission === 'default') {
            setShowBanner(true);
        }
        // 'denied' — show nothing
    }, []);

    const registerFcmToken = async () => {
        try {
            const { initializeApp, getApps } = await import('firebase/app');
            const { getMessaging, getToken } = await import('firebase/messaging');

            const firebaseConfig = {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: 'studio-567050101-bc6e8.firebaseapp.com',
                projectId: 'studio-567050101-bc6e8',
                storageBucket: 'studio-567050101-bc6e8.firebasestorage.app',
                messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            };

            const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
            const messaging = getMessaging(app);

            const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            const token = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: swReg,
            });

            if (token) {
                await registerDriverFcmToken(token);
                setRegistered(true);
                setShowBanner(false);
            }
        } catch {
            // Silent fail — push is non-critical
        }
    };

    const handleAllow = async () => {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            setShowBanner(false);
            await registerFcmToken();
        } else {
            setShowBanner(false);
        }
    };

    if (registered || !showBanner) return null;

    return (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-sm flex-1">Enable notifications to get alerts for new deliveries</p>
            <Button size="sm" onClick={handleAllow}>Allow</Button>
        </div>
    );
}
```

Add `<DriverFcmRegistrar />` to the top of the driver dashboard JSX.

---

### File 13: `src/app/track/[deliveryId]/page.tsx` — ETA display

Find where driver location / map is displayed. Add ETA display alongside it:

```tsx
{delivery.estimatedArrival && (
    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
        <span className="text-2xl">🕐</span>
        <div>
            <p className="text-sm text-muted-foreground">Estimated Arrival</p>
            <p className="text-lg font-semibold">
                {new Date(delivery.estimatedArrival.toDate()).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true
                })}
            </p>
        </div>
    </div>
)}
```

---

### File 14: `src/app/dashboard/delivery/page.tsx` — Pickup QR on dispatch board

In the delivery card/row for deliveries with status `assigned`, add a QR code display that dispensary staff can show/print:

```tsx
import { generateQrDataUrl } from '@/lib/delivery-qr';

// In the delivery card for assigned deliveries:
{delivery.status === 'assigned' && delivery.pickupQrCode && (
    <details className="mt-2">
        <summary className="text-xs text-muted-foreground cursor-pointer">Show Pickup QR</summary>
        <div className="mt-2 flex items-start gap-3">
            <QrCodeDisplay token={delivery.pickupQrCode} size={80} />
            <p className="text-xs text-muted-foreground">
                Show this QR to the driver when they arrive to pick up Order #{delivery.orderId.slice(-8).toUpperCase()}
            </p>
        </div>
    </details>
)}
```

Create `QrCodeDisplay` as a small async server component or use `<img>` with data URL generated server-side in the page fetch.

---

### File 15: `apphosting.yaml` — add 3 new entries

Add after the existing BLACKLEAF_BASE_URL entry (around line 172):

```yaml
  - variable: BLACKLEAF_API_KEY
    secret: BLACKLEAF_API_KEY@1
    availability:
      - RUNTIME

  - variable: GOOGLE_MAPS_API_KEY
    secret: GOOGLE_MAPS_API_KEY@1
    availability:
      - RUNTIME

  # Firebase Messaging VAPID key — public value, not a secret
  - variable: NEXT_PUBLIC_FIREBASE_VAPID_KEY
    value: "REPLACE_WITH_VAPID_KEY_FROM_FIREBASE_CONSOLE"
    availability:
      - BUILD
      - RUNTIME

  # Firebase public config for FCM in client components
  - variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    value: "REPLACE_WITH_SENDER_ID_FROM_FIREBASE_CONSOLE"
    availability:
      - BUILD
      - RUNTIME

  - variable: NEXT_PUBLIC_FIREBASE_APP_ID
    value: "REPLACE_WITH_APP_ID_FROM_FIREBASE_CONSOLE"
    availability:
      - BUILD
      - RUNTIME
```

**How to get these values:**
- Go to Firebase Console → Project Settings → General → Your apps → Web app config
- Copy `messagingSenderId` and `appId`
- Go to Cloud Messaging tab → Web Push Certificates → Generate key pair → copy the Key Pair value as VAPID key

---

## Section 4: Firestore Indexes

No new composite indexes required. Existing `deliveries` indexes cover all queries used in new actions.

---

## Section 5: Exact Test Cases

File: `tests/driver-mobile-parity.test.ts`

```typescript
// generateQrToken()
expect(generateQrToken()).toHaveLength(36);         // UUID format
expect(generateQrToken()).toMatch(/^[0-9a-f-]+$/);  // hex chars + dashes
expect(generateQrToken()).not.toBe(generateQrToken()); // unique each call

// validateQrToken()
expect(validateQrToken('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000')).toBe(true);
expect(validateQrToken('wrong-code', '550e8400-e29b-41d4-a716-446655440000')).toBe(false);
expect(validateQrToken('', 'any-token')).toBe(false);
expect(validateQrToken('any-token', '')).toBe(false);
expect(validateQrToken(' 550e8400-e29b-41d4-a716-446655440000 ', '550e8400-e29b-41d4-a716-446655440000')).toBe(true); // trims whitespace

// validatePickupQr() — mock Firestore
// Setup: delivery with status='assigned', driverId='driver_123', pickupQrCode='correct-uuid'
// Case 1: correct code → { success: true }
// Case 2: wrong code → { success: false, error: 'Invalid QR code — does not match this order' }
// Case 3: delivery status is 'in_transit' (already started) → { success: false, error: 'Delivery is not in assigned state' }
// Case 4: driver mismatch → { success: false, error: 'Access denied' }

// validateDeliveryQr() — mock Firestore
// Setup: delivery with status='in_transit', driverId='driver_123', deliveryQrCode='correct-uuid'
// Case 1: correct code → { success: true }
// Case 2: wrong code → { success: false, error: 'Invalid QR code — does not match this order' }
// Case 3: delivery status is 'arrived' → { success: false, error: 'Delivery must be in transit...' }

// sendEnRouteNotification() — mock fetch
// Case 1: phone exists → fetch called with correct Blackleaf URL
// Case 2: no phone → fetch not called, returns void
// Case 3: BLACKLEAF_API_KEY empty → fetch not called

// sendDeliveredNotification() — mock fetch
// Case 1: phone exists → fetch called
// Case 2: no phone → skipped

// calculateAndStoreEta() — mock Google Maps fetch
// Case 1: Maps returns durationSeconds=900 → delivery.estimatedArrival set to ~15min from now
// Case 2: Maps returns empty routes → estimatedArrival not set
// Case 3: GOOGLE_MAPS_API_KEY missing → returns immediately
```

---

## Section 6: API Contract

No new HTTP API routes. All logic is in server actions.

### QR validation (server actions):
```
validatePickupQr(deliveryId: string, scannedCode: string)
  → Promise<{ success: boolean; error?: string }>

validateDeliveryQr(deliveryId: string, scannedCode: string)
  → Promise<{ success: boolean; error?: string }>

registerDriverFcmToken(token: string)
  → Promise<{ success: boolean; error?: string }>
```

### Blackleaf MMS (internal service, not public API):
```
POST https://api.blackleaf.io/v1/sms/send
Authorization: Bearer {BLACKLEAF_API_KEY}
Body: { to: "+13155551234", message: "...", mediaUrl?: "https://..." }
Response: 200 OK on success
```

---

## Section 7: Build Order

Implement in this order to avoid import errors:

1. `src/types/delivery.ts` — schema first
2. `src/lib/delivery-qr.ts` — utilities (no dependencies)
3. `src/server/services/delivery-sms.ts`
4. `src/server/services/delivery-fcm.ts`
5. `src/server/actions/delivery-notifications.ts`
6. `src/server/actions/delivery.ts` — add QR generation to createDelivery + FCM to assignDriver
7. `src/server/actions/delivery-driver.ts` — add validatePickupQr, validateDeliveryQr, ETA + SMS to existing actions
8. `src/components/driver/qr-scanner.tsx`
9. `src/components/driver/fcm-registrar.tsx`
10. `src/app/driver/delivery/[id]/client.tsx` — wire in scanner
11. `src/app/driver/dashboard/page.tsx` — wire in FCM registrar
12. `src/app/order-qr/[deliveryId]/page.tsx` — new public page
13. `src/app/track/[deliveryId]/page.tsx` — ETA display
14. `src/app/dashboard/delivery/page.tsx` — pickup QR on dispatch
15. `public/firebase-messaging-sw.js` — FCM SW
16. `apphosting.yaml` — add secrets
17. `tests/driver-mobile-parity.test.ts` — tests
18. `npm run check:types` — verify build

---

## Section 8: Rollback Plan

If this causes a production regression:
```bash
git revert HEAD  # reverts last commit
git push origin main  # redeploys previous version
```

Firestore fields (`pickupQrCode`, `deliveryQrCode`) are additive — existing `deliveries` documents without them will not crash. New fields only appear on deliveries created after deploy.

The manual "Start Without Scan" and "Arrived (No QR)" buttons are preserved throughout — drivers can always fall back to manual button presses. Zero disruption to any existing workflow.

---

## Section 9: Success Criteria

- `npm run check:types` passes with 0 new errors after all 18 files touched
- `npm test -- tests/driver-mobile-parity.test.ts` — all test cases pass
- Manual smoke test:
  1. Create a delivery → `pickupQrCode` and `deliveryQrCode` are non-empty UUIDs on the Firestore doc
  2. Open `/order-qr/{deliveryId}` → QR code renders, no auth required
  3. Driver dashboard shows FCM permission banner on first load
  4. QrScanner component renders camera button on Chrome/Android, manual input on unsupported browser
  5. `validatePickupQr(id, correctCode)` → `{ success: true }` in Firestore emulator
  6. ETA appears on driver delivery page after `startDelivery()` is called (if Maps key configured)
  7. Dispatch dashboard shows "Show Pickup QR" section on assigned deliveries
