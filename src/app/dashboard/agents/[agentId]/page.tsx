
// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { agents } from '@/config/agents';
import { requireUser } from '@/server/auth/auth';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Activity, Zap } from 'lucide-react';
import Link from 'next/link';

import { AgentConfigSheet } from '@/components/dashboard/agents/agent-config-sheet';
import { getAgentConfigOverride } from '@/app/actions/agent-config';

interface PageProps {
    params: Promise<{
        agentId: string;
    }>;
}

export default async function AgentDetailsPage({ params }: PageProps) {
    const { agentId } = await params;
    let user;

    try {
        user = await requireUser(['brand', 'super_user']);
    } catch (error) {
        redirect('/dashboard');
    }

    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
        notFound();
    }

    const orgId = (user as any).orgId || (user as any).locationId || 'default';
    const configOverride = await getAgentConfigOverride(agentId, orgId);

    const Icon = agent.icon;

    // Apply overrides to local agent object for display
    const displayAgent = {
        ...agent,
        name: configOverride?.name || agent.name,
        title: configOverride?.title || agent.title,
        status: configOverride?.status || agent.status,
    };

    return (
        <main className="flex flex-col gap-6 px-4 py-6 md:px-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight auth-header flex items-center gap-2">
                        {displayAgent.name}
                        <Badge variant={displayAgent.status === 'online' ? 'default' : 'secondary'} className="text-sm font-normal normal-case">
                            {displayAgent.status}
                        </Badge>
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {displayAgent.title} · {displayAgent.description}
                    </p>
                </div>
                <div className="ml-auto flex gap-2">
                    <AgentConfigSheet agent={agent} initialConfig={configOverride} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{agent.status}</div>
                        <p className="text-xs text-muted-foreground">
                            System nominal
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{agent.primaryMetricLabel}</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{agent.primaryMetricValue}</div>
                        <p className="text-xs text-muted-foreground">
                            Last 24 hours
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Agent Console</CardTitle>
                            <CardDescription>Direct interface for {agent.name}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted p-4 rounded-lg min-h-[200px] text-sm space-y-4">
                                <div className="flex gap-2">
                                    <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Icon className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-xs text-muted-foreground">{agent.name}</p>
                                        <p className="text-foreground bg-background p-2 rounded-md shadow-sm inline-block">
                                            {agent.id === 'craig' && "Ready to launch campaigns. Need an email draft?"}
                                            {agent.id === 'deebo' && "Compliance engine active. Send me a label or page to audit."}
                                            {agent.id === 'pops' && "Forecasting models loaded. Ask me about next month's sales."}
                                            {agent.id === 'ezal' && "Market scanners running. Who are we tracking today?"}
                                            {agent.id === 'smokey' && "Budtender mode on. What product are you looking for?"}
                                            {agent.id === 'money-mike' && "Margins look tight. Should we check competitor pricing?"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button className="w-full justify-start text-muted-foreground" variant="outline" asChild>
                                    <Link href={`/dashboard?agent=${agent.id}`}>
                                        <Activity className="mr-2 h-4 w-4" />
                                        Open full chat session with {agent.name}...
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="col-span-3 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Capabilities</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                {agent.id === 'craig' && (
                                    <>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Email Generation</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Campaign Segmentation</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> A/B Testing</li>
                                    </>
                                )}
                                {agent.id === 'deebo' && (
                                    <>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Label Audits</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Age Gate Verification</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> State Law Database</li>
                                    </>
                                )}
                                {/* Defaults for others */}
                                {['craig', 'deebo'].includes(agent.id) === false && (
                                    <>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Natural Language Processing</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Real-time Analysis</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Advanced Tools (Beta)</li>
                                    </>
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
