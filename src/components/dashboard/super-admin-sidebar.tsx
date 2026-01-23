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
    Inbox
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InviteUserDialog } from "@/components/invitations/invite-user-dialog";

export function SuperAdminSidebar() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const currentTabParam = searchParams?.get("tab");
    const { toast } = useToast();
    const { sessions, activeSessionId, clearCurrentSession, setActiveSession } = useAgentChatStore();

    const isActive = (tab: string) => {
        if (tab === 'agents') {
            return pathname?.startsWith('/dashboard/ceo/agents') || currentTabParam === 'agents';
        }
        
        if (tab === 'projects') {
            return pathname?.startsWith('/dashboard/ceo/projects') || currentTabParam === 'projects';
        }

        if (tab === 'treasury') {
            return pathname?.startsWith('/dashboard/ceo/treasury') || currentTabParam === 'treasury';
        }

        return currentTabParam === tab;
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
                                <Link href="/dashboard/ceo/agents">
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
                            <SidebarMenuButton asChild isActive={isActive("ezal") || isActive("competitor-intel") || isActive("research")}>
                                <Link href="/dashboard/ceo?tab=ezal">
                                    <Search />
                                    <span>Intel & Research</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Admin - Collapsible for less frequent tools */}
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
                                {/* Users & Access */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("account-management")}>
                                        <Link href="/dashboard/ceo?tab=account-management">
                                            <Users />
                                            <span>Users & Access</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <InviteUserDialog
                                        allowedRoles={['super_admin']}
                                        trigger={
                                            <SidebarMenuButton className="text-primary hover:text-primary/90">
                                                <Users className="text-primary" />
                                                <span>Invite Team Member</span>
                                            </SidebarMenuButton>
                                        }
                                    />
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("tickets")}>
                                        <Link href="/dashboard/ceo?tab=tickets">
                                            <Ticket />
                                            <span>Support Tickets</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                {/* Data & Integrations */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("data-manager") || isActive("ai-search") || isActive("knowledge-base")}>
                                        <Link href="/dashboard/ceo?tab=data-manager">
                                            <Database />
                                            <span>Data Management</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("cannmenus") || isActive("coupons") || isActive("ai-agent-embed")}>
                                        <Link href="/dashboard/ceo?tab=cannmenus">
                                            <Factory />
                                            <span>Integrations</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                {/* Dev Tools */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("sandbox") || isActive("browser")}>
                                        <Link href="/dashboard/ceo?tab=sandbox">
                                            <Code />
                                            <span>Dev Tools</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("pilot-setup")}>
                                        <Link href="/dashboard/ceo?tab=pilot-setup">
                                            <Rocket />
                                            <span>Pilot Setup</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                {/* Settings */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("settings")}>
                                        <Link href="/dashboard/ceo?tab=settings">
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
        </>
    );
}
