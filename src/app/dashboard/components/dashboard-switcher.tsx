'use client';

import { useEffect, useState } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { getSuperAdminSession } from '@/lib/super-admin-config';
import AgentInterface from './agent-interface';
import DashboardPageComponent from '../page-client';
import DispensaryDashboardClient from '../dispensary/dashboard-client';
import BrandDashboardClient from '../brand/dashboard-client';
import { Loader2 } from 'lucide-react';

export default function DashboardSwitcher() {
    const { role, user, isLoading: isRoleLoading } = useUserRole();
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [checkComplete, setCheckComplete] = useState(false);

    console.log('[DashboardSwitcher] Render:', { role, isSuperAdmin, isRoleLoading });

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

    // 1. Brand / Owner View
    if (role === 'brand' || role === 'owner') {
        const brandId = (user as any)?.brandId || user?.uid || 'unknown-brand';
        return <BrandDashboardClient brandId={brandId} />;
    }

    // 2. Dispensary View
    if (role === 'dispensary') {
        const brandId = (user as any)?.brandId || user?.uid || 'unknown-dispensary';
        return <DispensaryDashboardClient brandId={brandId} />;
    }

    // 3. Super Admin View (Big Worm HQ) - Fallback for real admins or explicit access
    if (isSuperAdmin) {
        return <AgentInterface />;
    }

    // 4. Default Fallback
    return <DashboardPageComponent brandId={(user as any)?.brandId || user?.uid || 'guest'} />;
}
