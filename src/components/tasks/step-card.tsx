// Step Card Component - displays a single step in the task execution flow

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskStep, ToolExecution } from '@/types/task';
import { cn } from '@/lib/utils';
import {
    CheckCircle2,
    Circle,
    Clock,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Bot,
    ShieldCheck
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToolExecutionList } from './tool-execution-list';
import { ConfidenceMeter } from './confidence-meter';

interface StepCardProps {
    step: TaskStep;
    isActive: boolean;
    isLast: boolean;
}

export function StepCard({ step, isActive, isLast }: StepCardProps) {
    const [isExpanded, setIsExpanded] = useState(isActive);

    // Auto-expand when active
    if (isActive && !isExpanded) {
        setIsExpanded(true);
    }

    const getStatusIcon = () => {
        switch (step.status) {
            case 'completed':
                return <CheckCircle2 className="h-6 w-6 text-green-500" />;
            case 'running':
                return <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />;
            case 'failed':
                return <AlertCircle className="h-6 w-6 text-red-500" />;
            default:
                return <Circle className="h-6 w-6 text-muted-foreground" />;
        }
    };

    const getStatusColor = () => {
        switch (step.status) {
            case 'completed':
                return 'border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-900/10';
            case 'running':
                return 'border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/10 ring-1 ring-blue-500/20';
            case 'failed':
                return 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10';
            default:
                return 'border-border bg-card';
        }
    };

    return (
        <div className="relative pl-8 pb-8 last:pb-0">
            {/* Timeline Line */}
            {!isLast && (
                <div
                    className={cn(
                        "absolute left-[11px] top-8 bottom-0 w-0.5",
                        step.status === 'completed' ? "bg-green-500/30" : "bg-border"
                    )}
                />
            )}

            {/* Status Icon */}
            <div className="absolute left-0 top-0 bg-background rounded-full">
                {getStatusIcon()}
            </div>

            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card
                    className={cn(
                        "transition-all duration-300",
                        getStatusColor()
                    )}
                >
                    {/* Header */}
                    <div
                        className="p-4 flex items-start gap-4 cursor-pointer"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Step {step.stepNumber}
                                </span>
                                <Badge variant="outline" className="gap-1">
                                    <Bot className="h-3 w-3" />
                                    {step.agentId}
                                </Badge>
                                {step.deeboReviewed && (
                                    <Badge variant="secondary" className="gap-1 text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300">
                                        <ShieldCheck className="h-3 w-3" />
                                        Deebo Reviewed
                                    </Badge>
                                )}
                            </div>
                            <h3 className="font-semibold text-lg">{step.description}</h3>
                        </div>

                        <div className="flex items-center gap-4">
                            {step.confidenceScore > 0 && (
                                <div className="w-24 hidden sm:block">
                                    <ConfidenceMeter
                                        score={step.confidenceScore}
                                        size="sm"
                                        showTrend={false}
                                    />
                                </div>
                            )}
                            {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="px-4 pb-4 space-y-4">
                                    {/* Objective */}
                                    <div className="text-sm text-muted-foreground bg-background/50 p-3 rounded-md">
                                        <strong>Objective:</strong> {step.objective}
                                    </div>

                                    {/* Tool Executions */}
                                    {step.toolExecutions.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Execution Log
                                            </div>
                                            <ToolExecutionList executions={step.toolExecutions} />
                                        </div>
                                    )}

                                    {/* Pending State */}
                                    {step.status === 'running' && step.toolExecutions.length === 0 && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                                            <Clock className="h-4 w-4 animate-pulse" />
                                            Agent is thinking...
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </motion.div>
        </div>
    );
}
