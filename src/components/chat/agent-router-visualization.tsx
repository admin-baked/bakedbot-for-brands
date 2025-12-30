import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2, Brain, Shield, MapPin, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface RouterStep {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed';
    description?: string;
}

interface AgentRouterVisualizationProps {
    steps: {
        id: string;
        toolName: string;
        description: string;
        status: 'pending' | 'in-progress' | 'completed' | 'failed';
    }[];
    isComplete: boolean;
    onAnimationComplete?: () => void;
}

export function AgentRouterVisualization({ steps, isComplete, onAnimationComplete }: AgentRouterVisualizationProps) {
    const [shouldRender, setShouldRender] = useState(true);

    useEffect(() => {
        if (isComplete) {
            // Wait for fade out animation before hiding from DOM entirely if needed
            // But we keep it in DOM for layout stability initially, then collapse
            const timer = setTimeout(() => {
                setShouldRender(false);
                onAnimationComplete?.();
            }, 2000); // Keep visible for a moment then fade
            return () => clearTimeout(timer);
        } else {
            setShouldRender(true);
        }
    }, [isComplete, onAnimationComplete]);

    if (!shouldRender && isComplete) return null;

    return (
        <AnimatePresence>
            {shouldRender && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md mx-auto my-4 space-y-2 font-mono text-sm"
                >
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.id || index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border bg-card/50 backdrop-blur-sm transition-colors",
                                step.status === 'in-progress' && "border-primary/50 bg-primary/5 shadow-sm",
                                step.status === 'completed' && "border-green-200 bg-green-50/50 text-muted-foreground"
                            )}
                        >
                            <div className="mt-0.5 shrink-0">
                                {step.status === 'in-progress' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                {step.status === 'completed' && <Check className="h-4 w-4 text-green-500" />}
                                {step.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-muted" />}
                                {step.status === 'failed' && <div className="h-4 w-4 rounded-full bg-red-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium leading-none mb-1 text-sm">
                                    {formatStepTitle(step.toolName)}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {step.description}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    
                    {isComplete && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50 text-green-700"
                        >
                            <Check className="h-4 w-4" />
                            <div className="flex-1">
                                <div className="font-medium text-sm">Complete</div>
                                <div className="text-xs opacity-90">Task finished.</div>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function formatStepTitle(toolName: string): string {
    // Map internal tool names to pretty UI labels as shown in the screenshot
    const map: Record<string, string> = {
        'thoughts': 'Analyzing Request',
        'auth_check': 'Authenticating',
        'router': 'Routing',
        'memory': 'Memory Lookup',
        'response': 'Generating Response'
    };
    
    // Simple heuristic fallback
    if (map[toolName]) return map[toolName];
    if (toolName.includes('Loading')) return 'Processing...';
    
    // Capitalize words
    return toolName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
