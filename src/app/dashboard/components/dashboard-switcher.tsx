'use client';

import { useEffect, useState } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { getSuperAdminSession } from '@/lib/super-admin-config';
import AgentInterface from './agent-interface';
import DashboardPageComponent from '../page-client';
import DispensaryDashboardClient from '../dispensary/dashboard-client';
import BrandDashboardClient from '../brand/dashboard-client';
import CustomerDashboardClient from '../customer/dashboard-client';
import SpecialistDashboardClient from '../specialist/dashboard-client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DashboardSwitcher() {
    const router = useRouter(); // Initialize router
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

    // 1. Super Admin View - PRIORITY override
    // If we have a super admin session, always go to CEO dashboard, regardless of role
    if (isSuperAdmin) {
        router.replace('/dashboard/ceo');
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Redirecting to HQ...</span>
            </div>
        );
    }

    // 2. Specialist / Empire View (Agentic Mode)
    if (role === 'specialist' || role === 'empire') {
        return <SpecialistDashboardClient />;
    }

    // 3. Brand / Owner View
    if (role === 'brand' || role === 'owner') {
        const brandId = (user as any)?.brandId || user?.uid || 'unknown-brand';
        return <BrandDashboardClient brandId={brandId} />;
    }

    // 4. Dispensary View
    if (role === 'dispensary') {
        const brandId = (user as any)?.brandId || user?.uid || 'unknown-dispensary';
        return <DispensaryDashboardClient brandId={brandId} />;
    }

    // 5. Customer View
    if (role === 'customer') {
        return <CustomerDashboardClient />;
    }

    // 6. Default Fallback
    return <DashboardPageComponent brandId={(user as any)?.brandId || user?.uid || 'guest'} />;
}
