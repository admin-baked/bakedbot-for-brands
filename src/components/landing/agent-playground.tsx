'use client';

/**
 * Agent Playground - Interactive AI Demo for Homepage Hero
 * Updated to match "Ask Baked HQ" unified chat UI
 * Now supports live geolocation context (dispensaries/brands)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { getLandingGeoData, type LandingGeoData } from '@/server/actions/landing-geo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Paperclip,
    Mic,
    MoreHorizontal,
    Sparkles,
    Lock,
    Send,
    Loader2,
    ArrowRight,
    CheckCircle2,
    Image as ImageIcon,
    Video,
    Bot,
    ChevronDown,
    Wrench,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailCaptureModal } from './email-capture-modal';
import { ThoughtProcess, THOUGHT_PRESETS } from './thought-process';

// Mapped agents for backend routing
const AGENT_MAP = {
    'smokey': { name: 'Smokey', color: 'text-emerald-500' },
    'craig': { name: 'Craig', color: 'text-purple-500' },
    'pops': { name: 'Pops', color: 'text-blue-500' },
    'ezal': { name: 'Ezal', color: 'text-orange-500' },
    'hq': { name: 'Smokey Chat', color: 'text-green-600' }
};

// Unified example prompts (mixed agents)
// Unified example prompts (mixed agents)
// Updated for Demo Mode: Focus on explaining the tool/platform
const EXAMPLE_PROMPTS = [
    { text: "How does BakedBot work?", agentId: 'hq' },
    { text: "What can the Agent Squad do?", agentId: 'hq' },
    { text: "Show me a demo of product search", agentId: 'smokey' },
    { text: "Explain the pricing model", agentId: 'hq' },
];

// Demo result types
interface DemoResult {
    agent: string;
    prompt: string;
    items: {
        title: string;
        description: string;
        meta?: string;
    }[];
    totalCount: number;
    generatedMedia?: {
        type: 'image' | 'video';
        url: string;
    };
}

// Storage keys
const DEMO_COUNT_KEY = 'bakedbot_demo_count';
const DEMO_DATE_KEY = 'bakedbot_demo_date';
const MAX_FREE_DEMOS = 5;

export function AgentPlayground() {
    const [prompt, setPrompt] = useState('');
    const [activeAgentId, setActiveAgentId] = useState('hq');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<DemoResult | null>(null);
    const [demoCount, setDemoCount] = useState(0);
    const [showEmailCapture, setShowEmailCapture] = useState(false);
    const [hasEmailCaptured, setHasEmailCaptured] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [geoData, setGeoData] = useState<LandingGeoData | null>(null);
    const [isGeoLoading, setIsGeoLoading] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [thoughtSteps, setThoughtSteps] = useState(THOUGHT_PRESETS.default);

    // Load demo count from storage
    useEffect(() => {
        const storedDate = localStorage.getItem(DEMO_DATE_KEY);
        const today = new Date().toDateString();
        
        if (storedDate !== today) {
            localStorage.setItem(DEMO_DATE_KEY, today);
            localStorage.setItem(DEMO_COUNT_KEY, '0');
            setDemoCount(0);
        } else {
            const count = parseInt(localStorage.getItem(DEMO_COUNT_KEY) || '0', 10);
            setDemoCount(count);
        }

        const email = localStorage.getItem('bakedbot_lead_email');
        if (email) setHasEmailCaptured(true);
    }, []);

    // Fetch user location and nearby data on mount
    useEffect(() => {
        if (!navigator.geolocation) return;

        setIsGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const data = await getLandingGeoData(
                        position.coords.latitude,
                        position.coords.longitude
                    );
                    setGeoData(data);
                } catch (err) {
                    console.error('Failed to fetch geo data', err);
                } finally {
                    setIsGeoLoading(false);
                }
            },
            (err) => {
                console.warn('Geolocation denied or failed', err);
                setIsGeoLoading(false);
            }
        );
    }, []);

    const canRunDemo = useCallback(() => {
        if (hasEmailCaptured) return true;
        return demoCount < MAX_FREE_DEMOS;
    }, [demoCount, hasEmailCaptured]);

    const runDemo = useCallback(async (demoPrompt: string, agentId: string = 'smokey') => {
        if (!canRunDemo()) {
            setShowEmailCapture(true);
            return;
        }

        setIsLoading(true);
        setError(null);
        setPrompt(demoPrompt);
        setResult(null); // Clear previous result
        setActiveAgentId(agentId);

        // Determine thought pattern based on intent
        let steps = THOUGHT_PRESETS.default;
        if (demoPrompt.toLowerCase().includes('image') || agentId === 'midjourney') steps = THOUGHT_PRESETS.image;
        else if (demoPrompt.toLowerCase().includes('video') || agentId === 'sora') steps = THOUGHT_PRESETS.video;
        
        setThoughtSteps(steps);
        setIsThinking(true); // Start visualization

        try {
            const response = await fetch('/api/demo/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent: agentId,
                    prompt: demoPrompt,
                    context: geoData // Pass live context to API
                })
            });

            if (!response.ok) {
                const data = await response.json();
                if (data.requiresEmail) {
                    setShowEmailCapture(true);
                    return;
                }
                throw new Error(data.error || 'Demo failed');
            }

            const data = await response.json();
            setResult(data);

            const newCount = demoCount + 1;
            setDemoCount(newCount);
            localStorage.setItem(DEMO_COUNT_KEY, newCount.toString());

        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            // Note: We don't set isLoading(false) here because ThoughtProcess handles the "completion" flow visually.
            // We'll let the onComplete callback from ThoughtProcess trigger the display of results if we want perfect sync,
            // OR we just wait for the thought process to finish effectively.
            // However, for simplicity, we keep isLoading true until thinking is done.
        }
    }, [demoCount, canRunDemo]);

    const handleThoughtComplete = () => {
        setIsThinking(false);
        setIsLoading(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            // Default to Smokey or simple 'puffs' for typed input
            runDemo(prompt.trim(), 'smokey');
        }
    };

    const handleEmailCaptured = () => {
        setHasEmailCaptured(true);
        setShowEmailCapture(false);
        if (prompt) runDemo(prompt, activeAgentId);
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <Card className="border-emerald-500/20 bg-white shadow-xl rounded-2xl overflow-hidden relative">
                {/* Header Section */}
                <div className="p-4 sm:p-6 pb-2 border-b border-gray-100 flex items-center gap-3">
                     <div className="bg-emerald-100 p-2 rounded-lg">
                        <img 
                            src="/assets/agents/smokey-main.png" 
                            alt="Smokey Agent" 
                            className="w-8 h-8 object-contain"
                        />
                     </div>
                     <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 text-lg">Smokey Chat</span>
                        {geoData?.location && (
                            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 animate-in fade-in">
                                📍 Found {geoData.retailers.length} dispensaries & {geoData.brands.length} brands near {geoData.location.city}
                            </span>
                        )}
                     </div>
                </div>

                <CardContent className="p-4 sm:p-6 pt-6 min-h-[300px] flex flex-col justify-between bg-white relative">
                    {/* Background decoration or 'empty state' if no result */}
                    {!result && !isLoading && (
                        <div className="absolute inset-0 bg-white z-0" />
                    )}

                    {/* Content Area */}
                    <div className="z-10 flex-1">
                        {/* Loading State / Thought Process */}
                        {isThinking && (
                            <div className="mb-6">
                                <ThoughtProcess 
                                    steps={thoughtSteps} 
                                    onComplete={handleThoughtComplete} 
                                />
                            </div>
                        )}

                        {/* Generated Media Result */}
                        {result?.generatedMedia && (
                            <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                {result.generatedMedia.type === 'image' ? (
                                    <img 
                                        src={result.generatedMedia.url} 
                                        alt="Generated content" 
                                        className="w-full h-auto object-cover max-h-[400px]"
                                    />
                                ) : (
                                    <video 
                                        src={result.generatedMedia.url} 
                                        controls 
                                        className="w-full h-auto max-h-[400px] bg-black"
                                    />
                                )}
                                <div className="p-3 bg-gray-50 border-t border-gray-100">
                                    <p className="text-sm font-medium text-gray-900">
                                        {result.generatedMedia.type === 'image' ? 'Generated Image' : 'Generated Video'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Asset created successfully based on your prompt.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Results */}
                        {result && !isLoading && (
                            <div className="space-y-4 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium mb-2">
                                     <Bot className="w-4 h-4" />
                                     {AGENT_MAP[activeAgentId as keyof typeof AGENT_MAP]?.name || 'BakedBot'}
                                </div>
                                <div className="grid gap-3">
                                    {result.items.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="p-3 rounded-lg border border-gray-100 bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
                                            <h4 className="font-medium text-gray-900">{item.title}</h4>
                                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Locked Results Preview */}
                                {result.totalCount > 3 && (
                                    <Button 
                                        variant="outline" 
                                        className="w-full border-dashed text-muted-foreground gap-2"
                                        onClick={() => setShowEmailCapture(true)}
                                    >
                                        <Lock className="w-4 h-4" />
                                        Unlock {result.totalCount - 3} more insights
                                    </Button>
                                )}
                            </div>
                        )}

                    </div>

                    {/* Zero State / Demo Intro */}
                    {!result && !isLoading && !isThinking && (
                        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Hi, I'm Smokey.</h2>
                            <p className="text-emerald-600 font-medium mb-8">How can I help you?</p>
                            
                            <div className="w-full max-w-sm space-y-4">
                                <Button 
                                    size="lg" 
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200/50 rounded-full h-12 text-base font-medium"
                                    onClick={() => runDemo('Find product recommendations for relaxing at home', 'smokey')}
                                >
                                    <div className="bg-white/20 p-1 rounded-full mr-2">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                    Find product recommendations
                                </Button>

                                <button 
                                    onClick={() => {
                                        // Focus input or show specific prompts
                                        const input = document.querySelector('input[name="chat-input"]') as HTMLInputElement;
                                        if (input) input.focus();
                                    }}
                                    className="flex items-center justify-center gap-1 text-emerald-600 font-medium hover:text-emerald-700 hover:underline transition-all mx-auto text-sm"
                                >
                                    Just ask me a question 
                                    <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                                </button>
                                
                                {/* Secondary Actions / Discovery could go here if needed, 
                                    but for now keeping it clean as per screenshot 
                                */}
                            </div>
                        </div>
                    )}

                    {/* Input Container */}
                    <div className="z-10 mt-auto space-y-4">
                         {/* Chips */}
                         {!result && !isThinking && !isLoading && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {EXAMPLE_PROMPTS.map((ex, i) => (
                                    <button
                                        key={i}
                                        onClick={() => runDemo(ex.text, ex.agentId)}
                                        className="text-xs sm:text-sm px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                                    >
                                        {ex.text}
                                    </button>
                                ))}
                            </div>
                         )}

                         {/* Input Box */}
                         <div className="relative group">
                            <form onSubmit={handleSubmit} className="relative">
                                <Input
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Ask about BakedBot..."
                                    name="chat-input"
                                    className="pr-12 pt-4 pb-12 text-base shadow-sm border-gray-200 focus-visible:ring-emerald-500 bg-white"
                                    disabled={isLoading}
                                />
                                {/* Bottom Toolbar in Input */}
                                <div className="absolute left-2 bottom-2 flex items-center gap-1">
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                                        <Paperclip className="h-4 w-4" />
                                    </Button>
                                    
                                    <div className="h-4 w-px bg-gray-200 mx-1" />

                                    <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 sm:px-3">
                                        <Sparkles className="h-3 w-3" />
                                        <span className="text-xs font-medium hidden sm:inline">Puff</span>
                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                    </Button>

                                    <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-gray-500 hover:text-gray-700 px-2 sm:px-3">
                                        <Zap className="h-3 w-3" />
                                        <span className="text-xs font-medium hidden sm:inline">Standard</span>
                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                    </Button>

                                    <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-gray-500 hover:text-gray-700 px-2 sm:px-3">
                                        <Wrench className="h-3 w-3" />
                                        <span className="text-xs font-medium hidden sm:inline">Auto Tools</span>
                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                    </Button>
                                </div>

                                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                                     <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                                        <Mic className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        disabled={!prompt.trim() || isLoading}
                                        size="icon"
                                        className={cn(
                                            "h-8 w-8 rounded-full transition-all",
                                            prompt.trim() ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-gray-100 text-gray-400"
                                        )}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </form>
                         </div>

                         {/* Disclaimer */}
                         <p className="text-center text-[10px] text-gray-400">
                            AI can make mistakes. Verify critical automations.
                         </p>
                    </div>
                </CardContent>
            </Card>

            <EmailCaptureModal
                open={showEmailCapture}
                onClose={() => setShowEmailCapture(false)}
                onSuccess={handleEmailCaptured}
            />
        </div>
    );
}
