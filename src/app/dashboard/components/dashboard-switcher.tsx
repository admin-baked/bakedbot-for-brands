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
import BudtenderDashboardClient from '../budtender/dashboard-client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DashboardSwitcher() {
    const router = useRouter(); // Initialize router
    const { role: rawRole, user, isLoading: isRoleLoading } = useUserRole();
    const role = rawRole as string;
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [checkComplete, setCheckComplete] = useState(false);

    console.log('[DashboardSwitcher] Render:', { role, isSuperAdmin, isRoleLoading });

    useEffect(() => {
        if (isRoleLoading) return;

        // Check local storage for super admin session
        const session = getSuperAdminSession();
        if (session) {
            // SECURITY FIX: If a user is logged in, their email MUST match the super admin session
            // This prevents "Role Leakage" on shared devices where a Super Admin session persists
            if (user && user.email && session.email !== user.email.toLowerCase()) {
                console.warn('[DashboardSwitcher] Security Alert: Super Admin session mismatch. Invalidating.');
                setIsSuperAdmin(false);
                // We don't necessarily clear it here to allow easy switching back,
                // but we definitely don't grant access in this context.
                // Actually, for safety, let's clear it to force re-auth.
                localStorage.removeItem('bakedbot_superadmin_session');
            } else {
                setIsSuperAdmin(true);
            }
        } else {
            setIsSuperAdmin(false);
        }
        setCheckComplete(true);
    }, [isRoleLoading, user]);

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

    // 3. Owner View - Redirect to CEO Dashboard
    if (role === 'super_user') {
        router.replace('/dashboard/ceo');
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Redirecting to HQ...</span>
            </div>
        );
    }

    // 4. Brand View
    if (role === 'brand') {
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

    // 6. Budtender View (FREE co-pilot for dispensary employees)
    if (role === 'budtender') {
        return <BudtenderDashboardClient />;
    }

    // 6. Default Fallback
    return <DashboardPageComponent brandId={(user as any)?.brandId || user?.uid || 'guest'} />;
}
