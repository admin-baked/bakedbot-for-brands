'use client';

import React from 'react';
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AGENT_REGISTRY, type AgentId } from '@/lib/agents/registry';
import { AgentStatusIndicator, agentText } from '@/components/ui/agent-status-indicator';

export interface TaskFeedItemProps {
    agent: {
        id?: string;
        name: string;
        role: string;
        img?: string;
    };
    task: string;
    progress: number;
    status: 'live' | 'completed' | 'failed' | 'idle';
    className?: string;
}

export function TaskFeedItem({ item, className }: { item: TaskFeedItemProps; className?: string }) {
    const isLive = item.status === 'live';
    const def = item.agent.id ? AGENT_REGISTRY[item.agent.id as AgentId] : undefined;
    const visual = def?.visual ?? { emoji: item.agent.name[0], color: 'slate-500' };
    const textColor = agentText(visual.color);

    return (
        <Card className={cn("bg-baked-card/50 border-baked-border shadow-md mt-auto backdrop-blur-md", className)}>
            <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between border-b border-baked-border/50">
                <CardTitle className="text-xs font-semibold text-baked-text-primary uppercase tracking-wider">Task Feed</CardTitle>
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={isLive ? { opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isLive ? `bg-${visual.color} shadow-[0_0_8px_rgba(74,222,128,0.6)]` : "bg-baked-text-muted"
                        )}
                    />
                    <span className={cn(
                        "text-[10px] font-medium font-mono uppercase",
                        isLive ? textColor : "text-baked-text-muted"
                    )}>
                        {isLive ? 'LIVE' : 'IDLE'}
                    </span>
                    <MoreHorizontal className="w-3 h-3 text-baked-text-muted ml-1" />
                </div>
            </CardHeader>
            <CardContent className="px-4 py-3">
                <div className="flex gap-3 items-center">
                    <AgentStatusIndicator
                        visual={visual}
                        name={item.agent.name}
                        image={item.agent.img}
                        status={isLive ? 'working' : 'online'}
                        isActive={isLive}
                        size="md"
                    />

                    <div className="flex-1 space-y-1.5 relative z-10 min-w-0">
                        <div className="flex justify-between items-center">
                            <span className={cn("text-xs font-semibold truncate", textColor)}>{item.agent.name} ({item.agent.role})</span>
                            <span className={cn("text-[10px] font-mono", textColor)}>{item.progress}%</span>
                        </div>
                        <p className="text-xs text-baked-text-secondary truncate">{item.task}</p>
                        <Progress value={item.progress} className="h-1 bg-black/40" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
