'use client';

/**
 * Unified Admin Console
 *
 * Consolidates all admin tools into a single page with sub-navigation:
 * - Users: Account management, invitations
 * - Data: Data manager, AI search, knowledge base
 * - Integrations: CannMenus, Coupons, AI Embed
 * - Dev Tools: Agent sandbox, Browser automation
 * - Settings: System settings, Pilot setup
 */

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Users,
    Database,
    Factory,
    Code,
    Settings,
    Loader2,
    Ticket,
    UserPlus,
    Search,
    BookOpen,
    Utensils,
    Tag,
    Bot,
    Chrome,
    Rocket,
} from 'lucide-react';
import { InviteUserDialog } from '@/components/invitations/invite-user-dialog';
import { InvitationsList } from '@/components/invitations/invitations-list';
import { Button } from '@/components/ui/button';

// Lazy load the individual tab components
const TabLoader = () => (
    <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
);

const AccountManagementTab = dynamic(
    () => import('@/components/admin/account-management-tab').then(mod => mod.AccountManagementTab),
    { loading: TabLoader }
);

const TicketsTab = dynamic(
    () => import('./tickets-tab'),
    { loading: TabLoader }
);

const DataManagerTab = dynamic(
    () => import('./data-manager-tab'),
    { loading: TabLoader }
);

const AISearchIndexTab = dynamic(
    () => import('./ai-search-index-tab'),
    { loading: TabLoader }
);

const SystemKnowledgeBase = dynamic(
    () => import('./system-knowledge-base').then(mod => mod.SystemKnowledgeBase),
    { loading: TabLoader, ssr: false }
);

const CannMenusTestTab = dynamic(
    () => import('./cannmenus-test-tab'),
    { loading: TabLoader }
);

const CouponManagerTab = dynamic(
    () => import('./coupon-manager-tab'),
    { loading: TabLoader }
);

const AIAgentEmbedTab = dynamic(
    () => import('./ai-agent-embed-tab'),
    { loading: TabLoader }
);

const AgentSandbox = dynamic(
    () => import('./agent-sandbox').then(mod => mod.AgentSandbox),
    { loading: TabLoader, ssr: false }
);

const BakedBotBrowserTab = dynamic(
    () => import('./bakedbot-browser-tab'),
    { loading: TabLoader, ssr: false }
);

const PilotSetupTab = dynamic(
    () => import('./pilot-setup-tab'),
    { loading: TabLoader, ssr: false }
);

const CeoSettingsTab = dynamic(
    () => import('./ceo-settings-tab'),
    { loading: TabLoader }
);

// Sub-tab types
type AdminSection = 'users' | 'data' | 'integrations' | 'devtools' | 'settings';
type UsersSubTab = 'accounts' | 'invites' | 'tickets';
type DataSubTab = 'manager' | 'search' | 'knowledge';
type IntegrationsSubTab = 'cannmenus' | 'coupons' | 'embed';
type DevToolsSubTab = 'sandbox' | 'browser';
type SettingsSubTab = 'system' | 'pilot';

