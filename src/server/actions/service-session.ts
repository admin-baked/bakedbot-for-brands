'use server';

/**
 * Generic Service Session Management — Super User Only
 *
 * Replaces service-specific session actions (e.g. linkedin-session.ts).
 * All RTRVR-authenticated services share this Firestore schema:
 *
 * Path:   users/{uid}/integrations/{serviceId}
 * Schema: { cookies: Record<string, string>; capturedAt: Timestamp; captureMethod: 'auto' | 'manual' }
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireSuperUser, requireUser } from '@/server/auth/auth';
import { captureSessionCookies } from '@/server/services/rtrvr/session-capture';
import { SERVICE_REGISTRY, ServiceId } from '@/server/services/rtrvr/service-registry';
import { logger } from '@/lib/logger';
import { FieldValue } from '@google-cloud/firestore';

export interface ServiceSessionStatus {
    connected: boolean;
    capturedAt?: string;
    captureMethod?: 'auto' | 'manual';
}

/**
 * Log in via RTRVR automation and capture session cookies.
 * Credentials are used transiently — only cookies are stored.
 */
export async function connectServiceAuto(
    serviceId: ServiceId,
    email: string,
    password: string
): Promise<{ success: boolean; error?: string }> {
    await requireSuperUser();
    const user = await requireUser();

    const result = await captureSessionCookies(serviceId, email, password);
    if (!result.success || !result.cookies) {
        return { success: false, error: result.error };
    }

    try {
        await getAdminFirestore()
            .collection('users').doc(user.uid)
            .collection('integrations').doc(serviceId)
            .set({
                cookies: result.cookies,
                capturedAt: FieldValue.serverTimestamp(),
                captureMethod: 'auto',
            });

        logger.info('[ServiceSession] Auto-connected', { uid: user.uid, service: serviceId });
        return { success: true };
    } catch (err) {
        logger.error('[ServiceSession] Failed to save cookies', { error: String(err) });
        return { success: false, error: 'Failed to save session' };
    }
}

/**
 * Save session cookies — used for both manual paste and SSE-captured auto-login.
 * captureMethod defaults to 'manual' for the DevTools paste flow.
 */
export async function connectServiceManual(
    serviceId: ServiceId,
    cookies: Record<string, string>,
    captureMethod: 'auto' | 'manual' = 'manual'
): Promise<{ success: boolean; error?: string }> {
    await requireSuperUser();
    const user = await requireUser();

    const service = SERVICE_REGISTRY[serviceId];
    const hasAnyExpectedCookie = service.sessionCookies.some(name => !!cookies[name]);
    if (!hasAnyExpectedCookie) {
        return {
            success: false,
            error: `Must provide at least one of: ${service.sessionCookies.join(', ')}`,
        };
    }

    try {
        await getAdminFirestore()
            .collection('users').doc(user.uid)
            .collection('integrations').doc(serviceId)
            .set({
                cookies,
                capturedAt: FieldValue.serverTimestamp(),
                captureMethod,
            });

        logger.info('[ServiceSession] Connected', { uid: user.uid, service: serviceId, captureMethod });
        return { success: true };
    } catch (err) {
        logger.error('[ServiceSession] Failed to save cookies', { error: String(err) });
        return { success: false, error: 'Failed to save session' };
    }
}

/**
 * Get session status for the current Super User.
 */
export async function getServiceSessionStatus(serviceId: ServiceId): Promise<ServiceSessionStatus> {
    await requireSuperUser();
    const user = await requireUser();

    try {
        const doc = await getAdminFirestore()
            .collection('users').doc(user.uid)
            .collection('integrations').doc(serviceId)
            .get();

        if (!doc.exists) return { connected: false };

        const data = doc.data() as {
            cookies?: Record<string, string>;
            capturedAt?: FirebaseFirestore.Timestamp;
            captureMethod?: 'auto' | 'manual';
        };

        return {
            connected: !!(data?.cookies && Object.keys(data.cookies).length > 0),
            capturedAt: data?.capturedAt?.toDate().toISOString(),
            captureMethod: data?.captureMethod,
        };
    } catch {
        return { connected: false };
    }
}

/**
 * Get session cookies for use in browser automation (server-side only).
 * Used by service-specific adapters (linkedin-browser.ts, etc.).
 */
export async function getServiceSessionCookies(
    uid: string,
    serviceId: ServiceId
): Promise<Record<string, string> | null> {
    try {
        const doc = await getAdminFirestore()
            .collection('users').doc(uid)
            .collection('integrations').doc(serviceId)
            .get();

        if (!doc.exists) return null;
        const data = doc.data() as { cookies?: Record<string, string> };
        return data?.cookies ?? null;
    } catch {
        return null;
    }
}

/**
 * Disconnect a service — deletes stored cookies.
 */
export async function disconnectService(serviceId: ServiceId): Promise<void> {
    await requireSuperUser();
    const user = await requireUser();

    await getAdminFirestore()
        .collection('users').doc(user.uid)
        .collection('integrations').doc(serviceId)
        .delete();

    logger.info('[ServiceSession] Disconnected', { uid: user.uid, service: serviceId });
}
