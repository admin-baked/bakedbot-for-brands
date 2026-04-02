'use client';

/**
 * AgentStatusIndicator
 *
 * Unified agent avatar + status display used across all UI surfaces.
 * Derives colors and emoji from the canonical agent registry.
 */

import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { AgentStatus, AgentVisual } from '@/lib/agents/registry';

// Static color map — Tailwind JIT needs full class strings to be present in source.
// Dynamic interpolation like `bg-${color}` is purged at build time.
const COLOR_MAP: Record<string, { bg: string; text: string; bgMuted: string; border: string }> = {
    'emerald-500': { bg: 'bg-emerald-500', text: 'text-emerald-500', bgMuted: 'bg-emerald-500/10', border: 'border-emerald-500' },
    'blue-500':    { bg: 'bg-blue-500',    text: 'text-blue-500',    bgMuted: 'bg-blue-500/10',    border: 'border-blue-500' },
    'orange-500':  { bg: 'bg-orange-500',  text: 'text-orange-500',  bgMuted: 'bg-orange-500/10',  border: 'border-orange-500' },
    'purple-500':  { bg: 'bg-purple-500',  text: 'text-purple-500',  bgMuted: 'bg-purple-500/10',  border: 'border-purple-500' },
    'amber-500':   { bg: 'bg-amber-500',   text: 'text-amber-500',   bgMuted: 'bg-amber-500/10',   border: 'border-amber-500' },
    'pink-500':    { bg: 'bg-pink-500',     text: 'text-pink-500',    bgMuted: 'bg-pink-500/10',    border: 'border-pink-500' },
    'red-500':     { bg: 'bg-red-500',      text: 'text-red-500',     bgMuted: 'bg-red-500/10',     border: 'border-red-500' },
    'slate-500':   { bg: 'bg-slate-500',    text: 'text-slate-500',   bgMuted: 'bg-slate-500/10',   border: 'border-slate-500' },
    'cyan-500':    { bg: 'bg-cyan-500',     text: 'text-cyan-500',    bgMuted: 'bg-cyan-500/10',    border: 'border-cyan-500' },
    'indigo-500':  { bg: 'bg-indigo-500',   text: 'text-indigo-500',  bgMuted: 'bg-indigo-500/10',  border: 'border-indigo-500' },
    'teal-500':    { bg: 'bg-teal-500',     text: 'text-teal-500',    bgMuted: 'bg-teal-500/10',    border: 'border-teal-500' },
    'violet-500':  { bg: 'bg-violet-500',   text: 'text-violet-500',  bgMuted: 'bg-violet-500/10',  border: 'border-violet-500' },
    'sky-500':     { bg: 'bg-sky-500',      text: 'text-sky-500',     bgMuted: 'bg-sky-500/10',     border: 'border-sky-500' },
    'rose-500':    { bg: 'bg-rose-500',     text: 'text-rose-500',    bgMuted: 'bg-rose-500/10',    border: 'border-rose-500' },
    'lime-500':    { bg: 'bg-lime-500',     text: 'text-lime-500',    bgMuted: 'bg-lime-500/10',    border: 'border-lime-500' },
};

const FALLBACK_COLORS = { bg: 'bg-slate-500', text: 'text-slate-500', bgMuted: 'bg-slate-500/10', border: 'border-slate-500' };

function resolveColors(color: string) {
    return COLOR_MAP[color] ?? FALLBACK_COLORS;
}

export function agentBg(color: string) { return resolveColors(color).bg; }
export function agentText(color: string) { return resolveColors(color).text; }
export function agentBgMuted(color: string) { return resolveColors(color).bgMuted; }
export function agentBorder(color: string) { return resolveColors(color).border; }

export function statusDotColor(status: AgentStatus): string {
    switch (status) {
        case 'online': return 'bg-green-500';
        case 'working': return 'bg-amber-500';
        case 'thinking': return 'bg-amber-500';
        case 'offline': return 'bg-gray-400';
    }
}

interface AgentStatusIndicatorProps {
    visual: AgentVisual;
    name: string;
    image?: string;
    status: AgentStatus;
    isActive?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const SIZE_MAP = {
    sm: { avatar: 'h-6 w-6', emoji: 'text-xs', dot: 'w-2 h-2', dotPos: '-bottom-0.5 -right-0.5' },
    md: { avatar: 'h-9 w-9', emoji: 'text-base', dot: 'w-2.5 h-2.5', dotPos: '-bottom-0.5 -right-0.5' },
    lg: { avatar: 'h-10 w-10', emoji: 'text-lg', dot: 'w-3 h-3', dotPos: '-bottom-0.5 -right-0.5' },
};

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
    const colors = resolveColors(visual.color);
    const showPulse = isActive || status === 'working' || status === 'thinking';

    return (
        <div className={cn('relative', className)}>
            <Avatar className={cn(s.avatar, 'border', colors.border)}>
                {image && <AvatarImage src={image} alt={name} />}
                <AvatarFallback className={colors.bgMuted}>
                    <span className={s.emoji}>{visual.emoji}</span>
                </AvatarFallback>
            </Avatar>

            <div
                className={cn(
                    'absolute rounded-full border-2 border-background',
                    s.dot,
                    s.dotPos,
                    statusDotColor(status),
                )}
            />

            {showPulse && (
                <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={cn(
                        'absolute -inset-1 rounded-full -z-10',
                        colors.bg,
                        'opacity-30',
                    )}
                />
            )}
        </div>
    );
}

export default AgentStatusIndicator;
