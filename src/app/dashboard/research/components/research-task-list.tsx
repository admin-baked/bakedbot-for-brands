'use client';

/**
 * ResearchTaskList Component
 * 
 * Client component for displaying research tasks with proper hydration handling.
 * The formatDistanceToNow function can cause mismatches between server and client.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { ResearchTask } from "@/types/research";
import { formatDistanceToNow } from "date-fns";

interface ResearchTaskListProps {
    tasks: ResearchTask[];
}

export function ResearchTaskList({ tasks }: ResearchTaskListProps) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    return (
        <>
            {tasks.map((task) => (
                <Card key={task.id}>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                            <span className="truncate pr-2" title={task.query}>{task.query}</span>
                            <StatusBadge status={task.status} />
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {hasMounted 
                                ? formatDistanceToNow(task.createdAt, { addSuffix: true })
                                : 'Loading...'
                            } • Depth: {task.depth}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {task.status === 'processing' ? (
                            <div className="space-y-2">
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[60%] animate-pulse" />
                                </div>
                                <p className="text-xs text-muted-foreground text-center animate-pulse">
                                    Analyzing sources...
                                </p>
                            </div>
                        ) : task.status === 'completed' ? (
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                Research complete. {task.resultReportId ? 'Report generated.' : 'View details.'}
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                Status: {task.status}
                            </p>
                        )}

                        <Button 
                            variant={task.status === 'completed' ? 'outline' : 'ghost'} 
                            size="sm" 
                            className="w-full gap-1"
                            disabled={task.status !== 'completed'}
                        >
                            {task.status === 'completed' ? <><FileText className="h-3 w-3" /> View Report</> : 'Processing...'}
                        </Button>
                    </CardContent>
                </Card>
            ))}

            {tasks.length === 0 && (
                <div className="col-span-full py-10 text-center text-muted-foreground">
                    No research tasks found. Start one above!
                </div>
            )}
        </>
    );
}

function StatusBadge({ status }: { status: ResearchTask['status'] }) {
    switch (status) {
        case 'completed':
            return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Done</span>;
        case 'processing':
            return <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1"><Clock className="h-3 w-3 animate-spin" /> Running</span>;
        case 'failed':
            return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Failed</span>;
        default:
            return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">{status}</span>;
    }
}
