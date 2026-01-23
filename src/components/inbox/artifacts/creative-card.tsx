'use client';

/**
 * Inbox Creative Card
 *
 * Inline preview card for creative content artifacts in the inbox conversation.
 */

import React from 'react';
import { Palette, Check, X, Eye, Instagram, Linkedin, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInboxStore } from '@/lib/store/inbox-store';
import type { InboxArtifact } from '@/types/inbox';
import type { CreativeContent } from '@/types/creative-content';
import { approveAndPublishArtifact, updateInboxArtifactStatus } from '@/server/actions/inbox';

interface InboxCreativeCardProps {
    artifact: InboxArtifact;
    className?: string;
}

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    instagram: Instagram,
    linkedin: Linkedin,
    tiktok: Palette, // Using Palette as fallback
    twitter: Palette,
    facebook: Palette,
};

const PLATFORM_COLORS: Record<string, string> = {
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
    linkedin: 'bg-blue-600',
    tiktok: 'bg-black',
    twitter: 'bg-sky-500',
    facebook: 'bg-blue-500',
};

export function InboxCreativeCard({ artifact, className }: InboxCreativeCardProps) {
    const { setSelectedArtifact, updateArtifact } = useInboxStore();
    const contentData = artifact.data as CreativeContent;
    const PlatformIcon = PLATFORM_ICONS[contentData.platform] || Palette;

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

    const complianceColors = {
        active: 'text-green-600',
        warning: 'text-yellow-600',
        review_needed: 'text-orange-600',
        rejected: 'text-red-600',
    };

    return (
        <Card className={cn('overflow-hidden', className)}>
            <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn('p-1.5 rounded-md text-white', PLATFORM_COLORS[contentData.platform] || 'bg-gray-500')}>
                            <PlatformIcon className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="font-medium text-sm capitalize">{contentData.platform} Post</h4>
                            <p className="text-xs text-muted-foreground">
                                {contentData.mediaType || 'image'}
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px]', statusColors[artifact.status])}>
                        {artifact.status.replace('_', ' ')}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-3 pt-0">
                {/* Media Preview */}
                {contentData.thumbnailUrl || contentData.mediaUrls?.[0] ? (
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                        <img
                            src={contentData.thumbnailUrl || contentData.mediaUrls?.[0]}
                            alt="Content preview"
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="aspect-square rounded-lg bg-muted flex items-center justify-center mb-2">
                        <Palette className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                )}

                {/* Caption Preview */}
                <p className="text-xs line-clamp-2 mb-2">
                    {contentData.caption}
                </p>

                {/* Hashtags */}
                {contentData.hashtags && contentData.hashtags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        {contentData.hashtags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-xs text-primary">
                                {tag}
                            </span>
                        ))}
                        {contentData.hashtags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                                +{contentData.hashtags.length - 3} more
                            </span>
                        )}
                    </div>
                )}

                {/* Compliance Status */}
                {contentData.complianceStatus && (
                    <div className={cn('text-xs mt-2 flex items-center gap-1', complianceColors[contentData.complianceStatus])}>
                        <Check className="h-3 w-3" />
                        Compliance: {contentData.complianceStatus}
                    </div>
                )}

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
                        Published
                    </Badge>
                )}
            </CardFooter>
        </Card>
    );
}

export default InboxCreativeCard;
