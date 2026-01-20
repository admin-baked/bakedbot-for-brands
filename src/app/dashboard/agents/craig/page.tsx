
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Mail, MessageSquare, BarChart3, History } from 'lucide-react';
import Link from 'next/link';
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Craig (Marketer) | BakedBot AI',
};

export default async function CraigDashboardPage() {
    try {
        await requireUser(['brand', 'super_user']);
    } catch (error) {
        redirect('/dashboard');
    }

    return (
        <main className="flex flex-col gap-6 px-4 py-6 md:px-8">
            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Craig (Marketer)</h1>
                    <p className="text-sm text-muted-foreground">
                        Automate your marketing campaigns with AI-generated content.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/agents/craig/campaigns/new">
                        <Plus className="mr-2 h-4 w-4" /> Create Campaign
                    </Link>
                </Button>
            </header>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">
                            Create your first campaign
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">
                            No emails sent yet
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Open Rate</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">
                            Not enough data
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Campaigns</CardTitle>
                    <CardDescription>
                        Your latest marketing activities and their status.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        {/* Placeholder for campaign list */}
                        <div className="flex items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            <div className="text-center">
                                <History className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                <p>No campaigns yet. Start one today!</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
