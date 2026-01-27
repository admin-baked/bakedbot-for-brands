'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ContentPaginationProps {
    /** Whether there are more pages available */
    hasMore: boolean;

    /** Whether currently loading */
    loading?: boolean;

    /** Whether on first page */
    isFirstPage: boolean;

    /** Callback when next page requested */
    onNextPage: () => void;

    /** Callback when previous page requested */
    onPreviousPage: () => void;

    /** Optional label for current page range */
    pageLabel?: string;
}

/**
 * Pagination controls for Creative content lists
 */
export function ContentPagination({
    hasMore,
    loading = false,
    isFirstPage,
    onNextPage,
    onPreviousPage,
    pageLabel,
}: ContentPaginationProps) {
    return (
        <div className="flex items-center justify-between py-4 px-2">
            <Button
                variant="outline"
                size="sm"
                onClick={onPreviousPage}
                disabled={isFirstPage || loading}
                className="gap-1"
            >
                <ChevronLeft className="h-4 w-4" />
                Previous
            </Button>

            {pageLabel && (
                <span className="text-sm text-muted-foreground">{pageLabel}</span>
            )}

            <Button
                variant="outline"
                size="sm"
                onClick={onNextPage}
                disabled={!hasMore || loading}
                className="gap-1"
            >
                Next
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
