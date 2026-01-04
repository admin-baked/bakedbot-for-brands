'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Terminal,
    Search, 
    Leaf, 
    Zap, 
    Globe, 
    CheckCircle2, 
    Loader2, 
    Server,
    Cpu,
    MousePointer2,
    BarChart3,
    Megaphone,
    ShieldAlert,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolCallStep } from '@/app/dashboard/ceo/components/puff-chat';

interface ThinkingWindowProps {
    steps: ToolCallStep[];
    isThinking: boolean;
    agentName?: string; // 'smokey', 'ezal', 'craig', etc.
    query?: string;
}

export function ThinkingWindow({ steps, isThinking, agentName = 'puff', query }: ThinkingWindowProps) {
    // Scroll logs to bottom
    const logsEndRef = useRef<HTMLDivElement>(null);
    
    // Auto-scroll logs when steps change
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [steps]);

    // Determine visual mode based on agent
    const getAgentConfig = () => {
        switch(agentName.toLowerCase()) {
            case 'ezal': return { color: 'purple', icon: Zap, label: 'Market Scanner' };
            case 'smokey': return { color: 'emerald', icon: Leaf, label: 'Inventory Sync' };
            case 'craig': return { color: 'blue', icon: Megaphone, label: 'Campaign Builder' };
            case 'pops': return { color: 'orange', icon: BarChart3, label: 'Data Analyst' };
            case 'deebo': return { color: 'red', icon: ShieldAlert, label: 'Compliance Audit' };
            default: return { color: 'slate', icon: Cpu, label: 'System Core' };
        }
    };

    const config = getAgentConfig();
    const activeStep = steps.find(s => s.status === 'in-progress') || steps[steps.length - 1];

    if (!isThinking && (!steps || steps.length === 0)) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-3xl mx-auto my-4 rounded-xl overflow-hidden shadow-2xl border border-border/50 font-sans"
        >
            {/* Header / Browser Bar */}
            <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-3 space-x-2">
                <div className="flex space-x-1.5 opacity-80">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 ml-2 flex justify-center">
                    <div className="bg-slate-800/80 rounded px-2 py-0.5 text-[10px] text-slate-400 font-mono w-2/3 flex items-center justify-between border border-slate-700/50">
                        <span className="truncate flex items-center gap-1.5">
                            <config.icon className={cn("h-3 w-3", `text-${config.color}-400`)} />
                            {activeStep?.toolName ? `agent://${agentName}/${activeStep.toolName.toLowerCase().replace(/\s/g, '-')}` : `agent://${agentName}/idle`}
                        </span>
                        {isThinking && <RefreshCw className="h-2.5 w-2.5 animate-spin opacity-50" />}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative h-48 bg-slate-950 overflow-hidden flex flex-col">
                
                {/* Background Grid/Effect */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                </div>

                {/* Agent Visuals */}
                <div className="absolute inset-0 overflow-hidden p-4">
                    <AnimatePresence mode="wait">
                        {agentName === 'ezal' ? (
                            <EzalVisual key="ezal" isThinking={isThinking} />
                        ) : agentName === 'smokey' ? (
                            <SmokeyVisual key="smokey" isThinking={isThinking} />
                        ) : (
                            <GenericVisual key="generic" config={config} isThinking={isThinking} />
                        )}
                    </AnimatePresence>
                </div>

                {/* Floating Stats / Info */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 pointer-events-none select-none">
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-slate-900/90 backdrop-blur text-xs text-slate-300 border border-slate-800 rounded px-2 py-1 shadow-sm font-mono flex items-center gap-2"
                    >
                        <Server className="h-3 w-3 text-blue-500" />
                        <span>Latency: {Math.floor(Math.random() * 40 + 20)}ms</span>
                    </motion.div>
                </div>

                {/* Agent Cursor (Simulated Movement) */}
                {isThinking && (
                    <AgentCursor color={config.color} />
                )}
            </div>

            {/* Terminal / Logs Footer */}
            <div className="h-32 bg-slate-950 border-t border-slate-800 p-3 font-mono text-[10px] overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 mb-2 text-slate-500 border-b border-slate-900 pb-1">
                    <Terminal className="h-3 w-3" />
                    <span>Episodic Thinking</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 scrollbar-none">
                    {steps.map((step, i) => (
                        <motion.div 
                            key={step.id}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn(
                                "flex items-start gap-2",
                                step.status === 'in-progress' ? `text-${config.color}-400` : "text-slate-400"
                            )}
                        >
                            <span className="opacity-50 min-w-[30px]">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]</span>
                            <span>
                                <span className={cn("font-bold mr-1", step.status === 'completed' ? "text-green-500" : "")}>
                                    {step.status === 'completed' ? '✓' : '>'}
                                </span>
                                {step.description || step.toolName}
                            </span>
                        </motion.div>
                    ))}
                    {isThinking && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            className={`text-${config.color}-500 animate-pulse`}
                        >
                            <span className="opacity-50 min-w-[30px]">...</span>
                            <span>_</span>
                        </motion.div>
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </motion.div>
    );
}

