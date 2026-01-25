'use client';

/**
 * Workflow Lifecycle
 *
 * Visual stepper showing content approval workflow with Framer Motion animations.
 * Highlights current step with pulsing effect and shows assigned agent.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ContentStatus } from '@/types/creative-content';

type WorkflowStep = {
    id: ContentStatus;
    label: string;
    status: 'completed' | 'active' | 'upcoming';
    agent?: {
        name: string;
        avatar?: string;
        initials: string;
    };
    timestamp?: string;
};

interface WorkflowLifecycleProps {
    currentStatus: ContentStatus;
    onApprove?: () => void;
    onSchedule?: () => void;
    className?: string;
    agentName?: string;
    agentAvatar?: string;
}

const WORKFLOW_STEPS: Omit<WorkflowStep, 'status'>[] = [
    { id: 'draft', label: 'Draft' },
    { id: 'pending', label: 'Pending Review' },
    { id: 'revision', label: 'Under Revision' },
    { id: 'approved', label: 'Approved' },
    { id: 'scheduled', label: 'Scheduled' },
];

function getStepStatus(
    stepId: ContentStatus,
    currentStatus: ContentStatus
): 'completed' | 'active' | 'upcoming' {
    const stepOrder = WORKFLOW_STEPS.map((s) => s.id);
    const currentIndex = stepOrder.indexOf(currentStatus);
    const stepIndex = stepOrder.indexOf(stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'upcoming';
}

function getProgressWidth(currentStatus: ContentStatus): string {
    const stepOrder = WORKFLOW_STEPS.map((s) => s.id);
    const currentIndex = stepOrder.indexOf(currentStatus);
    const percentage = (currentIndex / (stepOrder.length - 1)) * 100;
    return `${Math.min(percentage, 100)}%`;
}

export function WorkflowLifecycle({
    currentStatus,
    onApprove,
    onSchedule,
    className,
    agentName = 'Craig',
    agentAvatar,
}: WorkflowLifecycleProps) {
    const steps: WorkflowStep[] = WORKFLOW_STEPS.map((step) => ({
        ...step,
        status: getStepStatus(step.id, currentStatus),
        agent:
            step.id === currentStatus && step.id === 'revision'
                ? { name: agentName, avatar: agentAvatar, initials: agentName.charAt(0) }
                : undefined,
    }));

    const progressWidth = getProgressWidth(currentStatus);
    const isApproved = currentStatus === 'approved' || currentStatus === 'scheduled';
    const canApprove = currentStatus === 'pending' || currentStatus === 'revision';

    return (
        <Card className={cn('glass-card glass-card-hover', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Workflow & Approval Lifecycle
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>
            <CardContent>
                {/* Stepper */}
                <div className="relative flex items-center justify-between mb-8 mt-4 px-2">
                    {/* Background Line */}
                    <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-secondary rounded-full" />

                    {/* Progress Line (animated) */}
                    <motion.div
                        className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-primary rounded-full z-0"
                        initial={{ width: 0 }}
                        animate={{ width: progressWidth }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />

                    {/* Steps */}
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className="relative z-10 flex flex-col items-center group"
                        >
                            {/* Step Circle */}
                            <div
                                className={cn(
                                    'h-4 w-4 rounded-full border-2 flex items-center justify-center bg-background transition-colors relative',
                                    step.status === 'completed'
                                        ? 'border-primary bg-primary'
                                        : step.status === 'active'
                                        ? 'border-primary'
                                        : 'border-secondary bg-secondary'
                                )}
                            >
                                {/* Completed checkmark */}
                                {step.status === 'completed' && (
                                    <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                )}

                                {/* Active pulse effect */}
                                {step.status === 'active' && (
                                    <>
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 1 }}
                                            animate={{ scale: 1.8, opacity: 0 }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Infinity,
                                                ease: 'easeOut',
                                            }}
                                            className="absolute h-full w-full rounded-full bg-primary/60"
                                        />
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    </>
                                )}
                            </div>

                            {/* Step Label */}
                            <span
                                className={cn(
                                    'absolute top-6 text-[10px] whitespace-nowrap font-medium text-center',
                                    step.status === 'upcoming'
                                        ? 'text-muted-foreground'
                                        : 'text-foreground'
                                )}
                            >
                                {step.label}
                            </span>

                            {/* Active Agent Indicator */}
                            {step.agent && step.status === 'active' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute top-12 flex items-center gap-1.5 bg-secondary/50 py-1 px-2 rounded-full border border-border/50"
                                >
                                    <Avatar className="h-4 w-4">
                                        {step.agent.avatar && (
                                            <AvatarImage src={step.agent.avatar} />
                                        )}
                                        <AvatarFallback className="text-[8px]">
                                            {step.agent.initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] text-muted-foreground">
                                        {step.agent.name}
                                    </span>
                                </motion.div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-center mb-4 mt-8">
                    <Badge
                        variant={isApproved ? 'default' : 'secondary'}
                        className={cn(
                            'text-xs',
                            isApproved && 'bg-green-500/20 text-green-400 border-green-500/30'
                        )}
                    >
                        {currentStatus === 'draft' && 'Draft - Pending Submission'}
                        {currentStatus === 'pending' && 'Awaiting Review'}
                        {currentStatus === 'revision' && `${agentName} is revising...`}
                        {currentStatus === 'approved' && 'Ready to Schedule'}
                        {currentStatus === 'scheduled' && 'Scheduled for Publishing'}
                    </Badge>
                </div>

                {/* Action Button */}
                <div className="flex justify-end mt-4">
                    {canApprove && (
                        <Button
                            onClick={onApprove}
                            className="bg-zinc-100 text-zinc-900 hover:bg-white flex gap-2"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                        </Button>
                    )}
                    {currentStatus === 'approved' && (
                        <Button
                            onClick={onSchedule}
                            className="bg-zinc-100 text-zinc-900 hover:bg-white flex gap-2"
                        >
                            <Clock className="h-4 w-4" />
                            Approve & Schedule
                        </Button>
                    )}
                    {currentStatus === 'scheduled' && (
                        <Button variant="outline" className="flex gap-2">
                            <Clock className="h-4 w-4" />
                            View Schedule
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default WorkflowLifecycle;
