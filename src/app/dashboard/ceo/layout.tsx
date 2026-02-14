import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireSuperUser } from '@/server/auth/auth';

export default async function CeoLayout({ children }: { children: ReactNode }) {
    try {
        await requireSuperUser();
    } catch {
        redirect('/super-admin');
    }

    return <>{children}</>;
}
