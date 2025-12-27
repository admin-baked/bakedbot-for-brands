'use client';

/**
 * ThoughtProcess Component
 * Visualizes the agent's thinking steps: Analyzing -> Routing -> Processing -> etc.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, 
    Circle, 
    Loader2, 
    Brain, 
    Search, 
    Route, 
    Sparkles 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ThoughtStep = {
    id: string;
    label: string;
    icon: React.ElementType;
    status: 'waiting' | 'running' | 'completed';
};

interface ThoughtProcessProps {
    steps: ThoughtStep[];
    onComplete?: () => void;
}

export function ThoughtProcess({ steps: initialSteps, onComplete }: ThoughtProcessProps) {
    const [steps, setSteps] = useState<ThoughtStep[]>(initialSteps);
    
    useEffect(() => {
        let mounted = true;
        
        const runSteps = async () => {
            for (let i = 0; i < steps.length; i++) {
                if (!mounted) return;

                // Mark current as running
                setSteps(prev => prev.map((s, idx) => 
                    idx === i ? { ...s, status: 'running' } : s
                ));

                // Simulate work (random duration for "realism")
                const duration = 600 + Math.random() * 800; // 0.6s - 1.4s per step
                await new Promise(resolve => setTimeout(resolve, duration));

                // Mark current as completed
                setSteps(prev => prev.map((s, idx) => 
                    idx === i ? { ...s, status: 'completed' } : s
                ));
            }
            if (mounted && onComplete) {
                onComplete();
            }
        };

        runSteps();

        return () => { mounted = false; };
    }, []); // Run once on mount

    return (
        <div className="w-full max-w-md mx-auto py-8 px-4">
            <div className="space-y-4">
                {steps.map((step, idx) => (
                    <ThoughtStepItem 
                        key={step.id} 
                        step={step} 
                        isLast={idx === steps.length - 1} 
                    />
                ))}
            </div>
        </div>
    );
}

function ThoughtStepItem({ step, isLast }: { step: ThoughtStep, isLast: boolean }) {
    const isActive = step.status === 'running';
    const isCompleted = step.status === 'completed';
    const isWaiting = step.status === 'waiting';

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isWaiting ? 0.4 : 1, y: 0 }}
            className={cn(
                "flex items-start gap-4 relative",
                isWaiting && "grayscale"
            )}
        >
            {/* Connecting Line */}
            {!isLast && (
                <div className={cn(
                    "absolute left-[11px] top-8 bottom-[-16px] w-[2px] transition-colors duration-500",
                    isCompleted ? "bg-emerald-200" : "bg-gray-100"
                )} />
            )}

            {/* Icon Status */}
            <div className="relative z-10 flex-shrink-0 bg-white">
                <AnimatePresence mode="wait">
                    {isCompleted ? (
                        <motion.div
                            key="completed"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-emerald-500"
                        >
                            <CheckCircle2 className="w-6 h-6 fill-emerald-50" />
                        </motion.div>
                    ) : isActive ? (
                        <motion.div
                            key="running"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-emerald-600"
                        >
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="waiting"
                            className="text-gray-300"
                        >
                            <Circle className="w-6 h-6" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Content */}
            <div className={cn(
                "flex-1 pt-0.5 transition-colors duration-300",
                isActive ? "text-gray-900" : "text-gray-500"
            )}>
                <div className="flex items-center gap-2">
                    <step.icon className={cn(
                        "w-4 h-4",
                        isActive ? "text-emerald-500" : "text-gray-400"
                    )} />
                    <span className="font-medium text-sm">
                        {step.label}
                    </span>
                 </div>
                 {isActive && (
                    <motion.p 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-xs text-emerald-600 mt-1"
                    >
                        Processing...
                    </motion.p>
                 )}
            </div>
        </motion.div>
    );
}

// Preset configurations for different intent types
export const THOUGHT_PRESETS = {
    default: [
        { id: 'analyze', label: 'Analyzing Request', icon: Brain, status: 'waiting' },
        { id: 'routing', label: 'Routing Intent', icon: Route, status: 'waiting' },
        { id: 'agent', label: 'Selecting Agent', icon: Bot, status: 'waiting' }, // Replaced Bot with dynamic component if needed, but generic Bot is fine
        { id: 'process', label: 'Synthesizing Response', icon: Sparkles, status: 'waiting' },
    ] as ThoughtStep[],
    
    image: [
        { id: 'analyze', label: 'Analyzing Request', icon: Brain, status: 'waiting' },
        { id: 'routing', label: 'Routing to Midjourney Agent', icon: Route, status: 'waiting' },
        { id: 'generate', label: 'Generating Image', icon: ImageIcon, status: 'waiting' },
        { id: 'optimize', label: 'Optimizing Assets', icon: Sparkles, status: 'waiting' },
    ] as ThoughtStep[],

    video: [
        { id: 'analyze', label: 'Analyzing Request', icon: Brain, status: 'waiting' },
        { id: 'routing', label: 'Routing to Sora Agent', icon: Route, status: 'waiting' },
        { id: 'generate', label: 'Generating Video', icon: Video, status: 'waiting' },
        { id: 'render', label: 'Rendering Output', icon: Sparkles, status: 'waiting' },
    ] as ThoughtStep[]
};

// Need access to Bot/Video icons from the caller or re-import
import { Bot, Image as ImageIcon, Video } from 'lucide-react';
