'use client';

/**
 * ResearchReportModal
 *
 * Right-side Sheet that shows the full rendered markdown report.
 * Includes "Open in Drive" button when driveFileId is present.
 */

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2, HardDrive, ExternalLink, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getResearchReportAction } from '@/app/dashboard/research/actions';
import type { ResearchReport } from '@/types/research';

interface ResearchReportModalProps {
    reportId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    driveFileId?: string;
}

export function ResearchReportModal({
    reportId,
    open,
    onOpenChange,
    driveFileId,
}: ResearchReportModalProps) {
    const [report, setReport] = useState<ResearchReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !reportId) return;
        if (report?.id === reportId) return; // already loaded

        setIsLoading(true);
        setError(null);

        getResearchReportAction(reportId)
            .then((result) => {
                if (result.success && result.report) {
                    setReport(result.report as ResearchReport);
                } else {
                    setError(result.error || 'Failed to load report');
                }
            })
            .catch(() => setError('Failed to load report'))
            .finally(() => setIsLoading(false));
    }, [open, reportId, report?.id]);

    const effectiveDriveFileId = driveFileId || report?.driveFileId;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-2xl overflow-y-auto p-0"
            >
                <SheetHeader className="sticky top-0 bg-background border-b px-6 py-4 z-10">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                            <SheetTitle className="text-base truncate">
                                {report?.title || 'Research Report'}
                            </SheetTitle>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {effectiveDriveFileId && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-xs"
                                    onClick={() => {
                                        window.open(
                                            `/dashboard/drive?file=${effectiveDriveFileId}`,
                                            '_blank'
                                        );
                                    }}
                                >
                                    <HardDrive className="h-3 w-3" />
                                    Open in Drive
                                    <ExternalLink className="h-3 w-3 opacity-60" />
                                </Button>
                            )}
                            {effectiveDriveFileId && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <HardDrive className="h-3 w-3" /> Saved
                                </span>
                            )}
                        </div>
                    </div>
                    {report?.summary && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {report.summary}
                        </p>
                    )}
                </SheetHeader>

                <div className="px-6 py-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-emerald-500" />
                                <p className="text-sm text-muted-foreground">Loading report...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="py-10 text-center">
                            <p className="text-sm text-red-500">{error}</p>
                        </div>
                    ) : report ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {report.content}
                            </ReactMarkdown>

                            {/* Sources list */}
                            {report.sources && report.sources.length > 0 && (
                                <div className="mt-6 pt-4 border-t">
                                    <h3 className="text-sm font-semibold mb-2">Sources Visited</h3>
                                    <ul className="space-y-1">
                                        {report.sources.map((source, i) => (
                                            <li key={i} className="text-xs">
                                                <a
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 hover:underline break-all"
                                                >
                                                    {source.title || source.url}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    );
}
