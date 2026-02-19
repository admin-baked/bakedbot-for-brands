'use client';

/**
 * Inbox Artifact Panel
 *
 * Right-side panel for viewing and managing inbox artifacts in detail.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Images,
    PackagePlus,
    Palette,
    CheckCircle2,
    Trash2,
    Edit2,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Sparkles,
    FolderOpen,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useInboxStore, useSelectedArtifact } from '@/lib/store/inbox-store';
import type { InboxArtifact } from '@/types/inbox';
import type { Carousel } from '@/types/carousels';
import type { BundleDeal } from '@/types/bundles';
import type { CreativeContent } from '@/types/creative-content';
import { approveAndPublishArtifact, deleteInboxArtifact } from '@/server/actions/inbox';
import { ArtifactPipelineBar } from './artifact-pipeline-bar';

// ============ Props ============

interface InboxArtifactPanelProps {
    artifacts: InboxArtifact[];
    className?: string;
}

// ============ Artifact Type Icons ============

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    carousel: Images,
    bundle: PackagePlus,
    creative_content: Palette,
};

// ============ Detail Views ============

function CarouselDetail({ artifact }: { artifact: InboxArtifact }) {
    const data = artifact.data as Carousel;

    return (
        <div className="space-y-4">
            <div>
                <h3 className="font-semibold text-lg">{data.title}</h3>
                {data.description && (
                    <p className="text-sm text-muted-foreground mt-1">{data.description}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-3 rounded-lg bg-muted">
                    <div className="text-muted-foreground text-xs">Products</div>
                    <div className="font-medium">{data.productIds?.length || 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                    <div className="text-muted-foreground text-xs">Display Order</div>
                    <div className="font-medium">{data.displayOrder || 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                    <div className="text-muted-foreground text-xs">Status</div>
                    <div className="font-medium">{data.active ? 'Active' : 'Inactive'}</div>
                </div>
            </div>

            {/* Product List Placeholder */}
            <div>
                <h4 className="font-medium text-sm mb-2">Products</h4>
                <div className="space-y-1">
                    {(data.productIds || []).map((id, i) => (
                        <div key={id} className="text-xs p-2 rounded bg-muted flex items-center justify-between">
                            <span>Product {i + 1}</span>
                            <span className="text-muted-foreground font-mono">{id.slice(0, 8)}...</span>
                        </div>
                    ))}
                </div>
            </div>

            {artifact.rationale && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="text-xs font-medium text-blue-700 mb-1">AI Rationale</div>
                    <p className="text-sm text-blue-900">{artifact.rationale}</p>
                </div>
            )}
        </div>
    );
}

