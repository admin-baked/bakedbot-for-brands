'use client';

/**
 * Super Admin Sidebar — Frequency-Based Hierarchy
 *
 * Design Philosophy Principle 1: Surface things by how often they're used.
 * Principle 2: One path to every feature — sidebar is the single source of truth.
 *
 * Groups:
 *   Daily      — Home, Inbox, Boardroom, Outreach, Calendar, Creative
 *   Manage     — CRM, Agents, Playbooks, Content, Analytics
 *   Admin      — Users, Integrations, Settings, Data (collapsed)
 *   Dev Tools  — Sandbox, QA, Health, Dev Console (collapsed)
 */

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
    Bot,
    Briefcase,
    LayoutDashboard,
    BarChart3,
    Activity,
    Users,
    Factory,
    BookOpen,
    BookMarked,
    MessageSquarePlus,
    History,
    Trash2,
    ChevronRight,
    Settings,
    Globe,
    CalendarDays,
    Wallet,
    FolderKanban,
    Compass,
    Chrome,
    Rocket,
    Inbox,
    GraduationCap,
    Plug,
    HardDrive,
    Palette,
    DollarSign,
    Sparkles,
    Home,
    Search,
    Code,
    Database,
    Youtube,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InviteUserDialog } from "@/components/dashboard/admin/invite-user-dialog";

