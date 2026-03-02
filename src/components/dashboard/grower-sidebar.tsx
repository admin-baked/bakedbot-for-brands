'use client';

/**
 * Grower Sidebar Navigation
 *
 * B2B wholesale cultivator dashboard — tailored for growers who sell
 * product to brands and dispensaries.
 *
 * Sections:
 * - Workspace: Inbox, Projects, Playbooks
 * - Catalog: Products, Pricing
 * - Distribution: Dispensaries (buyers), Orders
 * - Financials: GreenLedger, Profitability
 * - Intelligence: Competitive Intel, Deep Research
 * - Admin: Settings, App Store, Invite Team Member
 */

import { memo } from 'react';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
    Inbox,
    FolderKanban,
    BookOpen,
    Package,
    TrendingUp,
    Store,
    ShoppingCart,
    Coins,
    BarChart3,
    Target,
    Globe,
    LayoutGrid,
    Settings,
    UserPlus,
    ChevronRight,
    Leaf,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InviteUserDialog } from "@/components/dashboard/admin/invite-user-dialog";
import { useUserRole } from "@/hooks/use-user-role";

export const GrowerSidebar = memo(function GrowerSidebar() {
    const pathname = usePathname();
    const { orgId } = useUserRole();

    const isActive = (href: string): boolean => {
        if (href === '/dashboard') {
            return pathname === href;
        }
        return pathname === href || (pathname?.startsWith(href + '/') ?? false);
    };

    return (
        <>
            {/* Workspace - Primary tools */}
            <SidebarGroup>
                <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/inbox')}>
                                <Link href="/dashboard/inbox" prefetch={true}>
                                    <Inbox />
                                    <span>Inbox</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/projects')}>
                                <Link href="/dashboard/projects" prefetch={true}>
                                    <FolderKanban />
                                    <span>Projects</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/playbooks')}>
                                <Link href="/dashboard/playbooks" prefetch={true}>
                                    <BookOpen />
                                    <span>Playbooks</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Catalog - Products & Pricing */}
            <SidebarGroup>
                <SidebarGroupLabel>Catalog</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/products')}>
                                <Link href="/dashboard/products" prefetch={true}>
                                    <Leaf />
                                    <span>My Strains & SKUs</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/pricing')}>
                                <Link href="/dashboard/pricing" prefetch={true}>
                                    <TrendingUp />
                                    <span>Pricing</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Distribution - Buyers & Orders */}
            <SidebarGroup>
                <SidebarGroupLabel>Distribution</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/dispensaries')}>
                                <Link href="/dashboard/dispensaries" prefetch={true}>
                                    <Store />
                                    <span>Retail Buyers</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/orders')}>
                                <Link href="/dashboard/orders" prefetch={true}>
                                    <ShoppingCart />
                                    <span>Orders</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Financials - Revenue & Supply chain */}
            <SidebarGroup>
                <SidebarGroupLabel>Financials</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/greenledger')}>
                                <Link href="/dashboard/greenledger" prefetch={true}>
                                    <Coins />
                                    <span>GreenLedger</span>
                                    <span className="ml-auto text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-medium">NEW</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/analytics')}>
                                <Link href="/dashboard/analytics" prefetch={true}>
                                    <BarChart3 />
                                    <span>Analytics</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Intelligence - Market & Research */}
            <SidebarGroup>
                <Collapsible defaultOpen={false} className="group/intel">
                    <SidebarGroupLabel asChild>
                        <CollapsibleTrigger className="flex w-full items-center">
                            Intelligence
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/intel:rotate-90" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive('/dashboard/competitive-intel')}>
                                        <Link href="/dashboard/competitive-intel" prefetch={true}>
                                            <Target />
                                            <span>Competitive Intel</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive('/dashboard/research')}>
                                        <Link href="/dashboard/research" prefetch={true}>
                                            <Globe />
                                            <span>Deep Research</span>
                                            <span className="ml-auto text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-medium">BETA</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarGroup>

            {/* Admin - Settings & Team */}
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
                                    <SidebarMenuButton asChild isActive={isActive('/dashboard/apps')}>
                                        <Link href="/dashboard/apps" prefetch={true}>
                                            <LayoutGrid />
                                            <span>App Store</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive('/dashboard/settings')}>
                                        <Link href="/dashboard/settings" prefetch={true}>
                                            <Settings />
                                            <span>Settings</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <InviteUserDialog
                                        defaultRole="brand_member"
                                        trigger={
                                            <SidebarMenuButton className="text-primary hover:text-primary/90">
                                                <UserPlus className="text-primary" />
                                                <span>Invite Team Member</span>
                                            </SidebarMenuButton>
                                        }
                                    />
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarGroup>
        </>
    );
});
