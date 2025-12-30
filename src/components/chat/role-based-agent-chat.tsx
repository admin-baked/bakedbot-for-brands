'use client';

/**
 * Role-Based Agent Chat
 * 
 * A generic agent chat component that adapts its UI and prompts
 * based on the user's role. Can be embedded in any dashboard.
 */

import { getChatConfigForRole, type UserRoleForChat, type RoleChatConfig } from '@/lib/chat/role-chat-config';
import { cn } from '@/lib/utils';
import { UnifiedAgentChat } from './unified-agent-chat';

export interface RoleBasedAgentChatProps {
    role: UserRoleForChat;
    className?: string;
    height?: string;
    compact?: boolean;
}

export function RoleBasedAgentChat({
    role,
    className,
    height = 'h-[500px]',
    compact = false
}: RoleBasedAgentChatProps) {
    return (
        <UnifiedAgentChat
            role={role}
            className={className}
            height={height}
            compact={compact}
            showHeader={true}
        />
    );
}

// Export for convenience
export { getChatConfigForRole, type UserRoleForChat, type RoleChatConfig };
