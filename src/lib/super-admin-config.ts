// src/lib/super-admin-config.ts
/**
 * Super Admin configuration
 * Whitelist of emails that have super admin access to CEO dashboard
 */

// All known super admin emails (type safety)
const ALL_SUPER_ADMIN_EMAILS = [
    'martez@bakedbot.ai',
    'jack@bakedbot.ai',
    'vib@cannmenus.com',
    'owner@bakedbot.ai', // Dev persona - gated by environment check below
    'rishabh@bakedbot.ai', // Added by request
] as const;

export type SuperAdminEmail = typeof ALL_SUPER_ADMIN_EMAILS[number];

// Runtime filter: dev persona only available in non-production environments
export const SUPER_ADMIN_EMAILS: readonly SuperAdminEmail[] = ALL_SUPER_ADMIN_EMAILS.filter(
    email => email !== 'owner@bakedbot.ai' || process.env.NODE_ENV !== 'production'
);

/**
 * Check if an email is in the super admin whitelist
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return (SUPER_ADMIN_EMAILS as readonly string[]).includes(email.toLowerCase());
}

/**
 * Storage key for super admin session
 */
export const SUPER_ADMIN_SESSION_KEY = 'bakedbot_superadmin_session';

/**
 * Get super admin session from localStorage
 */
export function getSuperAdminSession(): { email: string; timestamp: number } | null {
    if (typeof window === 'undefined') return null;

    try {
        const session = localStorage.getItem(SUPER_ADMIN_SESSION_KEY);
        if (!session) return null;

        const parsed = JSON.parse(session);

        // Session expires after 24 hours
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        if (Date.now() - parsed.timestamp > TWENTY_FOUR_HOURS) {
            localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
            return null;
        }

        // Verify email is still in whitelist
        if (!isSuperAdminEmail(parsed.email)) {
            localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

/**
 * Set super admin session in localStorage
 */
export function setSuperAdminSession(email: string): boolean {
    if (!isSuperAdminEmail(email)) return false;

    try {
        localStorage.setItem(SUPER_ADMIN_SESSION_KEY, JSON.stringify({
            email: email.toLowerCase(),
            timestamp: Date.now(),
        }));
        return true;
    } catch {
        return false;
    }
}

/**
 * Clear super admin session
 */
export function clearSuperAdminSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
}