function BundleDetail({ artifact }: { artifact: InboxArtifact }) {
    const data = artifact.data as BundleDeal;

    return (
        <div className="space-y-4">
            <div>
                <h3 className="font-semibold text-lg">{data.name}</h3>
                {data.description && (
                    <p className="text-sm text-muted-foreground mt-1">{data.description}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-3 rounded-lg bg-muted">
                    <div className="text-muted-foreground text-xs">Type</div>
                    <div className="font-medium capitalize">{data.type.replace('_', ' ')}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                    <div className="text-muted-foreground text-xs">Products</div>
                    <div className="font-medium">{data.products?.length || 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-green-50">
                    <div className="text-green-700 text-xs">Bundle Price</div>
                    <div className="font-medium text-green-700">${data.bundlePrice?.toFixed(2) || '0.00'}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                    <div className="text-muted-foreground text-xs">Original</div>
                    <div className="font-medium line-through">${data.originalTotal?.toFixed(2) || '0.00'}</div>
                </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                <div className="text-2xl font-bold text-emerald-700">
                    {data.savingsPercent?.toFixed(0) || 0}% OFF
                </div>
                <div className="text-sm text-emerald-600">
                    Save ${data.savingsAmount?.toFixed(2) || '0.00'}
                </div>
            </div>

            {/* Products */}
            <div>
                <h4 className="font-medium text-sm mb-2">Included Products</h4>
                <div className="space-y-1">
                    {(data.products || []).map((product, i) => (
                        <div key={i} className="text-xs p-2 rounded bg-muted flex items-center justify-between">
                            <span>{product.name}</span>
                            <span className="text-muted-foreground">x{product.requiredQty}</span>
                        </div>
                    ))}
                </div>
            </div>

            {artifact.rationale && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="text-xs font-medium text-blue-700 mb-1">AI Rationale</div>
                    <p className="text-sm text-blue-900">{artifact.rationale}</p>
                </div>
            )}
        </div>
    );
}

function CreativeDetail({ artifact }: { artifact: InboxArtifact }) {
    const data = artifact.data as CreativeContent;

    return (
        <div className="space-y-4">
            <div>
                <Badge className="capitalize mb-2">{data.platform}</Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{data.mediaType || 'Image'}</span>
                    {data.complianceStatus && (
                        <>
                            <span>•</span>
                            <span className={cn(
                                data.complianceStatus === 'active' && 'text-green-600',
                                data.complianceStatus === 'warning' && 'text-yellow-600',
                                data.complianceStatus === 'rejected' && 'text-red-600'
                            )}>
                                {data.complianceStatus}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Media Preview */}
            {(data.thumbnailUrl || data.mediaUrls?.[0]) && (
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                        src={data.thumbnailUrl || data.mediaUrls?.[0]}
                        alt="Content preview"
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            {/* Caption */}
            <div>
                <h4 className="font-medium text-sm mb-2">Caption</h4>
                <p className="text-sm whitespace-pre-wrap">{data.caption}</p>
            </div>

            {/* Hashtags */}
            {data.hashtags && data.hashtags.length > 0 && (
                <div>
                    <h4 className="font-medium text-sm mb-2">Hashtags</h4>
                    <div className="flex flex-wrap gap-1">
                        {data.hashtags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                                #{tag}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {artifact.rationale && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="text-xs font-medium text-blue-700 mb-1">AI Rationale</div>
                    <p className="text-sm text-blue-900">{artifact.rationale}</p>
                </div>
            )}
        </div>
    );
}

// ============ Main Component ============

export function InboxArtifactPanel({ artifacts, className }: InboxArtifactPanelProps) {
    const router = useRouter();
    const {
        selectedArtifactId,
        setSelectedArtifact,
        setArtifactPanelOpen,
        updateArtifact,
        removeArtifact,
    } = useInboxStore();

    const selectedArtifact = useSelectedArtifact();

    // Navigation between artifacts
    const currentIndex = artifacts.findIndex((a) => a.id === selectedArtifactId);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < artifacts.length - 1;

    const handlePrev = () => {
        if (hasPrev) {
            setSelectedArtifact(artifacts[currentIndex - 1].id);
        }
    };

    const handleNext = () => {
        if (hasNext) {
            setSelectedArtifact(artifacts[currentIndex + 1].id);
        }
    };

    const handleApprove = async () => {
        if (!selectedArtifact) return;
        updateArtifact(selectedArtifact.id, { status: 'pending_review' });
        const result = await approveAndPublishArtifact(selectedArtifact.id);
        if (result.success) {
            updateArtifact(selectedArtifact.id, { status: 'published' });
        }
    };

    const handleDelete = async () => {
        if (!selectedArtifact) return;
        await deleteInboxArtifact(selectedArtifact.id);
        removeArtifact(selectedArtifact.id);
    };

    const Icon = selectedArtifact ? TYPE_ICONS[selectedArtifact.type] || Images : Images;

    const [isApproving, setIsApproving] = useState(false);

    return (
        <div className={cn(
            'flex flex-col h-full',
            'bg-sidebar/80 backdrop-blur-xl',
            'border-l border-white/5',
            'supports-[backdrop-filter]:bg-sidebar/60',
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium">Artifact Details</span>
                    {artifacts.length > 1 && (
                        <Badge variant="secondary" className="text-xs bg-white/10 border-white/10">
                            {currentIndex + 1} of {artifacts.length}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {artifacts.length > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handlePrev}
                                disabled={!hasPrev}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleNext}
                                disabled={!hasNext}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setArtifactPanelOpen(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-4">
                    {selectedArtifact ? (
                        <>
                            {/* HitL Pipeline Bar */}
                            <ArtifactPipelineBar
                                currentStatus={selectedArtifact.status}
                                className="mb-4"
                            />

                            {/* Type-specific detail view */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={selectedArtifact.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    {selectedArtifact.type === 'carousel' && <CarouselDetail artifact={selectedArtifact} />}
                                    {selectedArtifact.type === 'bundle' && <BundleDetail artifact={selectedArtifact} />}
                                    {selectedArtifact.type === 'creative_content' && <CreativeDetail artifact={selectedArtifact} />}
                                </motion.div>
                            </AnimatePresence>
                        </>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Select an artifact to view details</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Actions - HitL Approval Workflow */}
            {selectedArtifact && selectedArtifact.status !== 'published' && (
                <div className="p-4 border-t border-white/5 space-y-3">
                    {/* Primary Approve Button - Green Check EMPHASIZED per Technical Brief */}
                    {(selectedArtifact.status === 'draft' || selectedArtifact.status === 'pending_review') && (
                        <motion.div
                            initial={{ scale: 0.98 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="relative"
                        >
                            <Button
                                className={cn(
                                    'w-full gap-3 font-bold h-14 text-base relative overflow-hidden',
                                    'bg-gradient-to-r from-green-600 via-green-500 to-green-400',
                                    'hover:from-green-500 hover:via-green-400 hover:to-green-300',
                                    'text-white shadow-xl shadow-green-500/50',
                                    'border-2 border-green-400/50',
                                    'transition-all duration-300'
                                )}
                                onClick={async () => {
                                    setIsApproving(true);
                                    await handleApprove();
                                    setIsApproving(false);
                                }}
                                disabled={isApproving}
                            >
                                {/* Animated shine effect */}
                                {!isApproving && (
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                        animate={{ x: ['-100%', '200%'] }}
                                        transition={{ repeat: Infinity, duration: 3, ease: 'linear', repeatDelay: 1 }}
                                    />
                                )}

                                {/* Button content with z-index */}
                                <div className="relative z-10 flex items-center gap-3">
                                    {isApproving ? (
                                        <>
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                            <span>Publishing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-6 w-6" />
                                            <span>Approve & Publish</span>
                                        </>
                                    )}
                                </div>
                            </Button>

                            {/* Pulsing glow effect */}
                            {!isApproving && (
                                <motion.div
                                    className="absolute -inset-1 rounded-lg bg-gradient-to-r from-green-600 to-green-400 -z-10 blur-md"
                                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                />
                            )}
                        </motion.div>
                    )}

                    {/* Drive integration — show badge + open button when saved */}
                    {selectedArtifact?.driveFileId && (
                        <div className="flex items-center gap-2">
                            <Badge
                                variant="outline"
                                className="text-xs gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            >
                                <FolderOpen className="h-3 w-3" />
                                Saved to Drive
                            </Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs gap-1.5 ml-auto"
                                onClick={() =>
                                    router.push(
                                        `/dashboard/drive?file=${selectedArtifact.driveFileId}`
                                    )
                                }
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open in Drive
                            </Button>
                        </div>
                    )}

                    {/* Secondary Actions */}
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/5">
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                            onClick={handleDelete}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InboxArtifactPanel;
