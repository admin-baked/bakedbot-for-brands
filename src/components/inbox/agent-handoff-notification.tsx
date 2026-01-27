'use client';

/**
 * Agent Handoff Notification Component
 *
 * Displays visual notifications when an agent hands off a conversation
 * to another agent within an inbox thread.
 */

import { motion } from 'framer-motion';
import { ArrowRight, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AgentHandoff, InboxAgentPersona } from '@/types/inbox';
import { format } from 'date-fns';

// Agent display configuration
const AGENT_CONFIG: Record<InboxAgentPersona, { name: string; emoji: string; color: string }> = {
    smokey: { name: 'Smokey', emoji: '🌿', color: 'text-emerald-500' },
    money_mike: { name: 'Money Mike', emoji: '💰', color: 'text-yellow-500' },
    craig: { name: 'Craig', emoji: '📣', color: 'text-blue-500' },
    ezal: { name: 'Ezal', emoji: '👀', color: 'text-purple-500' },
    deebo: { name: 'Deebo', emoji: '🛡️', color: 'text-red-500' },
    pops: { name: 'Pops', emoji: '📊', color: 'text-cyan-500' },
    day_day: { name: 'Day Day', emoji: '📦', color: 'text-orange-500' },
    mrs_parker: { name: 'Mrs. Parker', emoji: '💝', color: 'text-pink-500' },
    big_worm: { name: 'Big Worm', emoji: '🔬', color: 'text-indigo-500' },
    roach: { name: 'Roach', emoji: '📚', color: 'text-teal-500' },
    leo: { name: 'Leo', emoji: '🦁', color: 'text-amber-600' },
    jack: { name: 'Jack', emoji: '📈', color: 'text-green-600' },
    linus: { name: 'Linus', emoji: '🔧', color: 'text-slate-600' },
    glenda: { name: 'Glenda', emoji: '✨', color: 'text-fuchsia-500' },
    mike: { name: 'Mike', emoji: '💼', color: 'text-blue-600' },
    auto: { name: 'Auto', emoji: '🤖', color: 'text-gray-500' },
};

interface AgentHandoffNotificationProps {
    handoff: AgentHandoff;
    className?: string;
}

export function AgentHandoffNotification({ handoff, className = '' }: AgentHandoffNotificationProps) {
    const fromConfig = AGENT_CONFIG[handoff.fromAgent];
    const toConfig = AGENT_CONFIG[handoff.toAgent];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center justify-center my-4 ${className}`}
        >
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar/60 backdrop-blur-sm border border-border/50 max-w-md">
                {/* From Agent */}
                <div className="flex items-center gap-2">
                    <span className="text-lg">{fromConfig.emoji}</span>
                    <span className={`text-sm font-medium ${fromConfig.color}`}>
                        {fromConfig.name}
                    </span>
                </div>

                {/* Arrow */}
                <motion.div
                    initial={{ x: -5 }}
                    animate={{ x: 0 }}
                    transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "easeInOut"
                    }}
                >
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </motion.div>

                {/* To Agent */}
                <div className="flex items-center gap-2">
                    <span className="text-lg">{toConfig.emoji}</span>
                    <span className={`text-sm font-medium ${toConfig.color}`}>
                        {toConfig.name}
                    </span>
                </div>

                {/* Info */}
                <div className="ml-auto flex items-center gap-2">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                        {format(handoff.timestamp, 'h:mm a')}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

interface AgentHandoffMessageProps {
    handoff: AgentHandoff;
    className?: string;
}

export function AgentHandoffMessage({ handoff, className = '' }: AgentHandoffMessageProps) {
    const fromConfig = AGENT_CONFIG[handoff.fromAgent];
    const toConfig = AGENT_CONFIG[handoff.toAgent];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className={`flex justify-center my-6 ${className}`}
        >
            <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-br from-sidebar/80 to-sidebar/60 backdrop-blur-xl border border-border/50 max-w-lg shadow-lg">
                {/* Icon Row */}
                <div className="flex items-center gap-4">
                    <motion.div
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center gap-2"
                    >
                        <span className="text-2xl">{fromConfig.emoji}</span>
                    </motion.div>

                    <motion.div
                        animate={{ x: [0, 10, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <ArrowRight className="w-5 h-5 text-primary" />
                    </motion.div>

                    <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: [0.9, 1, 0.9] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                        className="flex items-center gap-2"
                    >
                        <span className="text-2xl">{toConfig.emoji}</span>
                    </motion.div>
                </div>

                {/* Message */}
                <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">
                        <span className={fromConfig.color}>{fromConfig.name}</span>
                        {' is consulting '}
                        <span className={toConfig.color}>{toConfig.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{handoff.reason}</p>
                </div>

                {/* Badge */}
                <Badge variant="outline" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    Agent Handoff
                </Badge>
            </div>
        </motion.div>
    );
}

interface AgentHandoffHistoryProps {
    handoffs: AgentHandoff[];
    className?: string;
}

export function AgentHandoffHistory({ handoffs, className = '' }: AgentHandoffHistoryProps) {
    if (handoffs.length === 0) {
        return null;
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-3">
                <Users className="w-3 h-3" />
                Agent Transitions
            </div>
            <div className="space-y-2">
                {handoffs.map((handoff) => {
                    const fromConfig = AGENT_CONFIG[handoff.fromAgent];
                    const toConfig = AGENT_CONFIG[handoff.toAgent];

                    return (
                        <motion.div
                            key={handoff.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-2 rounded-md bg-sidebar/40 border border-border/30"
                        >
                            <div className="flex items-center gap-2 flex-1">
                                <span className="text-sm">{fromConfig.emoji}</span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{toConfig.emoji}</span>
                                <span className="text-xs text-muted-foreground truncate">
                                    {handoff.reason}
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(handoff.timestamp, 'MMM d, h:mm a')}
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
