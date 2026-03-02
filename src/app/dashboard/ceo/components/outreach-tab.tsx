'use client';

/**
 * CEO Outreach Tab — NY Dispensary Outreach Command Center
 *
 * Draft-first approval flow:
 * - Pipeline status (queue depth, daily limit, pending drafts)
 * - "Generate Drafts" button (creates email previews for approval)
 * - Pending drafts section with Approve/Edit/Reject per draft
 * - Gmail connection status indicator
 * - "Send Test Batch" button (all 10 templates to internal recipients)
 * - Lead queue + CRM contact tables
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    Loader2, Mail, Search, Play, TestTube2, RefreshCcw, Users,
    AlertTriangle, CheckCircle2, XCircle, FileText, Send,
    Pencil, ChevronDown, ChevronUp, Link2,
} from 'lucide-react';
import {
    getOutreachDashboardData,
    generateOutreachDrafts,
    getOutreachDrafts,
    updateOutreachDraft,
    approveAndSendDraft,
    approveAndSendAllDrafts,
    rejectDraft,
    triggerTestBatch,
    triggerContactResearch,
    checkGmailConnection,
} from '@/server/actions/ny-outreach-dashboard';
import type { OutreachDraft } from '@/server/services/ny-outreach/outreach-service';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

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
    pendingDrafts: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Draft Card (per-draft approve/edit/reject)
// ────────────────────────────────────────────────────────────────────────────

function DraftCard({
    draft,
    onAction,
}: {
    draft: OutreachDraft;
    onAction: () => void;
}) {
    const [status, setStatus] = useState<'idle' | 'approving' | 'rejecting' | 'saving' | 'sent' | 'rejected' | 'failed'>(
        draft.status === 'sent' ? 'sent' : draft.status === 'rejected' ? 'rejected' : 'idle'
    );
    const [editing, setEditing] = useState(false);
    const [editSubject, setEditSubject] = useState(draft.subject);
    const [editBody, setEditBody] = useState(draft.textBody);
    const [bodyOpen, setBodyOpen] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string>();

    async function handleApprove() {
        setStatus('approving');
        setErrorMsg(undefined);
        try {
            const result = await approveAndSendDraft(draft.id);
            if (result.success) {
                setStatus('sent');
                onAction();
            } else {
                setStatus('failed');
                setErrorMsg(result.error || 'Send failed');
            }
        } catch (e) {
            setStatus('failed');
            setErrorMsg((e as Error).message);
        }
    }

    async function handleReject() {
        setStatus('rejecting');
        setErrorMsg(undefined);
        try {
            const result = await rejectDraft(draft.id);
            if (result.success) {
                setStatus('rejected');
                onAction();
            } else {
                setErrorMsg(result.error || 'Reject failed');
                setStatus('idle');
            }
        } catch (e) {
            setErrorMsg((e as Error).message);
            setStatus('idle');
        }
    }

    async function handleSaveEdit() {
        setStatus('saving');
        setErrorMsg(undefined);
        try {
            const result = await updateOutreachDraft(draft.id, {
                subject: editSubject,
                textBody: editBody,
            });
            if (result.success) {
                setEditing(false);
                setStatus('idle');
            } else {
                setErrorMsg(result.error || 'Save failed');
                setStatus('idle');
            }
        } catch (e) {
            setErrorMsg((e as Error).message);
            setStatus('idle');
        }
    }

    if (status === 'sent') {
        return (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium text-sm">Sent via Gmail</span>
                    <span className="text-xs text-green-600 ml-auto">{draft.dispensaryName}</span>
                </div>
            </div>
        );
    }

    if (status === 'rejected') {
        return (
            <div className="rounded-lg border p-4 opacity-60">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium text-sm">Rejected</span>
                    <span className="text-xs ml-auto">{draft.dispensaryName}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border p-4 space-y-3">
            {/* Draft header */}
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-medium text-sm">{draft.dispensaryName}</p>
                    <p className="text-xs text-muted-foreground">{draft.email} &middot; {draft.city}, {draft.state}</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-xs">{draft.templateId.replace(/-/g, ' ')}</Badge>
                    {draft.emailVerified ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                </div>
            </div>

            {/* Subject */}
            {editing ? (
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Subject</label>
                    <Input
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        className="h-8 text-sm"
                    />
                </div>
            ) : (
                <div className="px-3 py-2 rounded-md bg-muted text-sm">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Subject: </span>
                    {editSubject}
                </div>
            )}

            {/* Body */}
            {editing ? (
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Email body</label>
                    <Textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={8}
                        className="text-sm"
                    />
                </div>
            ) : (
                <div>
                    <button
                        className="flex w-full items-center justify-between px-3 py-2 rounded-md bg-muted text-sm hover:bg-muted/80 transition-colors"
                        onClick={() => setBodyOpen((v) => !v)}
                    >
                        <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium">
                            Email body
                        </span>
                        {bodyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {bodyOpen && (
                        draft.htmlBody ? (
                            <div
                                className="mt-1 px-3 py-2 rounded-md bg-muted/50 text-sm max-h-60 overflow-y-auto prose prose-sm"
                                dangerouslySetInnerHTML={{ __html: draft.htmlBody }}
                            />
                        ) : (
                            <div className="mt-1 px-3 py-2 rounded-md bg-muted/50 text-sm whitespace-pre-wrap text-muted-foreground max-h-60 overflow-y-auto">
                                {editBody}
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Error */}
            {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

            {/* Action buttons */}
            {editing ? (
                <div className="flex gap-2">
                    <Button size="sm" className="gap-1.5 text-xs h-8" onClick={handleSaveEdit} disabled={status === 'saving'}>
                        {status === 'saving' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Save
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => { setEditing(false); setEditSubject(draft.subject); setEditBody(draft.textBody); }}>
                        Cancel
                    </Button>
                </div>
            ) : (status === 'idle' || status === 'failed') ? (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700"
                        onClick={handleApprove}
                    >
                        <Send className="h-3 w-3" />
                        Approve &amp; Send
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => setEditing(true)}
                    >
                        <Pencil className="h-3 w-3" />
                        Edit
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleReject}
                    >
                        <XCircle className="h-3 w-3" />
                        Reject
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-2 py-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {status === 'approving' ? 'Sending via Gmail…' : 'Rejecting…'}
                </div>
            )}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────

export default function OutreachTab() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Drafts state
    const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
    const [draftsLoading, setDraftsLoading] = useState(false);

    // Gmail status
    const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
    const [gmailEmail, setGmailEmail] = useState<string>();

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [dashResult, gmailResult] = await Promise.all([
                getOutreachDashboardData(),
                checkGmailConnection(),
            ]);
            if (dashResult.success && dashResult.data) {
                setData(dashResult.data as DashboardData);
            }
            setGmailConnected(gmailResult.connected ?? false);
            setGmailEmail(gmailResult.email);
        } catch (err) {
            setActionResult({ type: 'error', message: `Failed to load data: ${String(err)}` });
        } finally {
            setLoading(false);
        }
    }, []);

    const loadDrafts = useCallback(async () => {
        try {
            setDraftsLoading(true);
            const result = await getOutreachDrafts('draft');
            if (result.success && result.drafts) {
                setDrafts(result.drafts as OutreachDraft[]);
            }
        } catch {
            // Silently fail — drafts are non-critical
        } finally {
            setDraftsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        loadDrafts();
    }, [loadData, loadDrafts]);

    const handleGenerateDrafts = async () => {
        setActionLoading('drafts');
        setActionResult(null);
        try {
            const result = await generateOutreachDrafts();
            if (result.success) {
                setActionResult({
                    type: 'success',
                    message: `Generated ${result.draftsCreated || 0} drafts — review below`,
                });
                await Promise.all([loadData(), loadDrafts()]);
            } else {
                setActionResult({ type: 'error', message: result.error || 'Draft generation failed' });
            }
        } catch (err) {
            setActionResult({ type: 'error', message: String(err) });
        } finally {
            setActionLoading(null);
        }
    };

    const handleApproveAll = async () => {
        setActionLoading('approveAll');
        setActionResult(null);
        try {
            const result = await approveAndSendAllDrafts();
            if (result.success) {
                setActionResult({
                    type: 'success',
                    message: `Sent ${result.sent || 0} emails via Gmail, ${result.failed || 0} failed`,
                });
                await Promise.all([loadData(), loadDrafts()]);
            } else {
                setActionResult({ type: 'error', message: result.error || 'Batch send failed' });
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
    const pendingDrafts = data?.pendingDrafts || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">NY Dispensary Outreach</h2>
                    <p className="text-muted-foreground">Draft-first approval flow — preview and edit before sending</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { loadData(); loadDrafts(); }} disabled={!!actionLoading}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Gmail Connection Status */}
            {gmailConnected !== null && (
                <div className={`flex items-center gap-2 rounded-lg border p-3 ${
                    gmailConnected
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}>
                    <Mail className="h-4 w-4" />
                    {gmailConnected ? (
                        <span className="text-sm">
                            Gmail connected — emails will send from <strong>{gmailEmail || 'your account'}</strong>
                        </span>
                    ) : (
                        <>
                            <span className="text-sm flex-1">
                                Connect Gmail to send outreach from your account
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-amber-300"
                                onClick={() => window.location.href = '/dashboard/settings?tab=integrations'}
                            >
                                <Link2 className="h-3 w-3" />
                                Connect Gmail
                            </Button>
                        </>
                    )}
                </div>
            )}

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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <Card>
                    <CardContent className="pt-4 pb-3 px-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{stats?.totalSent || 0}</div>
                        <div className="text-xs text-muted-foreground">Emails Sent (24h)</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3 px-4 text-center">
                        <div className={`text-2xl font-bold ${pendingDrafts > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                            {pendingDrafts}
                        </div>
                        <div className="text-xs text-muted-foreground">Pending Drafts</div>
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
                    onClick={handleGenerateDrafts}
                    disabled={!!actionLoading || remaining === 0}
                    className="bg-green-600 hover:bg-green-700"
                >
                    {actionLoading === 'drafts' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <FileText className="h-4 w-4 mr-2" />
                    )}
                    Generate Drafts ({remaining} remaining)
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

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Pending Drafts for Review                                         */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Pending Drafts for Review
                        {drafts.length > 0 && (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 ml-2">
                                {drafts.length}
                            </Badge>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Review, edit, and approve email drafts before sending via Gmail
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {draftsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : drafts.length > 0 ? (
                        <div className="space-y-4">
                            {/* Bulk approve bar */}
                            <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/50 border">
                                <span className="text-sm text-muted-foreground flex-1">
                                    {drafts.length} draft{drafts.length !== 1 ? 's' : ''} awaiting approval
                                </span>
                                <Button
                                    size="sm"
                                    className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700"
                                    onClick={handleApproveAll}
                                    disabled={!!actionLoading || !gmailConnected}
                                >
                                    {actionLoading === 'approveAll' ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Send className="h-3 w-3" />
                                    )}
                                    Approve &amp; Send All ({drafts.length})
                                </Button>
                            </div>

                            {/* Individual draft cards */}
                            {drafts.map((draft) => (
                                <DraftCard
                                    key={draft.id}
                                    draft={draft}
                                    onAction={() => { loadData(); loadDrafts(); }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <FileText className="h-8 w-8 mb-2 opacity-50" />
                            <p>No pending drafts. Click &ldquo;Generate Drafts&rdquo; to create email previews.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

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
