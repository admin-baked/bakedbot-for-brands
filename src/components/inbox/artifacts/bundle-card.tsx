'use client';

/**
 * Inbox Bundle Card
 *
 * Inline preview card for bundle deal artifacts in the inbox conversation.
 */

import React from 'react';
import { PackagePlus, Check, X, Eye, Percent, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInboxStore } from '@/lib/store/inbox-store';
import type { InboxArtifact } from '@/types/inbox';
import type { BundleDeal } from '@/types/bundles';
import { approveAndPublishArtifact, updateInboxArtifactStatus } from '@/server/actions/inbox';

interface InboxBundleCardProps {
    artifact: InboxArtifact;
    className?: string;
}

const BUNDLE_TYPE_LABELS: Record<string, string> = {
    bogo: 'Buy One Get One',
    mix_match: 'Mix & Match',
    percentage: 'Percentage Off',
    fixed_price: 'Fixed Price',
    tiered: 'Tiered Discount',
};

export function InboxBundleCard({ artifact, className }: InboxBundleCardProps) {
    const { setSelectedArtifact, updateArtifact } = useInboxStore();
    const bundleData = artifact.data as BundleDeal;

    const handleApprove = async () => {
        updateArtifact(artifact.id, { status: 'pending_review' });
        const result = await approveAndPublishArtifact(artifact.id);
        if (result.success) {
            updateArtifact(artifact.id, { status: 'published' });
        } else {
            updateArtifact(artifact.id, { status: 'draft' });
        }
    };

    const handleReject = async () => {
        await updateInboxArtifactStatus(artifact.id, 'rejected');
        updateArtifact(artifact.id, { status: 'rejected' });
    };

    const statusColors = {
        draft: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        pending_review: 'bg-blue-100 text-blue-700 border-blue-200',
        approved: 'bg-green-100 text-green-700 border-green-200',
        published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        rejected: 'bg-red-100 text-red-700 border-red-200',
    };

    return (
        <Card className={cn('overflow-hidden', className)}>
            <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-orange-100">
                            <PackagePlus className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                            <h4 className="font-medium text-sm">{bundleData.name}</h4>
                            <p className="text-xs text-muted-foreground">
                                {BUNDLE_TYPE_LABELS[bundleData.type] || bundleData.type}
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px]', statusColors[artifact.status])}>
                        {artifact.status.replace('_', ' ')}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-3 pt-0">
                {bundleData.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {bundleData.description}
                    </p>
                )}

                {/* Pricing Info */}
                <div className="flex items-center gap-4 py-2 px-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">
                            ${bundleData.bundlePrice?.toFixed(2) || '0.00'}
                        </span>
                        {bundleData.originalTotal && (
                            <span className="text-xs text-muted-foreground line-through">
                                ${bundleData.originalTotal.toFixed(2)}
                            </span>
                        )}
                    </div>
                    {bundleData.savingsPercent > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 bg-green-100 text-green-700">
                            <Percent className="h-3 w-3 mr-0.5" />
                            {bundleData.savingsPercent.toFixed(0)}% off
                        </Badge>
                    )}
                </div>

                {/* Products */}
                <div className="mt-2 text-xs text-muted-foreground">
                    {bundleData.products?.length || 0} products included
                </div>

                {/* Rationale */}
                {artifact.rationale && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                        "{artifact.rationale}"
                    </p>
                )}
            </CardContent>

            <CardFooter className="p-3 pt-0 gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8"
                    onClick={() => setSelectedArtifact(artifact.id)}
                >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                </Button>

                {artifact.status === 'draft' && (
                    <>
                        <Button
                            variant="default"
                            size="sm"
                            className="flex-1 h-8"
                            onClick={handleApprove}
                        >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={handleReject}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </>
                )}

                {artifact.status === 'published' && (
                    <Badge variant="secondary" className="h-8 px-3">
                        <Check className="h-3 w-3 mr-1" />
                        Live
                    </Badge>
                )}
            </CardFooter>
        </Card>
    );
}

export default InboxBundleCard;
