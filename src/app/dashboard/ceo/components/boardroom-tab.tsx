'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Rocket,
    Briefcase,
    Wrench,
    Sparkles,
    DollarSign,
    BarChart3,
    Zap,
    TrendingUp,
    BookOpen,
    Scale,
    Heart,
    Megaphone,
    Eye,
    Shield,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PuffChat } from '@/app/dashboard/ceo/components/puff-chat';
import { useUser } from '@/firebase/auth/use-user';
import { getPlatformAnalytics } from '../actions/data-actions';
import type { PlatformAnalyticsData } from '../actions/types';
import { AgentDebugPanel, useAgentDebug } from './agent-debug-panel';
import { InboxThreadType } from '@/types/inbox';
import { useSearchParams } from 'next/navigation';

// --- Agent Definitions ---

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
    { id: 'day_day', name: 'Day Day', role: 'SEO & Growth', icon: TrendingUp, color: 'bg-indigo-100 text-indigo-700' },
    { id: 'mrs_parker', name: 'Mrs. Parker', role: 'Customer Success', icon: Heart, color: 'bg-pink-100 text-pink-700' },
    { id: 'big_worm', name: 'Big Worm', role: 'Deep Research', icon: BookOpen, color: 'bg-amber-100 text-amber-700' },
    { id: 'roach', name: 'Roach', role: 'Research Librarian', icon: Scale, color: 'bg-cyan-100 text-cyan-700' },
    { id: 'craig', name: 'Craig', role: 'Marketing', icon: Megaphone, color: 'bg-rose-100 text-rose-700' },
    { id: 'ezal', name: 'Ezal', role: 'Competitive Intel', icon: Eye, color: 'bg-yellow-100 text-yellow-700' },
    { id: 'deebo', name: 'Deebo', role: 'Compliance', icon: Shield, color: 'bg-red-100 text-red-700' },
];

const ALL_AGENTS = [...EXECUTIVE_TEAM, ...SUPPORT_STAFF];

// --- Sub-components ---

function HudMetric({ label, value, className }: { label: string; value: string; className?: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">{label}:</span>
            <span className={cn("font-mono font-bold text-sm", className)}>{value}</span>
        </div>
    );
}

