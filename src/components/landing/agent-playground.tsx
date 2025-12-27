'use client';

/**
 * Agent Playground - Interactive AI Demo for Homepage Hero
 * 
 * Features:
 * - Tabbed agent selector (Smokey, Craig, Pops, Ezal)
 * - Pre-defined example prompts per agent
 * - Custom prompt input
 * - Rate limiting (5 demos per session before email required)
 * - Partial result display (3 shown, 10 locked)
 * - Images free, video requires login
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Bot, 
    MessageCircle, 
    LineChart, 
    Radar,
    Sparkles, 
    Lock, 
    Send,
    Loader2,
    ArrowRight,
    CheckCircle2,
    Image as ImageIcon,
    Video
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailCaptureModal } from './email-capture-modal';

// Agent configurations for the playground
const PLAYGROUND_AGENTS = [
    {
        id: 'smokey',
        name: 'Smokey',
        title: 'AI Budtender',
        icon: Bot,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        prompts: [
            "Recommend products for anxiety relief",
            "What's trending in edibles?",
            "Customer is new to cannabis - help them",
            "High THC options for experienced users"
        ],
        thinkingMessage: "Analyzing 47 products in your catalog..."
    },
    {
        id: 'craig',
        name: 'Craig',
        title: 'Marketing Hustler',
        icon: MessageCircle,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        prompts: [
            "Draft SMS for Memorial Day sale",
            "Write social post for new strain launch",
            "Create email for loyalty members",
            "Generate 420 promotion ideas"
        ],
        thinkingMessage: "Crafting compliance-safe copy..."
    },
    {
        id: 'pops',
        name: 'Pops',
        title: 'Analytics Brain',
        icon: LineChart,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        prompts: [
            "What's my best-selling category?",
            "Show customer cohort analysis",
            "Predict next month's top sellers",
            "Which products need restocking?"
        ],
        thinkingMessage: "Crunching your sales data..."
    },
    {
        id: 'ezal',
        name: 'Ezal',
        title: 'Competitive Intel',
        icon: Radar,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        prompts: [
            "Who are my top competitors?",
            "Compare our prices to rivals",
            "What promotions are competitors running?",
            "Find market gaps we can exploit"
        ],
        thinkingMessage: "Scanning competitor menus..."
    }
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
    hasImage?: boolean;
    hasVideo?: boolean;
}

// Storage keys
const DEMO_COUNT_KEY = 'bakedbot_demo_count';
const DEMO_DATE_KEY = 'bakedbot_demo_date';
const MAX_FREE_DEMOS = 5;

export function AgentPlayground() {
    const [activeAgent, setActiveAgent] = useState(PLAYGROUND_AGENTS[0]);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<DemoResult | null>(null);
    const [demoCount, setDemoCount] = useState(0);
    const [showEmailCapture, setShowEmailCapture] = useState(false);
    const [hasEmailCaptured, setHasEmailCaptured] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load demo count from storage
    useEffect(() => {
        const storedDate = localStorage.getItem(DEMO_DATE_KEY);
        const today = new Date().toDateString();
        
        if (storedDate !== today) {
            // Reset count for new day
            localStorage.setItem(DEMO_DATE_KEY, today);
            localStorage.setItem(DEMO_COUNT_KEY, '0');
            setDemoCount(0);
        } else {
            const count = parseInt(localStorage.getItem(DEMO_COUNT_KEY) || '0', 10);
            setDemoCount(count);
        }

        // Check if email was already captured
        const email = localStorage.getItem('bakedbot_lead_email');
        if (email) {
            setHasEmailCaptured(true);
        }
    }, []);

    const canRunDemo = useCallback(() => {
        if (hasEmailCaptured) return true;
        return demoCount < MAX_FREE_DEMOS;
    }, [demoCount, hasEmailCaptured]);

    const runDemo = useCallback(async (demoPrompt: string) => {
        if (!canRunDemo()) {
            setShowEmailCapture(true);
            return;
        }

        setIsLoading(true);
        setError(null);
        setPrompt(demoPrompt);

        try {
            // Call the demo API
            const response = await fetch('/api/demo/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent: activeAgent.id,
                    prompt: demoPrompt
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

            // Update demo count
            const newCount = demoCount + 1;
            setDemoCount(newCount);
            localStorage.setItem(DEMO_COUNT_KEY, newCount.toString());

        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    }, [activeAgent, demoCount, canRunDemo]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            runDemo(prompt.trim());
        }
    };

    const handleEmailCaptured = () => {
        setHasEmailCaptured(true);
        setShowEmailCapture(false);
        // After capture, run the pending demo
        if (prompt) {
            runDemo(prompt);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Agent Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
                {PLAYGROUND_AGENTS.map((agent) => {
                    const Icon = agent.icon;
                    const isActive = activeAgent.id === agent.id;
                    return (
                        <button
                            key={agent.id}
                            onClick={() => {
                                setActiveAgent(agent);
                                setResult(null);
                                setError(null);
                            }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                                "border backdrop-blur-sm",
                                isActive 
                                    ? `${agent.bgColor} ${agent.borderColor} ${agent.color}`
                                    : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="font-medium">{agent.name}</span>
                            <span className="text-xs opacity-70 hidden sm:inline">
                                {agent.title}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Demo Card */}
            <Card className="border-white/10 bg-black/20 backdrop-blur-xl">
                <CardContent className="p-6">
                    {/* Example Prompts */}
                    <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-3">
                            Try these examples:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {activeAgent.prompts.map((examplePrompt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => runDemo(examplePrompt)}
                                    disabled={isLoading}
                                    className={cn(
                                        "text-sm px-3 py-1.5 rounded-full transition-all",
                                        "border border-white/10 bg-white/5",
                                        "hover:bg-white/10 hover:border-white/20",
                                        "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                >
                                    {examplePrompt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Prompt Input */}
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={`Ask ${activeAgent.name} anything...`}
                            className="flex-1 bg-white/5 border-white/10"
                            disabled={isLoading}
                        />
                        <Button 
                            type="submit" 
                            disabled={isLoading || !prompt.trim()}
                            className="gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Ask
                        </Button>
                    </form>

                    {/* Rate Limit Indicator */}
                    {!hasEmailCaptured && (
                        <p className="text-xs text-muted-foreground mt-2">
                            {MAX_FREE_DEMOS - demoCount} free demos remaining today
                            {demoCount >= MAX_FREE_DEMOS - 2 && (
                                <span className="text-amber-500 ml-1">
                                    • Enter email for unlimited
                                </span>
                            )}
                        </p>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="mt-6 p-4 rounded-lg bg-white/5 animate-pulse">
                            <div className="flex items-center gap-3">
                                <Sparkles className={cn("w-5 h-5 animate-pulse", activeAgent.color)} />
                                <span className="text-sm text-muted-foreground">
                                    {activeAgent.thinkingMessage}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Results */}
                    {result && !isLoading && (
                        <div className="mt-6 space-y-4">
                            {/* Success Header */}
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-muted-foreground">
                                    {activeAgent.name} analyzed your request
                                </span>
                            </div>

                            {/* Visible Results (3 shown) */}
                            <div className="space-y-3">
                                {result.items.slice(0, 3).map((item, idx) => (
                                    <div 
                                        key={idx}
                                        className="p-4 rounded-lg bg-white/5 border border-white/10"
                                    >
                                        <h4 className="font-medium mb-1">{item.title}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {item.description}
                                        </p>
                                        {item.meta && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {item.meta}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Locked Results */}
                            {result.totalCount > 3 && (
                                <div 
                                    className="relative p-4 rounded-lg bg-gradient-to-b from-white/5 to-white/0 border border-white/10 cursor-pointer group"
                                    onClick={() => setShowEmailCapture(true)}
                                >
                                    {/* Blurred preview */}
                                    <div className="space-y-2 blur-sm">
                                        <div className="h-4 bg-white/10 rounded w-3/4" />
                                        <div className="h-3 bg-white/5 rounded w-full" />
                                        <div className="h-3 bg-white/5 rounded w-2/3" />
                                    </div>

                                    {/* Overlay */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <Lock className="w-6 h-6 text-primary mb-2" />
                                        <p className="text-sm font-medium">
                                            +{result.totalCount - 3} more results
                                        </p>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="mt-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                        >
                                            Unlock All <ArrowRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Media Generation Options */}
                            <div className="flex gap-2 pt-2">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => {
                                        // Images are free - could trigger image generation
                                        alert('Image generation coming soon!');
                                    }}
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    Generate Image
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => setShowEmailCapture(true)}
                                >
                                    <Video className="w-4 h-4" />
                                    <Lock className="w-3 h-3" />
                                    Generate Video
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Email Capture Modal */}
            <EmailCaptureModal
                open={showEmailCapture}
                onClose={() => setShowEmailCapture(false)}
                onSuccess={handleEmailCaptured}
            />
        </div>
    );
}
