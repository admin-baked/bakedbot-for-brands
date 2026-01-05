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
    RefreshCw,
    Lock,
    ChevronLeft,
    ChevronRight,
    RotateCw,
    Maximize2,
    Minus,
    MessageSquare,
    Link,
    AlertCircle
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

    // URL Parsing Logic for Address Bar
    const getActiveUrl = () => {
        if (!activeStep) return 'about:blank';
        // Try to find a URL in the description
        const urlMatch = activeStep.description?.match(/https?:\/\/[^\s]+/);
        if (urlMatch) return urlMatch[0];
        
        // Fallback based on step name
        if (activeStep.toolName.toLowerCase().includes('google')) return 'https://google.com/search?q=dispensaries';
        if (activeStep.toolName.toLowerCase().includes('crawler')) return 'https://dutchesscanna.com/menu'; // Example simulation
        if (activeStep.toolName.toLowerCase().includes('search')) return 'https://google.com';
        
        return `agent://${agentName}/${activeStep.toolName.toLowerCase().replace(/\s/g, '-')}`;
    };

    const currentUrl = getActiveUrl();

    if (!isThinking && (!steps || steps.length === 0)) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-3xl mx-auto my-4 rounded-xl overflow-hidden shadow-2xl border border-slate-800 font-sans bg-slate-950"
        >
            {/* --- BROWSER CHROME --- */}
            
            {/* Tab Bar */}
            <div className="h-9 bg-[#1e1e1e] flex items-center px-4 pt-2 space-x-2 select-none">
                {/* Traffic Lights */}
                <div className="flex space-x-1.5 mr-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                </div>
                
                {/* Active Tab */}
                <div data-testid="active-tab" className="flex-1 max-w-[200px] h-full bg-[#3c3c3c] rounded-t-lg flex items-center px-3 text-[10px] text-slate-200 gap-2 relative group">
                    <div className={cn("w-2 h-2 rounded-full animate-pulse", `bg-${config.color}-500`)} />
                    <span className="truncate">{activeStep?.toolName || 'New Tab'}</span>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#3c3c3c] to-transparent" />
                </div>
                
                {/* Inactive Tab */}
                <div className="max-w-[150px] h-full bg-transparent flex items-center px-3 text-[10px] text-slate-500 gap-2">
                     <span className="truncate">agent://logs</span>
                </div>
            </div>

            {/* Address Bar Navigation */}
            <div className="h-10 bg-[#2d2d2d] border-b border-black/20 flex items-center px-3 gap-3">
                <div className="flex gap-2 text-slate-500">
                    <ChevronLeft className="h-4 w-4 opacity-50" />
                    <ChevronRight className="h-4 w-4 opacity-50" />
                    <RotateCw className={cn("h-3.5 w-3.5", isThinking && "animate-spin text-emerald-500")} />
                </div>
                
                {/* URL Input */}
                <div className="flex-1 h-7 bg-[#1e1e1e] rounded flex items-center px-3 text-[10px] text-slate-400 font-mono gap-2 relative">
                    <Lock className="h-2.5 w-2.5 text-emerald-500" />
                    <span className="text-emerald-500/50">https://</span>
                    <span data-testid="browser-url" className="text-slate-300 truncate">{currentUrl.replace('https://', '')}</span>
                    
                    {/* Loading Bar */}
                    {isThinking && activeStep.status === 'in-progress' && (
                        <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: "70%" }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute bottom-0 left-0 h-[2px] bg-emerald-500/50" 
                        />
                    )}
                </div>

                <div className="flex gap-2 text-slate-500">
                    <Maximize2 className="h-3.5 w-3.5 hover:text-slate-300 cursor-pointer" />
                </div>
            </div>


            {/* --- VIEWPORT --- */}
            <div className="relative h-64 bg-[#121212] overflow-hidden flex flex-col p-4">
                
                {/* Grid of Agent Actions (The "Visual Browser") */}
                <div className="grid grid-cols-3 gap-4 h-full">
                    
                    {/* Main Agent Focus Card */}
                    <div className="col-span-2 row-span-2 bg-[#1e1e1e] rounded-lg border border-white/5 p-4 flex flex-col relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-50" />
                        
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 z-10">
                            <div className="flex items-center gap-2">
                                <span className={cn("h-2 w-2 rounded-full", isThinking ? `bg-${config.color}-500 animate-pulse` : "bg-slate-500")} />
                                <span className="text-xs font-semibold text-slate-300">{activeStep?.toolName || 'Idle'}</span>
                            </div>
                            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400 font-mono">
                                PID: {Math.floor(Math.random() * 8000 + 1000)}
                            </span>
                        </div>

                        {/* Content Simulation */}
                        <div className="flex-1 flex flex-col gap-2 z-10">
                             <div className="w-3/4 h-3 bg-white/10 rounded animate-pulse" />
                             <div className="w-1/2 h-3 bg-white/10 rounded animate-pulse delay-75" />
                             <div className="w-full h-32 mt-2 bg-black/40 rounded border border-white/5 p-3 font-mono text-[9px] text-green-400 overflow-hidden relative">
                                 <div className="absolute top-2 right-2 flex gap-1">
                                     <div className="w-2 h-2 rounded-full bg-red-500/20" />
                                     <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                                     <div className="w-2 h-2 rounded-full bg-green-500/20" />
                                 </div>
                                 <p className="text-slate-400 mb-1"># Target: {currentUrl}</p>
                                 <p className="text-slate-500">$ parsing_dom_structure...</p>
                                 {isThinking && (
                                     <>
                                         <p className="text-slate-500">$ extracting_metadata...</p>
                                         <p className="text-emerald-500/80">$ found_elements: {Math.floor(Math.random() * 50 + 10)}</p>
                                         <p className="text-emerald-500/80">$ extracting_pricing_data...</p>
                                         <motion.span 
                                            animate={{ opacity: [0, 1, 0] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                            className="text-emerald-500"
                                         >_</motion.span>
                                     </>
                                 )}
                             </div>
                        </div>
                    </div>

                    {/* Secondary Stats Card */}
                    <div className="bg-[#1e1e1e] rounded-lg border border-white/5 p-3 flex flex-col justify-center items-center gap-2 relative overflow-hidden">
                         <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold z-10">Network Latency</div>
                         <div className="text-2xl font-mono text-emerald-400 z-10">{Math.floor(Math.random() * 40 + 20)}<span className="text-sm text-slate-600">ms</span></div>
                         <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden z-10">
                             <div className="h-full bg-emerald-500 w-[60%]" />
                         </div>
                         <div className="absolute inset-0 bg-emerald-500/5 z-0" />
                    </div>

                    {/* Threat/Status Card */}
                    <div className="bg-[#1e1e1e] rounded-lg border border-white/5 p-3 flex flex-col justify-center items-center gap-2">
                        {agentName === 'deebo' ? (
                            <>
                                <ShieldAlert className="h-6 w-6 text-red-500" />
                                <span className="text-[10px] text-slate-400 text-center">Audit Status: <span className="text-red-400 font-bold">ACTIVE</span></span>
                            </>
                        ) : (
                            <>
                                <Globe className="h-6 w-6 text-blue-500" />
                                <span className="text-[10px] text-slate-400 text-center">Proxy Status: <span className="text-blue-400 font-bold">ROTATING</span></span>
                            </>
                        )}
                        <span className="text-[9px] text-slate-600 font-mono">IP: 192.168.x.x</span>
                    </div>

                </div>

                {/* Agent Cursor Overlay */}
                {isThinking && <AgentCursor color={config.color} />}
            </div>

            {/* --- TERMINAL --- */}
            <div className="h-40 bg-[#0c0c0c] border-t border-white/10 p-2 font-mono text-[10px] flex flex-col">
                <div className="flex items-center gap-2 mb-1 px-2 text-slate-500 select-none pb-1 border-b border-white/5">
                    <Terminal className="h-3 w-3" />
                    <span>Agent Console Output</span>
                    <span className="ml-auto text-xs opacity-50">bash --login</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                    {steps.map((step, i) => (
                        <div 
                            key={step.id}
                            className={cn(
                                "flex items-start gap-3 pl-1 transition-all duration-300 font-mono group",
                                step.status === 'in-progress' ? "opacity-100" : "opacity-60 hover:opacity-100"
                            )}
                        >
                            <span className="text-slate-600 min-w-[65px] shrink-0 select-none">
                                [{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]
                            </span>
                            <span className="flex-1 break-all">
                                <span className={cn(
                                    "font-bold mr-2", 
                                    step.status === 'in-progress' ? `text-${config.color}-400` : 
                                    step.status === 'completed' ? "text-emerald-500" : "text-slate-400"
                                )}>
                                    {step.status === 'completed' ? '✔' : '❯'} {step.toolName}
                                </span>
                                <span className="text-slate-400 group-hover:text-slate-300">{step.description}</span>
                            </span>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="pl-[75px] animate-pulse text-emerald-500/80">
                            _
                        </div>
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </motion.div>
    );
}

function AgentCursor({ color = 'slate' }: { color?: string }) {
    return (
        <motion.div
            initial={{ x: "10%", y: "10%", opacity: 0 }}
            animate={{ 
                x: ["10%", "85%", "40%", "70%", "50%"], 
                y: ["20%", "40%", "70%", "80%", "50%"],
                opacity: 1 
            }}
            transition={{ 
                duration: 8, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "mirror"
            }}
            className="absolute z-50 pointer-events-none top-0 left-0 w-full h-full"
        >
            <div className="relative">
                <MousePointer2 className={cn("h-6 w-6 drop-shadow-xl filter", `text-${color}-500 fill-black/50`)} />
                <div className={cn("absolute left-4 top-4 text-[9px] font-bold px-2 py-0.5 rounded shadow-lg text-white whitespace-nowrap backdrop-blur-sm", `bg-${color}-600/90`)}>
                    Agent
                </div>
            </div>
        </motion.div>
    );
}
