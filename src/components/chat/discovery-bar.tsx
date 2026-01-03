'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Terminal,
    ChevronDown,
    ChevronUp,
    X,
    Zap, 
    Leaf, 
    CheckCircle2, 
    Loader2, 
    Cpu,
    BarChart3,
    Megaphone,
    ShieldAlert,
    Globe,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface DiscoveryStep {
    id: string;
    agentId: string;
    agentName: string;
    action: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    startedAt?: Date;
    durationMs?: number;
}

interface DiscoveryBarProps {
    isActive: boolean;
    steps: DiscoveryStep[];
    onClose?: () => void;
    onExpand?: () => void;
    isFirstDiscovery?: boolean;  // Show full terminal on first discovery
}

export function DiscoveryBar({ 
    isActive, 
    steps, 
    onClose, 
    onExpand,
    isFirstDiscovery = false 
}: DiscoveryBarProps) {
    const [isExpanded, setIsExpanded] = useState(isFirstDiscovery);
    const [showFullTerminal, setShowFullTerminal] = useState(isFirstDiscovery);
    const logsEndRef = useRef<HTMLDivElement>(null);
    
    // Auto-scroll logs when steps change
    useEffect(() => {
        if (logsEndRef.current && isExpanded) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [steps, isExpanded]);
    
    // Calculate total duration
    const totalDurationMs = steps.reduce((sum, s) => sum + (s.durationMs || 0), 0);
    const totalDurationSec = Math.round(totalDurationMs / 1000);
    
    // Get active agent
    const activeStep = steps.find(s => s.status === 'running');
    const completedCount = steps.filter(s => s.status === 'done').length;
    const totalCount = steps.length;
    
    // Agent icon/color config
    const getAgentConfig = (agentId: string) => {
        switch(agentId.toLowerCase()) {
            case 'ezal': return { color: 'purple', icon: Zap };
            case 'smokey': return { color: 'emerald', icon: Leaf };
            case 'craig': return { color: 'blue', icon: Megaphone };
            case 'pops': return { color: 'orange', icon: BarChart3 };
            case 'deebo': return { color: 'red', icon: ShieldAlert };
            default: return { color: 'slate', icon: Cpu };
        }
    };
    
    // Don't render if no steps and not active
    if (!isActive && steps.length === 0) return null;
    
    // Collapsed summary view (after completion)
    if (!isActive && !isExpanded && steps.length > 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-sm"
            >
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-slate-600 dark:text-slate-300">
                    Discovery: {completedCount} step{completedCount !== 1 ? 's' : ''} • {totalDurationSec}s
                </span>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                    onClick={() => setIsExpanded(true)}
                >
                    Details <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
            </motion.div>
        );
    }
    
    // Active or expanded view
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                className={cn(
                    "w-full rounded-xl overflow-hidden shadow-lg border font-sans transition-all duration-300",
                    showFullTerminal 
                        ? "border-slate-700 bg-slate-950" 
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                )}
            >
                {/* Header */}
                <div className={cn(
                    "flex items-center justify-between px-4 py-2",
                    showFullTerminal 
                        ? "bg-slate-900 border-b border-slate-800" 
                        : "bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700"
                )}>
                    <div className="flex items-center gap-3">
                        {/* Macbook dots for full terminal mode */}
                        {showFullTerminal && (
                            <div className="flex space-x-1.5 opacity-80">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                            {isActive ? (
                                <Loader2 className={cn(
                                    "h-4 w-4 animate-spin",
                                    showFullTerminal ? "text-emerald-400" : "text-primary"
                                )} />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            <span className={cn(
                                "font-medium text-sm",
                                showFullTerminal ? "text-slate-200" : "text-slate-700 dark:text-slate-200"
                            )}>
                                {isActive ? 'Discovery Active' : 'Discovery Complete'}
                            </span>
                        </div>
                        
                        {/* Active agent indicator */}
                        {activeStep && (
                            <div className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs",
                                showFullTerminal 
                                    ? "bg-purple-950/50 border border-purple-500/30 text-purple-200"
                                    : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                            )}>
                                <Globe className="h-3 w-3" />
                                {activeStep.agentName}: {activeStep.action}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Timer */}
                        <div className={cn(
                            "flex items-center gap-1 text-xs",
                            showFullTerminal ? "text-slate-400" : "text-slate-500"
                        )}>
                            <Clock className="h-3 w-3" />
                            {isActive ? (
                                <LiveTimer startedAt={steps[0]?.startedAt} />
                            ) : (
                                <span>{totalDurationSec}s</span>
                            )}
                        </div>
                        
                        {/* Toggle view mode */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-7 px-2",
                                showFullTerminal ? "text-slate-400 hover:text-slate-200" : ""
                            )}
                            onClick={() => setShowFullTerminal(!showFullTerminal)}
                        >
                            <Terminal className="h-3.5 w-3.5" />
                        </Button>
                        
                        {/* Collapse/Expand */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-7 px-2",
                                showFullTerminal ? "text-slate-400 hover:text-slate-200" : ""
                            )}
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                            )}
                        </Button>
                        
                        {/* Close (only when complete) */}
                        {!isActive && onClose && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-7 px-2",
                                    showFullTerminal ? "text-slate-400 hover:text-slate-200" : ""
                                )}
                                onClick={onClose}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
                
                {/* Steps List */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                "overflow-hidden",
                                showFullTerminal ? "max-h-48" : "max-h-32"
                            )}
                        >
                            <div className={cn(
                                "p-3 space-y-1 overflow-y-auto",
                                showFullTerminal ? "font-mono text-[11px]" : "text-sm"
                            )}>
                                {steps.map((step, i) => {
                                    const config = getAgentConfig(step.agentId);
                                    const Icon = config.icon;
                                    
                                    return (
                                        <motion.div
                                            key={step.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={cn(
                                                "flex items-center gap-2",
                                                showFullTerminal 
                                                    ? step.status === 'running' 
                                                        ? `text-${config.color}-400` 
                                                        : "text-slate-400"
                                                    : step.status === 'running'
                                                        ? "text-primary"
                                                        : "text-slate-600 dark:text-slate-400"
                                            )}
                                        >
                                            {/* Status indicator */}
                                            {step.status === 'done' ? (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                            ) : step.status === 'running' ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                                            ) : step.status === 'failed' ? (
                                                <X className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                            ) : (
                                                <div className="h-3.5 w-3.5 rounded-full border border-current opacity-30 flex-shrink-0" />
                                            )}
                                            
                                            {/* Agent icon */}
                                            <Icon className={cn(
                                                "h-3 w-3 flex-shrink-0",
                                                showFullTerminal ? `text-${config.color}-500` : ""
                                            )} />
                                            
                                            {/* Action text */}
                                            <span className="truncate">{step.agentName}: {step.action}</span>
                                            
                                            {/* Duration */}
                                            {step.durationMs && (
                                                <span className="text-xs opacity-50 ml-auto flex-shrink-0">
                                                    {Math.round(step.durationMs / 1000)}s
                                                </span>
                                            )}
                                        </motion.div>
                                    );
                                })}
                                
                                {/* Cursor for active state */}
                                {isActive && (
                                    <div className={cn(
                                        "animate-pulse",
                                        showFullTerminal ? "text-emerald-500" : "text-primary"
                                    )}>
                                        {showFullTerminal ? '█' : '...'}
                                    </div>
                                )}
                                
                                <div ref={logsEndRef} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}

// Live timer component
function LiveTimer({ startedAt }: { startedAt?: Date }) {
    const [seconds, setSeconds] = useState(0);
    
    useEffect(() => {
        if (!startedAt) return;
        
        const interval = setInterval(() => {
            setSeconds(Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
        }, 1000);
        
        return () => clearInterval(interval);
    }, [startedAt]);
    
    return <span>{seconds}s</span>;
}

// Compact inline summary for past messages
export function DiscoverySummary({ 
    steps, 
    durationSec,
    onExpand 
}: { 
    steps: DiscoveryStep[];
    durationSec: number;
    onExpand?: () => void;
}) {
    const agentNames = Array.from(new Set(steps.map(s => s.agentName)));
    
    return (
        <button
            onClick={onExpand}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-600 dark:text-slate-400 transition-colors"
        >
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span>
                {agentNames.length > 2 
                    ? `${agentNames.slice(0, 2).join(' → ')} +${agentNames.length - 2}`
                    : agentNames.join(' → ')
                }
            </span>
            <span className="opacity-50">({durationSec}s)</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
    );
}
