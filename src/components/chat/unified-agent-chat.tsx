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
import { getChatConfigForRole, type UserRoleForChat, type RoleChatConfig } from '@/lib/chat/role-chat-config';
import { cn } from '@/lib/utils';
import { Sparkles, Briefcase, Store, ShoppingCart, Shield, type LucideIcon } from 'lucide-react';
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
    isSuperUser?: boolean;
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
        'How does BakedBot work?',
        'Find dispensaries near me',
        'Explain the pricing model',
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
    height = 'h-[500px]',
    className,
    promptSuggestions,
    compact = false,
    isAuthenticated = false,
    userPlan = 'free',
    isSuperUser = false,
}: UnifiedAgentChatProps) {
    // Get role config (use public config if role is 'public')
    const config = role === 'public' ? PUBLIC_CONFIG : getChatConfigForRole(role);
    
    // Use provided prompts or fallback to role config
    const suggestions = promptSuggestions || config.promptSuggestions;
    
    // Icon and theme
    const Icon = ICON_MAP[config.iconName] || Sparkles;
    const theme = THEME_COLORS[config.themeColor] || THEME_COLORS.emerald;

    return (
        <div className={cn(
            "rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col",
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
                        <Badge
                            variant="outline"
                            className={cn("text-xs", theme.text, theme.border)}
                        >
                            {role === 'public' ? 'Demo' : `${config.role.charAt(0).toUpperCase() + config.role.slice(1)} Mode`}
                        </Badge>
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
                    className="h-full"
                />
            </div>
        </div>
    );
}

// Re-export types for convenience
export type { UserRoleForChat, RoleChatConfig };
