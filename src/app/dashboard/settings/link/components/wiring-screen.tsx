'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    ArrowRight, 
    Leaf, 
    Zap, 
    Globe, 
    CheckCircle2, 
    Loader2, 
    Server,
    Cpu,
    Lock,
    RefreshCw,
    MousePointer2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WiringScreenProps {
    dispensaryName: string;
    role?: 'brand' | 'dispensary';
    onComplete: () => void;
    checkStatus?: () => Promise<{ ready: boolean; percent: number; details?: { products: number; competitors: number } }>;
}

type WiringPhase = 'init' | 'smokey_crawl' | 'ezal_crawl' | 'building' | 'complete';

const DISPENSARY_LOGS = [
    "Initializing secure environment...",
    "🔍 Checking POS system integration...",
    "📡 Connecting to CannMenus API...",
    "Searching inventory sources...",
    "✅ Found products in catalog.",
    "Mapping categories to standard taxonomy...",
    "Syncing product images...",
    "Inventory sync complete.",
    "🧠 Starting BakedBot Discovery agent...",
    "Scanning competitor radius: 5 miles",
    "🔎 Checking Leafly for market data...",
    "🌐 Running website discovery fallback...",
    "Identified nearby competitors.",
    "Extracting pricing data...",
    "Analyzing gap opportunities...",
    "Competitor intelligence index built.",
    "Generating headless storefront...",
    "Compiling Next.js routes...",
    "Optimizing assets...",
    "Deploying to edge...",
    "✨ Wiring complete!"
];

const BRAND_LOGS = [
    "Initializing brand workspace...",
    "🔍 Checking POS integration...",
    "📡 Connecting to CannMenus catalog...",
    "Verifying GTIN/UPC codes...",
    "Indexing product metadata...",
    "✅ Found active SKUs.",
    "Syncing high-res assets from cloud...",
    "Optimizing images for web...",
    "Catalog import complete.",
    "🧠 Starting Market Scanner agent...",
    "🔎 Checking Leafly for retailer data...",
    "🌐 Running website discovery fallback...",
    "Scanning retailers for brand presence...",
    "Found retailer matches.",
    "Analyzing shelf placement...",
    "Calculating share of voice...",
    "Market intelligence index built.",
    "Generating brand portal...",
    "Configuring wholesale dashboard...",
    "Deploying analytics suite...",
    "✨ Wiring complete!"
];

