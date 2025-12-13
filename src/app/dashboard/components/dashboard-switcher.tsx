'use client';

import { useEffect, useState } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { getSuperAdminSession } from '@/lib/super-admin-config';
import AgentInterface from './agent-interface';
import DashboardPageComponent from '../page-client';
import DispensaryDashboardClient from '../dispensary/dashboard-client';
import { Loader2 } from 'lucide-react';

export default function DashboardSwitcher() {
    const { role, user, isLoading: isRoleLoading } = useUserRole();
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [checkComplete, setCheckComplete] = useState(false);

    useEffect(() => {
        // Check local storage for super admin session
        const session = getSuperAdminSession();
        if (session) {
            setIsSuperAdmin(true);
        }
        setCheckComplete(true);
    }, []);

    const isLoading = isRoleLoading || !checkComplete;

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // 1. Super Admin View (Big Worm HQ)
    if (isSuperAdmin) {
        return <AgentInterface />;
    }

    // 2. Brand / Owner View
    if (role === 'brand' || role === 'owner') {
        const brandId = (user as any)?.brandId || user?.uid || 'unknown-brand';
        return <DashboardPageComponent brandId={brandId} />;
    }

    // 3. Dispensary View (Using generic dashboard for now)
    if (role === 'dispensary') {
        const brandId = (user as any)?.brandId || user?.uid || 'unknown-dispensary';
        return <DispensaryDashboardClient brandId={brandId} />;
    }

    // 4. Fallback (Safe Default)
    // Avoid showing Big Worm HQ to unprivileged users
    return <DashboardPageComponent brandId={(user as any)?.brandId || user?.uid || 'guest'} />;
}
