'use client';

/**
 * Brand Sidebar Navigation
 *
 * Organized navigation for brand users with logical groupings:
 * - Workspace: Inbox, Projects, Playbooks
 * - Marketing: Creative Center
 * - Catalog: Products, Menu, Orders
 * - Customers: Customers, Segments, Leads, Loyalty
 * - Intelligence: Competitive Intel, Deep Research
 * - Agent Squad: Active Agents
 * - Distribution: Dispensaries
 * - Admin: Brand Page, App Store, CannSchemas, Settings
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
    Palette,
    Wand2,
    QrCode,
    Monitor,
    Package,
    Utensils,
    ShoppingCart,
    TrendingUp,
    Users,
    PieChart,
    UserPlus,
    Crown,
    Target,
    Globe,
    Store,
    LayoutTemplate,
    LayoutGrid,
    Database,
    Settings,
    ChevronRight,
    GraduationCap,
    Image,
    HardDrive,
    Zap,
    Flag,
    BarChart3,
    Coins,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InviteUserDialog } from "@/components/dashboard/admin/invite-user-dialog";
import { useUserRole } from "@/hooks/use-user-role";
import { AGENT_SQUAD } from '@/hooks/use-agentic-dashboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const BrandSidebar = memo(function BrandSidebar() {
    const pathname = usePathname();
    const { orgId, isSuperUser } = useUserRole();

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
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/goals')}>
                                <Link href="/dashboard/goals" prefetch={true}>
                                    <Flag />
                                    <span>Goals</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
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
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/drive')}>
                                <Link href="/dashboard/drive" prefetch={true}>
                                    <HardDrive />
                                    <span>Drive</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Strategy - Planning & Analytics */}
            <SidebarGroup>
                <SidebarGroupLabel>Strategy</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/goals')}>
                                <Link href="/dashboard/goals" prefetch={true}>
                                    <Flag />
                                    <span>Goals</span>
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

            {/* Marketing - Content creation */}
            <SidebarGroup>
                <SidebarGroupLabel>Marketing</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/brand/creative')}>
                                <Link href="/dashboard/brand/creative" prefetch={true}>
                                    <Palette />
                                    <span>Creative Center</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/vibe-studio')}>
                                <Link href="/dashboard/vibe-studio" prefetch={true}>
                                    <Wand2 />
                                    <span>Vibe Studio</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/heroes')}>
                                <Link href="/dashboard/heroes" prefetch={true}>
                                    <Monitor />
                                    <span>Hero Banners</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/qr-codes')}>
                                <Link href="/dashboard/qr-codes" prefetch={true}>
                                    <QrCode />
                                    <span>QR Codes</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        {isSuperUser && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/media')}>
                                <Link href="/dashboard/media" prefetch={true}>
                                    <Image />
                                    <span>Media</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        )}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Catalog - Products & Orders */}
            <SidebarGroup>
                <SidebarGroupLabel>Catalog</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/products')}>
                                <Link href="/dashboard/products" prefetch={true}>
                                    <Package />
                                    <span>Products</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/menu')}>
                                <Link href="/dashboard/menu" prefetch={true}>
                                    <Utensils />
                                    <span>Menu</span>
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
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/pricing')}>
                                <Link href="/dashboard/pricing" prefetch={true}>
                                    <TrendingUp />
                                    <span>Pricing</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/upsells')}>
                                <Link href="/dashboard/upsells" prefetch={true}>
                                    <Zap />
                                    <span>Smart Upsells</span>
                                    <span className="ml-auto text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-medium">NEW</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Customers - CRM & Engagement */}
            <SidebarGroup>
                <SidebarGroupLabel>Customers</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/customers')}>
                                <Link href="/dashboard/customers" prefetch={true}>
                                    <Users />
                                    <span>Customers</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/segments')}>
                                <Link href="/dashboard/segments" prefetch={true}>
                                    <PieChart />
                                    <span>Segments</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/leads')}>
                                <Link href="/dashboard/leads" prefetch={true}>
                                    <UserPlus />
                                    <span>Leads</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/loyalty')}>
                                <Link href="/dashboard/loyalty" prefetch={true}>
                                    <Crown />
                                    <span>Loyalty</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Intelligence - Competitive & Research */}
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

            {/* Agent Squad - Active Bots */}
            <SidebarGroup>
                <Collapsible defaultOpen={true} className="group/agents">
                    <SidebarGroupLabel asChild>
                        <CollapsibleTrigger className="flex w-full items-center">
                            Agent Squad
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/agents:rotate-90" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {AGENT_SQUAD.map((agent) => (
                                    <SidebarMenuItem key={agent.id}>
                                        <SidebarMenuButton className="h-10 cursor-default hover:bg-sidebar-accent/50">
                                            <div className="flex items-center gap-3 w-full">
                                                <div className="relative">
                                                    <Avatar className="h-6 w-6 border border-sidebar-border">
                                                        <AvatarImage src={agent.img} />
                                                        <AvatarFallback>{agent.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-sidebar-background ${agent.status === 'online' ? 'bg-green-500' :
                                                        agent.status === 'working' ? 'bg-amber-500' : 'bg-gray-400'
                                                        }`}></div>
                                                </div>
                                                <div className="flex flex-col items-start leading-none group-data-[collapsible=icon]:hidden">
                                                    <span className="font-medium text-xs">{agent.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">{agent.role}</span>
                                                </div>
                                            </div>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarGroup>

            {/* Distribution - Retail Partners */}
            <SidebarGroup>
                <Collapsible defaultOpen={false} className="group/dist">
                    <SidebarGroupLabel asChild>
                        <CollapsibleTrigger className="flex w-full items-center">
                            Distribution
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/dist:rotate-90" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive('/dashboard/dispensaries')}>
                                        <Link href="/dashboard/dispensaries" prefetch={true}>
                                            <Store />
                                            <span>Dispensaries</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarGroup>

            {/* GreenLedger - Supply Chain Finance */}
            <SidebarGroup>
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
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Admin - Settings & Integrations */}
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
                                    <SidebarMenuButton asChild isActive={isActive('/dashboard/content/brand-page')}>
                                        <Link href="/dashboard/content/brand-page" prefetch={true}>
                                            <LayoutTemplate />
                                            <span>Brand Page</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive('/dashboard/apps')}>
                                        <Link href="/dashboard/apps" prefetch={true}>
                                            <LayoutGrid />
                                            <span>App Store</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive('/dashboard/menu-sync')}>
                                        <Link href="/dashboard/menu-sync" prefetch={true}>
                                            <Database />
                                            <span>CannSchemas</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive('/dashboard/domains')}>
                                        <Link href="/dashboard/domains" prefetch={true}>
                                            <Globe />
                                            <span>Custom Domains</span>
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
                                        defaultRole="brand_admin"
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
