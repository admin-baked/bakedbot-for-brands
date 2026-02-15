'use client';

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuAction,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
    Bot,
    Briefcase,
    LayoutDashboard,
    BarChart3,
    Footprints,
    Ticket,
    Database,
    Search,
    Code,
    Utensils,
    Tag,
    Activity,
    Users,
    Factory,
    UserMinus,
    BookOpen,
    MessageSquarePlus,
    History,
    Trash2,
    ChevronRight,
    MoreHorizontal,
    Settings,
    Globe,
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
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InviteUserDialog } from "@/components/dashboard/admin/invite-user-dialog";

export function SuperAdminSidebar() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const currentTabParam = searchParams?.get("tab");
    const { toast } = useToast();
    const { sessions, activeSessionId, clearCurrentSession, setActiveSession } = useAgentChatStore();

    const isActive = (tab: string): boolean => {
        if (tab === 'agents') {
            return pathname?.startsWith('/dashboard/ceo/agents') || currentTabParam === 'agents';
        }

        if (tab === 'projects') {
            return pathname?.startsWith('/dashboard/ceo/projects') || currentTabParam === 'projects';
        }

        if (tab === 'treasury') {
            return pathname?.startsWith('/dashboard/ceo/treasury') || currentTabParam === 'treasury';
        }

        // Handle admin tab - also match legacy admin tab params
        if (tab === 'admin') {
            const legacyAdminTabs = ['account-management', 'invites', 'tickets', 'data-manager', 'ai-search',
                'knowledge-base', 'cannmenus', 'coupons', 'ai-agent-embed', 'sandbox', 'browser', 'settings', 'pilot-setup'];
            return currentTabParam === 'admin' || Boolean(currentTabParam && legacyAdminTabs.includes(currentTabParam));
        }

        return currentTabParam === tab;
    };

    const isAdminSectionActive = (section: string): boolean => {
        return isActive('admin') && searchParams?.get('section') === section;
    };

    return (
        <>
            {/* Assistant / Chat Group */}
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

                        {/* Recent Chats Collapsible */}
                        {sessions.length > 0 && (
                            <Collapsible defaultOpen className="group/collapsible">
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

            {/* Command Center - Primary Workspace */}
            <SidebarGroup>
                <SidebarGroupLabel>Command Center</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname?.startsWith('/dashboard/inbox')}>
                                <Link href="/dashboard/inbox">
                                    <Inbox />
                                    <span>Inbox</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("boardroom") || (!currentTabParam && pathname === '/dashboard/ceo')}>
                                <Link href="/dashboard/ceo?tab=boardroom">
                                    <LayoutDashboard />
                                    <span>Boardroom</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("projects")}>
                                <Link href="/dashboard/ceo/projects">
                                    <FolderKanban />
                                    <span>Projects</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Insights - Analytics & Intelligence */}
            <SidebarGroup>
                <SidebarGroupLabel>Insights</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("analytics") || isActive("usage") || isActive("insights")}>
                                <Link href="/dashboard/ceo?tab=analytics">
                                    <BarChart3 />
                                    <span>Analytics</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("treasury")}>
                                <Link href="/dashboard/ceo/treasury">
                                    <Wallet />
                                    <span>Treasury</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Operations - Day-to-day tools */}
            <SidebarGroup>
                <SidebarGroupLabel>Operations</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("agents")}>
                                <Link href="/dashboard/ceo?tab=agents">
                                    <Bot />
                                    <span>Agents</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("crm")}>
                                <Link href="/dashboard/ceo?tab=crm">
                                    <Users />
                                    <span>CRM</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("foot-traffic")}>
                                <Link href="/dashboard/ceo?tab=foot-traffic">
                                    <Compass />
                                    <span>Discovery Hub</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("playbooks")}>
                                <Link href="/dashboard/ceo?tab=playbooks">
                                    <Briefcase />
                                    <span>Playbooks</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={
                                    isActive("ezal") ||
                                    isActive("competitor-intel") ||
                                    isActive("research") ||
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
                            <SidebarMenuButton asChild isActive={isActive("drive")}>
                                <Link href="/dashboard/ceo?tab=drive">
                                    <HardDrive />
                                    <span>BakedBot Drive</span>
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
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("costs")}>
                                <Link href="/dashboard/ceo?tab=costs">
                                    <DollarSign />
                                    <span>Media Costs</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Admin Console - Unified admin tools */}
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
                                {/* Users Section */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isAdminSectionActive("users")}>
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

                                {/* Data Section */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isAdminSectionActive("data")}>
                                        <Link href="/dashboard/ceo?tab=admin&section=data">
                                            <Database />
                                            <span>Data Management</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                {/* Ground Truth Section */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("ground-truth")}>
                                        <Link href="/dashboard/ceo?tab=ground-truth">
                                            <BookOpen />
                                            <span>Ground Truth</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                {/* Training Sections */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname === '/dashboard/training' && !pathname.startsWith('/dashboard/training/admin')}>
                                        <Link href="/dashboard/training">
                                            <GraduationCap />
                                            <span>Training Program</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname?.startsWith('/dashboard/training/admin')}>
                                        <Link href="/dashboard/training/admin">
                                            <GraduationCap />
                                            <span>Training Admin</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                {/* Integrations Section */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isAdminSectionActive("integrations")}>
                                        <Link href="/dashboard/ceo?tab=admin&section=integrations">
                                            <Factory />
                                            <span>Integrations</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                {/* POS Config Section */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname?.startsWith('/dashboard/admin/pos-config')}>
                                        <Link href="/dashboard/admin/pos-config">
                                            <Plug />
                                            <span>POS Config</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                {/* Dev Tools Section */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isAdminSectionActive("devtools")}>
                                        <Link href="/dashboard/ceo?tab=admin&section=devtools">
                                            <Code />
                                            <span>Dev Tools</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                {/* Custom Domains */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname === '/dashboard/domains'}>
                                        <Link href="/dashboard/domains" prefetch={true}>
                                            <Globe />
                                            <span>Custom Domains</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                {/* Settings Section */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isAdminSectionActive("settings")}>
                                        <Link href="/dashboard/ceo?tab=admin&section=settings">
                                            <Settings />
                                            <span>Settings</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                {/* System Health Section */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("health")}>
                                        <Link href="/dashboard/ceo?tab=health">
                                            <Activity />
                                            <span>System Health</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarGroup>
        </>
    );
}
