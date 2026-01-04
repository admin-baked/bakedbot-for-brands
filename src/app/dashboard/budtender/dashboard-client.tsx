'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Mic, 
    MicOff, 
    MessageSquare, 
    Package, 
    DollarSign, 
    Clock,
    CheckCircle,
    Store,
    Sparkles,
    Loader2
} from 'lucide-react';
import { getBudtenderDashboardData, type BudtenderDashboardData } from './actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function BudtenderDashboardClient() {
    const [data, setData] = useState<BudtenderDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [chatInput, setChatInput] = useState('');

    useEffect(() => {
        async function loadData() {
            const result = await getBudtenderDashboardData();
            setData(result);
            setIsLoading(false);
        }
        loadData();
    }, []);

    const toggleVoice = () => {
        if (isVoiceMode) {
            setIsListening(false);
            setIsVoiceMode(false);
        } else {
            setIsVoiceMode(true);
            // Start listening
            setIsListening(true);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!data?.dispensary) {
        return (
            <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
                <Store className="h-16 w-16 mx-auto text-muted-foreground" />
                <h2 className="text-2xl font-bold">No Dispensary Linked</h2>
                <p className="text-muted-foreground">
                    Ask your manager to add you to their dispensary to unlock the Budtender Co-Pilot.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Budtender Co-Pilot</h1>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            FREE
                        </Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        {data.dispensary.name}
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <Package className="h-8 w-8 text-orange-500" />
                            <div>
                                <p className="text-2xl font-bold">{data.pendingOrders.length}</p>
                                <p className="text-sm text-muted-foreground">Pending Orders</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="h-8 w-8 text-emerald-500" />
                            <div>
                                <p className="text-2xl font-bold">{data.todayStats.ordersCompleted}</p>
                                <p className="text-sm text-muted-foreground">Completed Today</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-2">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <DollarSign className="h-8 w-8 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold">${data.todayStats.revenue.toFixed(0)}</p>
                                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Smokey Voice Chat - Main Feature */}
                <Card className="lg:col-span-3 border-2 border-emerald-200 dark:border-emerald-800 shadow-lg">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-emerald-600" />
                                <CardTitle>Smokey - Your AI Co-Pilot</CardTitle>
                            </div>
                            <Badge variant={isVoiceMode ? "default" : "outline"} className="gap-1">
                                {isVoiceMode ? <Mic className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                                {isVoiceMode ? 'Voice' : 'Text'}
                            </Badge>
                        </div>
                        <CardDescription>
                            Ask about products, get recommendations, or look up customer orders
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Voice Mode UI */}
                        {isVoiceMode ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                                <div className={cn(
                                    "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300",
                                    isListening 
                                        ? "bg-emerald-100 dark:bg-emerald-900 animate-pulse ring-4 ring-emerald-500/30" 
                                        : "bg-slate-100 dark:bg-slate-800"
                                )}>
                                    {isListening ? (
                                        <Mic className="h-12 w-12 text-emerald-600" />
                                    ) : (
                                        <MicOff className="h-12 w-12 text-slate-400" />
                                    )}
                                </div>
                                <p className="text-center text-muted-foreground">
                                    {isListening ? "Listening... Say something!" : "Tap to start voice chat"}
                                </p>
                                <div className="flex gap-3">
                                    <Button 
                                        variant={isListening ? "destructive" : "default"}
                                        size="lg"
                                        onClick={() => setIsListening(!isListening)}
                                        className="gap-2"
                                    >
                                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                        {isListening ? 'Stop' : 'Start Listening'}
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setIsVoiceMode(false)}
                                    >
                                        Switch to Text
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // Text Mode UI
                            <div className="space-y-4">
                                <div className="h-64 bg-slate-50 dark:bg-slate-900 rounded-lg p-4 overflow-y-auto">
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Sparkles className="h-8 w-8 mx-auto mb-3 text-emerald-500" />
                                        <p>Hey! I'm Smokey, your AI co-pilot.</p>
                                        <p className="text-sm mt-2">Ask me about products, recommendations, or customer orders.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="Ask Smokey anything..."
                                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                                        Send
                                    </Button>
                                    <Button variant="outline" onClick={() => setIsVoiceMode(true)}>
                                        <Mic className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                            <Button variant="outline" size="sm">What's popular today?</Button>
                            <Button variant="outline" size="sm">Recommend for relaxation</Button>
                            <Button variant="outline" size="sm">High THC options</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Orders */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Pending Orders</CardTitle>
                            <Badge variant="secondary">{data.pendingOrders.length}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.pendingOrders.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No pending orders right now 🎉
                            </p>
                        ) : (
                            data.pendingOrders.slice(0, 5).map(order => (
                                <Link 
                                    key={order.id} 
                                    href={`/scan/${order.id}`}
                                    className="block"
                                >
                                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                                        <div>
                                            <p className="font-medium">{order.customerName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {order.itemCount} items • ${order.total.toFixed(2)}
                                            </p>
                                        </div>
                                        <Badge className={cn(
                                            "capitalize",
                                            order.status === 'ready' ? 'bg-orange-100 text-orange-800' :
                                            order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                            'bg-slate-100 text-slate-800'
                                        )}>
                                            {order.status}
                                        </Badge>
                                    </div>
                                </Link>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
