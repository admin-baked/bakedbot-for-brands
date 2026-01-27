'use client';

/**
 * Global Approval Queue Page
 *
 * Unified view of all pending artifacts across all types.
 * Enables bulk approval/rejection workflow for efficient artifact management.
 *
 * Note: This is a simplified initial version. Full implementation requires
 * a new server action to query artifacts across all threads by status.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ApprovalsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Approval Queue</h1>
                <p className="text-muted-foreground">
                    Review and approve pending artifacts across all workflows
                </p>
            </div>

            {/* Info Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                        <div className="space-y-1">
                            <CardTitle className="text-lg">Global Approval Queue - Coming Soon</CardTitle>
                            <CardDescription>
                                This page will provide a unified view of all pending artifacts across all inbox threads.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border p-4 bg-muted/50">
                        <h3 className="font-medium mb-2">Current Workflow</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            For now, you can review and approve artifacts directly within each inbox thread.
                        </p>
                        <Button asChild variant="default">
                            <Link href="/dashboard/inbox">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Go to Inbox
                            </Link>
                        </Button>
                    </div>

                    <div className="text-sm text-muted-foreground space-y-2">
                        <p className="font-medium">Implementation Status:</p>
                        <ul className="space-y-1 ml-4 list-disc">
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                Page structure created
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                UI components designed
                            </li>
                            <li className="text-amber-600">
                                ⏳ Server action for cross-thread artifact queries (pending)
                            </li>
                            <li className="text-amber-600">
                                ⏳ Bulk approval/rejection logic (pending)
                            </li>
                        </ul>
                    </div>

                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <h3 className="font-medium text-sm mb-2">Next Steps</h3>
                        <p className="text-sm text-muted-foreground">
                            To enable this feature, we need to create a new server action that can query
                            artifacts by status across all threads, rather than requiring a specific threadId.
                            This will be implemented as part of the unified artifact storage migration.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Feature Preview */}
            <Card>
                <CardHeader>
                    <CardTitle>Planned Features</CardTitle>
                    <CardDescription>What you'll be able to do with the global approval queue</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Bulk Operations</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Select multiple artifacts</li>
                                <li>• Approve/reject in batch</li>
                                <li>• Filter by type and status</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Smart Filtering</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Search by title or content</li>
                                <li>• Filter by artifact type</li>
                                <li>• Sort by creation date</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Analytics</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Approval rate tracking</li>
                                <li>• Average review time</li>
                                <li>• Agent performance metrics</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Notifications</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Email alerts for pending items</li>
                                <li>• Slack integration</li>
                                <li>• Custom approval workflows</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
