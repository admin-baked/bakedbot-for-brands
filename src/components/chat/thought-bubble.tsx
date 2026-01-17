'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolCallStep } from '@/app/dashboard/playbooks/components/agent-chat';

interface ThoughtBubbleProps {
    steps: ToolCallStep[];
    isThinking: boolean;
    agentName?: string;
    duration?: number;
}

export function ThoughtBubble({ steps, isThinking, agentName = 'Assistant', duration = 0 }: ThoughtBubbleProps) {
    const [isOpen, setIsOpen] = useState(isThinking);
    const [elapsed, setElapsed] = useState(duration);

    // Auto-expand when thinking starts, but don't auto-close
    useEffect(() => {
        if (isThinking) setIsOpen(true);
    }, [isThinking]);

    // Timer effect for "Thinking for 12s..." label
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isThinking) {
            const start = Date.now() - (elapsed * 1000);
            interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isThinking, elapsed]);

    if (!steps || steps.length === 0) return null;

    const activeStep = steps.find(s => s.status === 'in-progress') || steps[steps.length - 1];
    const isDone = !isThinking && steps.every(s => s.status !== 'in-progress');

    return (
        <div className="mb-4 max-w-2xl">
            <div className="border rounded-lg bg-card/50 overflow-hidden shadow-sm">
                {/* Header / Toggle */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center gap-3 p-3 text-sm hover:bg-muted/50 transition-colors text-left"
                >
                    <div className={cn("p-1.5 rounded-md transition-colors", isThinking ? "bg-amber-100/50" : "bg-muted")}>
                         {isThinking ? (
                             <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                         ) : (
                             <div className="h-4 w-4 flex items-center justify-center">
                                <span className="block h-2 w-2 rounded-full bg-emerald-500" />
                             </div>
                         )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground/90">
                                {isThinking ? 'Thinking Process' : 'Thought Process'}
                            </span>
                            {isThinking && (
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {elapsed}s
                                </span>
                            )}
                        </div>
                        {!isOpen && activeStep && (
                            <p className="text-xs text-muted-foreground truncate opacity-80 mt-0.5">
                                {activeStep.description || activeStep.toolName}
                            </p>
                        )}
                    </div>

                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", !isOpen && "-rotate-90")} />
                </button>

                {/* Expanded Content */}
                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="px-4 pb-4 pt-1 space-y-3 border-t bg-muted/10">
                                <div className="space-y-4 pt-2">
                                    {steps.map((step, i) => (
                                        <div key={step.id || i} className="flex gap-3 text-sm group">
                                            <div className="mt-0.5 shrink-0">
                                                {step.status === 'completed' ? (
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                ) : step.status === 'failed' ? (
                                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                                ) : (
                                                    <div className="h-4 w-4 flex items-center justify-center">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={cn("font-medium", step.status === 'in-progress' && "text-amber-600")}>
                                                        {step.toolName}
                                                    </span>
                                                    {step.durationMs && step.durationMs > 0 && (
                                                        <span className="text-[10px] text-muted-foreground tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {(step.durationMs / 1000).toFixed(1)}s
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed break-words">
                                                    {step.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {isThinking && (
                                    <div className="pl-7 pt-1">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
