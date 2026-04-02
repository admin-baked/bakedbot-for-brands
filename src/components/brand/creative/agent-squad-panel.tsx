'use client';

/**
 * Agent Squad Panel
 *
 * Shows the active agents in the Creative Center with their status and capabilities.
 * Features Framer Motion animations for active agent indicators.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENT_REGISTRY, type AgentId, type AgentStatus } from '@/lib/agents/registry';
import { AgentStatusIndicator, agentText } from '@/components/ui/agent-status-indicator';

interface CreativeAgent {
    id: AgentId;
    status: AgentStatus;
    capabilities: string[];
}

interface AgentSquadPanelProps {
    onAgentSelect?: (agentId: string) => void;
    className?: string;
}

const CREATIVE_AGENTS: CreativeAgent[] = [
    { id: 'craig', status: 'online', capabilities: ['Caption Generation', 'Hashtag Strategy', 'Platform Optimization'] },
    { id: 'mrs_parker', status: 'offline', capabilities: ['Welcome Emails', 'Loyalty Programs', 'VIP Segments'] },
    { id: 'deebo', status: 'working', capabilities: ['Compliance Scanning', 'Redline Suggestions', 'State Regulations'] },
];

const STATUS_LABELS: Record<AgentStatus, { label: string; color: string }> = {
    online: { label: 'Ready', color: 'text-green-400' },
    thinking: { label: 'Thinking', color: 'text-amber-400' },
    working: { label: 'Working', color: 'text-amber-400' },
    offline: { label: 'Offline', color: 'text-slate-400' },
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
                {CREATIVE_AGENTS.map((entry) => {
                    const def = AGENT_REGISTRY[entry.id];
                    const statusLabel = STATUS_LABELS[entry.status];

                    return (
                        <div
                            key={entry.id}
                            className={cn(
                                'flex items-center gap-3 p-3 rounded-lg',
                                'bg-card/50 border border-border/30',
                                'hover:bg-card/80 hover:border-border/50 transition-all cursor-pointer'
                            )}
                            onClick={() => onAgentSelect?.(entry.id)}
                        >
                            <AgentStatusIndicator
                                visual={def.visual}
                                name={def.name}
                                image={def.image}
                                status={entry.status}
                                size="lg"
                            />

                            {/* Agent Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">
                                        {def.name}
                                    </span>
                                    <span className={cn('text-sm', agentText(def.visual.color))}>{def.visual.emoji}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{def.title}</p>
                            </div>

                            {/* Status Badge */}
                            <Badge
                                variant="secondary"
                                className={cn(
                                    'text-[10px] px-1.5 py-0',
                                    statusLabel.color
                                )}
                            >
                                {statusLabel.label}
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
