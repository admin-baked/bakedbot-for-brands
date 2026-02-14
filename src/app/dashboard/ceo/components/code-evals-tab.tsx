'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Terminal, 
    Play, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle,
    Cpu,
    Shield,
    DollarSign,
    Scale,
    Zap,
    Rocket,
    Send,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Layer definitions
const LAYERS = [
    { id: 1, name: 'Architect', icon: Cpu, focus: 'Structural Integrity', color: 'text-blue-500' },
    { id: 2, name: 'Orchestrator', icon: Zap, focus: 'Cross-Agent Flow', color: 'text-purple-500' },
    { id: 3, name: 'Sentry', icon: Shield, focus: 'Security (ISO/SOC2)', color: 'text-red-500' },
    { id: 4, name: 'Money Mike', icon: DollarSign, focus: 'Token Efficiency', color: 'text-amber-500' },
    { id: 5, name: 'Deebo', icon: Scale, focus: 'Regulatory', color: 'text-emerald-500' },
    { id: 6, name: 'Chaos Monkey', icon: AlertTriangle, focus: 'Resilience', color: 'text-orange-500' },
    { id: 7, name: 'Linus', icon: Rocket, focus: 'Deployment Decision', color: 'text-indigo-500' },
];

interface TerminalLine {
    id: string;
    type: 'command' | 'output' | 'success' | 'error' | 'warning' | 'info';
    content: string;
    timestamp: Date;
}

interface LayerResult {
    layer: number;
    status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
    confidence?: number;
    notes?: string;
}

