'use client';

// src/app/dashboard/ceo/page.tsx
/**
 * CEO Dashboard - Super Admin Only
 * Protected by super admin check
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataManagerTab from "./components/data-manager-tab";
import AISearchIndexTab from "./components/ai-search-index-tab";
import CouponManagerTab from "./components/coupon-manager-tab";
import AIAgentEmbedTab from "./components/ai-agent-embed-tab";
import CannMenusTestTab from "./components/cannmenus-test-tab";
import PlatformAnalyticsTab from "./components/platform-analytics-tab";
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { Loader2, Shield, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ClientOnly } from '@/components/client-only';
import { RoleSwitcher } from '@/components/debug/role-switcher';
import { MockDataToggle } from '@/components/debug/mock-data-toggle';

export default function CeoDashboardPage() {
    const router = useRouter();
    const { isSuperAdmin, isLoading, superAdminEmail, logout } = useSuperAdmin();

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
    return (
        <div className="space-y-6">
            {/* Super Admin Header */}
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-green-900">Super Admin Mode</p>
                        <p className="text-sm text-green-700">{superAdminEmail}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <MockDataToggle />
                    <RoleSwitcher />
                    <Button variant="outline" size="sm" onClick={logout}>
                        Logout
                    </Button>
                </div>
            </div>

            {/* CEO Dashboard Tabs */}
            <Tabs defaultValue="analytics">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="ai-agent-embed">AI Agent Embed</TabsTrigger>
                    <TabsTrigger value="data-manager">Data Manager</TabsTrigger>
                    <TabsTrigger value="ai-search">AI Search</TabsTrigger>
                    <TabsTrigger value="coupons">Coupons</TabsTrigger>
                    <TabsTrigger value="cannmenus">CannMenus</TabsTrigger>
                </TabsList>
                <div className="mt-6">
                    <ClientOnly fallback={<div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                        <TabsContent value="analytics" className="mt-0">
                            <PlatformAnalyticsTab />
                        </TabsContent>
                        <TabsContent value="ai-agent-embed" className="mt-0">
                            <AIAgentEmbedTab />
                        </TabsContent>
                        <TabsContent value="data-manager" className="mt-0">
                            <DataManagerTab />
                        </TabsContent>
                        <TabsContent value="ai-search" className="mt-0">
                            <AISearchIndexTab />
                        </TabsContent>
                        <TabsContent value="coupons" className="mt-0">
                            <CouponManagerTab />
                        </TabsContent>
                        <TabsContent value="cannmenus" className="mt-0">
                            <CannMenusTestTab />
                        </TabsContent>
                    </ClientOnly>
                </div>
            </Tabs>
        </div>
    );
}

