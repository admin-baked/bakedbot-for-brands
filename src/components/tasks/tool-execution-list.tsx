// Tool Execution List - displays tool usage with "aha moment" animations

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ToolExecution } from '@/types/task';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ToolExecutionListProps {
    executions: ToolExecution[];
    showDetails?: boolean;
}

export function ToolExecutionList({ executions, showDetails = true }: ToolExecutionListProps) {
    return (
        <div className="space-y-2">
            <AnimatePresence mode="popLayout">
                {executions.map((execution, index) => (
                    <motion.div
                        key={execution.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 30,
                            delay: index * 0.1
                        }}
                    >
                        <ToolExecutionCard execution={execution} showDetails={showDetails} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

function ToolExecutionCard({ execution, showDetails }: { execution: ToolExecution; showDetails: boolean }) {
    const getStatusIcon = () => {
        switch (execution.status) {
            case 'running':
            case 'queued':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            case 'success':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'error':
            case 'cancelled':
                return <XCircle className="h-4 w-4 text-red-500" />;
        }
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    // "Aha moment" animation when tool completes successfully
    const showAhaMoment = execution.status === 'success' && execution.visible;

    return (
        <motion.div
            className={cn(
                'relative overflow-hidden rounded-lg border p-4',
                showAhaMoment && 'ring-2 ring-purple-500 ring-offset-2'
            )}
            animate={showAhaMoment ? {
                scale: [1, 1.02, 1],
                boxShadow: [
                    '0 0 0 0 rgba(168, 85, 247, 0)',
                    '0 0 20px 5px rgba(168, 85, 247, 0.3)',
                    '0 0 0 0 rgba(168, 85, 247, 0)'
                ]
            } : {}}
            transition={{ duration: 0.6 }}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                        {getStatusIcon()}
                    </div>

                    {/* Tool Info */}
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{execution.toolName}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">
                                {execution.toolCategory}
                            </span>
                        </div>

                        {showDetails && execution.displayData && (
                            <div className="text-sm text-muted-foreground">
                                {execution.displayData.preview}
                            </div>
                        )}
                    </div>
                </div>

                {/* Duration */}
                {execution.duration && (
                    <div className="text-right">
                        <div className="text-sm font-medium tabular-nums">
                            {formatDuration(execution.duration)}
                        </div>
                        <div className="text-xs text-muted-foreground">duration</div>
                    </div>
                )}
            </div>

            {/* Display Data */}
            {showDetails && execution.displayData && execution.status === 'success' && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-4"
                >
                    <DisplayData data={execution.displayData} />
                </motion.div>
            )}

            {/* Error */}
            {execution.error && (
                <div className="mt-3 p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-300">{execution.error}</p>
                </div>
            )}

            {/* Metadata */}
            {showDetails && execution.metadata && (
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {execution.metadata.apiCalls && (
                        <span>{execution.metadata.apiCalls} API call{execution.metadata.apiCalls > 1 ? 's' : ''}</span>
                    )}
                    {execution.metadata.tokensUsed && (
                        <span>{execution.metadata.tokensUsed.toLocaleString()} tokens</span>
                    )}
                    {execution.metadata.cost && (
                        <span>${execution.metadata.cost.toFixed(4)}</span>
                    )}
                </div>
            )}
        </motion.div>
    );
}

function DisplayData({ data }: { data: ToolExecution['displayData'] }) {
    if (!data) return null;

    switch (data.type) {
        case 'table':
            return (
                <Card className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                        {data.icon && <span>{data.icon}</span>}
                        {data.title}
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    {Object.keys((data.content as any[])[0] || {}).map(key => (
                                        <th key={key} className="text-left p-2 font-medium">
                                            {key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(data.content as any[]).slice(0, 5).map((row, i) => (
                                    <tr key={i} className="border-b last:border-0">
                                        {Object.values(row).map((value: any, j) => (
                                            <td key={j} className="p-2">
                                                {typeof value === 'string' && value.startsWith('http') ? (
                                                    <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                        Link <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                ) : (
                                                    String(value)
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {(data.content as any[]).length > 5 && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Showing 5 of {(data.content as any[]).length} results
                        </p>
                    )}
                </Card>
            );

        case 'text':
            return (
                <div className="p-4 rounded-lg bg-secondary">
                    <pre className="text-sm whitespace-pre-wrap">{data.content as string}</pre>
                </div>
            );

        case 'email':
            return (
                <Card className="p-4 space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                        📧 {data.title}
                    </h4>
                    <div className="text-sm space-y-1">
                        <div><strong>To:</strong> {(data.content as any).to?.join(', ')}</div>
                        <div><strong>Subject:</strong> {(data.content as any).subject}</div>
                        <div className="pt-2 text-muted-foreground">{(data.content as any).preview}</div>
                    </div>
                </Card>
            );

        default:
            return (
                <div className="p-4 rounded-lg bg-secondary">
                    <p className="text-sm">{data.preview || JSON.stringify(data.content)}</p>
                </div>
            );
    }
}