export function SuperAdminSidebar() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const currentTabParam = searchParams?.get("tab");
    const { toast } = useToast();
    const { sessions, activeSessionId, clearCurrentSession, setActiveSession } = useAgentChatStore();

    const isTab = (tab: string): boolean => {
        if (tab === 'home') {
            return (!currentTabParam && pathname === '/dashboard/ceo') || currentTabParam === 'home';
        }
        if (tab === 'agents') {
            return pathname?.startsWith('/dashboard/ceo/agents') || currentTabParam === 'agents';
        }
        if (tab === 'projects') {
            return pathname?.startsWith('/dashboard/ceo/projects') || currentTabParam === 'projects';
        }
        if (tab === 'treasury') {
            return pathname?.startsWith('/dashboard/ceo/treasury') || currentTabParam === 'treasury';
        }
        if (tab === 'admin') {
            const legacyAdminTabs = ['account-management', 'invites', 'tickets', 'data-manager', 'ai-search',
                'knowledge-base', 'cannmenus', 'coupons', 'ai-agent-embed', 'sandbox', 'browser', 'settings', 'pilot-setup'];
            return currentTabParam === 'admin' || Boolean(currentTabParam && legacyAdminTabs.includes(currentTabParam));
        }
        return currentTabParam === tab;
    };

    const isAdminSection = (section: string): boolean => {
        return isTab('admin') && searchParams?.get('section') === section;
    };

    return (
        <>
            {/* ── Daily: things you use every session ── */}
            <SidebarGroup>
                <SidebarGroupLabel>Daily</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isTab("home")}>
                                <Link href="/dashboard/ceo">
                                    <Home />
                                    <span>Mission Control</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname?.startsWith('/dashboard/inbox')}>
                                <Link href="/dashboard/inbox">
                                    <Inbox />
                                    <span>Inbox</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isTab("boardroom")}>
                                <Link href="/dashboard/ceo?tab=boardroom">
                                    <LayoutDashboard />
                                    <span>Boardroom</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isTab("outreach")}>
                                <Link href="/dashboard/ceo?tab=outreach">
                                    <Rocket />
                                    <span>Outreach</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isTab("calendar")}>
                                <Link href="/dashboard/ceo?tab=calendar">
                                    <CalendarDays />
                                    <span>Calendar</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname?.startsWith('/dashboard/creative')}>
                                <Link href="/dashboard/creative">
                                    <Palette />
                                    <span>Creative Center</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* ── Manage: weekly operational tools ── */}
            <SidebarGroup>
                <SidebarGroupLabel>Manage</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isTab("agents")}>
                                <Link href="/dashboard/ceo?tab=agents">
                                    <Bot />
                                    <span>Agents</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isTab("crm")}>
                                <Link href="/dashboard/ceo?tab=crm">
                                    <Users />
                                    <span>CRM</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isTab("playbooks")}>
                                <Link href="/dashboard/ceo?tab=playbooks">
                                    <Briefcase />
                                    <span>Playbooks</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isTab("analytics") || isTab("usage") || isTab("insights")}>
                                <Link href="/dashboard/ceo?tab=analytics">
                                    <BarChart3 />
                                    <span>Analytics</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={
                                    isTab("ezal") ||
                                    isTab("competitor-intel") ||
                                    isTab("research") ||
                                    (currentTabParam === 'analytics' && searchParams?.get('sub') === 'intelligence')
                                }
                            >
                                <Link href="/dashboard/ceo?tab=analytics&sub=intelligence&intel=insights">
                                    <Search />
                                    <span>Intel & Research</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isTab("projects")}>
                                <Link href="/dashboard/ceo/projects">
                                    <FolderKanban />
                                    <span>Projects</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isTab("treasury")}>
                                <Link href="/dashboard/ceo/treasury">
                                    <Wallet />
                                    <span>Treasury</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* ── Content: publishing & brand ── */}
            <SidebarGroup>
                <SidebarGroupLabel>Content</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isTab("content")}>
                                <Link href="/dashboard/ceo?tab=content">
                                    <Sparkles />
                                    <span>Content Hub</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname?.startsWith('/dashboard/blog') && !pathname?.startsWith('/dashboard/blog/calendar')}>
                                <Link href="/dashboard/blog">
                                    <BookOpen />
                                    <span>Blog</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname?.startsWith('/dashboard/blog/calendar')}>
                                <Link href="/dashboard/blog/calendar">
                                    <CalendarDays />
                                    <span>Content Calendar</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname?.startsWith('/dashboard/settings/brand-guide')}>
                                <Link href="/dashboard/settings/brand-guide">
                                    <BookMarked />
                                    <span>Brand Guide</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname?.startsWith('/dashboard/admin/content-strategy')}>
                                <Link href="/dashboard/admin/content-strategy">
                                    <Youtube />
                                    <span>YouTube Strategy</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* ── Admin: setup & config (collapsed by default) ── */}
            <SidebarGroup>
                <Collapsible defaultOpen={false} className="group/admin">
                    <SidebarGroupLabel asChild>
                        <CollapsibleTrigger className="flex w-full items-center">
                            Admin
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/admin:rotate-90" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isAdminSection("users")}>
                                        <Link href="/dashboard/ceo?tab=admin&section=users">
                                            <Users />
                                            <span>Users & Access</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <InviteUserDialog
                                        defaultRole="super_user"
                                        trigger={
                                            <SidebarMenuButton className="text-primary hover:text-primary/90">
                                                <Users className="text-primary" />
                                                <span>Invite Team Member</span>
                                            </SidebarMenuButton>
                                        }
                                    />
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isAdminSection("integrations")}>
                                        <Link href="/dashboard/ceo?tab=admin&section=integrations">
                                            <Factory />
                                            <span>Integrations</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname?.startsWith('/dashboard/settings/connections')}>
                                        <Link href="/dashboard/settings/connections">
                                            <Chrome />
                                            <span>Social Connections</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname?.startsWith('/dashboard/admin/pos-config')}>
                                        <Link href="/dashboard/admin/pos-config">
                                            <Plug />
                                            <span>POS Config</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isAdminSection("data")}>
                                        <Link href="/dashboard/ceo?tab=admin&section=data">
                                            <Database />
                                            <span>Data Management</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname === '/dashboard/domains'}>
                                        <Link href="/dashboard/domains">
                                            <Globe />
                                            <span>Custom Domains</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname?.startsWith('/dashboard/admin/payment-config')}>
                                        <Link href="/dashboard/admin/payment-config">
                                            <Wallet />
                                            <span>Payment Config</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isAdminSection("settings")}>
                                        <Link href="/dashboard/ceo?tab=admin&section=settings">
                                            <Settings />
                                            <span>Settings</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarGroup>

            {/* ── Dev Tools: engineering & QA (collapsed by default) ── */}
            <SidebarGroup>
                <Collapsible defaultOpen={false} className="group/dev">
                    <SidebarGroupLabel asChild>
                        <CollapsibleTrigger className="flex w-full items-center">
                            Dev Tools
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/dev:rotate-90" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isTab("health")}>
                                        <Link href="/dashboard/ceo?tab=health">
                                            <Activity />
                                            <span>System Health</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isTab("qa")}>
                                        <Link href="/dashboard/ceo?tab=qa">
                                            <Code />
                                            <span>QA</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isTab("dev-console")}>
                                        <Link href="/dashboard/ceo?tab=dev-console">
                                            <Code />
                                            <span>Dev Console</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isAdminSection("devtools")}>
                                        <Link href="/dashboard/ceo?tab=admin&section=devtools">
                                            <Bot />
                                            <span>Agent Sandbox</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isTab("ground-truth")}>
                                        <Link href="/dashboard/ceo?tab=ground-truth">
                                            <BookOpen />
                                            <span>Ground Truth</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isTab("skills-lab")}>
                                        <Link href="/dashboard/ceo?tab=skills-lab">
                                            <Sparkles />
                                            <span>Skills Lab</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isTab("email")}>
                                        <Link href="/dashboard/ceo?tab=email">
                                            <Inbox />
                                            <span>Email Tester</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isTab("costs")}>
                                        <Link href="/dashboard/ceo?tab=costs">
                                            <DollarSign />
                                            <span>Media Costs</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isTab("ai-settings")}>
                                        <Link href="/dashboard/ceo?tab=ai-settings">
                                            <Settings />
                                            <span>AI Settings</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarGroup>

            {/* ── Assistant: chat history ── */}
            <SidebarGroup>
                <SidebarGroupLabel>Assistant</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => {
                                    clearCurrentSession();
                                    toast({ title: 'New Chat', description: 'Started a new chat session' });
                                }}
                                className="text-blue-600 font-medium"
                            >
                                <MessageSquarePlus />
                                <span>New Chat</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        {sessions.length > 0 && (
                            <Collapsible defaultOpen={false} className="group/collapsible">
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton>
                                            <History />
                                            <span>Recent Chats</span>
                                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {sessions.slice(0, 5).map((session) => (
                                                <SidebarMenuSubItem key={session.id}>
                                                    <SidebarMenuSubButton
                                                        isActive={activeSessionId === session.id}
                                                        onClick={() => setActiveSession(session.id)}
                                                    >
                                                        <span className="truncate">{session.title || 'Untitled Chat'}</span>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton
                                                    onClick={() => {
                                                        localStorage.removeItem('agent-chat-storage');
                                                        window.location.reload();
                                                    }}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3 w-3 mr-2" />
                                                    <span>Clear History</span>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        )}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </>
    );
}
