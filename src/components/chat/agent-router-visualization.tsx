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
    const [visible, setVisible] = useState(true);

    // Filter to find the single most relevant step to show
    // Priority:
    // 1. In-progress step
    // 2. Last completed step (if nothing in progress)
    // 3. First step (if nothing started)
    const activeStep = steps.find(s => s.status === 'in-progress') 
        || steps.toReversed().find(s => s.status === 'completed') // Use slice().reverse() if toReversed not avail
        || steps[0];

    useEffect(() => {
        if (isComplete) {
            // Wait briefly to show "Complete" then hide
            const timer = setTimeout(() => {
                setVisible(false);
                onAnimationComplete?.();
            }, 1500);
            return () => clearTimeout(timer);
        } else {
            setVisible(true);
        }
    }, [isComplete, onAnimationComplete]);

    if (!visible || !activeStep) return null;

    return (
        <AnimatePresence mode="wait">
            {visible && (
                <motion.div
                    key="container"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-md mx-auto my-2"
                >
                    <motion.div
                        key={activeStep ? activeStep.id : 'loading'}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "flex items-center gap-3 p-2 rounded-lg border bg-card/50 backdrop-blur-sm text-xs text-muted-foreground",
                            activeStep.status === 'in-progress' && "border-primary/20 bg-primary/5",
                            activeStep.status === 'completed' && "border-green-200 bg-green-50/50"
                        )}
                    >
                        <div className="shrink-0">
                            {activeStep.status === 'in-progress' ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            ) : activeStep.status === 'completed' ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                                <div className="h-3.5 w-3.5 rounded-full border-2 border-muted" />
                            )}
                        </div>
                        
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                             <span className="font-medium text-foreground">
                                {formatStepTitle(activeStep.toolName)}
                             </span>
                             {activeStep.description && (
                                <span className="truncate opacity-75 hidden sm:inline">
                                    - {activeStep.description}
                                </span>
                             )}
                        </div>
                    </motion.div>
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
