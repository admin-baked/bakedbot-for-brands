'use client';

/**
 * Inbox Task Feed
 *
 * Real-time agent activity visualization with pulse animations.
 * Shows granular progress: "Deebo is scanning for compliance violations..."
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import type { InboxAgentPersona } from '@/types/inbox';
import type { Thought } from '@/hooks/use-job-poller';
import { AGENT_REGISTRY, type AgentId } from '@/lib/agents/registry';
import { agentBg, agentBgMuted, agentText } from '@/components/ui/agent-status-indicator';

// ============ Agent Colors & Config ============

/** Build pulse config from registry for known agents, with overrides for extended personas */
function buildPulseConfig(id: string, fallback: { name: string; avatar: string; color: string }) {
    const def = AGENT_REGISTRY[id as AgentId];
    if (def) {
        return {
            name: def.name,
            avatar: def.visual.emoji,
            color: agentBg(def.visual.color),
            bgColor: agentBgMuted(def.visual.color),
            textColor: agentText(def.visual.color),
        };
    }
    return {
        name: fallback.name,
        avatar: fallback.avatar,
        color: `bg-${fallback.color}`,
        bgColor: `bg-${fallback.color}/10`,
        textColor: `text-${fallback.color}`,
    };
}

export const AGENT_PULSE_CONFIG: Record<InboxAgentPersona, {
    name: string;
    avatar: string;
    color: string;
    bgColor: string;
    textColor: string;
}> = {
    // Registry-derived agents (canonical colors)
    smokey: buildPulseConfig('smokey', { name: 'Smokey', avatar: '🌿', color: 'emerald-500' }),
    money_mike: buildPulseConfig('money_mike', { name: 'Money Mike', avatar: '💰', color: 'amber-500' }),
    craig: buildPulseConfig('craig', { name: 'Craig', avatar: '📣', color: 'blue-500' }),
    ezal: buildPulseConfig('ezal', { name: 'Ezal', avatar: '🔍', color: 'purple-500' }),
    deebo: buildPulseConfig('deebo', { name: 'Deebo', avatar: '🛡️', color: 'red-500' }),
    pops: buildPulseConfig('pops', { name: 'Pops', avatar: '📊', color: 'orange-500' }),
    mrs_parker: buildPulseConfig('mrs_parker', { name: 'Mrs. Parker', avatar: '💜', color: 'pink-500' }),
    // Extended agents (not yet in registry — keep manual config)
    day_day: buildPulseConfig('day_day', { name: 'Day Day', avatar: '📦', color: 'cyan-500' }),
    big_worm: buildPulseConfig('big_worm', { name: 'Big Worm', avatar: '🐛', color: 'indigo-500' }),
    roach: buildPulseConfig('roach', { name: 'Roach', avatar: '📚', color: 'teal-500' }),
    // Executive Agents
    leo: buildPulseConfig('leo', { name: 'Leo', avatar: '⚙️', color: 'slate-500' }),
    jack: buildPulseConfig('jack', { name: 'Jack', avatar: '📈', color: 'violet-500' }),
    linus: buildPulseConfig('linus', { name: 'Linus', avatar: '🖥️', color: 'sky-500' }),
    glenda: buildPulseConfig('glenda', { name: 'Glenda', avatar: '✨', color: 'rose-500' }),
    mike: buildPulseConfig('mike', { name: 'Mike', avatar: '💵', color: 'lime-500' }),
    // Auto-routing
    auto: { name: 'Assistant', avatar: '🤖', color: 'bg-primary', bgColor: 'bg-primary/10', textColor: 'text-primary' },
};

// ============ Props ============

interface InboxTaskFeedProps {
    agentPersona: InboxAgentPersona;
    thoughts?: Thought[];
    isRunning?: boolean;
    currentAction?: string;
    progress?: number;
    className?: string;
}

// ============ Thought Item ============

