'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, FileEdit, Loader2 } from 'lucide-react';
import { togglePagePublish } from '../page-actions';
import { useToast } from '@/hooks/use-toast';
import type { BrandPageType } from '@/types/brand-pages';

interface PagePublishToggleProps {
    orgId: string;
    pageType: BrandPageType;
    isPublished: boolean;
    updatedAt: string | null;
    onToggle: (pageType: BrandPageType, isPublished: boolean) => void;
}

export function PagePublishToggle({ orgId, pageType, isPublished, updatedAt, onToggle }: PagePublishToggleProps) {
    const [toggling, setToggling] = useState(false);
    const { toast } = useToast();

    const handleToggle = async () => {
        setToggling(true);
        try {
            const result = await togglePagePublish(orgId, pageType, !isPublished);
            onToggle(pageType, result.isPublished);
            toast({ title: result.isPublished ? 'Page published' : 'Page set to draft' });
        } catch (error) {
            toast({ title: 'Failed to update', description: String(error), variant: 'destructive' });
        } finally {
            setToggling(false);
        }
    };

    const formattedDate = updatedAt
        ? new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    return (
        <div className="flex items-center gap-3">
            {isPublished ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 gap-1.5">
                    <Globe className="h-3 w-3" />
                    Published
                </Badge>
            ) : (
                <Badge variant="outline" className="text-muted-foreground gap-1.5">
                    <FileEdit className="h-3 w-3" />
                    Draft
                </Badge>
            )}
            {formattedDate && (
                <span className="text-xs text-muted-foreground">
                    Updated {formattedDate}
                </span>
            )}
            <Button
                variant={isPublished ? 'outline' : 'default'}
                size="sm"
                onClick={handleToggle}
                disabled={toggling}
                className="gap-1.5"
            >
                {toggling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isPublished ? (
                    <>
                        <FileEdit className="h-3.5 w-3.5" />
                        Unpublish
                    </>
                ) : (
                    <>
                        <Globe className="h-3.5 w-3.5" />
                        Publish
                    </>
                )}
            </Button>
        </div>
    );
}
