'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CheckCircle, XCircle, AlertTriangle, Zap, Loader2, ExternalLink, Clock,
} from 'lucide-react';
import {
    getPendingApprovals, getApprovalDetails, approveApprovalRequest, rejectApprovalRequest,
    getApprovalHistoryAction, getApprovalStatsAction,
} from '@/app/actions/approvals';
import type { ApprovalRequest } from '@/server/services/approval-queue';

const RISK_COLORS: Record<string, string> = {
    low: 'bg-green-100 text-green-800 border-green-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    critical: 'bg-red-100 text-red-800 border-red-300',
};

const RISK_ICONS: Record<string, React.ReactNode> = {
    low: <CheckCircle className="h-4 w-4" />,
    medium: <AlertTriangle className="h-4 w-4" />,
    high: <AlertTriangle className="h-4 w-4" />,
    critical: <AlertTriangle className="h-4 w-4" />,
};

export default function LinusApprovalsPage() {
    const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
    const [historyApprovals, setHistoryApprovals] = useState<ApprovalRequest[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [pending, history, statsData] = await Promise.all([
                getPendingApprovals(),
                getApprovalHistoryAction(undefined, 50),
                getApprovalStatsAction(),
            ]);

            if (pending.success) setPendingApprovals(pending.data || []);
            if (history.success) setHistoryApprovals(history.data || []);
            if (statsData.success) setStats(statsData.data);
        } catch (error) {
            console.error('Error loading approvals:', error);
        }
        setLoading(false);
    }

    async function handleApprove(requestId: string, comments?: string) {
        setActionLoading(requestId);
        try {
            const result = await approveApprovalRequest(requestId, comments);
            if (result.success) {
                setSelectedApproval(null);
                await loadData();
            }
        } catch (error) {
            console.error('Error approving:', error);
        }
        setActionLoading(null);
    }

    async function handleReject(requestId: string) {
        if (!rejectReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        setActionLoading(requestId);
        try {
            const result = await rejectApprovalRequest(requestId, rejectReason);
            if (result.success) {
                setSelectedApproval(null);
                setRejectReason('');
                await loadData();
            }
        } catch (error) {
            console.error('Error rejecting:', error);
        }
        setActionLoading(null);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Linus Operation Approvals</h1>
                <p className="text-muted-foreground">
                    Review and approve critical infrastructure operations
                </p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Pending</p>
                                    <p className="text-2xl font-bold">{stats.pending}</p>
                                </div>
                                <Clock className="h-5 w-5 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Approved</p>
                                    <p className="text-2xl font-bold">{stats.approved}</p>
                                </div>
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Rejected</p>
                                    <p className="text-2xl font-bold">{stats.rejected}</p>
                                </div>
                                <XCircle className="h-5 w-5 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Executed</p>
                                    <p className="text-2xl font-bold">{stats.executed}</p>
                                </div>
                                <Zap className="h-5 w-5 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Failed</p>
                                    <p className="text-2xl font-bold">{stats.failed}</p>
                                </div>
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="pending">
                <TabsList>
                    <TabsTrigger value="pending">
                        Pending ({pendingApprovals.length})
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        History ({historyApprovals.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    {pendingApprovals.length === 0 ? (
                        <EmptyState message="No pending approvals" />
                    ) : (
                        <div className="space-y-3">
                            {pendingApprovals.map(approval => (
                                <ApprovalCard
                                    key={approval.id}
                                    approval={approval}
                                    onSelect={() => setSelectedApproval(approval)}
                                    actionLoading={actionLoading}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="history">
                    {historyApprovals.length === 0 ? (
                        <EmptyState message="No approval history" />
                    ) : (
                        <div className="space-y-3">
                            {historyApprovals.map(approval => (
                                <ApprovalCard
                                    key={approval.id}
                                    approval={approval}
                                    onSelect={() => setSelectedApproval(approval)}
                                    actionLoading={actionLoading}
                                    isHistory
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Detail Modal */}
            {selectedApproval && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle>Operation Details</CardTitle>
                            <CardDescription>
                                Request ID: {selectedApproval.id}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Operation Info */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Operation Type</label>
                                    <p className="text-base mt-1">{selectedApproval.operationType}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Target Resource</label>
                                    <p className="text-base mt-1">{selectedApproval.operationDetails.targetResource}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Action</label>
                                    <p className="text-base mt-1 capitalize">{selectedApproval.operationDetails.action}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Reason</label>
                                    <p className="text-base mt-1">{selectedApproval.operationDetails.reason}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Risk Level</label>
                                    <p className="text-base mt-1">
                                        <Badge className={`${RISK_COLORS[selectedApproval.operationDetails.riskLevel]} border`}>
                                            {RISK_ICONS[selectedApproval.operationDetails.riskLevel]}
                                            <span className="ml-1 capitalize">{selectedApproval.operationDetails.riskLevel}</span>
                                        </Badge>
                                    </p>
                                </div>
                                {selectedApproval.operationDetails.estimatedCost && (
                                    <div>
                                        <label className="text-sm font-medium">Estimated Monthly Cost</label>
                                        <p className="text-base mt-1">
                                            ${selectedApproval.operationDetails.estimatedCost.estimatedMonthly.toFixed(2)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Audit Trail */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Audit Trail</label>
                                <div className="space-y-2 bg-muted p-3 rounded text-sm">
                                    {selectedApproval.auditLog.map((log, idx) => (
                                        <div key={idx} className="text-xs">
                                            <span className="font-medium">{log.actor}</span>
                                            {' '}<span className="text-muted-foreground">{log.action}</span>
                                            {' '}<span className="text-muted-foreground">
                                                {new Date(log.timestamp.toDate()).toLocaleString()}
                                            </span>
                                            {log.details && <p className="text-muted-foreground mt-1">{log.details}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Status-Specific Actions */}
                            {selectedApproval.status === 'pending' && (
                                <div className="space-y-4 pt-4 border-t">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Rejection Reason (if rejecting)</label>
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Explain why this operation should not proceed..."
                                            className="w-full h-24 p-2 border rounded text-sm"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleApprove(selectedApproval.id)}
                                            disabled={actionLoading === selectedApproval.id}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            {actionLoading === selectedApproval.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                            )}
                                            Approve
                                        </Button>
                                        <Button
                                            onClick={() => handleReject(selectedApproval.id)}
                                            disabled={actionLoading === selectedApproval.id || !rejectReason.trim()}
                                            variant="outline"
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Reject
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setSelectedApproval(null);
                                                setRejectReason('');
                                            }}
                                            variant="ghost"
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {selectedApproval.status === 'approved' && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                                    <p className="text-green-800">
                                        ✅ Approved by {selectedApproval.approvedBy} on{' '}
                                        {selectedApproval.approvalTimestamp?.toDate().toLocaleString()}
                                    </p>
                                </div>
                            )}

                            {selectedApproval.status === 'rejected' && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                                    <p className="text-red-800 font-medium">Rejected</p>
                                    <p className="text-red-700 mt-1">{selectedApproval.rejectionReason}</p>
                                </div>
                            )}

                            {selectedApproval.status === 'executed' && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                                    <p className="text-blue-800">
                                        ⚡ Executed on {selectedApproval.execution?.executedAt?.toDate().toLocaleString()}
                                    </p>
                                </div>
                            )}

                            {selectedApproval.status === 'failed' && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                                    <p className="text-red-800 font-medium">Execution Failed</p>
                                    <p className="text-red-700 mt-1">{selectedApproval.execution?.error}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

function ApprovalCard({ approval, onSelect, actionLoading, isHistory }: {
    approval: ApprovalRequest;
    onSelect: () => void;
    actionLoading: string | null;
    isHistory?: boolean;
}) {
    const statusColors: Record<string, string> = {
        pending: 'bg-orange-100 text-orange-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
        executed: 'bg-blue-100 text-blue-800',
        failed: 'bg-red-100 text-red-800',
    };

    const riskColor = RISK_COLORS[approval.operationDetails.riskLevel];
    const isLoading = actionLoading === approval.id;

    return (
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={onSelect}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{approval.operationType}</span>
                            <Badge className={statusColors[approval.status]}>
                                {approval.status}
                            </Badge>
                            <Badge className={`${riskColor} border`}>
                                {RISK_ICONS[approval.operationDetails.riskLevel]}
                                <span className="ml-1 capitalize">{approval.operationDetails.riskLevel}</span>
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {approval.operationDetails.targetResource}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Requested by: {approval.requestedBy} •{' '}
                            {new Date(approval.createdAt.toDate()).toLocaleDateString()}
                        </p>
                    </div>

                    {!isHistory && approval.status === 'pending' && (
                        <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect();
                                }}
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <Card className="border-dashed mt-4">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Clear</h3>
                <p className="text-sm text-muted-foreground">{message}</p>
            </CardContent>
        </Card>
    );
}
