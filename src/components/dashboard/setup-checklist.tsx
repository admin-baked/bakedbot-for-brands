'use client';

/**
 * Setup Checklist Component
 * 
 * Onboarding v2: Progressive disclosure - shows remaining setup tasks
 * instead of a long wizard. Displayed as a pinned card at top of dashboard
 * until dismissed or all tasks completed.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Clock, ChevronRight, X, Package, Store, Bot, FileSearch, Shield, Megaphone } from 'lucide-react';
import { useUserRole } from '@/hooks/use-user-role';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ChecklistItem {
    id: string;
    title: string;
    description: string;
    estimatedTime: string;
    href: string;
    icon: React.ReactNode;
    status: 'todo' | 'done' | 'dismissed';
}

// Brand checklist items - focused on getting headless menu live with Smokey
const BRAND_CHECKLIST: ChecklistItem[] = [
    {
        id: 'add-products',
        title: 'Add your products',
        description: 'Upload your products manually, CSV, or import from CannMenus',
        estimatedTime: '5 min',
        href: '/dashboard/products',
        icon: <Package className="h-4 w-4" />,
        status: 'todo'
    },
    {
        id: 'add-retailers',
        title: 'Add "Where to Buy" retailers',
        description: 'Connect dispensaries that carry your products',
        estimatedTime: '3 min',
        href: '/dashboard/dispensaries',
        icon: <Store className="h-4 w-4" />,
        status: 'todo'
    },
    {
        id: 'launch-menu',
        title: 'Launch your Headless Menu',
        description: 'Go live at bakedbot.ai/yourbrand with your product catalog',
        estimatedTime: '2 min',
        href: '/dashboard/brand-page',
        icon: <Store className="h-4 w-4" />,
        status: 'todo'
    },
    {
        id: 'activate-smokey',
        title: 'Activate Smokey AI Budtender',
        description: 'Enable AI-powered product recommendations on your menu',
        estimatedTime: '2 min',
        href: '/dashboard/agents',
        icon: <Bot className="h-4 w-4" />,
        status: 'todo'
    },
    {
        id: 'run-audit',
        title: 'Run Menu + SEO Audit',
        description: 'Get an instant report on your online presence',
        estimatedTime: '1 min',
        href: '/dashboard/audit',
        icon: <FileSearch className="h-4 w-4" />,
        status: 'todo'
    }
];

// Dispensary checklist items
const DISPENSARY_CHECKLIST: ChecklistItem[] = [
    {
        id: 'link-dispensary',
        title: 'Link your dispensary',
        description: 'Search CannMenus or Dutchie to connect your data',
        estimatedTime: '2 min',
        href: '/dashboard/settings/link',
        icon: <Store className="h-4 w-4" />,
        status: 'todo'
    },
    {
        id: 'connect-pos',
        title: 'Connect POS or upload inventory',
        description: 'Sync your menu from Dutchie, Jane, or upload CSV',
        estimatedTime: '5 min',
        href: '/dashboard/apps',
        icon: <Package className="h-4 w-4" />,
        status: 'todo'
    },
    {
        id: 'publish-menu',
        title: 'Publish headless menu pages',
        description: 'Generate SEO-optimized menu pages',
        estimatedTime: '2 min',
        href: '/dashboard/menu/publish',
        icon: <Store className="h-4 w-4" />,
        status: 'todo'
    },
    {
        id: 'install-smokey',
        title: 'Install Smokey',
        description: 'Add AI budtender to your website',
        estimatedTime: '2 min',
        href: '/dashboard/settings',
        icon: <Bot className="h-4 w-4" />,
        status: 'todo'
    },
    {
        id: 'run-audit',
        title: 'Run Menu + SEO Audit',
        description: 'Fix top issues to improve rankings',
        estimatedTime: '3 min',
        href: '/dashboard/audit',
        icon: <FileSearch className="h-4 w-4" />,
        status: 'todo'
    },
    {
        id: 'compliance-defaults',
        title: 'Configure Deebo defaults',
        description: 'Set up compliance for your state',
        estimatedTime: '3 min',
        href: '/dashboard/settings/compliance',
        icon: <Shield className="h-4 w-4" />,
        status: 'todo'
    },
    {
        id: 'launch-campaign',
        title: 'Launch first campaign',
        description: 'Create a compliant marketing campaign',
        estimatedTime: '10 min',
        href: '/dashboard/craig/campaigns/new',
        icon: <Megaphone className="h-4 w-4" />,
        status: 'todo'
    }
];

/**
 * Get linked dispensary status from Firestore
 */