export function WiringScreen({ dispensaryName, role = 'dispensary', onComplete, checkStatus }: WiringScreenProps) {
    const [phase, setPhase] = useState<WiringPhase>('init');
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [isReady, setIsReady] = useState(false);
    const [stats, setStats] = useState({ products: 0, competitors: 0 });
    
    // Auto-advance phases (Visual only fallback)
    useEffect(() => {
        if (checkStatus) return; // If polling, don't use timer-based phases for completion

        // Init -> Smokey (2s)
        const t1 = setTimeout(() => setPhase('smokey_crawl'), 2000);
        
        // Smokey -> Ezal (8s)
        const t2 = setTimeout(() => setPhase('ezal_crawl'), 8000);
        
        // Ezal -> Building (15s)
        const t3 = setTimeout(() => setPhase('building'), 15000);
        
        // Building -> Complete (22s)
        const t4 = setTimeout(() => setPhase('complete'), 22000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, [checkStatus]);

    // Polling Logic
    useEffect(() => {
        if (!checkStatus) return;

        const interval = setInterval(async () => {
            try {
                const status = await checkStatus();
                // Map percent to phases roughly
                if (status.percent < 20) setPhase('init');
                else if (status.percent < 50) setPhase('smokey_crawl');
                else if (status.percent < 80) setPhase('ezal_crawl');
                else if (status.percent < 100) setPhase('building');
                else {
                    setPhase('complete');
                    setIsReady(true);
                    clearInterval(interval);
                }
                
                // Update granular stats if available
                if (status.details) {
                    setStats(status.details);
                }
                
                // Ensure visual progress matches at least the real progress
                setProgress(p => Math.max(p, status.percent));

            } catch (e) {
                console.error("Wiring status check failed", e);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [checkStatus]);

    // Progress bar simulation (Visual smoothing)
    useEffect(() => {
        if (checkStatus && isReady) return; 

        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    if (!checkStatus) clearInterval(interval); // Only stop if not polling
                    return 100;
                }
                // Vary speed based on phase (slower now)
                const increment = Math.random() * (phase === 'complete' ? 20 : 0.8);
                // If polling, cap simulated progress at 95% until actually ready
                const limit = checkStatus ? 95 : 100;
                return Math.min(limit, p + increment);
            });
        }, 100);
        return () => clearInterval(interval);
    }, [phase, checkStatus, isReady]);

    // Log scrolling simulation
    useEffect(() => {
        let lineIndex = 0;
        const targetLogs = role === 'brand' ? BRAND_LOGS : DISPENSARY_LOGS;
        
        const interval = setInterval(() => {
            if (lineIndex < targetLogs.length) {
                setLogs(prev => {
                    const newLogs = [...prev, targetLogs[lineIndex]];
                    if (newLogs.length > 7) newLogs.shift();
                    return newLogs;
                });
                lineIndex++;
            } else {
                // Determine if we should clear
                clearInterval(interval);
            }
        }, 1200); // Slower logs

        return () => clearInterval(interval);
    }, [role]);


    // --- RENDER HELPERS ---

    const getPhaseLabel = () => {
        switch (phase) {
            case 'init': return "Initializing Agent Swarm...";
            case 'smokey_crawl': return "Smokey: Syncing Menu & Inventory...";
            case 'ezal_crawl': return "Ezal: Crawling Competitor Data...";
            case 'building': return "Builder: Generating Headless Site...";
            case 'complete': return "Setup Complete!";
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-5xl aspect-video bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col relative"
            >
                {/* Browser Toolbar */}
                <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center px-4 space-x-2 shrink-0">
                    <div className="flex space-x-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="flex-1 ml-4 flex justify-center">
                        <div className="bg-slate-800/50 rounded-md px-3 py-1 text-xs text-slate-400 font-mono w-2/3 flex items-center justify-between">
                            <span className="truncate">
                                {phase === 'init' && "system://initializing..."}
                                {phase === 'smokey_crawl' && `https://cannmenus.com/menus/${dispensaryName.toLowerCase().replace(/\s/g, '-')}`}
                                {phase === 'ezal_crawl' && "https://bakedbot.ai/discovery?radius=5mi"}
                                {phase === 'building' && "localhost:3000/deploying..."}
                                {phase === 'complete' && "BakedBot Dashboard"}
                            </span>
                            {phase !== 'complete' && <RefreshCw className="h-3 w-3 animate-spin ml-2" />}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative bg-slate-100 dark:bg-slate-900 overflow-hidden">
                    <AnimatePresence mode="wait">
                        {phase === 'init' && <InitView key="init" />}
                        {phase === 'smokey_crawl' && <SmokeyView key="smokey" dispensaryName={dispensaryName} />}
                        {phase === 'ezal_crawl' && <EzalView key="ezal" />}
                        {phase === 'building' && <BuilderView key="building" />}
                        {phase === 'complete' && <CompleteView key="complete" onEnter={onComplete} />}
                    </AnimatePresence>

                    {/* Agent Cursors Layer */}
                    <AgentCursors phase={phase} />

                    {/* Real-time Data Stream Overlay */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                        <AnimatePresence>
                            {stats.products > 0 && (
                                <motion.div 
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="bg-emerald-500/90 text-white px-3 py-1.5 rounded-md shadow-lg backdrop-blur-md flex items-center gap-2 text-xs font-mono border border-emerald-400/50"
                                >
                                    <Leaf className="h-3 w-3" />
                                    <span>Products Indexed: <span className="font-bold">{stats.products}</span></span>
                                </motion.div>
                            )}
                            {stats.competitors > 0 && (
                                <motion.div 
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="bg-purple-500/90 text-white px-3 py-1.5 rounded-md shadow-lg backdrop-blur-md flex items-center gap-2 text-xs font-mono border border-purple-400/50"
                                >
                                    <Zap className="h-3 w-3" />
                                    <span>Competitors Found: <span className="font-bold">{stats.competitors}</span></span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Terminal Overlay (Bottom) */}
                <div className="h-32 bg-slate-950 border-t border-slate-800 p-4 font-mono text-xs overflow-hidden shrink-0">
                    <div className="flex items-center gap-2 mb-2 text-slate-400 border-b border-slate-800 pb-1">
                        <Server className="h-3 w-3" />
                        <span>Agent Logs</span>
                    </div>
                    <div className="space-y-1">
                        {logs.map((log, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-emerald-500/90"
                            >
                                <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                {log}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Status Text */}
            <div className="mt-8 text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground animate-pulse">{getPhaseLabel()}</h2>
                <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden mx-auto">
                    <motion.div 
                        className="h-full bg-primary"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

// --- SUB-VIEWS ---

function InitView() {
    return (
        <div className="h-full w-full flex items-center justify-center bg-slate-900 text-white">
            <div className="flex flex-col items-center gap-4">
                <Cpu className="h-16 w-16 text-blue-500 animate-pulse" />
                <h3 className="text-lg font-mono">System Core Active</h3>
            </div>
        </div>
    );
}

function SmokeyView({ dispensaryName }: { dispensaryName: string }) {
    return (
        <div className="h-full w-full bg-white p-8 relative">
            <div className="w-full h-8 bg-slate-100 rounded mb-6" />
            <div className="flex gap-6">
                <div className="w-1/4 space-y-4">
                    <div className="h-40 bg-slate-100 rounded" />
                    <div className="h-20 bg-slate-100 rounded" />
                </div>
                <div className="flex-1 space-y-4">
                    <div className="h-12 bg-slate-100 rounded w-3/4" />
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.2 }}
                                className="aspect-[3/4] bg-emerald-50 border border-emerald-100 rounded p-2 flex flex-col gap-2"
                            >
                                <div className="w-full aspect-square bg-emerald-200/50 rounded" />
                                <div className="h-3 bg-emerald-200/50 rounded w-full" />
                                <div className="h-3 bg-emerald-200/50 rounded w-1/2" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Overlay Title */}
            <div className="absolute top-4 right-4 bg-emerald-600 text-white px-3 py-1 rounded text-xs">
                Importing Inventory...
            </div>
        </div>
    );
}

function EzalView() {
    return (
        <div className="h-full w-full bg-slate-50 p-6 relative">
             <div className="absolute inset-0 bg-[url('https://lib.shadcn.com/placeholder.svg')] opacity-5" />
             <div className="grid grid-cols-2 gap-8 h-full">
                <div className="border rounded-lg bg-white shadow-sm p-4 space-y-3 opacity-50">
                    <div className="h-4 bg-slate-200 w-1/3 rounded" />
                    <div className="space-y-2">
                        <div className="h-8 bg-slate-100 rounded" />
                        <div className="h-8 bg-slate-100 rounded" />
                        <div className="h-8 bg-slate-100 rounded" />
                    </div>
                </div>
                <div className="border-2 border-purple-500 rounded-lg bg-white shadow-xl p-4 space-y-3 scale-105 z-10">
                    <div className="flex justify-between items-center">
                        <div className="h-4 bg-slate-800 w-1/3 rounded" />
                        <div className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs font-bold">-15% Gap</div>
                    </div>
                    <div className="space-y-2">
                        {[1,2,3].map(i => (
                            <motion.div 
                                key={i}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.3 }}
                                className="flex justify-between p-2 bg-purple-50 rounded border border-purple-100"
                            >
                                <span className="text-xs text-purple-900">Competitor Product {i}</span>
                                <span className="text-xs font-bold text-purple-700">$45.00</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
             </div>
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg">
                <Zap className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-bold">BakedBot Discovery Active</span>
             </div>
        </div>
    );
}

function BuilderView() {
    return (
        <div className="h-full w-full bg-slate-900 p-8 font-mono text-sm relative overflow-hidden">
            <div className="space-y-1 text-blue-400">
                <p>&gt; git clone bakedbot-headless-starter</p>
                <p>&gt; npm install</p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>&gt; building components/Hero.tsx...</motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>&gt; building components/MenuGrid.tsx...</motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>&gt; optimizing images...</motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0 }} className="text-green-400">&gt; build success (450ms)</motion.p>
            </div>
            
            {/* Visual Assembler */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 border-l border-slate-700 bg-slate-800 p-4">
                <div className="w-full h-full bg-slate-700 rounded border border-slate-600 relative overflow-hidden">
                     {/* Blocks flying in */}
                     <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="absolute top-0 left-0 right-0 h-16 bg-slate-600 border-b border-slate-500"
                     />
                     <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1.2 }}
                        className="absolute top-20 left-4 right-4 bottom-4 grid grid-cols-2 gap-2"
                     >
                        <div className="bg-slate-600 rounded" />
                        <div className="bg-slate-600 rounded" />
                        <div className="bg-slate-600 rounded" />
                        <div className="bg-slate-600 rounded" />
                     </motion.div>
                </div>
            </div>
        </div>
    );
}

function CompleteView({ onEnter }: { onEnter: () => void }) {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-white space-y-6">
            <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center"
            >
                <CheckCircle2 className="h-12 w-12 text-green-600" />
            </motion.div>
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Dispensary Connected</h2>
                <p className="text-muted-foreground">Your agents are online and synced.</p>
            </div>
            <Button size="lg" onClick={onEnter} className="bg-emerald-600 hover:bg-emerald-700">
                Enter Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
}

// --- AGENT CURSORS ---

function AgentCursors({ phase }: { phase: WiringPhase }) {
    if (phase === 'init' || phase === 'complete') return null;

    return (
        <>
            {/* Smokey Cursor - Active in Smokey phase */}
            <AnimatePresence>
                {phase === 'smokey_crawl' && (
                    <motion.div
                        initial={{ x: 50, y: 50, opacity: 0 }}
                        animate={{ 
                            x: [50, 200, 400, 150, 300], 
                            y: [50, 100, 300, 250, 150],
                            opacity: 1 
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
                        className="absolute z-20 pointer-events-none"
                    >
                        <MousePointer2 className="h-6 w-6 text-emerald-500 fill-emerald-500/20" />
                        <div className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded ml-4 -mt-2 font-bold shadow-sm">
                            Smokey
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ezal Cursor - Active in Ezal phase */}
            <AnimatePresence>
                {phase === 'ezal_crawl' && (
                    <motion.div
                        initial={{ x: 600, y: 300, opacity: 0 }}
                        animate={{ 
                            x: [600, 500, 300, 550], 
                            y: [300, 150, 400, 200],
                            opacity: 1 
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                        className="absolute z-20 pointer-events-none"
                    >
                        <MousePointer2 className="h-6 w-6 text-purple-500 fill-purple-500/20" />
                        <div className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded ml-4 -mt-2 font-bold shadow-sm">
                            Ezal
                        </div>
                        <div className="absolute top-6 left-6 bg-yellow-400 text-black text-[10px] px-1 rounded shadow-sm whitespace-nowrap">
                            Scanning...
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
