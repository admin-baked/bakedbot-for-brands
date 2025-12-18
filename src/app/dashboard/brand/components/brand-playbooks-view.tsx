'use client';

import { useState } from 'react';
import { BrandPlaybooksList } from './brand-playbooks-list';
import { Button } from '@/components/ui/button';
import {
    BookOpen,
    History,
    Play,
    Settings2,
    Plus,
    CheckCircle2,
    XCircle,
    Clock,
    Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function BrandPlaybooksView() {
    const [view, setView] = useState<'library' | 'history'>('library');

    const runHistory = [
        {
            id: 'h1',
            playbook: 'Retail Coverage Builder',
            status: 'completed',
            outcome: '12 emails sent, 2 replies',
            timestamp: '2 hours ago',
            agent: 'Craig'
        },
        {
            id: 'h2',
            playbook: 'OOS / Restock Nudge',
            status: 'failed',
            outcome: 'API Error: Retailer #402',
            timestamp: '5 hours ago',
            agent: 'Smokey'
        },
        {
            id: 'h3',
            playbook: 'Velocity Watch',
            status: 'completed',
            outcome: '3 flags raised',
            timestamp: 'Today, 9:00 AM',
            agent: 'Pops'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight">OPERATIONAL PLAYBOOKS</h1>
                    <p className="text-sm text-muted-foreground font-medium">
                        Scale your brand with pre-built automated workflows.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="font-bold border-2 gap-2" onClick={() => setView(view === 'library' ? 'history' : 'library')}>
                        {view === 'library' ? (
                            <>
                                <History className="h-4 w-4" />
                                View Run History
                            </>
                        ) : (
                            <>
                                <BookOpen className="h-4 w-4" />
                                View Library
                            </>
                        )}
                    </Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2">
                        <Plus className="h-4 w-4" />
                        Create Playbook
                    </Button>
                </div>
            </div>

            {view === 'library' ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-muted/30 border-2 border-dashed rounded-xl">
                        <div className="flex items-center gap-3">
                            <Settings2 className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm font-bold">Batch Actions:</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold">Enable All</Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold">Disable All</Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-red-600 hover:text-red-700">Clear Cache</Button>
                        </div>
                    </div>
                    <BrandPlaybooksList />
                </div>
            ) : (
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2 border-b">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider">Recent Activity Log</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {runHistory.map((run) => (
                                    <div key={run.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center ${run.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                {run.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm">{run.playbook}</span>
                                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 h-4">
                                                        {run.agent}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">{run.outcome}</p>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 justify-end">
                                                <Clock className="h-3 w-3" />
                                                {run.timestamp}
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider">
                                                Details
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