async function getLinkedDispensaryStatus(): Promise<{ isLinked: boolean; posConnected: boolean }> {
    try {
        const response = await fetch('/api/user/linked-dispensary');
        if (response.ok) {
            const data = await response.json();
            return { 
                isLinked: !!data.linkedDispensary, 
                posConnected: !!data.posConnected 
            };
        }
    } catch (error) {
        console.error('Failed to check linked dispensary:', error);
    }
    return { isLinked: false, posConnected: false };
}

export function SetupChecklist() {
    const { role } = useUserRole();
    const [isDismissed, setIsDismissed] = useState(false);
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load checklist based on role and check completion status
    useEffect(() => {
        async function loadChecklist() {
            let baseItems: ChecklistItem[] = [];
            
            if (role === 'brand') {
                baseItems = [...BRAND_CHECKLIST];
            } else if (role === 'dispensary') {
                baseItems = [...DISPENSARY_CHECKLIST];
                
                // Check if dispensary is linked
                // Check if dispensary is linked and POS connected
                const { isLinked, posConnected } = await getLinkedDispensaryStatus();
                
                if (isLinked) {
                    baseItems = baseItems.map(item => 
                        item.id === 'link-dispensary' 
                            ? { ...item, status: 'done' as const }
                            : item
                    );
                }

                if (posConnected) {
                     baseItems = baseItems.map(item => 
                        item.id === 'connect-pos' 
                            ? { ...item, status: 'done' as const }
                            : item
                    );
                }
            }
            
            setItems(baseItems);
            setIsLoading(false);
        }
        
        loadChecklist();

        // Check if dismissed in localStorage
        const dismissed = localStorage.getItem('setup-checklist-dismissed');
        if (dismissed === 'true') {
            setIsDismissed(true);
        }
    }, [role]);

    const completedCount = items.filter(i => i.status === 'done').length;
    const totalCount = items.length;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleDismiss = () => {
        setIsDismissed(true);
        localStorage.setItem('setup-checklist-dismissed', 'true');
    };

    // Don't show for customers or if dismissed
    if (role === 'customer' || isDismissed || isLoading) {
        return null;
    }

    // Don't show if all items complete
    if (completedCount === totalCount && totalCount > 0) {
        return null;
    }

    return (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent mb-6">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            Complete your setup
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {completedCount} of {totalCount} tasks complete
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDismiss}
                        className="text-muted-foreground hover:text-foreground -mt-1 -mr-2"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Dismiss</span>
                    </Button>
                </div>
                <Progress value={progressPercent} className="h-1.5 mt-3" />
            </CardHeader>
            <CardContent className="pt-2">
                <div className="space-y-1">
                    {items.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 p-2 -mx-2 rounded-lg transition-colors group",
                                item.status === 'done'
                                    ? "opacity-60"
                                    : "hover:bg-muted/50"
                            )}
                        >
                            <div className={cn(
                                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                                item.status === 'done'
                                    ? "bg-primary/20 text-primary"
                                    : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                            )}>
                                {item.status === 'done' ? (
                                    <CheckCircle className="h-4 w-4" />
                                ) : (
                                    item.icon
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={cn(
                                    "text-sm font-medium",
                                    item.status === 'done' && "line-through"
                                )}>
                                    {item.title}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {item.estimatedTime}
                                </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
