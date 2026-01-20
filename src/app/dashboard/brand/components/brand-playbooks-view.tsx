'use client';

import { useState } from 'react';
import { BrandPlaybooksList } from './brand-playbooks-list';
import { Button } from '@/components/ui/button';
import {
    BookOpen,
    History,
    Settings2,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronDown,
    ChevronUp,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreatePlaybookDialog } from '../../playbooks/components/create-playbook-dialog';
import { createPlaybook } from '@/server/actions/playbooks';
import { useToast } from '@/hooks/use-toast';
import { PlaybookCategory } from '@/types/playbook';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface RunHistoryItem {
    id: string;
    playbook: string;
    status: 'completed' | 'failed';
    outcome: string;
    timestamp: string;
    agent: string;
    errorDetails?: string;
    logs?: string[];
}

export function BrandPlaybooksView({ brandId }: { brandId: string }) {
    const [view, setView] = useState<'library' | 'history'>('library');
    const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const { toast } = useToast();

    const runHistory: RunHistoryItem[] = [
        {
            id: 'h1',
            playbook: 'Retail Coverage Builder',
            status: 'completed',
            outcome: '12 emails sent, 2 replies',
            timestamp: '2 hours ago',
            agent: 'Craig',
            logs: [
                'Started execution at 10:00 AM',
                'Fetched 24 retailers from database',
                'Filtered to 12 retailers matching criteria',
                'Sent emails via Mailjet',
                'Received 2 webhook confirmations for opens',
                'Completed successfully'
            ]
        },
        {
            id: 'h2',
            playbook: 'OOS / Restock Nudge',
            status: 'failed',
            outcome: 'API Error: Retailer #402',
            timestamp: '5 hours ago',
            agent: 'Smokey',
            errorDetails: 'The retailer API returned a 402 Payment Required error. This may indicate the retailer has not configured their API access or has exceeded their quota.',
            logs: [
                'Started execution at 7:00 AM',
                'Fetched inventory data',
                'Identified 5 low-stock items',
                'Attempted to notify retailer #402',
                'ERROR: API returned 402 Payment Required',
                'Retried 3 times, all failed',
                'Execution halted'
            ]
        },
        {
            id: 'h3',
            playbook: 'Velocity Watch',
            status: 'completed',
            outcome: '3 flags raised',
            timestamp: 'Today, 9:00 AM',
            agent: 'Pops',
            logs: [
                'Started daily velocity analysis',
                'Analyzed 156 SKUs across 12 retailers',
                'Flag 1: "Blue Dream 3.5g" velocity down 45% at Retailer A',
                'Flag 2: "Gummy Bears 10pk" out of stock at 3 locations',
                'Flag 3: Price variance detected for "Vape Cart 1g"',
                'Report sent to dashboard'
            ]
        }
    ];

    const handleCreateFromScratch = async (data: { name: string; description: string; agent: string; category: PlaybookCategory }) => {
        try {
            const result = await createPlaybook(brandId, {
                name: data.name,
                description: data.description,
                agent: data.agent,
                category: data.category,
                status: 'paused',
                triggers: [],
                steps: []
            });

            if (result.success) {
                toast({
                    title: 'Playbook Created',
                    description: `"${data.name}" has been created successfully.`
                });
                setRefreshKey(prev => prev + 1);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to create playbook'
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to create playbook'
            });
        }
    };

    const handleCloneTemplate = async (templateId: string) => {
        const templates: Record<string, { name: string; description: string; agent: string; category: PlaybookCategory }> = {
            'daily_intel': {
                name: 'Daily Intelligence Snapshot',
                description: 'Morning report on market activity, competitor moves, and key metrics',
                agent: 'ezal',
                category: 'intel'
            },
            'lead_followup': {
                name: 'Lead Follow-up',
                description: 'Automated follow-up email sequence for new leads',
                agent: 'craig',
                category: 'marketing'
            },
            'weekly_kpi': {
                name: 'Weekly KPI Report',
                description: 'Executive summary of key performance indicators',
                agent: 'pops',
                category: 'reporting'
            },
            'low_stock_alert': {
                name: 'Low Stock Alert',
                description: 'Monitor inventory and alert when items are running low',
                agent: 'smokey',
                category: 'ops'
            }
        };

        const template = templates[templateId];
        if (template) {
            await handleCreateFromScratch(template);
        }
    };

    const toggleRunDetails = (runId: string) => {
        setExpandedRunId(expandedRunId === runId ? null : runId);
    };

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
                    <CreatePlaybookDialog
                        onCreateFromScratch={handleCreateFromScratch}
                        onCloneTemplate={handleCloneTemplate}
                    />
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
                    <BrandPlaybooksList key={refreshKey} brandId={brandId} />
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
                                    <Collapsible
                                        key={run.id}
                                        open={expandedRunId === run.id}
                                        onOpenChange={() => toggleRunDetails(run.id)}
                                    >
                                        <div className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
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
                                                <CollapsibleTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider gap-1">
                                                        Details
                                                        {expandedRunId === run.id ? (
                                                            <ChevronUp className="h-3 w-3" />
                                                        ) : (
                                                            <ChevronDown className="h-3 w-3" />
                                                        )}
                                                    </Button>
                                                </CollapsibleTrigger>
                                            </div>
                                        </div>
                                        <CollapsibleContent>
                                            <div className="px-4 pb-4 pt-0 ml-12 space-y-3">
                                                {run.status === 'failed' && run.errorDetails && (
                                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                        <div className="flex items-start gap-2">
                                                            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-sm font-medium text-red-800">Error Details</p>
                                                                <p className="text-xs text-red-600 mt-1">{run.errorDetails}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {run.logs && run.logs.length > 0 && (
                                                    <div className="bg-muted/30 rounded-lg p-3">
                                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Execution Log</p>
                                                        <div className="space-y-1 font-mono text-xs">
                                                            {run.logs.map((log, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`${log.includes('ERROR') ? 'text-red-600' : log.includes('Flag') ? 'text-amber-600' : 'text-muted-foreground'}`}
                                                                >
                                                                    {log}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
