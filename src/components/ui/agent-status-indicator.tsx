'use client';

/**
 * AgentStatusIndicator
 *
 * Unified agent avatar + status display used across all UI surfaces.
 * Derives colors and emoji from the canonical agent registry.
 *
 * Ensures consistent visual identity for agents in:
 * - Sidebar squad list
 * - Creative center squad panel
 * - Inbox task feed
 * - Agentic dashboard task feed
 */

import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { AgentStatus, AgentVisual } from '@/lib/agents/registry';

// ============ Color helpers ============

/** Build Tailwind class from a base color token like 'emerald-500' */
export function agentBg(color: string) { return `bg-${color}`; }
export function agentText(color: string) { return `text-${color}`; }
export function agentBgMuted(color: string) { return `bg-${color}/10`; }
export function agentBorder(color: string) { return `border-${color}`; }

/** Status dot color — maps agent status to a consistent color */
export function statusDotColor(status: AgentStatus): string {
    switch (status) {
        case 'online': return 'bg-green-500';
        case 'working': return 'bg-amber-500';
        case 'thinking': return 'bg-amber-500';
        case 'offline': return 'bg-gray-400';
    }
}

// ============ Props ============

interface AgentStatusIndicatorProps {
    /** Agent visual config from registry */
    visual: AgentVisual;
    /** Agent name for alt text */
    name: string;
    /** Optional image URL — falls back to emoji */
    image?: string;
    /** Current status */
    status: AgentStatus;
    /** Whether the agent is actively running a task (shows pulse) */
    isActive?: boolean;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const SIZE_MAP = {
    sm: { avatar: 'h-6 w-6', emoji: 'text-xs', dot: 'w-2 h-2', dotPos: '-bottom-0.5 -right-0.5' },
    md: { avatar: 'h-9 w-9', emoji: 'text-base', dot: 'w-2.5 h-2.5', dotPos: '-bottom-0.5 -right-0.5' },
    lg: { avatar: 'h-10 w-10', emoji: 'text-lg', dot: 'w-3 h-3', dotPos: '-bottom-0.5 -right-0.5' },
};

// ============ Component ============

export function AgentStatusIndicator({
    visual,
    name,
    image,
    status,
    isActive = false,
    size = 'md',
    className,
}: AgentStatusIndicatorProps) {
    const s = SIZE_MAP[size];
    const showPulse = isActive || status === 'working' || status === 'thinking';

    return (
        <div className={cn('relative', className)}>
            <Avatar className={cn(s.avatar, 'border', agentBorder(visual.color))}>
                {image && <AvatarImage src={image} alt={name} />}
                <AvatarFallback className={agentBgMuted(visual.color)}>
                    <span className={s.emoji}>{visual.emoji}</span>
                </AvatarFallback>
            </Avatar>

            {/* Status dot */}
            <div
                className={cn(
                    'absolute rounded-full border-2 border-background',
                    s.dot,
                    s.dotPos,
                    statusDotColor(status),
                )}
            />

            {/* Pulse ring animation when active/working */}
            {showPulse && (
                <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={cn(
                        'absolute -inset-1 rounded-full -z-10',
                        agentBg(visual.color),
                        'opacity-30',
                    )}
                />
            )}
        </div>
    );
}

export default AgentStatusIndicator;
