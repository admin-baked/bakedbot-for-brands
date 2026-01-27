'use client';

import React from 'react';
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface TaskFeedItemProps {
    agent: {
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
                            isLive ? "bg-baked-green shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "bg-baked-text-muted"
                        )}
                    />
                    <span className={cn(
                        "text-[10px] font-medium font-mono",
                        isLive ? "text-baked-green" : "text-baked-text-muted"
                    )}>
                        {isLive ? 'LIVE' : 'IDLE'}
                    </span>
                    <MoreHorizontal className="w-3 h-3 text-baked-text-muted ml-1" />
                </div>
            </CardHeader>
            <CardContent className="px-4 py-3">
                <div className="flex gap-3 items-center">
                    <div className="relative shrink-0">
                        <Avatar className="w-8 h-8 border border-baked-border">
                            <AvatarImage src={item.agent.img} />
                            <AvatarFallback>{item.agent.name[0]}</AvatarFallback>
                        </Avatar>
                        {isLive && (
                            <motion.div
                                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="absolute -inset-1 rounded-full border border-baked-green/40 z-0"
                            />
                        )}
                    </div>

                    <div className="flex-1 space-y-1.5 relative z-10 min-w-0">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-white truncate">{item.agent.name} ({item.agent.role})</span>
                            <span className="text-[10px] text-baked-green font-mono">{item.progress}%</span>
                        </div>
                        <p className="text-xs text-baked-text-secondary truncate">{item.task}</p>
                        <Progress value={item.progress} className="h-1 bg-black/40" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
