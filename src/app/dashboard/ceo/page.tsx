'use client';

import { InvitationsList } from '@/components/invitations/invitations-list';

// src/app/dashboard/ceo/page.tsx
/**
 * CEO Dashboard - Super Admin Only
 * Protected by super admin check
 */

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import nextDynamic from 'next/dynamic';
// SuperUserStatusCounts now consumed inside MissionControlTab

const TabLoader = () => <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

const DataManagerTab = nextDynamic(() => import("./components/data-manager-tab"), { loading: TabLoader, ssr: false });
const AISearchIndexTab = nextDynamic(() => import("./components/ai-search-index-tab"), { loading: TabLoader, ssr: false });
const CouponManagerTab = nextDynamic(() => import("./components/coupon-manager-tab"), { loading: TabLoader, ssr: false });
const AIAgentEmbedTab = nextDynamic(() => import("./components/ai-agent-embed-tab"), { loading: TabLoader, ssr: false });
const CannMenusTestTab = nextDynamic(() => import("./components/cannmenus-test-tab"), { loading: TabLoader, ssr: false });
const TicketsTab = nextDynamic(() => import("./components/tickets-tab"), { loading: TabLoader, ssr: false });
const FootTrafficTab = nextDynamic(() => import("./components/foot-traffic-tab"), { loading: TabLoader, ssr: false });
const SuperAdminAgentChat = nextDynamic(() => import("./components/super-admin-agent-chat"), { loading: TabLoader, ssr: false });
// Canonical Super User playbooks/ops experience lives at /dashboard/ceo/playbooks.
// We render it inside the CEO tab to keep navigation consistent for Super Users.
const SuperUserPlaybooksPage = nextDynamic(() => import("./playbooks/page"), { loading: TabLoader, ssr: false });
const OperationsTab = nextDynamic(() => import("./components/operations-tab"), { loading: TabLoader, ssr: false });
const UnifiedAnalyticsPage = nextDynamic(() => import("./components/unified-analytics-page"), { loading: TabLoader, ssr: false });
const CRMTab = nextDynamic(() => import("./components/crm-tab"), { loading: TabLoader, ssr: false });
const AccountManagementTab = nextDynamic(() => import("@/components/admin/account-management-tab").then(mod => mod.AccountManagementTab), { loading: TabLoader, ssr: false });
const SystemKnowledgeBase = nextDynamic(() => import("./components/system-knowledge-base").then(mod => mod.SystemKnowledgeBase), { loading: TabLoader, ssr: false });
const CeoSettingsTab = nextDynamic(() => import("./components/ceo-settings-tab"), { loading: TabLoader, ssr: false });
const GLMSettingsTab = nextDynamic(() => import("./components/glm-settings-tab"), { loading: TabLoader, ssr: false });
const AgentSandbox = nextDynamic(() => import("./components/agent-sandbox").then(mod => mod.AgentSandbox), { loading: TabLoader, ssr: false });
const EmailTesterTab = nextDynamic(() => import("./components/email-tester-tab"), { loading: TabLoader, ssr: false });
const MissionControlTab = nextDynamic(() => import("./components/mission-control-tab"), { loading: TabLoader, ssr: false });
const BoardroomTab = nextDynamic(() => import("./components/boardroom-tab"), { loading: TabLoader, ssr: false });
const CodeEvalsTab = nextDynamic(() => import("./components/code-evals-tab"), { loading: TabLoader, ssr: false });
const DevConsoleTab = nextDynamic(() => import("./components/dev-console-tab").then(mod => mod.DevConsoleTab), { loading: TabLoader, ssr: false });
const TalkTracksTab = nextDynamic(() => import("./components/talk-tracks-tab"), { loading: TabLoader, ssr: false });
const BakedBotBrowserTab = nextDynamic(() => import("./components/bakedbot-browser-tab"), { loading: TabLoader, ssr: false });
const PilotSetupTab = nextDynamic(() => import("./components/pilot-setup-tab"), { loading: TabLoader, ssr: false });
const GroundTruthTab = nextDynamic(() => import("./components/ground-truth-tab"), { loading: TabLoader, ssr: false });
const UnifiedAdminConsole = nextDynamic(() => import("./components/unified-admin-console"), { loading: TabLoader, ssr: false });
const LeadsTab = nextDynamic(() => import("./components/leads-tab"), { loading: TabLoader, ssr: false });
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
import { Loader2, Shield } from 'lucide-react';
import { ClientOnly } from '@/components/client-only';
import { RoleSwitcher } from '@/components/debug/role-switcher';
import { MockDataToggle } from '@/components/debug/mock-data-toggle';
import { DataImportDropdown } from '@/components/dashboard/data-import-dropdown';

import { logger } from '@/lib/logger';
import { useAgentChatStore, type ChatMessage, type ChatSession } from '@/lib/store/agent-chat-store';
import type { Artifact } from '@/types/artifact';

