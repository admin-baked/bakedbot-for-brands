'use client';

import { useState, useCallback, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Users, 
    Rocket, 
    Briefcase, 
    Wrench, 
    Sparkles, 
    DollarSign, 
    BarChart3, 
    ShieldAlert, 
    Zap,
    TrendingUp,
    CheckCircle2,
    MessageSquare,
    Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PuffChat } from '@/app/dashboard/ceo/components/puff-chat';
import { useUser } from '@/firebase/auth/use-user';
import { getPlatformAnalytics, type PlatformAnalyticsData } from '../actions';
import { useEffect } from 'react';

// Mock KPI Widgets
function BoardroomWidget({ title, value, subtext, icon: Icon, trend, color }: any) {
    return (
        <Card className="overflow-hidden border-border/40 bg-background shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className={cn("p-1.5 rounded-lg", color)}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
                    {trend && <TrendingUp className="h-3 w-3 text-green-500" />}
                    {subtext}
                </div>
            </CardContent>
        </Card>
    );
}

const EXECUTIVE_TEAM = [
    { id: 'leo', name: 'Leo', role: 'COO', icon: Briefcase, color: 'bg-blue-100 text-blue-700' },
    { id: 'jack', name: 'Jack', role: 'CRO', icon: Rocket, color: 'bg-orange-100 text-orange-700' },
    { id: 'linus', name: 'Linus', role: 'CTO', icon: Wrench, color: 'bg-purple-100 text-purple-700' },
    { id: 'glenda', name: 'Glenda', role: 'CMO', icon: Sparkles, color: 'bg-emerald-100 text-emerald-700' },
    { id: 'mike_exec', name: 'Mike', role: 'CFO', icon: DollarSign, color: 'bg-amber-100 text-amber-700' },
];

const SUPPORT_STAFF = [
    { id: 'smokey', name: 'Smokey', role: 'Head of Product', icon: Zap, color: 'bg-green-100 text-green-700' },
    { id: 'pops', name: 'Pops', role: 'Data Analyst', icon: BarChart3, color: 'bg-slate-100 text-slate-700' },
];

