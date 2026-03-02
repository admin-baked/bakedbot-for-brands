'use client';

/**
 * CEO Outreach Tab — NY Dispensary Outreach Command Center
 *
 * Provides Super User controls for the automated NY outreach pipeline:
 * - Pipeline status (queue depth, daily limit, recent results)
 * - "Send Test Batch" button (all 10 templates to internal recipients)
 * - "Run Outreach Now" button (manually trigger daily runner)
 * - Lead queue + CRM contact tables
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Search, Play, TestTube2, RefreshCcw, Users, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { getOutreachDashboardData, triggerOutreachRun, triggerTestBatch, triggerContactResearch } from '@/server/actions/ny-outreach-dashboard';

interface OutreachStats {
    totalSent: number;
    totalFailed: number;
    totalBadEmails: number;
    totalPending: number;
    recentResults: Array<{
        leadId: string;
        dispensaryName: string;
        email: string;
        templateId: string;
        emailSent: boolean;
        sendError?: string;
        timestamp: number;
    }>;
}

interface QueueLead {
    id: string;
    dispensaryName: string;
    email?: string;
    city: string;
    contactFormUrl?: string;
    source: string;
    createdAt: number;
}

interface CRMContact {
    id: string;
    dispensaryName: string;
    email: string;
    contactName?: string;
    city: string;
    status: string;
    outreachCount: number;
    lastOutreachAt: number;
    lastTemplateId: string;
}

interface DashboardData {
    stats: OutreachStats;
    queueDepth: number;
    queueLeads: QueueLead[];
    crmContacts: CRMContact[];
    dailyLimit: number;
    sentToday: number;
}

export default function OutreachTab() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const result = await getOutreachDashboardData();
            if (result.success && result.data) {
                setData(result.data);
            }
        } catch (err) {
            setActionResult({ type: 'error', message: `Failed to load data: ${String(err)}` });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRunOutreach = async () => {
        setActionLoading('outreach');
        setActionResult(null);
        try {
            const result = await triggerOutreachRun();
            if (result.success) {
                setActionResult({
                    type: 'success',
                    message: `Outreach complete: ${result.summary?.emailsSent || 0} sent, ${result.summary?.emailsFailed || 0} failed`,
                });
                await loadData();
            } else {
                setActionResult({ type: 'error', message: result.error || 'Outreach run failed' });
            }
        } catch (err) {
            setActionResult({ type: 'error', message: String(err) });
        } finally {
            setActionLoading(null);
        }
    };

    const handleTestBatch = async () => {
        setActionLoading('test');
        setActionResult(null);
        try {
            const result = await triggerTestBatch();
            if (result.success) {
                setActionResult({
                    type: 'success',
                    message: `Test batch sent: ${result.count || 0} emails to internal recipients`,
                });
                await loadData();
            } else {
                setActionResult({ type: 'error', message: result.error || 'Test batch failed' });
            }
        } catch (err) {
            setActionResult({ type: 'error', message: String(err) });
        } finally {
            setActionLoading(null);
        }
    };

    const handleResearch = async () => {
        setActionLoading('research');
        setActionResult(null);
        try {
            const result = await triggerContactResearch();
            if (result.success) {
                setActionResult({
                    type: 'success',
                    message: `Research complete: ${result.leadsFound || 0} new leads discovered`,
                });
                await loadData();
            } else {
                setActionResult({ type: 'error', message: result.error || 'Research failed' });
            }
        } catch (err) {
            setActionResult({ type: 'error', message: String(err) });
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const stats = data?.stats;
    const sentToday = data?.sentToday || 0;
    const dailyLimit = data?.dailyLimit || 5;
    const remaining = Math.max(0, dailyLimit - sentToday);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">NY Dispensary Outreach</h2>
                    <p className="text-muted-foreground">Automated contact research + personalized email outreach pipeline</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} disabled={!!actionLoading}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Action Result Banner */}
            {actionResult && (
                <div className={`flex items-center gap-2 rounded-lg border p-3 ${
                    actionResult.type === 'success'
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-red-200 bg-red-50 text-red-800'
                }`}>
                    {actionResult.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <span className="text-sm">{actionResult.message}</span>
                    <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={() => setActionResult(null)}>
                        Dismiss
                    </Button>
                </div>
            )}

            {/* Stats HUD */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="pt-4 pb-3 px-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{stats?.totalSent || 0}</div>
                        <div className="text-xs text-muted-foreground">Emails Sent (24h)</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3 px-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{data?.queueDepth || 0}</div>
                        <div className="text-xs text-muted-foreground">Leads in Queue</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3 px-4 text-center">
                        <div className="text-2xl font-bold">
                            <span className={remaining > 0 ? 'text-amber-600' : 'text-red-600'}>
                                {sentToday}/{dailyLimit}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">Sent Today / Limit</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3 px-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{stats?.totalBadEmails || 0}</div>
                        <div className="text-xs text-muted-foreground">Bad Emails</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3 px-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">{data?.crmContacts?.length || 0}</div>
                        <div className="text-xs text-muted-foreground">CRM Contacts</div>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
                <Button
                    onClick={handleRunOutreach}
                    disabled={!!actionLoading || remaining === 0}
                    className="bg-green-600 hover:bg-green-700"
                >
                    {actionLoading === 'outreach' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Play className="h-4 w-4 mr-2" />
                    )}
                    Run Outreach Now ({remaining} remaining)
                </Button>

                <Button
                    variant="outline"
                    onClick={handleTestBatch}
                    disabled={!!actionLoading}
                >
                    {actionLoading === 'test' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <TestTube2 className="h-4 w-4 mr-2" />
                    )}
                    Send Test Batch (All 10 Templates)
                </Button>

                <Button
                    variant="outline"
                    onClick={handleResearch}
                    disabled={!!actionLoading}
                >
                    {actionLoading === 'research' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Search className="h-4 w-4 mr-2" />
                    )}
                    Research New Leads
                </Button>
            </div>

            {/* Recent Outreach Results */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Recent Outreach Results
                    </CardTitle>
                    <CardDescription>Last 20 outreach attempts</CardDescription>
                </CardHeader>
                <CardContent>
                    {stats?.recentResults && stats.recentResults.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="text-left p-2 font-medium">Dispensary</th>
                                        <th className="text-left p-2 font-medium">Email</th>
                                        <th className="text-left p-2 font-medium">Template</th>
                                        <th className="text-center p-2 font-medium">Status</th>
                                        <th className="text-right p-2 font-medium">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentResults.map((r) => (
                                        <tr key={r.leadId} className="border-b">
                                            <td className="p-2 font-medium">{r.dispensaryName}</td>
                                            <td className="p-2 text-muted-foreground">{r.email}</td>
                                            <td className="p-2">
                                                <Badge variant="outline" className="text-xs">{r.templateId}</Badge>
                                            </td>
                                            <td className="p-2 text-center">
                                                {r.emailSent ? (
                                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Sent</Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="text-xs">{r.sendError || 'Failed'}</Badge>
                                                )}
                                            </td>
                                            <td className="p-2 text-right text-muted-foreground text-xs">
                                                {new Date(r.timestamp).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Mail className="h-8 w-8 mb-2 opacity-50" />
                            <p>No outreach activity yet. Click &ldquo;Send Test Batch&rdquo; to start.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Two-column: Queue + CRM */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Lead Queue */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5" />
                            Lead Queue
                        </CardTitle>
                        <CardDescription>{data?.queueDepth || 0} leads waiting for outreach</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data?.queueLeads && data.queueLeads.length > 0 ? (
                            <div className="space-y-2">
                                {data.queueLeads.map((lead) => (
                                    <div key={lead.id} className="flex items-center justify-between rounded-lg border p-3">
                                        <div>
                                            <div className="font-medium text-sm">{lead.dispensaryName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {lead.city} &middot; {lead.email ? 'Has email' : lead.contactFormUrl ? 'Has form' : 'No contact'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">{lead.source}</Badge>
                                            {lead.email ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                <Search className="h-8 w-8 mb-2 opacity-50" />
                                <p>Queue empty. Click &ldquo;Research New Leads&rdquo; to discover dispensaries.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* CRM Contacts */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            CRM Outreach Contacts
                        </CardTitle>
                        <CardDescription>{data?.crmContacts?.length || 0} contacts tracked</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data?.crmContacts && data.crmContacts.length > 0 ? (
                            <div className="space-y-2">
                                {data.crmContacts.map((contact) => (
                                    <div key={contact.id} className="flex items-center justify-between rounded-lg border p-3">
                                        <div>
                                            <div className="font-medium text-sm">{contact.dispensaryName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {contact.email} &middot; {contact.city}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={`text-xs ${
                                                    contact.status === 'contacted' ? 'border-green-300 text-green-700' :
                                                    contact.status === 'replied' ? 'border-blue-300 text-blue-700' :
                                                    contact.status === 'converted' ? 'border-purple-300 text-purple-700' :
                                                    'border-red-300 text-red-700'
                                                }`}
                                            >
                                                {contact.status}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                x{contact.outreachCount}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                <Users className="h-8 w-8 mb-2 opacity-50" />
                                <p>No CRM contacts yet. Run outreach to populate.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
