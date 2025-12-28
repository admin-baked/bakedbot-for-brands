'use client';

/**
 * ArtifactPanel Component
 * 
 * Claude/ChatGPT-style resizable side panel for viewing artifacts.
 * Displays code, research, presentations, diagrams, etc.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
    X, ChevronLeft, ChevronRight, Maximize2, Minimize2, 
    Download, Copy, Check, Share2, ExternalLink, Eye 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Artifact, getArtifactIcon, getArtifactLabel, isDeckArtifact } from '@/types/artifact';
import { ArtifactRenderer } from './artifact-renderer';
import * as LucideIcons from 'lucide-react';

interface ArtifactPanelProps {
    artifacts: Artifact[];
    selectedArtifact: Artifact | null;
    onSelect: (artifact: Artifact | null) => void;
    onClose: () => void;
    onShare?: (artifact: Artifact) => void;
    isOpen: boolean;
}

export function ArtifactPanel({ 
    artifacts, 
    selectedArtifact, 
    onSelect, 
    onClose,
    onShare,
    isOpen 
}: ArtifactPanelProps) {
    const [width, setWidth] = useState(480);
    const [isResizing, setIsResizing] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [copied, setCopied] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const panelRef = useRef<HTMLDivElement>(null);
    const resizeRef = useRef<HTMLDivElement>(null);

    // Handle resize drag
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            setWidth(Math.min(Math.max(320, newWidth), window.innerWidth * 0.8));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Reset slide when artifact changes
    useEffect(() => {
        setCurrentSlide(0);
    }, [selectedArtifact?.id]);

    const handleCopy = async () => {
        if (!selectedArtifact) return;
        await navigator.clipboard.writeText(selectedArtifact.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!selectedArtifact) return;
        const blob = new Blob([selectedArtifact.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedArtifact.title.replace(/\s+/g, '_')}.${selectedArtifact.type === 'code' ? selectedArtifact.language || 'txt' : 'md'}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Get icon component
    const getIconComponent = (iconName: string) => {
        const Icon = (LucideIcons as any)[iconName] || LucideIcons.File;
        return Icon;
    };

    if (!isOpen) return null;

    const slides = selectedArtifact?.metadata?.slides || [];
    const totalSlides = slides.length;

    return (
        <>
            {/* Backdrop for maximized view */}
            {isMaximized && (
                <div 
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
                    onClick={() => setIsMaximized(false)}
                />
            )}

            {/* Panel */}
            <div
                ref={panelRef}
                className={cn(
                    "fixed right-0 top-0 h-full bg-background border-l shadow-2xl z-50",
                    "flex flex-col transition-all duration-200",
                    isMaximized && "left-4 right-4 top-4 bottom-4 h-auto rounded-xl border"
                )}
                style={{ width: isMaximized ? 'auto' : width }}
            >
                {/* Resize Handle */}
                {!isMaximized && (
                    <div
                        ref={resizeRef}
                        className={cn(
                            "absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize",
                            "hover:bg-primary/30 transition-colors",
                            isResizing && "bg-primary/50"
                        )}
                        onMouseDown={handleMouseDown}
                    />
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                        {selectedArtifact ? (
                            <>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => onSelect(null)}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="font-medium truncate max-w-[200px]">
                                    {selectedArtifact.title}
                                </span>
                            </>
                        ) : (
                            <span className="font-semibold">Artifacts</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {selectedArtifact && (
                            <>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={handleCopy}
                                    title="Copy content"
                                >
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={handleDownload}
                                    title="Download"
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                {onShare && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={() => onShare(selectedArtifact)}
                                        title="Share"
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </>
                        )}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setIsMaximized(!isMaximized)}
                            title={isMaximized ? "Minimize" : "Maximize"}
                        >
                            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {selectedArtifact ? (
                        <div className="h-full flex flex-col">
                            {/* Deck navigation */}
                            {isDeckArtifact(selectedArtifact) && totalSlides > 0 && (
                                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentSlide === 0}
                                        onClick={() => setCurrentSlide(s => s - 1)}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Slide {currentSlide + 1} of {totalSlides}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentSlide === totalSlides - 1}
                                        onClick={() => setCurrentSlide(s => s + 1)}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            )}
                            
                            {/* Artifact content */}
                            <ScrollArea className="flex-1 p-4">
                                <ArtifactRenderer 
                                    artifact={selectedArtifact} 
                                    currentSlide={currentSlide}
                                />
                            </ScrollArea>

                            {/* Published badge */}
                            {selectedArtifact.metadata?.isPublished && (
                                <div className="px-4 py-2 border-t bg-green-50 dark:bg-green-950/30 flex items-center gap-2">
                                    <Eye className="h-4 w-4 text-green-600" />
                                    <span className="text-sm text-green-700 dark:text-green-400">
                                        Published: 
                                        <a 
                                            href={selectedArtifact.metadata.shareUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="ml-1 underline"
                                        >
                                            View public link
                                        </a>
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            <div className="p-4 space-y-2">
                                {artifacts.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <p>No artifacts yet</p>
                                        <p className="text-sm mt-1">Artifacts will appear here when generated</p>
                                    </div>
                                ) : (
                                    artifacts.map(artifact => {
                                        const Icon = getIconComponent(getArtifactIcon(artifact.type));
                                        return (
                                            <button
                                                key={artifact.id}
                                                className={cn(
                                                    "w-full text-left p-3 rounded-lg border transition-all",
                                                    "hover:border-primary/50 hover:bg-muted/50"
                                                )}
                                                onClick={() => onSelect(artifact)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-md bg-muted">
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{artifact.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {getArtifactLabel(artifact.type)}
                                                        </p>
                                                    </div>
                                                    {artifact.metadata?.isPublished && (
                                                        <ExternalLink className="h-4 w-4 text-green-600" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </div>
        </>
    );
}
