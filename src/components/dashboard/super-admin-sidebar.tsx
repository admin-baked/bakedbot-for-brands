'use client';

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuAction,
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
    MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function SuperAdminSidebar() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const currentTab = searchParams?.get("tab") || "playbooks";
    const { toast } = useToast();
    const { sessions, activeSessionId, clearCurrentSession, setActiveSession } = useAgentChatStore();

    const isActive = (tab: string) => {
        if (tab === 'agents') {
            return pathname?.startsWith('/dashboard/ceo/agents') || currentTab === 'agents';
        }
        return currentTab === tab;
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

            {/* Operations Group */}
            <SidebarGroup>
                <SidebarGroupLabel>Operations</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("playbooks")}>
                                <Link href="/dashboard/ceo?tab=playbooks">
                                    <Briefcase />
                                    <span>Playbooks</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("agents")}>
                                <Link href="/dashboard/ceo/agents">
                                    <Bot />
                                    <span>Agents</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("insights")}>
                                <Link href="/dashboard/ceo?tab=insights">
                                    <Activity />
                                    <span>Intelligence</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("operations")}>
                                <Link href="/dashboard/ceo?tab=operations">
                                    <Factory />
                                    <span>Page Generator</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("crm")}>
                                <Link href="/dashboard/ceo?tab=crm">
                                    <Users />
                                    <span>CRM Lite</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Insights Group */}
            <SidebarGroup>
                <SidebarGroupLabel>Insights</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("analytics")}>
                                <Link href="/dashboard/ceo?tab=analytics">
                                    <BarChart3 />
                                    <span>Analytics</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("usage")}>
                                <Link href="/dashboard/ceo?tab=usage">
                                    <Activity />
                                    <span>Usage</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("foot-traffic")}>
                                <Link href="/dashboard/ceo?tab=foot-traffic">
                                    <Footprints />
                                    <span>Foot Traffic</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("ezal")}>
                                <Link href="/dashboard/ceo?tab=ezal">
                                    <Users />
                                    <span>Ezal Analysis</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("competitor-intel")}>
                                <Link href="/dashboard/ceo?tab=competitor-intel">
                                    <Search />
                                    <span>Competitor Intel</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Admin Group */}
            <SidebarGroup>
                <SidebarGroupLabel>Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("tickets")}>
                                <Link href="/dashboard/ceo?tab=tickets">
                                    <Ticket />
                                    <span>Tickets</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("data-manager")}>
                                <Link href="/dashboard/ceo?tab=data-manager">
                                    <Database />
                                    <span>Data</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("ai-search")}>
                                <Link href="/dashboard/ceo?tab=ai-search">
                                    <Search />
                                    <span>AI Search</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("ai-agent-embed")}>
                                <Link href="/dashboard/ceo?tab=ai-agent-embed">
                                    <Code />
                                    <span>AI Embed</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("cannmenus")}>
                                <Link href="/dashboard/ceo?tab=cannmenus">
                                    <Utensils />
                                    <span>CannMenus</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("coupons")}>
                                <Link href="/dashboard/ceo?tab=coupons">
                                    <Tag />
                                    <span>Coupons</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("knowledge-base")}>
                                <Link href="/dashboard/ceo?tab=knowledge-base">
                                    <BookOpen />
                                    <span>Knowledge Base</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("account-management")}>
                                <Link href="/dashboard/ceo?tab=account-management">
                                    <UserMinus />
                                    <span>User Management</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </>
    );
}

// Helper components for SubMenu (assuming they might not be exported from ui/sidebar or standard shadcn)
// If they are missing, I'll use standard list items.
// Based on typical shadcn sidebar, we need:
import { SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
