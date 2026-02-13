'use client';
import { InvitationsList } from '@/components/invitations/invitations-list';

// src/app/dashboard/ceo/page.tsx
/**
 * CEO Dashboard - Super Admin Only
 * Protected by super admin check
 */

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getChatSessions } from '@/server/actions/chat-persistence'; // Added for global hydration

const TabLoader = () => <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

const DataManagerTab = dynamic(() => import("./components/data-manager-tab"), { loading: TabLoader });
const AISearchIndexTab = dynamic(() => import("./components/ai-search-index-tab"), { loading: TabLoader });
const CouponManagerTab = dynamic(() => import("./components/coupon-manager-tab"), { loading: TabLoader });
const AIAgentEmbedTab = dynamic(() => import("./components/ai-agent-embed-tab"), { loading: TabLoader });
const CannMenusTestTab = dynamic(() => import("./components/cannmenus-test-tab"), { loading: TabLoader });
const TicketsTab = dynamic(() => import("./components/tickets-tab"), { loading: TabLoader });
const FootTrafficTab = dynamic(() => import("./components/foot-traffic-tab"), { loading: TabLoader });
const SuperAdminAgentChat = dynamic(() => import("./components/super-admin-agent-chat"), { loading: TabLoader, ssr: false });
// Canonical Super User playbooks/ops experience lives at /dashboard/ceo/playbooks.
// We render it inside the CEO tab to keep navigation consistent for Super Users.
const SuperUserPlaybooksPage = dynamic(() => import("./playbooks/page"), { loading: TabLoader, ssr: false });
const OperationsTab = dynamic(() => import("./components/operations-tab"), { loading: TabLoader });
const UnifiedAnalyticsPage = dynamic(() => import("./components/unified-analytics-page"), { loading: TabLoader });
const CRMTab = dynamic(() => import("./components/crm-tab"), { loading: TabLoader });
const AccountManagementTab = dynamic(() => import("@/components/admin/account-management-tab").then(mod => mod.AccountManagementTab), { loading: TabLoader });
const SystemKnowledgeBase = dynamic(() => import("./components/system-knowledge-base").then(mod => mod.SystemKnowledgeBase), { loading: TabLoader, ssr: false });
const CeoSettingsTab = dynamic(() => import("./components/ceo-settings-tab"), { loading: TabLoader });
const AgentSandbox = dynamic(() => import("./components/agent-sandbox").then(mod => mod.AgentSandbox), { loading: TabLoader, ssr: false });
const EmailTesterTab = dynamic(() => import("./components/email-tester-tab"), { loading: TabLoader });
const BoardroomTab = dynamic(() => import("./components/boardroom-tab"), { loading: TabLoader, ssr: false });
const CodeEvalsTab = dynamic(() => import("./components/code-evals-tab"), { loading: TabLoader, ssr: false });
const TalkTracksTab = dynamic(() => import("./components/talk-tracks-tab"), { loading: TabLoader, ssr: false });
const BakedBotBrowserTab = dynamic(() => import("./components/bakedbot-browser-tab"), { loading: TabLoader, ssr: false });
const PilotSetupTab = dynamic(() => import("./components/pilot-setup-tab"), { loading: TabLoader, ssr: false });
const GroundTruthTab = dynamic(() => import("./components/ground-truth-tab"), { loading: TabLoader, ssr: false });
const UnifiedAdminConsole = dynamic(() => import("./components/unified-admin-console"), { loading: TabLoader, ssr: false });
const LeadsTab = dynamic(() => import("./components/leads-tab"), { loading: TabLoader });
const WhatsAppTab = dynamic(() => import("./components/whatsapp-tab"), { loading: TabLoader, ssr: false });
const DriveTab = dynamic(() => import("./components/drive-tab"), { loading: TabLoader, ssr: false });
const CostsTab = dynamic(() => import("./components/costs-tab"), { loading: TabLoader, ssr: false });
const SystemHealthTab = dynamic(() => import("./components/system-health-tab"), { loading: TabLoader, ssr: false });


import { useUserRole } from '@/hooks/use-user-role';
import { isSuperAdminEmail } from '@/lib/super-admin-config';
import { Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ClientOnly } from '@/components/client-only';
import { RoleSwitcher } from '@/components/debug/role-switcher';
import { MockDataToggle } from '@/components/debug/mock-data-toggle';
import { DataImportDropdown } from '@/components/dashboard/data-import-dropdown';

import { useAgentChatStore } from '@/lib/store/agent-chat-store';

function CeoDashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { user, isLoading: isAuthLoading, isSuperUser } = useUserRole();
    const { clearCurrentSession } = useAgentChatStore();

    // Server-side layout already enforces `requireSuperUser()`, but we keep
    // a client-side guard to handle expired sessions / client-only navigation.
    const canAccessCeo = Boolean(isSuperUser || isSuperAdminEmail(user?.email));

    // Sync tabs with URL ?tab=...
    const currentTab = searchParams?.get('tab') || 'boardroom'; // Default to Boardroom

    // Clear chat session on mount to prevent leakage from public/customer context
    useEffect(() => {
        if (canAccessCeo) {
            clearCurrentSession();
            // Hydrate sessions globally on dashboard load
            if (user?.uid) {
                getChatSessions(user.uid).then(result => {
                    if (result.success && Array.isArray(result.sessions)) {
                        // Revive dates from ISO strings
                        const hydratedSessions = result.sessions.map((s: any) => ({
                            ...s,
                            timestamp: new Date(s.timestamp),
                            messages: Array.isArray(s.messages) ? s.messages.map((m: any) => ({
                                ...m,
                                timestamp: new Date(m.timestamp)
                            })) : []
                        }));
                        // Update store with loaded sessions
                        useAgentChatStore.getState().hydrateSessions(hydratedSessions);
                    }
                }).catch(err => {
                    console.error("Failed to hydrate sessions (client):", err);
                });
            }
        }
    }, [canAccessCeo, clearCurrentSession, user]);



    // Not authorized - redirect to login
    useEffect(() => {
        if (!isAuthLoading && !canAccessCeo) {
            router.push('/super-admin');
        }
    }, [isAuthLoading, canAccessCeo, router]);

    // Redirect legacy tabs to unified pages
    useEffect(() => {
        const legacyAnalyticsTabs: Record<string, string> = {
            'usage': 'sub=usage',
            'insights': 'sub=intelligence&intel=insights',
            'ezal': 'sub=intelligence&intel=ezal',
            'competitor-intel': 'sub=intelligence&intel=competitor',
            'research': 'sub=intelligence&intel=research',
        };
        const legacyAdminTabs: Record<string, string> = {
            'account-management': 'section=users&subtab=accounts',
            'invites': 'section=users&subtab=invites',
            'tickets': 'section=users&subtab=tickets',
            'data-manager': 'section=data&subtab=manager',
            'ai-search': 'section=data&subtab=search',
            'knowledge-base': 'section=data&subtab=knowledge',
            'cannmenus': 'section=integrations&subtab=cannmenus',
            'coupons': 'section=integrations&subtab=coupons',
            'ai-agent-embed': 'section=integrations&subtab=embed',
            'sandbox': 'section=devtools&subtab=sandbox',
            'browser': 'section=devtools&subtab=browser',
            'settings': 'section=settings&subtab=system',
            'pilot-setup': 'section=settings&subtab=pilot',
        };
        if (currentTab && legacyAnalyticsTabs[currentTab]) {
            router.replace(`/dashboard/ceo?tab=analytics&${legacyAnalyticsTabs[currentTab]}`);
        } else if (currentTab && legacyAdminTabs[currentTab]) {
            router.replace(`/dashboard/ceo?tab=admin&${legacyAdminTabs[currentTab]}`);
        }
    }, [currentTab, router]);

    // Loading state
    if (isAuthLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (!canAccessCeo) {
        return null; // Don't render anything while redirecting
    }

    // Authorized - show CEO dashboard
    const renderContent = () => {
        switch (currentTab) {
            case 'agents': return <SuperAdminAgentChat />;
            // Unified Analytics (consolidated from analytics, usage, insights, ezal, competitor-intel, research)
            case 'analytics':
            case 'usage':
            case 'insights':
            case 'ezal':
            case 'competitor-intel':
            case 'research':
                return <UnifiedAnalyticsPage />;
            // Unified Admin Console (consolidated admin tools)
            case 'admin':
            case 'account-management':
            case 'invites':
            case 'tickets':
            case 'data-manager':
            case 'ai-search':
            case 'knowledge-base':
            case 'cannmenus':
            case 'coupons':
            case 'ai-agent-embed':
            case 'sandbox':
            case 'browser':
            case 'settings':
            case 'pilot-setup':
                return <UnifiedAdminConsole />;
            case 'playbooks': return <SuperUserPlaybooksPage />;
            case 'foot-traffic': return <FootTrafficTab />;
            case 'operations': return <OperationsTab />;
            case 'crm': return <CRMTab />;
            case 'email': return <EmailTesterTab />;
            case 'boardroom': return <BoardroomTab />;
            case 'code-evals': return <CodeEvalsTab />;
            case 'talk-tracks': return <TalkTracksTab />;
            case 'ground-truth': return <GroundTruthTab />;
            case 'leads': return <LeadsTab />;
            case 'whatsapp': return <WhatsAppTab />;
            case 'drive': return <DriveTab />;
            case 'costs': return <CostsTab />;
            case 'health': return <SystemHealthTab />;
            default: return <SuperUserPlaybooksPage />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Super Admin Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <p className="font-display text-xl font-bold text-green-900">Super User Mode</p>
                        <p className="text-sm text-green-700">{user?.email || 'Authenticated'}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                    <Link href="?tab=email">
                        <Button variant="ghost" size="sm" className="w-full sm:w-auto">Email Tester</Button>
                    </Link>
                    <DataImportDropdown />
                    {process.env.NODE_ENV !== 'production' && <MockDataToggle />}
                    {process.env.NODE_ENV !== 'production' && <RoleSwitcher />}
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

// Wrap with Suspense to fix React #300 hydration error caused by useSearchParams
export default function CeoDashboardPage() {
    return (
        <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <CeoDashboardContent />
        </Suspense>
    );
}
