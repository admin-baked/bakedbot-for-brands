'use client';

/**
 * Super User Playbooks Page
 *
 * Agent Command UX for internal BakedBot operations:
 * - Welcome emails for new signups
 * - Competitor pricing research (AIQ, etc.)
 * - Weekly report automation
 * - Internal operations workflows
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search, Bot, Zap, Clock, TrendingUp, Users, Mail, BarChart3, Target, Database, Loader2, CheckCircle } from 'lucide-react';
import { SuperUserAgentChat } from './components/super-user-agent-chat';
import { InternalPlaybooksGrid } from './components/internal-playbooks-grid';
import { seedPlaybookTemplates, type SeedResult } from '@/server/actions/seed-playbooks';
import { useToast } from '@/components/ui/use-toast';

export default function SuperUserPlaybooksPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSeeding, setIsSeeding] = useState(false);
    const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
    const { toast } = useToast();

    const stats = {
        activePlaybooks: 8,
        totalPlaybooks: 12,
        runsToday: 47,
        automationsThisWeek: 156,
    };

    const handleSeedTemplates = async () => {
        setIsSeeding(true);
        setSeedResult(null);
        try {
            const result = await seedPlaybookTemplates();
            setSeedResult(result);

            if (result.success) {
                toast({
                    title: 'Templates seeded',
                    description: `Seeded ${result.seeded.length} templates, ${result.skipped.length} already existed.`,
                });
            } else {
                toast({
                    title: 'Seeding completed with errors',
                    description: result.errors.join(', '),
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Seeding failed',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive',
            });
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">BakedBot Operations</h1>
                    <p className="text-muted-foreground">
                        Internal agent commands and automation playbooks for BakedBot operations.
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleSeedTemplates}
                    disabled={isSeeding}
                >
                    {isSeeding ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Seeding...
                        </>
                    ) : seedResult?.success ? (
                        <>
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Seeded
                        </>
                    ) : (
                        <>
                            <Database className="h-4 w-4 mr-2" />
                            Seed Templates
                        </>
                    )}
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active Playbooks</p>
                                <p className="text-2xl font-bold">{stats.activePlaybooks}/{stats.totalPlaybooks}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <Zap className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Runs Today</p>
                                <p className="text-2xl font-bold">{stats.runsToday}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">This Week</p>
                                <p className="text-2xl font-bold">{stats.automationsThisWeek}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active Agents</p>
                                <p className="text-2xl font-bold">6</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                                <Bot className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Agent Command Interface */}
            <section className="w-full">
                <SuperUserAgentChat />
            </section>

            {/* Quick Actions */}
            <section>
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuickActionCard
                        icon={<Mail className="h-5 w-5" />}
                        title="Welcome Email Automation"
                        description="Send personalized welcome emails to new signups"
                        command="Send welcome email sequence to all new signups from today"
                        color="blue"
                    />
                    <QuickActionCard
                        icon={<BarChart3 className="h-5 w-5" />}
                        title="Competitor Research"
                        description="Analyze AIQ and competitor pricing strategies"
                        command="Research AIQ competitor pricing and provide a comparison report"
                        color="green"
                    />
                    <QuickActionCard
                        icon={<Target className="h-5 w-5" />}
                        title="Weekly Report"
                        description="Generate comprehensive weekly operations report"
                        command="Generate weekly platform report with revenue, signups, and agent metrics"
                        color="purple"
                    />
                </div>
            </section>

            {/* Internal Playbooks Grid */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Internal Playbooks</h2>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search playbooks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                <InternalPlaybooksGrid searchQuery={searchQuery} />
            </section>
        </div>
    );
}

// Quick Action Card Component
function QuickActionCard({
    icon,
    title,
    description,
    command,
    color,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    command: string;
    color: 'blue' | 'green' | 'purple' | 'amber';
}) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
        green: 'bg-green-100 text-green-600 hover:bg-green-200',
        purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
        amber: 'bg-amber-100 text-amber-600 hover:bg-amber-200',
    };

    const handleClick = () => {
        // Dispatch command to agent chat
        const event = new CustomEvent('agent-command', { detail: { command } });
        window.dispatchEvent(event);
    };

    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleClick}
        >
            <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                        {icon}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold">{title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                        <Badge variant="secondary" className="mt-2 text-xs">
                            Click to run
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