// --- Visual Sub-Components ---

function EzalVisual({ isThinking }: { isThinking: boolean }) {
    return (
        <div className="w-full h-full relative">
            {/* Radar / Scanner Visual */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative w-48 h-48">
                    {/* Ripple Rings */}
                    <div className="absolute inset-0 border border-purple-500/20 rounded-full" />
                    <div className="absolute inset-4 border border-purple-500/20 rounded-full" />
                    <div className="absolute inset-8 border border-purple-500/20 rounded-full" />
                    <div className="absolute inset-12 border border-purple-500/20 rounded-full" />
                    
                    {/* Scanning Line */}
                    {isThinking && (
                        <div className="absolute inset-0 rounded-full border-t border-purple-500/50 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(168,85,247,0.1)_180deg,transparent_360deg)] animate-[spin_3s_linear_infinite]" />
                    )}

                    {/* Detected Points */}
                    <motion.div 
                        animate={{ opacity: [0, 1, 0] }} 
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        className="absolute top-8 right-10 w-2 h-2 bg-red-400 rounded-full shadow-[0_0_8px_rgba(248,113,113,0.8)]" 
                    />
                    <motion.div 
                        animate={{ opacity: [0, 1, 0] }} 
                        transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
                        className="absolute bottom-12 left-14 w-2 h-2 bg-red-400 rounded-full shadow-[0_0_8px_rgba(248,113,113,0.8)]" 
                    />
                </div>
            </div>
            <div className="absolute bottom-0 right-0">
                <div className="flex items-center gap-2 bg-purple-950/50 border border-purple-500/30 text-purple-200 px-2 py-1 rounded text-[10px]">
                    <Globe className="h-3 w-3" />
                    <span>BakedBot Discovery Active</span>
                </div>
            </div>
        </div>
    );
}

function SmokeyVisual({ isThinking }: { isThinking: boolean }) {
    return (
        <div className="w-full h-full relative p-4">
             <div className="grid grid-cols-4 gap-2 opacity-50">
                 {[...Array(12)].map((_, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0.3, scale: 0.9 }}
                        animate={isThinking ? { 
                            opacity: [0.3, 0.8, 0.3],
                            scale: [0.9, 1, 0.9]
                        } : {}}
                        transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
                        className="aspect-square bg-emerald-500/10 border border-emerald-500/20 rounded-md"
                    />
                 ))}
             </div>
             {/* Center Focus */}
             <div className="absolute inset-0 flex items-center justify-center">
                 <div className="bg-slate-900/80 backdrop-blur p-4 rounded-xl border border-emerald-500/30 shadow-xl flex flex-col items-center">
                    <Leaf className={cn("h-8 w-8 text-emerald-500", isThinking && "animate-pulse")} />
                    <span className="text-xs text-emerald-200 mt-2 font-mono">Catalog Sync</span>
                 </div>
             </div>
        </div>
    );
}

function GenericVisual({ config, isThinking }: { config: any, isThinking: boolean }) {
    const Icon = config.icon;
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className={cn("absolute inset-0 rounded-full opacity-20 animate-ping", `bg-${config.color}-500`)} />
                    <div className={cn("relative p-4 rounded-full bg-slate-800 border", `border-${config.color}-500/50`)}>
                        <Icon className={cn("h-8 w-8", `text-${config.color}-400`)} />
                    </div>
                </div>
                <div className="text-center space-y-1">
                    <h4 className="text-sm font-medium text-slate-200">{config.label}</h4>
                    {isThinking && (
                        <p className={cn("text-xs font-mono animate-pulse", `text-${config.color}-400`)}>Processing request...</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function AgentCursor({ color = 'slate' }: { color?: string }) {
    return (
        <motion.div
            initial={{ x: "50%", y: "50%", opacity: 0 }}
            animate={{ 
                x: ["40%", "60%", "30%", "70%", "50%"], 
                y: ["40%", "60%", "70%", "30%", "50%"],
                opacity: 1 
            }}
            transition={{ 
                duration: 4, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "mirror"
            }}
            className="absolute z-20 pointer-events-none"
        >
            <MousePointer2 className={cn("h-5 w-5 drop-shadow-md", `text-${color}-500 fill-${color}-500/20`)} />
            <div className={cn("ml-4 -mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm text-white", `bg-${color}-600`)}>
                Agent
            </div>
        </motion.div>
    );
}