export default function UnifiedAdminConsole() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Get section from URL or default to 'users'
    const section = (searchParams?.get('section') as AdminSection) || 'users';
    const subTab = searchParams?.get('subtab') || '';

    const [activeSection, setActiveSection] = useState<AdminSection>(section);

    const handleSectionChange = (newSection: string) => {
        setActiveSection(newSection as AdminSection);
        const params = new URLSearchParams();
        params.set('tab', 'admin');
        params.set('section', newSection);
        router.replace(`/dashboard/ceo?${params.toString()}`, { scroll: false });
    };

    const handleSubTabChange = (subtab: string) => {
        const params = new URLSearchParams();
        params.set('tab', 'admin');
        params.set('section', activeSection);
        params.set('subtab', subtab);
        router.replace(`/dashboard/ceo?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
                <p className="text-muted-foreground">
                    System administration, user management, and developer tools
                </p>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeSection} onValueChange={handleSectionChange} className="space-y-4">
                <TabsList className="grid w-full max-w-2xl grid-cols-5">
                    <TabsTrigger value="users" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Users</span>
                    </TabsTrigger>
                    <TabsTrigger value="data" className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span className="hidden sm:inline">Data</span>
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="flex items-center gap-2">
                        <Factory className="h-4 w-4" />
                        <span className="hidden sm:inline">Integrations</span>
                    </TabsTrigger>
                    <TabsTrigger value="devtools" className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        <span className="hidden sm:inline">Dev Tools</span>
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span className="hidden sm:inline">Settings</span>
                    </TabsTrigger>
                </TabsList>

                {/* Users Section */}
                <TabsContent value="users" className="space-y-4">
                    <Tabs defaultValue={subTab || 'accounts'} onValueChange={handleSubTabChange}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="accounts" className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Accounts
                            </TabsTrigger>
                            <TabsTrigger value="invites" className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4" />
                                Invitations
                            </TabsTrigger>
                            <TabsTrigger value="tickets" className="flex items-center gap-2">
                                <Ticket className="h-4 w-4" />
                                Support Tickets
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="accounts">
                            <AccountManagementTab />
                        </TabsContent>
                        <TabsContent value="invites">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Team Invitations</CardTitle>
                                        <CardDescription>
                                            Invite new team members to join BakedBot
                                        </CardDescription>
                                    </div>
                                    <InviteUserDialog
                                        allowedRoles={['super_admin']}
                                        trigger={
                                            <Button>
                                                <UserPlus className="h-4 w-4 mr-2" />
                                                Invite Member
                                            </Button>
                                        }
                                    />
                                </CardHeader>
                                <CardContent>
                                    <InvitationsList allowedRoles={['super_admin']} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="tickets">
                            <TicketsTab />
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                {/* Data Section */}
                <TabsContent value="data" className="space-y-4">
                    <Tabs defaultValue={subTab || 'manager'} onValueChange={handleSubTabChange}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="manager" className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                Data Manager
                            </TabsTrigger>
                            <TabsTrigger value="search" className="flex items-center gap-2">
                                <Search className="h-4 w-4" />
                                AI Search Index
                            </TabsTrigger>
                            <TabsTrigger value="knowledge" className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                Knowledge Base
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="manager">
                            <DataManagerTab />
                        </TabsContent>
                        <TabsContent value="search">
                            <AISearchIndexTab />
                        </TabsContent>
                        <TabsContent value="knowledge">
                            <SystemKnowledgeBase />
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                {/* Integrations Section */}
                <TabsContent value="integrations" className="space-y-4">
                    <Tabs defaultValue={subTab || 'cannmenus'} onValueChange={handleSubTabChange}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="cannmenus" className="flex items-center gap-2">
                                <Utensils className="h-4 w-4" />
                                CannMenus
                            </TabsTrigger>
                            <TabsTrigger value="coupons" className="flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                Coupons
                            </TabsTrigger>
                            <TabsTrigger value="embed" className="flex items-center gap-2">
                                <Code className="h-4 w-4" />
                                AI Embed
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="cannmenus">
                            <CannMenusTestTab />
                        </TabsContent>
                        <TabsContent value="coupons">
                            <CouponManagerTab />
                        </TabsContent>
                        <TabsContent value="embed">
                            <AIAgentEmbedTab />
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                {/* Dev Tools Section */}
                <TabsContent value="devtools" className="space-y-4">
                    <Tabs defaultValue={subTab || 'sandbox'} onValueChange={handleSubTabChange}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="sandbox" className="flex items-center gap-2">
                                <Bot className="h-4 w-4" />
                                Agent Sandbox
                            </TabsTrigger>
                            <TabsTrigger value="browser" className="flex items-center gap-2">
                                <Chrome className="h-4 w-4" />
                                Browser Automation
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="sandbox">
                            <AgentSandbox />
                        </TabsContent>
                        <TabsContent value="browser">
                            <BakedBotBrowserTab />
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                {/* Settings Section */}
                <TabsContent value="settings" className="space-y-4">
                    <Tabs defaultValue={subTab || 'system'} onValueChange={handleSubTabChange}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="system" className="flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                System Settings
                            </TabsTrigger>
                            <TabsTrigger value="pilot" className="flex items-center gap-2">
                                <Rocket className="h-4 w-4" />
                                Pilot Setup
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="system">
                            <CeoSettingsTab />
                        </TabsContent>
                        <TabsContent value="pilot">
                            <PilotSetupTab />
                        </TabsContent>
                    </Tabs>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export { UnifiedAdminConsole };
