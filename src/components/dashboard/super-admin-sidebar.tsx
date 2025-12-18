
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
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
    Factory
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function SuperAdminSidebar() {
    const searchParams = useSearchParams();
    const currentTab = searchParams?.get("tab") || "playbooks";

    const isActive = (tab: string) => currentTab === tab;

    return (
        <>
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
                                <Link href="/dashboard/ceo?tab=agents">
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
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </>
    );
}
