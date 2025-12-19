'use client';

/**
 * Role-Based Agent Chat
 * 
 * A generic agent chat component that adapts its UI and prompts
 * based on the user's role. Can be embedded in any dashboard.
 */

import { PuffChat } from '@/app/dashboard/ceo/components/puff-chat';
import { getChatConfigForRole, type UserRoleForChat, type RoleChatConfig } from '@/lib/chat/role-chat-config';
import {
    Sparkles,
    Briefcase,
    Store,
    Edit3,
    ShoppingCart,
    Shield,
    type LucideIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RoleBasedAgentChatProps {
    role: UserRoleForChat;
    className?: string;
    height?: string;
    compact?: boolean;
}

// Icon mapping
const ICON_MAP: Record<RoleChatConfig['iconName'], LucideIcon> = {
    'sparkles': Sparkles,
    'briefcase': Briefcase,
    'store': Store,
    'edit': Edit3,
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

export function RoleBasedAgentChat({
    role,
    className,
    height = 'h-[500px]',
    compact = false
}: RoleBasedAgentChatProps) {
    const config = getChatConfigForRole(role);
    const Icon = ICON_MAP[config.iconName] || Sparkles;
    const theme = THEME_COLORS[config.themeColor] || THEME_COLORS.primary;

    return (
        <div className={cn(
            "rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col",
            height,
            className
        )}>
            {/* Header */}
            {!compact && (
                <div className={cn("p-4 border-b", theme.bg)}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className={cn("font-semibold text-sm flex items-center gap-2", theme.text)}>
                            <Icon className={cn("h-4 w-4", theme.icon)} />
                            {config.title}
                        </h3>
                        <Badge
                            variant="outline"
                            className={cn("text-xs", theme.bg.replace('gradient-to-r', ''), theme.text, theme.border)}
                        >
                            {config.role.charAt(0).toUpperCase() + config.role.slice(1)} Mode
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{config.subtitle}</p>
                </div>
            )}

            {/* Compact header */}
            {compact && (
                <div className={cn("px-3 py-2 border-b flex items-center gap-2", theme.bg)}>
                    <Icon className={cn("h-4 w-4", theme.icon)} />
                    <span className={cn("font-medium text-sm", theme.text)}>{config.title}</span>
                </div>
            )}

            {/* Chat Interface */}
            <div className="flex-1 overflow-hidden">
                <PuffChat
                    initialTitle={config.title}
                    promptSuggestions={config.promptSuggestions}
                />
            </div>
        </div>
    );
}

// Export for convenience
export { getChatConfigForRole, type UserRoleForChat, type RoleChatConfig };
