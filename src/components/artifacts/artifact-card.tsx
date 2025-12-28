'use client';

/**
 * ArtifactCard Component
 * 
 * Compact card shown inline in chat messages when artifacts are generated.
 * Click to open the artifact in the side panel.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Artifact, getArtifactIcon, getArtifactLabel } from '@/types/artifact';
import * as LucideIcons from 'lucide-react';
import { ExternalLink, Sparkles } from 'lucide-react';

interface ArtifactCardProps {
    artifact: Artifact;
    onClick: () => void;
    compact?: boolean;
}

export function ArtifactCard({ artifact, onClick, compact = false }: ArtifactCardProps) {
    const iconName = getArtifactIcon(artifact.type);
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.File;
    const label = getArtifactLabel(artifact.type);

    // Get a preview of the content
    const preview = artifact.content.substring(0, 80).replace(/\n/g, ' ');

    if (compact) {
        return (
            <button
                onClick={onClick}
                className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-md",
                    "bg-primary/10 hover:bg-primary/20 border border-primary/20",
                    "text-sm transition-colors"
                )}
            >
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="font-medium">{artifact.title}</span>
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full max-w-xs text-left p-3 rounded-lg transition-all",
                "bg-gradient-to-br from-background to-muted/50",
                "border hover:border-primary/50 hover:shadow-md",
                "group cursor-pointer"
            )}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    "bg-primary/10 text-primary"
                )}>
                    <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                            {artifact.title}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {label}
                    </p>
                    {preview && (
                        <p className="text-[10px] text-muted-foreground/70 mt-1.5 line-clamp-2 font-mono">
                            {preview}...
                        </p>
                    )}
                </div>
            </div>

            {/* Published badge */}
            {artifact.metadata?.isPublished && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-green-600">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Published
                </div>
            )}
        </button>
    );
}

/**
 * ArtifactCardList - Display multiple artifacts inline
 */
interface ArtifactCardListProps {
    artifacts: Artifact[];
    onSelect: (artifact: Artifact) => void;
}

export function ArtifactCardList({ artifacts, onSelect }: ArtifactCardListProps) {
    if (artifacts.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 mt-3">
            {artifacts.map(artifact => (
                <ArtifactCard 
                    key={artifact.id}
                    artifact={artifact}
                    onClick={() => onSelect(artifact)}
                />
            ))}
        </div>
    );
}

/**
 * ArtifactInlineMarker - Simple inline marker that can be embedded in markdown
 */
interface ArtifactInlineMarkerProps {
    type: string;
    title: string;
    onClick: () => void;
}

export function ArtifactInlineMarker({ type, title, onClick }: ArtifactInlineMarkerProps) {
    const iconName = getArtifactIcon(type as any);
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.Sparkles;

    return (
        <button
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded",
                "bg-primary/10 hover:bg-primary/20 text-primary",
                "text-xs font-medium transition-colors"
            )}
        >
            <Icon className="h-3 w-3" />
            {title}
        </button>
    );
}
