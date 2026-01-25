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

// ============ Agent Colors & Config ============

export const AGENT_PULSE_CONFIG: Record<InboxAgentPersona, {
    name: string;
    avatar: string;
    color: string;
    bgColor: string;
    textColor: string;
}> = {
    // Field Agents
    smokey: { name: 'Smokey', avatar: '🌿', color: 'bg-emerald-500', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-500' },
    money_mike: { name: 'Money Mike', avatar: '💰', color: 'bg-amber-500', bgColor: 'bg-amber-500/10', textColor: 'text-amber-500' },
    craig: { name: 'Craig', avatar: '📣', color: 'bg-blue-500', bgColor: 'bg-blue-500/10', textColor: 'text-blue-500' },
    ezal: { name: 'Ezal', avatar: '🔍', color: 'bg-purple-500', bgColor: 'bg-purple-500/10', textColor: 'text-purple-500' },
    deebo: { name: 'Deebo', avatar: '🛡️', color: 'bg-red-500', bgColor: 'bg-red-500/10', textColor: 'text-red-500' },
    pops: { name: 'Pops', avatar: '📊', color: 'bg-orange-500', bgColor: 'bg-orange-500/10', textColor: 'text-orange-500' },
    day_day: { name: 'Day Day', avatar: '📦', color: 'bg-cyan-500', bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-500' },
    mrs_parker: { name: 'Mrs. Parker', avatar: '💜', color: 'bg-pink-500', bgColor: 'bg-pink-500/10', textColor: 'text-pink-500' },
    big_worm: { name: 'Big Worm', avatar: '🐛', color: 'bg-indigo-500', bgColor: 'bg-indigo-500/10', textColor: 'text-indigo-500' },
    roach: { name: 'Roach', avatar: '📚', color: 'bg-teal-500', bgColor: 'bg-teal-500/10', textColor: 'text-teal-500' },
    // Executive Agents
    leo: { name: 'Leo', avatar: '⚙️', color: 'bg-slate-500', bgColor: 'bg-slate-500/10', textColor: 'text-slate-400' },
    jack: { name: 'Jack', avatar: '📈', color: 'bg-violet-500', bgColor: 'bg-violet-500/10', textColor: 'text-violet-500' },
    linus: { name: 'Linus', avatar: '🖥️', color: 'bg-sky-500', bgColor: 'bg-sky-500/10', textColor: 'text-sky-500' },
    glenda: { name: 'Glenda', avatar: '✨', color: 'bg-rose-500', bgColor: 'bg-rose-500/10', textColor: 'text-rose-500' },
    mike: { name: 'Mike', avatar: '💵', color: 'bg-lime-500', bgColor: 'bg-lime-500/10', textColor: 'text-lime-500' },
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
