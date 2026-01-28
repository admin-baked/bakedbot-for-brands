'use client';

/**
 * Approval Chain Component
 *
 * Displays multi-level approval workflow with visual progress indicator.
 * Shows approval history, pending approvers, and action buttons.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    XCircle,
    Clock,
    UserCheck,
    AlertCircle,
    ChevronRight,
    Shield,
    Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { ApprovalState, ApprovalRecord, ApprovalAction } from '@/types/creative-content';
import { cn } from '@/lib/utils';

interface ApprovalChainProps {
    approvalState: ApprovalState;
    currentUserRole?: string;
    currentUserId?: string;
    onApprove?: (notes: string) => Promise<void>;
    onReject?: (notes: string) => Promise<void>;
    className?: string;
}

export function ApprovalChain({
    approvalState,
    currentUserRole,
    currentUserId,
    onApprove,
    onReject,
    className,
}: ApprovalChainProps) {
    const [actionNotes, setActionNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Group approvals by level
    const approvalsByLevel = approvalState.approvals.reduce((acc, approval) => {
        if (!acc[approval.level]) {
            acc[approval.level] = [];
        }
        acc[approval.level].push(approval);
        return acc;
    }, {} as Record<number, ApprovalRecord[]>);

    const maxLevel = Math.max(...Object.keys(approvalsByLevel).map(Number), approvalState.currentLevel);

    // Check if current user can approve
    const canCurrentUserApprove =
        currentUserRole &&
        approvalState.nextRequiredRoles.includes(currentUserRole) &&
        approvalState.status === 'pending_approval';

    // Check if user already approved at current level
    const userAlreadyApproved = approvalState.approvals.some(
        (a) => a.approverId === currentUserId && a.level === approvalState.currentLevel
    );

    const handleApprove = async () => {
        if (!onApprove || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onApprove(actionNotes);
            setActionNotes('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!onReject || isSubmitting || !actionNotes.trim()) return;
        setIsSubmitting(true);
        try {
            await onReject(actionNotes);
            setActionNotes('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (status: ApprovalState['status']) => {
        switch (status) {
            case 'approved':
                return 'text-green-400 bg-green-400/10 border-green-400/30';
            case 'rejected':
                return 'text-red-400 bg-red-400/10 border-red-400/30';
            case 'override_required':
                return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
            default:
                return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
        }
    };

    const getActionIcon = (action: ApprovalAction) => {
        switch (action) {
            case 'approved':
                return <CheckCircle2 className="w-4 h-4 text-green-400" />;
            case 'rejected':
                return <XCircle className="w-4 h-4 text-red-400" />;
            default:
                return <Clock className="w-4 h-4 text-amber-400" />;
        }
    };

    return (
        <Card className={cn('bg-baked-card border-baked-border shadow-none', className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-400" />
                        Approval Workflow
                    </CardTitle>
                    <Badge className={cn('text-xs', getStatusColor(approvalState.status))}>
                        {approvalState.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Approval Levels Progress */}
                <div className="space-y-3">
                    {Array.from({ length: maxLevel }, (_, i) => i + 1).map((level) => {
                        const levelsApprovals = approvalsByLevel[level] || [];
                        const isCurrentLevel = level === approvalState.currentLevel;
                        const isPastLevel = level < approvalState.currentLevel;
                        const isFutureLevel = level > approvalState.currentLevel;

                        const allApproved = levelsApprovals.every((a) => a.action === 'approved');
                        const anyRejected = levelsApprovals.some((a) => a.action === 'rejected');

                        return (
                            <motion.div
                                key={level}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: level * 0.1 }}
                                className={cn(
                                    'rounded-lg p-3 border transition-all',
                                    isCurrentLevel &&
                                        'border-purple-400/50 bg-purple-400/5 ring-1 ring-purple-400/20',
                                    isPastLevel && allApproved && 'border-green-400/30 bg-green-400/5',
                                    isPastLevel && anyRejected && 'border-red-400/30 bg-red-400/5',
                                    isFutureLevel && 'border-baked-border bg-baked-darkest/50 opacity-60'
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={cn(
                                                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
                                                isCurrentLevel && 'bg-purple-400 text-white',
                                                isPastLevel &&
                                                    allApproved &&
                                                    'bg-green-400 text-baked-darkest',
                                                isPastLevel && anyRejected && 'bg-red-400 text-white',
                                                isFutureLevel && 'bg-baked-border text-baked-text-muted'
                                            )}
                                        >
                                            {level}
                                        </div>
                                        <span
                                            className={cn(
                                                'text-sm font-medium',
                                                isCurrentLevel && 'text-purple-400',
                                                isPastLevel && 'text-baked-text-secondary',
                                                isFutureLevel && 'text-baked-text-muted'
                                            )}
                                        >
                                            Level {level} Review
                                        </span>
                                    </div>

                                    {isPastLevel && allApproved && (
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    )}
                                    {isPastLevel && anyRejected && (
                                        <XCircle className="w-5 h-5 text-red-400" />
                                    )}
                                    {isCurrentLevel && (
                                        <Clock className="w-5 h-5 text-purple-400 animate-pulse" />
                                    )}
                                </div>

                                {/* Approvers at this level */}
                                {levelsApprovals.length > 0 && (
                                    <div className="space-y-2 mt-3">
                                        {levelsApprovals.map((approval) => (
                                            <div
                                                key={approval.id}
                                                className="flex items-start gap-2 text-xs bg-baked-darkest/50 rounded p-2"
                                            >
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {getActionIcon(approval.action)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="w-5 h-5">
                                                            <AvatarFallback className="text-[10px] bg-purple-400/20 text-purple-300">
                                                                {approval.approverName
                                                                    .split(' ')
                                                                    .map((n) => n[0])
                                                                    .join('')
                                                                    .slice(0, 2)
                                                                    .toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium text-baked-text-primary truncate">
                                                            {approval.approverName}
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] px-1 py-0 h-4 border-baked-border"
                                                        >
                                                            {approval.approverRole}
                                                        </Badge>
                                                    </div>
                                                    {approval.notes && (
                                                        <p className="text-baked-text-muted mt-1 text-[11px]">
                                                            "{approval.notes}"
                                                        </p>
                                                    )}
                                                    <p className="text-baked-text-muted mt-0.5 text-[10px]">
                                                        {new Date(approval.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Pending approvers */}
                                {isCurrentLevel && levelsApprovals.length === 0 && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-purple-300">
                                        <Users className="w-4 h-4" />
                                        <span>Awaiting review from: {approvalState.nextRequiredRoles.join(', ')}</span>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Rejection Reason */}
                {approvalState.status === 'rejected' && approvalState.rejectionReason && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-red-400 mb-1">Rejection Reason</p>
                                <p className="text-xs text-baked-text-secondary">
                                    {approvalState.rejectionReason}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {canCurrentUserApprove && !userAlreadyApproved && (
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-3 pt-3 border-t border-baked-border"
                        >
                            <Textarea
                                value={actionNotes}
                                onChange={(e) => setActionNotes(e.target.value)}
                                placeholder="Add optional notes for your review decision..."
                                className="bg-baked-darkest border-baked-border resize-none h-20 text-sm placeholder:text-baked-text-muted/50 focus-visible:ring-purple-400/50"
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    onClick={handleApprove}
                                    disabled={isSubmitting}
                                    className="bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        'Processing...'
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                            Approve
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={handleReject}
                                    disabled={isSubmitting || !actionNotes.trim()}
                                    variant="destructive"
                                    className="font-semibold disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        'Processing...'
                                    ) : (
                                        <>
                                            <XCircle className="w-4 h-4 mr-1.5" />
                                            Reject
                                        </>
                                    )}
                                </Button>
                            </div>

                            <p className="text-xs text-baked-text-muted text-center">
                                Your decision will advance the content to the next approval level
                            </p>
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* User Already Approved Message */}
                {userAlreadyApproved && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-green-400" />
                        <p className="text-sm text-green-400">You have already approved at this level</p>
                    </div>
                )}

                {/* Cannot Approve Message */}
                {!canCurrentUserApprove && !userAlreadyApproved && approvalState.status === 'pending_approval' && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-400" />
                        <p className="text-sm text-blue-400">
                            Waiting for approval from: {approvalState.nextRequiredRoles.join(', ')}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
