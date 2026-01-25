'use client';

/**
 * Agent Squad Panel
 *
 * Shows the active agents in the Creative Center with their status and capabilities.
 * Features Framer Motion animations for active agent indicators.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    MoreHorizontal,
    Sparkles,
    ShieldAlert,
    Palette,
    MessageSquare,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type AgentStatus = 'active' | 'idle' | 'working' | 'offline';

interface Agent {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    initials: string;
    status: AgentStatus;
    icon: typeof Sparkles;
    color: string;
    capabilities: string[];
}

interface AgentSquadPanelProps {
    onAgentSelect?: (agentId: string) => void;
    className?: string;
}

const CREATIVE_AGENTS: Agent[] = [
    {
        id: 'craig',
        name: 'Craig',
        role: 'Marketer',
        initials: 'C',
        status: 'active',
        icon: MessageSquare,
        color: 'text-purple-400',
        capabilities: ['Caption Generation', 'Hashtag Strategy', 'Platform Optimization'],
    },
    {
        id: 'nano-banana',
        name: 'Nano Banana',
        role: 'Visual Artist',
        initials: 'NB',
        status: 'idle',
        icon: Palette,
        color: 'text-amber-400',
        capabilities: ['Product Images', 'Lifestyle Photos', '4K Social Assets'],
    },
    {
        id: 'deebo',
        name: 'Deebo',
        role: 'Enforcer',
        initials: 'D',
        status: 'working',
        icon: ShieldAlert,
        color: 'text-red-400',
        capabilities: ['Compliance Scanning', 'Redline Suggestions', 'State Regulations'],
    },
];

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; bgColor: string }> = {
    active: { label: 'Ready', color: 'text-green-400', bgColor: 'bg-green-400' },
    idle: { label: 'Idle', color: 'text-slate-400', bgColor: 'bg-slate-400' },
    working: { label: 'Working', color: 'text-amber-400', bgColor: 'bg-amber-400' },
    offline: { label: 'Offline', color: 'text-red-400', bgColor: 'bg-red-400' },
};

export function AgentSquadPanel({ onAgentSelect, className }: AgentSquadPanelProps) {
    return (
        <Card className={cn('glass-card glass-card-hover', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Creative Squad
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-3">
                {CREATIVE_AGENTS.map((agent) => {
                    const statusConfig = STATUS_CONFIG[agent.status];
                    const Icon = agent.icon;

                    return (
                        <div
                            key={agent.id}
                            className={cn(
                                'flex items-center gap-3 p-3 rounded-lg',
                                'bg-card/50 border border-border/30',
                                'hover:bg-card/80 hover:border-border/50 transition-all cursor-pointer'
                            )}
                            onClick={() => onAgentSelect?.(agent.id)}
                        >
                            {/* Agent Avatar with Status Indicator */}
                            <div className="relative">
                                <Avatar className="h-10 w-10">
                                    {agent.avatar && <AvatarImage src={agent.avatar} />}
                                    <AvatarFallback className="bg-secondary text-sm">
                                        {agent.initials}
                                    </AvatarFallback>
                                </Avatar>
                                {/* Status dot with pulse for working */}
                                <div
                                    className={cn(
                                        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                                        statusConfig.bgColor
                                    )}
                                >
                                    {agent.status === 'working' && (
                                        <motion.div
                                            className={cn(
                                                'absolute inset-0 rounded-full',
                                                statusConfig.bgColor
                                            )}
                                            initial={{ scale: 1, opacity: 0.8 }}
                                            animate={{ scale: 1.5, opacity: 0 }}
                                            transition={{
                                                duration: 1,
                                                repeat: Infinity,
                                                ease: 'easeOut',
                                            }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Agent Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">
                                        {agent.name}
                                    </span>
                                    <Icon className={cn('h-3.5 w-3.5', agent.color)} />
                                </div>
                                <p className="text-xs text-muted-foreground">{agent.role}</p>
                            </div>

                            {/* Status Badge */}
                            <Badge
                                variant="secondary"
                                className={cn(
                                    'text-[10px] px-1.5 py-0',
                                    statusConfig.color
                                )}
                            >
                                {statusConfig.label}
                            </Badge>
                        </div>
                    );
                })}

                {/* Capabilities Section */}
                <div className="pt-3 mt-3 border-t border-border/30">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        Active Capabilities
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                        {CREATIVE_AGENTS.filter((a) => a.status !== 'offline')
                            .flatMap((a) => a.capabilities.slice(0, 2))
                            .slice(0, 6)
                            .map((cap, index) => (
                                <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-[10px] bg-secondary/30"
                                >
                                    {cap}
                                </Badge>
                            ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default AgentSquadPanel;
