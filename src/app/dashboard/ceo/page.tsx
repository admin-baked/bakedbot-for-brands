'use client';

import { InvitationsList } from '@/components/invitations/invitations-list';

// src/app/dashboard/ceo/page.tsx
/**
 * CEO Dashboard - Super Admin Only
 * Protected by super admin check
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import type { SuperUserStatusCounts } from '@/server/actions/ny-outreach-dashboard';

const TabLoader = () => <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

const DataManagerTab = nextDynamic(() => import("./components/data-manager-tab"), { loading: TabLoader });
const AISearchIndexTab = nextDynamic(() => import("./components/ai-search-index-tab"), { loading: TabLoader });
const CouponManagerTab = nextDynamic(() => import("./components/coupon-manager-tab"), { loading: TabLoader });
const AIAgentEmbedTab = nextDynamic(() => import("./components/ai-agent-embed-tab"), { loading: TabLoader });
const CannMenusTestTab = nextDynamic(() => import("./components/cannmenus-test-tab"), { loading: TabLoader });
const TicketsTab = nextDynamic(() => import("./components/tickets-tab"), { loading: TabLoader });
const FootTrafficTab = nextDynamic(() => import("./components/foot-traffic-tab"), { loading: TabLoader });
const SuperAdminAgentChat = nextDynamic(() => import("./components/super-admin-agent-chat"), { loading: TabLoader, ssr: false });
// Canonical Super User playbooks/ops experience lives at /dashboard/ceo/playbooks.
// We render it inside the CEO tab to keep navigation consistent for Super Users.
const SuperUserPlaybooksPage = nextDynamic(() => import("./playbooks/page"), { loading: TabLoader, ssr: false });
const OperationsTab = nextDynamic(() => import("./components/operations-tab"), { loading: TabLoader });
const UnifiedAnalyticsPage = nextDynamic(() => import("./components/unified-analytics-page"), { loading: TabLoader });
const CRMTab = nextDynamic(() => import("./components/crm-tab"), { loading: TabLoader, ssr: false });
const AccountManagementTab = nextDynamic(() => import("@/components/admin/account-management-tab").then(mod => mod.AccountManagementTab), { loading: TabLoader });
const SystemKnowledgeBase = nextDynamic(() => import("./components/system-knowledge-base").then(mod => mod.SystemKnowledgeBase), { loading: TabLoader, ssr: false });
const CeoSettingsTab = nextDynamic(() => import("./components/ceo-settings-tab"), { loading: TabLoader });
const GLMSettingsTab = nextDynamic(() => import("./components/glm-settings-tab"), { loading: TabLoader });
const AgentSandbox = nextDynamic(() => import("./components/agent-sandbox").then(mod => mod.AgentSandbox), { loading: TabLoader, ssr: false });
const EmailTesterTab = nextDynamic(() => import("./components/email-tester-tab"), { loading: TabLoader });
const BoardroomTab = nextDynamic(() => import("./components/boardroom-tab"), { loading: TabLoader, ssr: false });
const CodeEvalsTab = nextDynamic(() => import("./components/code-evals-tab"), { loading: TabLoader, ssr: false });
const DevConsoleTab = nextDynamic(() => import("./components/dev-console-tab").then(mod => mod.DevConsoleTab), { loading: TabLoader, ssr: false });
const TalkTracksTab = nextDynamic(() => import("./components/talk-tracks-tab"), { loading: TabLoader, ssr: false });
const BakedBotBrowserTab = nextDynamic(() => import("./components/bakedbot-browser-tab"), { loading: TabLoader, ssr: false });
const PilotSetupTab = nextDynamic(() => import("./components/pilot-setup-tab"), { loading: TabLoader, ssr: false });
const GroundTruthTab = nextDynamic(() => import("./components/ground-truth-tab"), { loading: TabLoader, ssr: false });
const UnifiedAdminConsole = nextDynamic(() => import("./components/unified-admin-console"), { loading: TabLoader, ssr: false });
const LeadsTab = nextDynamic(() => import("./components/leads-tab"), { loading: TabLoader });
const WhatsAppTab = nextDynamic(() => import("./components/whatsapp-tab"), { loading: TabLoader, ssr: false });
const DriveTab = nextDynamic(() => import("./components/drive-tab"), { loading: TabLoader, ssr: false });
const CostsTab = nextDynamic(() => import("./components/costs-tab"), { loading: TabLoader, ssr: false });
const AIEconomicsTab = nextDynamic(() => import("./components/ai-economics-tab"), { loading: TabLoader, ssr: false });
const SystemHealthTab = nextDynamic(() => import("./components/system-health-tab"), { loading: TabLoader, ssr: false });
const GoalsCeoTab = nextDynamic(() => import("./components/goals-ceo-tab"), { loading: TabLoader, ssr: false });
const QATab = nextDynamic(() => import("./components/qa-tab"), { loading: TabLoader, ssr: false });
const CalendarTab = nextDynamic(() => import("./components/calendar-tab"), { loading: TabLoader, ssr: false });
const NYPilotTab = nextDynamic(() => import("./components/ny-pilot-tab"), { loading: TabLoader, ssr: false });
const OutreachTab = nextDynamic(() => import("./components/outreach-tab"), { loading: TabLoader, ssr: false });
const ContentCeoTab = nextDynamic(() => import("./components/content-tab"), { loading: TabLoader, ssr: false });
const SkillOptimizationTab = nextDynamic(() => import("./components/skill-optimization-tab"), { loading: TabLoader, ssr: false });


import { useUserRole } from '@/hooks/use-user-role';
import { isSuperAdminEmail } from '@/lib/super-admin-config';
import { Loader2, Shield, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';
import { ClientOnly } from '@/components/client-only';
import { RoleSwitcher } from '@/components/debug/role-switcher';
import { MockDataToggle } from '@/components/debug/mock-data-toggle';
import { DataImportDropdown } from '@/components/dashboard/data-import-dropdown';

import { useAgentChatStore } from '@/lib/store/agent-chat-store';

function CeoDashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: isAuthLoading, isSuperUser } = useUserRole();
    const { clearCurrentSession } = useAgentChatStore();

    // Proactive status counts for the dashboard banner
    const [statusCounts, setStatusCounts] = useState<SuperUserStatusCounts | null>(null);

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
                import('@/server/actions/chat-persistence').then(({ getChatSessions }) => {
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
                }).catch(err => {
                    console.error("Failed to load chat persistence actions:", err);
                });

                // Load proactive status counts (non-blocking — banner appears after auth)
                import('@/server/actions/ny-outreach-dashboard').then(({ getSuperUserStatusCounts }) => {
                    getSuperUserStatusCounts().then(result => {
                        if (result.success && result.counts) {
                            setStatusCounts(result.counts);
                        }
                    }).catch(() => { /* non-critical — banner just stays hidden */ });
                }).catch(() => { /* non-critical — banner just stays hidden */ });
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

    // Proactive status chip row — shown only when there are items needing attention
    const hasStatusItems = statusCounts && (
        statusCounts.pendingOutreachDrafts > 0 ||
        statusCounts.pendingBlogDrafts > 0 ||
        statusCounts.unenrichedLeads > 0 ||
        statusCounts.apolloCreditsRemaining < 25
    );

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
            case 'dev-console': return <DevConsoleTab />;
            case 'ground-truth': return <GroundTruthTab />;
            case 'leads': return <LeadsTab />;
            case 'whatsapp': return <WhatsAppTab />;
            case 'drive': return <DriveTab />;
            case 'costs': return <CostsTab />;
            case 'ai-economics': return <AIEconomicsTab />;
            case 'health': return <SystemHealthTab />;
            case 'goals': return <GoalsCeoTab />;
            case 'qa': return <QATab />;
            case 'calendar': return <CalendarTab />;
            case 'ny-pilot': return <NYPilotTab />;
            case 'outreach': return <OutreachTab />;
            case 'content': return <ContentCeoTab />;
            case 'skills-lab': return <SkillOptimizationTab />;
            case 'ai-settings': return <GLMSettingsTab />;
            default: return <SuperUserPlaybooksPage />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Super Admin Header */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                            <Shield className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="font-display text-xl font-bold text-green-900">Super User Mode</p>
                            <p className="text-sm text-green-700">{user?.email || 'Authenticated'}</p>
                        </div>
                    </div>
                {/* Mobile: compact Sheet trigger */}
                <div className="flex sm:hidden items-center gap-2">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 border-green-300 text-green-800 hover:bg-green-100">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                                Tools
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="max-h-[55dvh] overflow-y-auto rounded-t-2xl">
                            <SheetHeader className="mb-3">
                                <SheetTitle className="text-base">Super User Tools</SheetTitle>
                            </SheetHeader>
                            <div className="grid grid-cols-2 gap-2 pb-6">
                                <Link href="?tab=dev-console"><Button variant="outline" size="sm" className="w-full justify-start">Dev Console</Button></Link>
                                <Link href="?tab=health"><Button variant="outline" size="sm" className="w-full justify-start">System Health</Button></Link>
                                <Link href="?tab=email"><Button variant="outline" size="sm" className="w-full justify-start">Email Tester</Button></Link>
                                <Link href="?tab=qa"><Button variant="outline" size="sm" className="w-full justify-start">QA</Button></Link>
                                <Link href="?tab=calendar"><Button variant="outline" size="sm" className="w-full justify-start">📅 Calendar</Button></Link>
                                <Link href="?tab=ny-pilot"><Button variant="outline" size="sm" className="w-full justify-start">NY Pilot</Button></Link>
                                <Link href="?tab=outreach"><Button variant="outline" size="sm" className="w-full justify-start">Outreach</Button></Link>
                                <Link href="?tab=ai-settings"><Button variant="outline" size="sm" className="w-full justify-start">AI Settings</Button></Link>
                                <Link href="?tab=content"><Button variant="outline" size="sm" className="w-full justify-start">📝 Content</Button></Link>
                                <Link href="?tab=skills-lab"><Button variant="outline" size="sm" className="w-full justify-start">🧪 Skills Lab</Button></Link>
                            </div>
                        </SheetContent>
                    </Sheet>
                    {process.env.NODE_ENV !== 'production' && <MockDataToggle />}
                    {process.env.NODE_ENV !== 'production' && <RoleSwitcher />}
                </div>

                {/* Desktop: full button row (sm+) */}
                <div className="hidden sm:flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                    <Link href="?tab=dev-console">
                        <Button variant="ghost" size="sm">Dev Console</Button>
                    </Link>
                    <Link href="?tab=health">
                        <Button variant="ghost" size="sm">System Health</Button>
                    </Link>
                    <Link href="?tab=email">
                        <Button variant="ghost" size="sm">Email Tester</Button>
                    </Link>
                    <Link href="?tab=qa">
                        <Button variant="ghost" size="sm">QA</Button>
                    </Link>
                    <Link href="?tab=calendar">
                        <Button variant="ghost" size="sm">📅 Calendar</Button>
                    </Link>
                    <Link href="?tab=ny-pilot">
                        <Button variant="ghost" size="sm">NY Pilot</Button>
                    </Link>
                    <Link href="?tab=outreach">
                        <Button variant="ghost" size="sm">Outreach</Button>
                    </Link>
                    <Link href="?tab=ai-settings">
                        <Button variant="ghost" size="sm">AI Settings</Button>
                    </Link>
                    <Link href="?tab=content">
                        <Button variant="ghost" size="sm">📝 Content</Button>
                    </Link>
                    <Link href="?tab=skills-lab">
                        <Button variant="ghost" size="sm">🧪 Skills Lab</Button>
                    </Link>
                    <DataImportDropdown />
                    {process.env.NODE_ENV !== 'production' && <MockDataToggle />}
                    {process.env.NODE_ENV !== 'production' && <RoleSwitcher />}
                </div>
                </div>{/* end inner flex row */}

                {/* Proactive Status Banner — loads async after auth, shows items needing attention */}
                {hasStatusItems && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-green-200">
                        <span className="text-xs font-medium text-green-700">Ready for you:</span>
                        {statusCounts!.pendingOutreachDrafts > 0 && (
                            <Link href="?tab=outreach" className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors">
                                ✉ {statusCounts!.pendingOutreachDrafts} outreach draft{statusCounts!.pendingOutreachDrafts !== 1 ? 's' : ''} to review
                            </Link>
                        )}
                        {statusCounts!.pendingBlogDrafts > 0 && (
                            <Link href="?tab=content" className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors">
                                📝 {statusCounts!.pendingBlogDrafts} blog draft{statusCounts!.pendingBlogDrafts !== 1 ? 's' : ''} ready
                            </Link>
                        )}
                        {statusCounts!.unenrichedLeads > 0 && (
                            <Link href="?tab=outreach" className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 transition-colors">
                                🔍 {statusCounts!.unenrichedLeads} leads need enrichment
                            </Link>
                        )}
                        {statusCounts!.leadQueueDepth > 0 && (
                            <Link href="?tab=outreach" className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition-colors">
                                ✅ {statusCounts!.leadQueueDepth} leads queued
                            </Link>
                        )}
                        {statusCounts!.apolloCreditsRemaining < 25 && (
                            <Link href="?tab=outreach" className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 transition-colors">
                                ⚡ {statusCounts!.apolloCreditsRemaining} Apollo credits left
                            </Link>
                        )}
                    </div>
                )}
            </div>{/* end outer header */}

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
