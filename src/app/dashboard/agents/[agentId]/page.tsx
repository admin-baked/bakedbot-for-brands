
import { agents } from '@/config/agents';
import { requireUser } from '@/server/auth/auth';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Activity, Zap } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
    params: {
        agentId: string;
    };
}

export default async function AgentDetailsPage({ params }: PageProps) {
    try {
        await requireUser(['brand', 'owner']);
    } catch (error) {
        redirect('/dashboard');
    }

    const { agentId } = params;
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
        notFound();
    }

    const Icon = agent.icon;

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
                        {agent.name}
                        <Badge variant={agent.status === 'online' ? 'default' : 'secondary'} className="text-sm font-normal normal-case">
                            {agent.status}
                        </Badge>
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {agent.title} · {agent.description}
                    </p>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button variant="outline">
                        <Settings className="mr-2 h-4 w-4" />
                        Configure
                    </Button>
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

            <Card className="h-[400px] flex items-center justify-center border-dashed">
                <div className="text-center space-y-4 max-w-md mx-auto p-4">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">{agent.name} is ready</h3>
                        <p className="text-muted-foreground text-sm mt-2">
                            This agent key features are being initialized. Check back soon for full control panel access and advanced configuration options.
                        </p>
                    </div>
                    <Button>
                        Run Diagnostics
                    </Button>
                </div>
            </Card>
        </main>
    );
}