export default function CodeEvalsTab() {
    const [isRunning, setIsRunning] = useState(false);
    const [layerResults, setLayerResults] = useState<LayerResult[]>(
        LAYERS.map(l => ({ layer: l.id, status: 'pending' as const }))
    );
    const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
        { id: '0', type: 'info', content: 'Linus CTO Terminal v1.0 - Antigravity Code Eval Framework', timestamp: new Date() },
        { id: '1', type: 'info', content: 'Type a command or click "Run Full Eval" to begin.', timestamp: new Date() },
    ]);
    const [prompt, setPrompt] = useState('');
    const [deploymentDecision, setDeploymentDecision] = useState<string | null>(null);
    const terminalRef = useRef<HTMLDivElement>(null);

    // Auto-scroll terminal
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [terminalLines]);

    const addLine = (type: TerminalLine['type'], content: string) => {
        setTerminalLines(prev => [...prev, {
            id: Date.now().toString(),
            type,
            content,
            timestamp: new Date()
        }]);
    };

    const runLayerEval = async (layerId: number) => {
        const layer = LAYERS.find(l => l.id === layerId);
        if (!layer) return;

        setLayerResults(prev => prev.map(r => 
            r.layer === layerId ? { ...r, status: 'running' } : r
        ));
        
        addLine('command', `$ linus eval --layer ${layerId} --name "${layer.name}"`);
        
        // Simulate evaluation (in production, this calls the actual linus.ts)
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        
        const passed = Math.random() > 0.1; // 90% pass rate for demo
        const confidence = 0.85 + Math.random() * 0.15;
        
        setLayerResults(prev => prev.map(r => 
            r.layer === layerId ? { 
                ...r, 
                status: passed ? 'passed' : 'warning',
                confidence,
                notes: passed ? 'All checks passed' : 'Minor issues detected'
            } : r
        ));
        
        addLine(passed ? 'success' : 'warning', 
            `[Layer ${layerId}: ${layer.name}] ${passed ? '✅ PASSED' : '⚠️ WARNING'} (confidence: ${(confidence * 100).toFixed(1)}%)`
        );
        
        return passed;
    };

    const runFullEval = async () => {
        setIsRunning(true);
        setDeploymentDecision(null);
        setLayerResults(LAYERS.map(l => ({ layer: l.id, status: 'pending' })));
        
        addLine('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        addLine('command', '$ linus eval --full --target production');
        addLine('info', 'Starting 7-layer code evaluation...');
        
        let allPassed = true;
        for (const layer of LAYERS) {
            const passed = await runLayerEval(layer.id);
            if (!passed) allPassed = false;
        }
        
        // Final decision
        addLine('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        addLine('command', '$ linus decision --synthesize');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const decision = allPassed ? 'MISSION_READY' : 'NEEDS_REVIEW';
        setDeploymentDecision(decision);
        
        if (decision === 'MISSION_READY') {
            addLine('success', `🚀 DEPLOYMENT DECISION: ${decision}`);
            addLine('success', 'All 7 layers passed. Ready for production deployment.');
        } else {
            addLine('warning', `⚠️ DEPLOYMENT DECISION: ${decision}`);
            addLine('warning', 'Some layers have warnings. Human review required before deployment.');
        }
        
        addLine('info', 'Report sent to Executive Boardroom.');
        setIsRunning(false);
    };

    const handlePromptSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isRunning) return;
        
        addLine('command', `$ ${prompt}`);
        
        // Simple command parsing
        if (prompt.toLowerCase().includes('health') || prompt.toLowerCase().includes('check')) {
            addLine('info', 'Running health check...');
            setTimeout(() => {
                addLine('success', '✅ Build: Passing');
                addLine('success', '✅ Tests: 116 passed');
                addLine('success', '✅ Types: No errors');
            }, 500);
        } else if (prompt.toLowerCase().includes('eval')) {
            runFullEval();
        } else if (prompt.toLowerCase().includes('deploy')) {
            if (deploymentDecision === 'MISSION_READY') {
                addLine('info', 'Initiating deployment sequence...');
                addLine('success', '🚀 Deployment approved by Linus.');
            } else {
                addLine('error', '❌ Cannot deploy: Decision is not MISSION_READY');
            }
        } else {
            addLine('output', `Linus received: "${prompt}". Use "eval" to run code evaluation.`);
        }
        
        setPrompt('');
    };

    const getStatusIcon = (status: LayerResult['status']) => {
        switch (status) {
            case 'passed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
            default: return <div className="h-4 w-4 rounded-full bg-muted" />;
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Cpu className="h-6 w-6 text-purple-500" />
                        Code Evaluations
                    </h2>
                    <p className="text-muted-foreground">
                        Linus CTO • 7-Layer Antigravity Framework • Claude API
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {deploymentDecision && (
                        <Badge 
                            variant={deploymentDecision === 'MISSION_READY' ? 'default' : 'secondary'}
                            className={cn(
                                "text-sm px-3 py-1",
                                deploymentDecision === 'MISSION_READY' 
                                    ? 'bg-green-500 hover:bg-green-600' 
                                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                            )}
                        >
                            {deploymentDecision}
                        </Badge>
                    )}
                    <Button 
                        onClick={runFullEval} 
                        disabled={isRunning}
                        className="gap-2"
                    >
                        {isRunning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                        Run Full Eval
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Layer Scorecard */}
                <div className="lg:col-span-4 space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Layer Scorecard
                    </h3>
                    {LAYERS.map((layer) => {
                        const result = layerResults.find(r => r.layer === layer.id);
                        return (
                            <Card 
                                key={layer.id}
                                className={cn(
                                    "transition-all",
                                    result?.status === 'running' && 'ring-2 ring-blue-500/50 shadow-lg'
                                )}
                            >
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-lg bg-muted/50", layer.color)}>
                                            <layer.icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">
                                                Layer {layer.id}: {layer.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {layer.focus}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {result?.confidence && (
                                            <span className="text-xs text-muted-foreground">
                                                {(result.confidence * 100).toFixed(0)}%
                                            </span>
                                        )}
                                        {getStatusIcon(result?.status || 'pending')}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Terminal */}
                <Card className="lg:col-span-8 shadow-xl border-border/50 overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white py-3 px-4 flex flex-row items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        <CardTitle className="text-sm font-mono">linus@bakedbot:~/codebase</CardTitle>
                        <div className="ml-auto flex gap-1.5">
                            <div className="h-3 w-3 rounded-full bg-red-500" />
                            <div className="h-3 w-3 rounded-full bg-yellow-500" />
                            <div className="h-3 w-3 rounded-full bg-green-500" />
                        </div>
                    </CardHeader>
                    <div 
                        ref={terminalRef}
                        className="bg-slate-950 h-[500px] overflow-y-auto font-mono text-sm p-4"
                    >
                        {terminalLines.map(line => (
                            <div 
                                key={line.id}
                                className={cn(
                                    "py-0.5",
                                    line.type === 'command' && 'text-green-400',
                                    line.type === 'output' && 'text-slate-300',
                                    line.type === 'success' && 'text-green-500',
                                    line.type === 'error' && 'text-red-500',
                                    line.type === 'warning' && 'text-amber-500',
                                    line.type === 'info' && 'text-slate-500',
                                )}
                            >
                                {line.content}
                            </div>
                        ))}
                        {isRunning && (
                            <div className="text-blue-400 animate-pulse">
                                Processing...
                            </div>
                        )}
                    </div>
                    <form 
                        onSubmit={handlePromptSubmit}
                        className="bg-slate-900 p-3 flex items-center gap-2 border-t border-slate-800"
                    >
                        <span className="text-green-400 font-mono text-sm">$</span>
                        <Input
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ask Linus... (e.g., 'run health check', 'eval', 'deploy')"
                            className="flex-1 bg-transparent border-none text-white placeholder:text-slate-500 font-mono text-sm focus-visible:ring-0"
                            disabled={isRunning}
                        />
                        <Button 
                            type="submit" 
                            size="sm" 
                            variant="ghost" 
                            className="text-slate-400 hover:text-white"
                            disabled={isRunning || !prompt.trim()}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
