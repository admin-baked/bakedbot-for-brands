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
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { Loader2, Shield, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function CeoDashboardPage() {
    const router = useRouter();
    const { isSuperAdmin, isLoading, superAdminEmail, logout } = useSuperAdmin();

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

    // Not authorized - redirect to login
    useEffect(() => {
        if (!isLoading && !isSuperAdmin) {
            router.push('/super-admin');
        }
    }, [isLoading, isSuperAdmin, router]);

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
                <Button variant="outline" size="sm" onClick={logout}>
                    Logout
                </Button>
            </div>

            {/* CEO Dashboard Tabs */}
            <Tabs defaultValue="ai-agent-embed">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="ai-agent-embed">AI Agent Embed</TabsTrigger>
                    <TabsTrigger value="data-manager">Data Manager</TabsTrigger>
                    <TabsTrigger value="ai-search">AI Search Index</TabsTrigger>
                    <TabsTrigger value="coupons">Coupon Manager</TabsTrigger>
                    <TabsTrigger value="cannmenus">CannMenus Test</TabsTrigger>
                </TabsList>
                <TabsContent value="ai-agent-embed" className="mt-6">
                    <AIAgentEmbedTab />
                </TabsContent>
                <TabsContent value="data-manager" className="mt-6">
                    <DataManagerTab />
                </TabsContent>
                <TabsContent value="ai-search" className="mt-6">
                    <AISearchIndexTab />
                </TabsContent>
                <TabsContent value="coupons" className="mt-6">
                    <CouponManagerTab />
                </TabsContent>
                <TabsContent value="cannmenus" className="mt-6">
                    <CannMenusTestTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