function AgentDirectoryItem({
    agent,
    isSelected,
    onClick,
}: {
    agent: typeof ALL_AGENTS[number];
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left",
                isSelected
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-accent/60 border border-transparent"
            )}
        >
            <div className={cn("w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center", agent.color)}>
                <agent.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold truncate leading-tight", isSelected && "text-primary")}>
                    {agent.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{agent.role}</p>
            </div>
            <ChevronRight
                className={cn(
                    "h-3.5 w-3.5 flex-shrink-0 transition-opacity",
                    isSelected ? "text-primary opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                )}
            />
        </button>
    );
}

// --- Main Component ---

export default function BoardroomTab() {
    const { user } = useUser();
    const searchParams = useSearchParams();
    const [selectedAgent, setSelectedAgent] = useState('leo');
    const [analytics, setAnalytics] = useState<PlatformAnalyticsData | null>(null);
    const [initialPermissions, setInitialPermissions] = useState<any[]>([]);

    // Debug mode for testing agents
    const { isDebugVisible, toggleDebug, setDebugContext } = useAgentDebug();

    useEffect(() => {
        getPlatformAnalytics().then(setAnalytics).catch(console.error);
    }, []);

    // Allow deep-linking from /dashboard/ceo/agents via ?agent=...
    useEffect(() => {
        const agentParam = searchParams?.get('agent');
        if (!agentParam) return;

        const normalized = agentParam.replace(/-/g, '_');
        const allowed = new Set<string>(ALL_AGENTS.map(a => a.id));

        if (allowed.has(normalized) && normalized !== selectedAgent) {
            setSelectedAgent(normalized);
        }
    }, [searchParams, selectedAgent]);

    // Update debug context when agent changes
    useEffect(() => {
        const threadTypeMap: Record<string, InboxThreadType> = {
            leo: 'daily_standup',
            jack: 'pipeline',
            linus: 'sprint_planning',
            glenda: 'content_calendar',
            mike_exec: 'budget_planning',
            mrs_parker: 'customer_onboarding',
            big_worm: 'deep_research',
            roach: 'compliance_research',
            deebo: 'compliance_audit',
            day_day: 'seo_sprint',
        };
        setDebugContext(selectedAgent as any, threadTypeMap[selectedAgent]);
    }, [selectedAgent, setDebugContext]);

    // Check for existing Gmail capability
    useEffect(() => {
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

    // Analytics derived values
    const mrr = analytics?.revenue.mrr || 0;
    const arr = analytics?.revenue.arr || 0;
    const arpu = analytics?.revenue.arpu || 0;
    const totalUsers = analytics?.signups.total || 0;
    const activeUsers = analytics?.activeUsers.monthly || 0;
    const dailyActiveUsers = analytics?.activeUsers.daily || 0;
    const goalPct = (mrr / 100000) * 100;
    const activePct = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(0) : 0;

    const currentAgent = ALL_AGENTS.find(a => a.id === selectedAgent);
    const threadTypeMap: Record<string, InboxThreadType> = {
        leo: 'daily_standup',
        jack: 'pipeline',
        linus: 'sprint_planning',
        glenda: 'content_calendar',
        mike_exec: 'budget_planning',
        mrs_parker: 'customer_onboarding',
        big_worm: 'deep_research',
        roach: 'compliance_research',
        deebo: 'compliance_audit',
        day_day: 'seo_sprint',
    };

    return (
        <div className="flex flex-col gap-0 animate-in fade-in duration-500 -mt-2 xl:h-[calc(100svh-200px)] xl:overflow-hidden">

            {/* HUD Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50 mb-4 xl:shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold tracking-tight">Executive Boardroom</h2>
                        <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 gap-1">
                            <Zap className="h-2.5 w-2.5 fill-green-600 animate-[heartbeat_1.5s_ease-in-out_infinite]" />
                            <span className="text-[10px]">Roundtable Active</span>
                        </Badge>
                        <style jsx>{`
                            @keyframes heartbeat {
                                0%, 100% { transform: scale(1); opacity: 1; }
                                10% { transform: scale(1.3); opacity: 0.7; }
                                20% { transform: scale(1); opacity: 1; }
                                30% { transform: scale(1.3); opacity: 0.7; }
                                40% { transform: scale(1); opacity: 1; }
                            }
                        `}</style>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                        BakedBot growth strategy: Outcompete AlpineIQ, Dutchie, agencies • $100k MRR by Jan 2027
                    </p>
                </div>

                {/* Inline KPI HUD */}
                <div className="flex items-center gap-4 sm:gap-6 shrink-0 border-l border-border/50 pl-4 sm:pl-6">
                    <HudMetric label="MRR" value={`$${mrr.toLocaleString()}`} className="text-green-600" />
                    <HudMetric label="ARR" value={`$${arr.toLocaleString()}`} />
                    <HudMetric label="ARPU" value={`$${arpu}`} />
                    <HudMetric label="Users" value={totalUsers.toLocaleString()} />
                    <HudMetric label="DAU" value={dailyActiveUsers.toLocaleString()} />
                </div>
            </div>

            {/* Main 2-Column Layout: Chat + Agent Directory */}
            <div className="flex gap-4 items-start xl:flex-1 xl:min-h-0 xl:items-stretch">

                {/* Chat Canvas — takes all remaining width */}
                <div className="flex-1 min-w-0 xl:flex xl:flex-col xl:min-h-0">
                    <Card className="shadow-lg border-border/50 overflow-hidden h-[80vh] xl:h-full flex flex-col bg-background">
                        <CardHeader className="bg-background border-b py-3 px-5 flex flex-row items-center justify-between shadow-sm z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                {currentAgent && (
                                    <div className={cn("p-1.5 rounded-lg", currentAgent.color)}>
                                        <currentAgent.icon className="h-4 w-4" />
                                    </div>
                                )}
                                <div>
                                    <CardTitle className="text-sm font-semibold">Roundtable Discussion</CardTitle>
                                    <CardDescription className="text-[10px] font-medium text-primary leading-tight">
                                        Current Speaker: {currentAgent?.name} ({currentAgent?.role})
                                    </CardDescription>
                                </div>
                            </div>
                            <Badge variant="secondary" className="text-[10px] hidden sm:flex">
                                Universal Delegation Enabled
                            </Badge>
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

                {/* Agent Directory Sidebar */}
                <aside className="hidden xl:flex flex-col w-64 shrink-0 gap-3 xl:overflow-y-auto xl:min-h-0">

                    {/* Executive Team */}
                    <div className="bg-background border border-border/50 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-3 py-2.5 border-b border-border/50 bg-muted/30">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Executives</p>
                        </div>
                        <div className="p-2 space-y-0.5">
                            {EXECUTIVE_TEAM.map((agent) => (
                                <AgentDirectoryItem
                                    key={agent.id}
                                    agent={agent}
                                    isSelected={selectedAgent === agent.id}
                                    onClick={() => setSelectedAgent(agent.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Support Staff */}
                    <div className="bg-background border border-border/50 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-3 py-2.5 border-b border-border/50 bg-muted/30">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Support Staff</p>
                        </div>
                        <div className="p-2 space-y-0.5">
                            {SUPPORT_STAFF.map((agent) => (
                                <AgentDirectoryItem
                                    key={agent.id}
                                    agent={agent}
                                    isSelected={selectedAgent === agent.id}
                                    onClick={() => setSelectedAgent(agent.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Online Status */}
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground py-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        {ALL_AGENTS.length} Agents Online
                    </div>
                </aside>
            </div>

            {/* Mobile Agent Picker — shown below chat on small screens */}
            <div className="xl:hidden mt-4 space-y-3">
                <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Executives</p>
                    <div className="grid grid-cols-5 gap-2">
                        {EXECUTIVE_TEAM.map((agent) => (
                            <button
                                key={agent.id}
                                onClick={() => setSelectedAgent(agent.id)}
                                className={cn(
                                    "flex flex-col items-center p-2.5 rounded-xl border transition-all",
                                    selectedAgent === agent.id
                                        ? "ring-2 ring-primary ring-offset-1 border-primary/50 bg-primary/5"
                                        : "border-border/50 hover:border-primary/30 hover:bg-accent/50"
                                )}
                            >
                                <div className={cn("p-2 rounded-full mb-1.5", agent.color)}>
                                    <agent.icon className="h-4 w-4" />
                                </div>
                                <p className="text-[10px] font-bold leading-tight">{agent.name}</p>
                                <p className="text-[9px] text-muted-foreground leading-tight">{agent.role}</p>
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Support Staff</p>
                    <div className="grid grid-cols-2 gap-2">
                        {SUPPORT_STAFF.map((agent) => (
                            <button
                                key={agent.id}
                                onClick={() => setSelectedAgent(agent.id)}
                                className={cn(
                                    "flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left",
                                    selectedAgent === agent.id
                                        ? "ring-2 ring-slate-400 ring-offset-1 border-slate-300 bg-slate-50"
                                        : "border-border/50 hover:bg-accent/50"
                                )}
                            >
                                <div className={cn("p-1.5 rounded-lg shrink-0", agent.color)}>
                                    <agent.icon className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold leading-tight">{agent.name}</p>
                                    <p className="text-[9px] text-muted-foreground leading-tight">{agent.role}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Agent Debug Panel - Test Mode */}
            <AgentDebugPanel
                isVisible={isDebugVisible}
                onToggle={toggleDebug}
                currentAgent={selectedAgent as any}
                threadType={threadTypeMap[selectedAgent]}
            />
        </div>
    );
}
