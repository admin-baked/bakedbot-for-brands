import { getLifecycleFlows } from './actions';
import { LifecycleFlowCard } from './components/lifecycle-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Zap, Play, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LifecyclePage() {
    const flows = await getLifecycleFlows();
    const activeCount = flows.filter(f => f.status === 'active').length;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Lifecycle Automations</h1>
                    <p className="text-muted-foreground">Manage automated customer journeys and event-triggered messaging.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/marketing">
                        <Button variant="ghost">Back to Marketing</Button>
                    </Link>
                    <Link href="/dashboard/marketing/campaigns/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Workflow
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Zap className="h-5 w-5" /> Active Flows
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{activeCount}</div>
                        <p className="text-green-100 text-sm">Running 24/7</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Workflow className="h-5 w-5 text-muted-foreground" /> Total Triggers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">2,450</div>
                        <p className="text-muted-foreground text-sm">This month</p>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-xl font-semibold mb-4">Your Flows</h2>
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {flows.map((flow) => (
                    <LifecycleFlowCard key={flow.id} flow={flow} />
                ))}
            </div>
        </div>
    );
}

function Plus(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}
