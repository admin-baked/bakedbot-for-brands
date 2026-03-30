import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { isSuperUser } from '@/server/auth/auth';

/**
 * CEO Layout — server-side auth guard.
 *
 * Uses the non-throwing `isSuperUser()` (returns boolean) instead of
 * `requireSuperUser()` (throws on failure). This prevents two 500-causing
 * scenarios:
 *   1. `redirect()` inside a catch block during RSC POST can produce 500
 *      in Next.js App Router instead of a proper redirect response.
 *   2. Transient Firebase Auth network failures (verifySessionCookie
 *      revocation check) would crash the entire page.
 *
 * Client-side `CeoDashboardContent` has its own super user guard as backup.
 */
export default async function CeoLayout({ children }: { children: ReactNode }) {
    const authorized = await isSuperUser();

    if (!authorized) {
        redirect('/super-admin');
    }

    return <>{children}</>;
}