type SerializedArtifact = Omit<Artifact, 'createdAt' | 'updatedAt'> & {
    createdAt?: string | number | Date;
    updatedAt?: string | number | Date;
};

type SerializedChatMessage = Omit<ChatMessage, 'timestamp' | 'artifacts'> & {
    timestamp: string | number | Date;
    artifacts?: SerializedArtifact[];
};

type SerializedChatSession = Omit<ChatSession, 'timestamp' | 'messages' | 'artifacts'> & {
    timestamp: string | number | Date;
    messages?: SerializedChatMessage[];
    artifacts?: SerializedArtifact[];
};

const CHAT_HYDRATION_TABS = new Set(['agents', 'boardroom', 'playbooks', 'dev-console']);

function hydrateArtifactDates(artifact: SerializedArtifact): Artifact {
    return {
        ...artifact,
        createdAt: artifact?.createdAt ? new Date(artifact.createdAt) : new Date(),
        updatedAt: artifact?.updatedAt ? new Date(artifact.updatedAt) : new Date(),
    };
}

function hydrateChatMessage(message: SerializedChatMessage): ChatMessage {
    return {
        ...message,
        timestamp: new Date(message.timestamp),
        artifacts: Array.isArray(message.artifacts)
            ? message.artifacts.map(hydrateArtifactDates)
            : [],
    };
}

function hydrateChatSession(session: SerializedChatSession): ChatSession {
    return {
        ...session,
        timestamp: new Date(session.timestamp),
        messages: Array.isArray(session.messages)
            ? session.messages.map(hydrateChatMessage)
            : [],
        artifacts: Array.isArray(session.artifacts)
            ? session.artifacts.map(hydrateArtifactDates)
            : [],
    };
}

function CeoDashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: isAuthLoading, isSuperUser } = useUserRole();
    const { clearCurrentSession } = useAgentChatStore();

    // Status counts moved to MissionControlTab (Principle 3: status-forward landing)

    // Server-side layout already enforces `requireSuperUser()`, but we keep
    // a client-side guard to handle expired sessions / client-only navigation.
    const canAccessCeo = Boolean(isSuperUser || isSuperAdminEmail(user?.email));
    const userUid = user?.uid ?? null;
    const hydratedSessionsUserRef = useRef<string | null>(null);
    // statusCountsUserRef removed — status loading is in MissionControlTab
    const clearedDashboardSessionRef = useRef(false);

    // Sync tabs with URL ?tab=...
    const currentTab = searchParams?.get('tab') || 'home'; // Default to Mission Control

    useEffect(() => {
        if (!canAccessCeo) {
            clearedDashboardSessionRef.current = false;
            return;
        }

        if (!clearedDashboardSessionRef.current) {
            clearCurrentSession();
            clearedDashboardSessionRef.current = true;
        }
    }, [canAccessCeo, clearCurrentSession]);

    useEffect(() => {
        if (!canAccessCeo || !userUid) {
            hydratedSessionsUserRef.current = null;
            return;
        }

        if (!CHAT_HYDRATION_TABS.has(currentTab)) {
            return;
        }

        if (hydratedSessionsUserRef.current === userUid) {
            return;
        }

        hydratedSessionsUserRef.current = userUid;

        import('@/server/actions/chat-persistence').then(({ getChatSessions }) => {
            getChatSessions(userUid).then(result => {
                if (!result.success) {
                    hydratedSessionsUserRef.current = null;
                    void logger.error("Failed to hydrate sessions (client)", { error: result.error || 'Unknown error' });
                    return;
                }

                if (Array.isArray(result.sessions)) {
                    useAgentChatStore.getState().hydrateSessions(result.sessions.map(hydrateChatSession));
                }
            }).catch(err => {
                hydratedSessionsUserRef.current = null;
                void logger.error("Failed to hydrate sessions (client)", { error: String(err) });
            });
        }).catch(err => {
            hydratedSessionsUserRef.current = null;
            void logger.error("Failed to load chat persistence actions", { error: String(err) });
        });
    }, [canAccessCeo, currentTab, userUid]);

    // Status counts loading moved to MissionControlTab

    // Dead code removed — status counts + session hydration handled above and in MissionControlTab



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
            case 'home': return <MissionControlTab />;
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
            default: return <MissionControlTab />;
        }
    };

    return (
        <div className="space-y-4">
            {/* Minimal Super User Header — Principle 2: sidebar is the nav, not this */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                        <Shield className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Super User</p>
                        <p className="text-[11px] text-muted-foreground">{user?.email || 'Authenticated'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DataImportDropdown />
                    {process.env.NODE_ENV !== 'production' && <MockDataToggle />}
                    {process.env.NODE_ENV !== 'production' && <RoleSwitcher />}
                </div>
            </div>

            {/* CEO Dashboard Content (URL Driven) */}
            <div>
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
