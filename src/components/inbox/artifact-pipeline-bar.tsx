'use client';

/**
 * Artifact Pipeline Bar
 *
 * Visual HitL (Human-in-the-Loop) status progression:
 * Draft → Pending Review → Approved → Published
 */

import React, { Fragment } from 'react';
import { motion } from 'framer-motion';
import {
    FileEdit,
    Eye,
    CheckCircle2,
    Rocket,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InboxArtifactStatus } from '@/types/inbox';

// ============ Pipeline Stages ============

const PIPELINE_STAGES: {
    status: InboxArtifactStatus;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}[] = [
    { status: 'draft', label: 'Draft', icon: FileEdit },
    { status: 'pending_review', label: 'Review', icon: Eye },
    { status: 'approved', label: 'Approved', icon: CheckCircle2 },
    { status: 'published', label: 'Published', icon: Rocket },
];

// ============ Props ============

interface ArtifactPipelineBarProps {
    currentStatus: InboxArtifactStatus;
    className?: string;
}

// ============ Main Component ============

export function ArtifactPipelineBar({ currentStatus, className }: ArtifactPipelineBarProps) {
    // Handle rejected status separately
    if (currentStatus === 'rejected') {
        return (
            <div className={cn(
                'flex items-center gap-2 p-2 rounded-lg',
                'bg-red-500/10 border border-red-500/20',
                className
            )}>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/20 text-red-500">
                    <Eye className="h-3 w-3" />
                    <span className="text-xs font-medium">Rejected</span>
                </div>
                <span className="text-xs text-muted-foreground">
                    Needs revision
                </span>
            </div>
        );
    }

    const currentIndex = PIPELINE_STAGES.findIndex(s => s.status === currentStatus);

    return (
        <div className={cn(
            'flex items-center gap-1 p-2 rounded-lg',
            'bg-card/50 backdrop-blur-sm border border-white/5',
            className
        )}>
            {PIPELINE_STAGES.map((stage, i) => {
                const Icon = stage.icon;
                const isCompleted = i < currentIndex;
                const isCurrent = i === currentIndex;
                const isPending = i > currentIndex;

                return (
                    <Fragment key={stage.status}>
                        <motion.div
                            initial={false}
                            animate={{
                                scale: isCurrent ? 1.05 : 1,
                            }}
                            className={cn(
                                'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all duration-200',
                                isCompleted && 'bg-baked-500/20 text-baked-400',
                                isCurrent && 'bg-baked-500/30 text-baked-300 ring-1 ring-baked-500/50 font-medium',
                                isPending && 'text-muted-foreground/50'
                            )}
                        >
                            <Icon className={cn(
                                'h-3 w-3',
                                isCurrent && 'animate-pulse'
                            )} />
                            <span className="hidden sm:inline">{stage.label}</span>
                        </motion.div>

                        {/* Connector */}
                        {i < PIPELINE_STAGES.length - 1 && (
                            <ChevronRight className={cn(
                                'h-3 w-3 flex-shrink-0',
                                i < currentIndex ? 'text-baked-500' : 'text-muted-foreground/30'
                            )} />
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
}

// ============ Compact Version ============

interface ArtifactPipelineCompactProps {
    currentStatus: InboxArtifactStatus;
    className?: string;
}

export function ArtifactPipelineCompact({ currentStatus, className }: ArtifactPipelineCompactProps) {
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.status === currentStatus);
    const current = PIPELINE_STAGES[currentIndex] || PIPELINE_STAGES[0];
    const Icon = current.icon;

    const statusColors: Record<InboxArtifactStatus, string> = {
        draft: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        pending_review: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        approved: 'bg-baked-500/10 text-baked-400 border-baked-500/20',
        published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    };

    return (
        <div className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border',
            statusColors[currentStatus],
            className
        )}>
            <Icon className="h-3 w-3" />
            <span>{current.label}</span>
            {/* Progress dots */}
            <div className="flex items-center gap-0.5 ml-1">
                {PIPELINE_STAGES.map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            'w-1 h-1 rounded-full',
                            i <= currentIndex ? 'bg-current' : 'bg-current/30'
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

export default ArtifactPipelineBar;
