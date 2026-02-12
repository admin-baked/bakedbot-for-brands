'use client';

/**
 * Dispensary Sidebar Navigation
 *
 * Organized navigation for dispensary users with logical groupings:
 * - Workspace: Inbox, Projects, Playbooks
 * - Menu & Inventory: Menu, Carousels, Bundles, Orders (dispensary's core focus)
 * - Customers: Customers, Segments, Loyalty
 * - Marketing: Creative Center, Campaigns (future)
 * - Intelligence: Competitive Intel, Deep Research
 * - Admin: App Store, Settings
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
    Utensils,
    Package,
    Images,
    Monitor,
    PackagePlus,
    ShoppingCart,
    TrendingUp,
    Users,
    PieChart,
    Crown,
    Palette,
    Wand2,
    Megaphone,
    Target,
    Globe,
    LayoutGrid,
    Settings,
    ChevronRight,
    UserPlus,
    GraduationCap,
    BookOpenCheck,
    Calculator,
    Image,
    HardDrive,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InviteUserDialog } from "@/components/dashboard/admin/invite-user-dialog";
import { useUserRole } from "@/hooks/use-user-role";

export const DispensarySidebar = memo(function DispensarySidebar() {
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
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/drive')}>
                                <Link href="/dashboard/drive" prefetch={true}>
                                    <HardDrive />
                                    <span>Drive</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/academy')}>
                                <Link href="/dashboard/academy" prefetch={true}>
                                    <GraduationCap />
                                    <span>Academy</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Menu & Inventory - Dispensary's core focus */}
            <SidebarGroup>
                <SidebarGroupLabel>Menu & Inventory</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/menu')}>
                                <Link href="/dashboard/menu" prefetch={true}>
                                    <Utensils />
                                    <span>Menu</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/products')}>
                                <Link href="/dashboard/products" prefetch={true}>
                                    <Package />
                                    <span>Products</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/carousels')}>
                                <Link href="/dashboard/carousels" prefetch={true}>
                                    <Images />
                                    <span>Carousels</span>
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
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/bundles')}>
                                <Link href="/dashboard/bundles" prefetch={true}>
                                    <PackagePlus />
                                    <span>Bundles</span>
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

            {/* Marketing - Content & Campaigns */}
            <SidebarGroup>
                <SidebarGroupLabel>Marketing</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/settings/brand-guide')}>
                                <Link href="/dashboard/settings/brand-guide" prefetch={true}>
                                    <BookOpenCheck />
                                    <span>Brand Guide</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
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
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/media')}>
                                <Link href="/dashboard/media" prefetch={true}>
                                    <Image />
                                    <span>Media</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive('/dashboard/campaigns')}>
                                <Link href="/dashboard/campaigns" prefetch={true}>
                                    <Megaphone />
                                    <span>Campaigns</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* Intelligence - Competitive & Research */}
            <SidebarGroup>
                <Collapsible defaultOpen className="group/intel">
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
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive('/dashboard/profitability')}>
                                        <Link href="/dashboard/profitability" prefetch={true}>
                                            <Calculator />
                                            <span>Profitability</span>
                                            <span className="ml-auto text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-medium">NEW</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </Collapsible>
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
                                    <SidebarMenuButton asChild isActive={isActive('/dashboard/apps')}>
                                        <Link href="/dashboard/apps" prefetch={true}>
                                            <LayoutGrid />
                                            <span>App Store</span>
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
                                        defaultRole="dispensary_admin"
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
