'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThumbsUp, Edit2, Share, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MessageBubbleProps {
    isUser: boolean;
    name: string;
    role?: string;
    avatarSrc?: string;
    avatarFallback?: React.ReactNode;
    timestamp?: string;
    content: React.ReactNode;
    actions?: boolean;
    className?: string;
}

export function MessageBubble({
    isUser,
    name,
    role,
    avatarSrc,
    avatarFallback,
    timestamp,
    content,
    actions,
    className
}: MessageBubbleProps) {
    return (
        <div className={cn("flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-500", className)}>
            <Avatar className="w-10 h-10 border-2 border-baked-border/50 mt-1">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback>{avatarFallback || name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 max-w-2xl">
                <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="font-semibold text-white/90 text-sm">{name}</span>
                    {role && <span className="text-xs text-baked-text-muted">({role})</span>}
                    {timestamp && <span className="text-[10px] text-baked-text-muted/60 ml-auto font-mono">{timestamp}</span>}
                </div>
                <div className="text-baked-text-secondary text-sm bg-white/5 p-4 rounded-2xl rounded-tl-sm border border-white/5 group-hover:border-baked-border/50 transition-colors leading-relaxed shadow-sm">
                    {content}
                </div>
                {actions && (
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-baked-text-muted hover:text-white hover:bg-white/10 rounded-full">
                            <ThumbsUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-baked-text-muted hover:text-white hover:bg-white/10 rounded-full">
                            <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-baked-text-muted hover:text-white hover:bg-white/10 rounded-full">
                            <Share className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-baked-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-full">
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
