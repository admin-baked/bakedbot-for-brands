'use client';

import { Badge } from '@/components/ui/badge';
import { ExternalLink, Globe } from 'lucide-react';
import type { PageStatus } from '../page-actions';

interface PagesHeaderProps {
    brandSlug: string | null;
    pageStatuses: PageStatus[];
}

export function PagesHeader({ brandSlug, pageStatuses }: PagesHeaderProps) {
    const publishedCount = pageStatuses.filter(s => s.isPublished).length;
    const totalCount = pageStatuses.length;

    return (
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Public Pages</h1>
                <p className="text-muted-foreground flex items-center gap-2">
                    Manage your storefront menu, locations, and SEO pages
                    {totalCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                            {publishedCount}/{totalCount} published
                        </Badge>
                    )}
                </p>
            </div>
            {brandSlug && (
                <a
                    href={`https://bakedbot.ai/${brandSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Globe className="h-4 w-4" />
                    bakedbot.ai/{brandSlug}
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            )}
        </div>
    );
}
