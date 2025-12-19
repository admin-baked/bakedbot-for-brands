'use client';

// src/app/dashboard/ceo/page.tsx
/**
 * CEO Dashboard - Super Admin Only
 * Protected by super admin check
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const TabLoader = () => <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

const DataManagerTab = dynamic(() => import("./components/data-manager-tab"), { loading: TabLoader });
const AISearchIndexTab = dynamic(() => import("./components/ai-search-index-tab"), { loading: TabLoader });
const CouponManagerTab = dynamic(() => import("./components/coupon-manager-tab"), { loading: TabLoader });
const AIAgentEmbedTab = dynamic(() => import("./components/ai-agent-embed-tab"), { loading: TabLoader });
const CannMenusTestTab = dynamic(() => import("./components/cannmenus-test-tab"), { loading: TabLoader });
const PlatformAnalyticsTab = dynamic(() => import("./components/platform-analytics-tab"), { loading: TabLoader });
const TicketsTab = dynamic(() => import("./components/tickets-tab"), { loading: TabLoader });
const FootTrafficTab = dynamic(() => import("./components/foot-traffic-tab"), { loading: TabLoader });
const SuperAdminAgentChat = dynamic(() => import("./components/super-admin-agent-chat"), { loading: TabLoader });
const AgentDashboardClient = dynamic(() => import("./agents/agent-dashboard-client"), { loading: TabLoader }); // New Integration
const SuperAdminPlaybooksTab = dynamic(() => import("./components/super-admin-playbooks-tab"), { loading: TabLoader });
const UsageTab = dynamic(() => import("./components/usage-tab"), { loading: TabLoader });
const EzalTab = dynamic(() => import("./components/ezal-tab"), { loading: TabLoader });
const SuperAdminInsightsTab = dynamic(() => import("./components/super-admin-insights-tab").then(mod => mod.SuperAdminInsightsTab), { loading: TabLoader });
const OperationsTab = dynamic(() => import("./components/operations-tab"), { loading: TabLoader });
const CompetitorIntelTab = dynamic(() => import("./components/competitor-intel-tab"), { loading: TabLoader });
const CRMTab = dynamic(() => import("./components/crm-tab"), { loading: TabLoader });
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { Loader2, Shield, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ClientOnly } from '@/components/client-only';
import { RoleSwitcher } from '@/components/debug/role-switcher';
import { MockDataToggle } from '@/components/debug/mock-data-toggle';
import { DataImportDropdown } from '@/components/dashboard/data-import-dropdown';

export default function CeoDashboardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { isSuperAdmin, isLoading, superAdminEmail, logout } = useSuperAdmin();

    // Sync tabs with URL ?tab=...
    const currentTab = searchParams?.get('tab') || 'playbooks'; // Default to Playbooks tab



    // Not authorized - redirect to login
    useEffect(() => {
        if (!isLoading && !isSuperAdmin) {
            router.push('/super-admin');
        }
    }, [isLoading, isSuperAdmin, router]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (!isSuperAdmin) {
        return null; // Don't render anything while redirecting
    }

    // Authorized - show CEO dashboard
    const renderContent = () => {
        switch (currentTab) {
            case 'agents': return <SuperAdminAgentChat />;
            case 'usage': return <UsageTab />;
            case 'ezal': return <EzalTab />;
            case 'insights': return <SuperAdminInsightsTab />;
            case 'playbooks': return <SuperAdminPlaybooksTab />;
            case 'analytics': return <PlatformAnalyticsTab />;
            case 'foot-traffic': return <FootTrafficTab />;
            case 'tickets': return <TicketsTab />;
            case 'ai-agent-embed': return <AIAgentEmbedTab />;
            case 'data-manager': return <DataManagerTab />;
            case 'ai-search': return <AISearchIndexTab />;
            case 'coupons': return <CouponManagerTab />;
            case 'cannmenus': return <CannMenusTestTab />;
            case 'operations': return <OperationsTab />;
            case 'competitor-intel': return <CompetitorIntelTab />;
            case 'crm': return <CRMTab />;
            default: return <SuperAdminPlaybooksTab />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Super Admin Header */}
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <p className="font-display text-xl font-bold text-green-900">Super Admin Mode</p>
                        <p className="text-sm text-green-700">{superAdminEmail}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <DataImportDropdown />
                    <MockDataToggle />
                    <RoleSwitcher />
                    <Button variant="outline" size="sm" onClick={logout}>
                        Logout
                    </Button>
                </div>
            </div>

            {/* CEO Dashboard Content (URL Driven) */}
            <div className="mt-6">
                <ClientOnly fallback={<div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                    {renderContent()}
                </ClientOnly>
            </div>
        </div>
    );
}