function ThoughtItem({ thought, agentConfig }: { thought: Thought; agentConfig: typeof AGENT_PULSE_CONFIG[InboxAgentPersona] }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-start gap-2 py-1.5"
        >
            <CheckCircle2 className={cn('h-3.5 w-3.5 mt-0.5 flex-shrink-0', agentConfig.textColor)} />
            <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground/80 truncate">{thought.title}</p>
                {thought.durationMs && (
                    <p className="text-[10px] text-muted-foreground">
                        {(thought.durationMs / 1000).toFixed(1)}s
                    </p>
                )}
            </div>
        </motion.div>
    );
}

// ============ Main Component ============

export function InboxTaskFeed({
    agentPersona,
    thoughts = [],
    isRunning = true,
    currentAction,
    progress,
    className,
}: InboxTaskFeedProps) {
    const agentConfig = AGENT_PULSE_CONFIG[agentPersona] || AGENT_PULSE_CONFIG.auto;

    // Default action based on agent
    const displayAction = currentAction || getDefaultAction(agentPersona);

    return (
        <Card className={cn(
            'bg-card/50 backdrop-blur-sm border-white/10 shadow-lg',
            className
        )}>
            <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        Task Feed
                        {/* Live indicator */}
                        <span className="flex items-center gap-1.5">
                            <motion.span
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className={cn('w-1.5 h-1.5 rounded-full', agentConfig.color)}
                            />
                            <span className={cn('text-[10px] uppercase tracking-wider', agentConfig.textColor)}>
                                Live
                            </span>
                        </span>
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
                {/* Agent Activity Row */}
                <div className="flex items-center gap-3">
                    {/* Agent Avatar with Pulse */}
                    <div className="relative">
                        <Avatar className={cn('h-9 w-9 border-2', `border-${agentConfig.textColor.replace('text-', '')}`)}>
                            <AvatarFallback className={agentConfig.bgColor}>
                                <span className="text-base">{agentConfig.avatar}</span>
                            </AvatarFallback>
                        </Avatar>
                        {/* Pulse Ring Animation */}
                        {isRunning && (
                            <motion.div
                                animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0.7] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className={cn(
                                    'absolute -inset-1 rounded-full -z-10',
                                    agentConfig.color,
                                    'opacity-30'
                                )}
                            />
                        )}
                    </div>

                    {/* Status Text */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className={cn('text-sm font-medium', agentConfig.textColor)}>
                                {agentConfig.name}
                            </span>
                            {isRunning && (
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {displayAction}
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                {progress !== undefined && (
                    <div className="flex items-center gap-2 mt-3">
                        <Progress
                            value={progress}
                            className="h-1.5 flex-1 bg-muted/50"
                        />
                        <span className="text-xs text-muted-foreground w-10 text-right">
                            {progress}%
                        </span>
                    </div>
                )}

                {/* Thought Stream */}
                {thoughts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-0.5 max-h-32 overflow-y-auto">
                        <AnimatePresence mode="popLayout">
                            {thoughts.slice(-5).map((thought) => (
                                <ThoughtItem
                                    key={thought.id}
                                    thought={thought}
                                    agentConfig={agentConfig}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ============ Helpers ============

function getDefaultAction(persona: InboxAgentPersona): string {
    const actions: Record<InboxAgentPersona, string> = {
        smokey: 'Analyzing product recommendations...',
        money_mike: 'Calculating optimal pricing...',
        craig: 'Drafting marketing content...',
        ezal: 'Scanning competitive landscape...',
        deebo: 'Checking compliance requirements...',
        pops: 'Crunching the numbers...',
        day_day: 'Reviewing inventory levels...',
        mrs_parker: 'Personalizing customer experience...',
        big_worm: 'Conducting deep research...',
        roach: 'Searching knowledge base...',
        leo: 'Coordinating operations...',
        jack: 'Analyzing revenue opportunities...',
        linus: 'Processing technical analysis...',
        glenda: 'Crafting marketing strategy...',
        mike: 'Reviewing financials...',
        auto: 'Processing your request...',
    };
    return actions[persona] || 'Processing...';
}

export default InboxTaskFeed;
