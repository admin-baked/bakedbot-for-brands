'use client';

/**
 * UnifiedAgentChat
 * 
 * A single, role-aware agent chat component that can be used anywhere:
 * - Homepage (public demo)
 * - Brand Dashboard
 * - Dispensary Dashboard
 * - Super User Dashboard
 * 
 * Wraps PuffChat with role-specific configuration.
 */

import { PuffChat } from '@/app/dashboard/ceo/components/puff-chat';
import { useEffect } from 'react';
import { getChatConfigForRole, type UserRoleForChat, type RoleChatConfig } from '@/lib/chat/role-chat-config';
import { cn } from '@/lib/utils';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { Sparkles, Briefcase, Store, ShoppingCart, Shield, MessageSquarePlus, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface UnifiedAgentChatProps {
    /** User role determines prompts and theming */
    role?: UserRoleForChat | 'public';
    /** Show header with role badge */
    showHeader?: boolean;
    /** Height of the container */
    height?: string;
    /** Additional CSS classes */
    className?: string;
    /** Override prompt suggestions */
    promptSuggestions?: string[];
    /** Show compact mode (smaller header) */
    compact?: boolean;
    /** Is the user authenticated? If false, show "Login to access" in model selector */
    isAuthenticated?: boolean;
    /** User's plan for unlocking models */
    userPlan?: string;
    /** Is Super User? */
    /** Is Super User? */
    isSuperUser?: boolean;
    /** Location context to display in header */
    locationInfo?: {
        dispensaryCount: number;
        brandCount: number;
        city: string;
    } | null;
}

// Icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
    'sparkles': Sparkles,
    'briefcase': Briefcase,
    'store': Store,
    'shopping-cart': ShoppingCart,
    'shield': Shield,
};

// Theme color mapping
const THEME_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    emerald: {
        bg: 'bg-gradient-to-r from-emerald-50 to-background',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        icon: 'text-emerald-600'
    },
    purple: {
        bg: 'bg-gradient-to-r from-purple-50 to-background',
        text: 'text-purple-800',
        border: 'border-purple-200',
        icon: 'text-purple-600'
    },
    blue: {
        bg: 'bg-gradient-to-r from-blue-50 to-background',
        text: 'text-blue-800',
        border: 'border-blue-200',
        icon: 'text-blue-600'
    },
    orange: {
        bg: 'bg-gradient-to-r from-orange-50 to-background',
        text: 'text-orange-800',
        border: 'border-orange-200',
        icon: 'text-orange-600'
    },
    primary: {
        bg: 'bg-gradient-to-r from-primary/10 to-background',
        text: 'text-primary',
        border: 'border-primary/20',
        icon: 'text-primary'
    }
};

// Default public config
const PUBLIC_CONFIG: RoleChatConfig = {
    role: 'customer',
    title: 'Smokey Chat',
    subtitle: 'Ask me anything about cannabis, products, or our platform',
    welcomeMessage: 'Welcome! Ask me anything about BakedBot or cannabis products.',
    placeholder: 'Ask about BakedBot...',
    iconName: 'sparkles',
    themeColor: 'emerald',
    agentPersona: 'smokey',
    promptSuggestions: [
        'Hire a Market Scout (audit my competition)',
        'Send Deebo (compliance check)',
        'See my Digital Budtender in action',
    ],
    enabledFeatures: {
        modelSelector: false,
        personaSelector: false,
        triggers: false,
        permissions: false
    }
};

export function UnifiedAgentChat({
    role = 'public',
    showHeader = true,
    height = '', // No fixed height - auto-expand with content
    className,
    promptSuggestions,
    compact = false,
    isAuthenticated = false,
    userPlan = 'free',
    isSuperUser = false,
    locationInfo
}: UnifiedAgentChatProps) {
    // Get role config (use public config if role is 'public')
    const config = role === 'public' ? PUBLIC_CONFIG : getChatConfigForRole(role);
    
    // Use provided prompts or fallback to role config
    const suggestions = promptSuggestions || config.promptSuggestions;
    
    // Icon and theme
    const Icon = ICON_MAP[config.iconName] || Sparkles;
    const theme = THEME_COLORS[config.themeColor] || THEME_COLORS.emerald;

    // Critical Security: Force clear session on mount for public/demo roles
    // This prevents "chat leaks" from privileged dashboards (Super User/Brand) 
    // from appearing on the public homepage.
    useEffect(() => {
        if (role === 'public') {
            useAgentChatStore.getState().clearCurrentSession();
        }
    }, [role]);

    return (
        <div className={cn(
            "rounded-xl border bg-card shadow-sm flex flex-col",
            height,
            className
        )}>
            {/* Header */}
            {showHeader && !compact && (
                <div className={cn("p-4 border-b", theme.bg)}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className={cn("font-semibold text-sm flex items-center gap-2", theme.text)}>
                            <Icon className={cn("h-4 w-4", theme.icon)} />
                            {config.title}
                        </h3>
                        
                        <div className="flex items-center gap-2">
                             {/* New Chat Button (Public/Demo/All Roles) */}
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                    useAgentChatStore.getState().clearCurrentSession();
                                    // Optional: Trigger a toast or visual feedback
                                }}
                            >
                                <MessageSquarePlus className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">New Chat</span>
                            </Button>

                            {/* Location Badge or Role Badge */}
                            {/* Location Badge or Role Badge */}
                            {locationInfo ? (
                                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 animate-in fade-in">
                                    📍 Found {locationInfo.dispensaryCount} dispensaries & {locationInfo.brandCount} brands near {locationInfo.city}
                                </span>
                            ) : (
                                <Badge
                                    variant="outline"
                                    className={cn("text-xs", theme.text, theme.border)}
                                >
                                    {role === 'public' ? 'Demo' : `${config.role.replace('_', ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')} Mode`}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{config.subtitle}</p>
                </div>
            )}

            {/* Compact header */}
            {showHeader && compact && (
                <div className={cn("px-3 py-2 border-b flex items-center gap-2", theme.bg)}>
                    <Icon className={cn("h-4 w-4", theme.icon)} />
                    <span className={cn("font-medium text-sm", theme.text)}>{config.title}</span>
                </div>
            )}

            {/* Chat Interface - PuffChat with unified props */}
            <div className="flex-1 overflow-hidden">
                <PuffChat
                    initialTitle={config.title}
                    promptSuggestions={suggestions}
                    hideHeader={showHeader} // Hide PuffChat's internal header if we show our own
                    isAuthenticated={isAuthenticated}
                    isSuperUser={isSuperUser}
                    locationInfo={locationInfo} // Pass location context
                    persona={config.agentPersona as any}
                    className="h-full"
                />
            </div>
        </div>
    );
}

// Re-export types for convenience
export type { UserRoleForChat, RoleChatConfig };