export default function BoardroomTab() {
    const { user } = useUser();
    const [selectedAgent, setSelectedAgent] = useState('leo');
    const [analytics, setAnalytics] = useState<PlatformAnalyticsData | null>(null);

    useEffect(() => {
        getPlatformAnalytics().then(setAnalytics).catch(console.error);
    }, []);

    const [initialPermissions, setInitialPermissions] = useState<any[]>([]);
    
    // Check for existing Gmail capability
    useEffect(() => {
        // Dynamic import to avoid bundling server code if possible, though 'use server' handles it.
        // Actually, for client components calling server actions, we import directly often.
        // But here we use dynamic import as per previous pattern.
        import('@/server/actions/gmail').then(({ checkGmailConnection }) => {
            checkGmailConnection().then(result => {
                if (result.isConnected) {
                    setInitialPermissions([{
                        id: 'gmail',
                        name: 'Gmail',
                        icon: 'mail',
                        email: result.email || 'connected@user.com',
                        description: 'Access granted via persistent connection.',
                        status: 'granted',
                        tools: ['Send Message', 'Read Mail']
                    }]);
                }
            });
        });
    }, []);

    const mrr = analytics?.revenue.mrr || 0;
    const leads = analytics?.signups.total || 0;
    const activeUsers = analytics?.activeUsers.monthly || 0;
    const goalPct = (mrr / 100000) * 100;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Roundtable Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Executive Boardroom</h2>
                        <p className="text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-0.5">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 animate-pulse w-fit">
                                <Zap className="h-3 w-3 fill-primary" />
                                Roundtable Active
                            </Badge>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-sm sm:text-base">Collaborative alignment for $100k MRR target (Jan 2027)</span>
                        </p>
                    </div>
                </div>

                {/* Executive Team */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
                    {EXECUTIVE_TEAM.map((agent) => (
                        <Card 
                            key={agent.id}
                            className={cn(
                                "cursor-pointer transition-all hover:scale-105 active:scale-95",
                                selectedAgent === agent.id ? "ring-2 ring-primary ring-offset-2 border-primary/50 shadow-lg" : "hover:border-primary/30"
                            )}
                            onClick={() => setSelectedAgent(agent.id)}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4 gap-2 sm:gap-3">
                                <div className={cn("p-2 sm:p-3 rounded-full shadow-inner", agent.color)}>
                                    <agent.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-sm leading-tight">{agent.name}</p>
                                    <p className="text-[10px] uppercase tracking-wider font-semibold opacity-60 leading-tight mt-1">{agent.role}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Support Staff */}
                <div className="flex items-center gap-4 mt-2">
                     <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest shrink-0">Support Staff</p>
                     <div className="h-px bg-border flex-1" />
                </div>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:flex sm:flex-wrap">
                    {SUPPORT_STAFF.map((agent) => (
                        <Card 
                            key={agent.id}
                            className={cn(
                                "cursor-pointer transition-all hover:bg-accent/50 active:scale-95 sm:w-48",
                                selectedAgent === agent.id ? "ring-2 ring-slate-400 ring-offset-1 border-slate-400 shadow-md bg-accent" : "border-border/60"
                            )}
                            onClick={() => setSelectedAgent(agent.id)}
                        >
                            <CardContent className="flex flex-row items-center p-3 gap-3">
                                <div className={cn("p-2 rounded-lg shrink-0", agent.color)}>
                                    <agent.icon className="h-4 w-4" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-sm leading-none">{agent.name}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1 leading-none">{agent.role}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Sidebar: KPIs */}
                <div className="lg:col-span-4 lg:order-1 grid grid-cols-1 gap-4 hidden lg:grid">
                    <BoardroomWidget 
                        title="Revenue Growth (MRR)" 
                        value={`$${mrr.toLocaleString()}`} 
                        subtext={`${goalPct.toFixed(1)}% of $100k Goal`} 
                        icon={TrendingUp} 
                        trend={true}
                        color="bg-green-100 text-green-700"
                    />
                    <BoardroomWidget 
                        title="Operational Health" 
                        value="98.4%" 
                        subtext="3/4 Critical OKRs on track" 
                        icon={BarChart3} 
                        color="bg-blue-100 text-blue-700"
                    />
                    <BoardroomWidget 
                        title="Compliance Score" 
                        value="100%" 
                        subtext="All regional licenses verified" 
                        icon={ShieldAlert} 
                        color="bg-emerald-100 text-emerald-700"
                    />
                    <BoardroomWidget 
                        title="Total Users" 
                        value={`${leads.toLocaleString()}`} 
                        subtext="Registered Accounts" 
                        icon={Users} 
                        color="bg-purple-100 text-purple-700"
                    />
                </div>

                {/* Main: Unified Chat */}
                <Card className="lg:col-span-8 lg:order-2 shadow-xl border-border/50 overflow-hidden h-[85vh] lg:h-[700px] flex flex-col bg-slate-50/30 backdrop-blur-sm order-first">
                    <CardHeader className="bg-background border-b py-3 px-6 flex flex-row items-center justify-between shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-1.5 rounded-lg", EXECUTIVE_TEAM.find(a => a.id === selectedAgent)?.color)}>
                                {(() => {
                                    const AgentIcon = EXECUTIVE_TEAM.find(a => a.id === selectedAgent)?.icon || Briefcase;
                                    return <AgentIcon className="h-5 w-5" />;
                                })()}
                            </div>
                            <div>
                                <CardTitle className="text-base">Roundtable Discussion</CardTitle>
                                <CardDescription className="text-[11px] font-medium text-primary">
                                    Current Speaker: {EXECUTIVE_TEAM.find(a => a.id === selectedAgent)?.name} ({EXECUTIVE_TEAM.find(a => a.id === selectedAgent)?.role})
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] hidden sm:flex">Universal Delegation Enabled</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-visible relative min-h-0">
                            <PuffChat
                                persona={selectedAgent as any}
                                hideHeader={true}
                                isSuperUser={true}
                                isHired={true}
                                initialPermissions={initialPermissions}
                                promptSuggestions={[
                                    "Run Weekly KPI Report",
                                    "Check System Health Status",
                                    "Review Recent Signups",
                                    "Generate Competitive Intel Summary",
                                    "Draft Weekly Team Update Email"
                                ]}
                                className="h-full border-0 shadow-none"
                            />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
