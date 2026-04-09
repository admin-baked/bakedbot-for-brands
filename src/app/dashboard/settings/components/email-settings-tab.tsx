'use client';

/**
 * Email Settings Tab
 *
 * Amazon SES is the primary sender for all email types (company + tenant wide).
 * Optional fallback channels:
 *  - Custom Sending Domain (SES) → tenant sends from their own domain
 *  - Google Workspace  → personal / transactional fallback
 *  - Mailjet           → bulk / marketing fallback (6k free/month)
 *
 * The dispatcher in lib/email/dispatcher.ts routes: SES → Workspace/Mailjet → Platform.
 */

import { useState, useEffect, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Mail, Zap, Check, AlertCircle, ExternalLink, RefreshCw,
    Send, Eye, EyeOff, ChevronDown, ChevronUp, ChevronsUpDown,
    TrendingUp, ShieldCheck, Cloud, Loader2, X,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    getWorkspaceStatus,
    getWorkspaceOAuthUrl,
    saveWorkspaceSendAs,
    selectSendAs,
    disconnectWorkspaceAction,
    getMailjetStatus,
    saveMailjetConfig,
    disconnectMailjet,
    sendTestEmail,
    getSesStatus,
    initiateSesVerification,
    refreshSesVerification,
    disconnectSes,
} from '@/server/actions/org-email-settings';
import { getMyWarmupStatus } from '@/server/actions/email-warmup';
import {
    saveCloudflareApiToken,
    getCloudflareStatus,
    applyEmailDnsRecords,
    applySesDnsRecords,
    disconnectCloudflareAction,
} from '@/server/actions/cloudflare-dns';
import type { DnsRecordStatus } from '@/server/actions/cloudflare-dns';
import { useUserRole } from '@/hooks/use-user-role';
import type { WarmupStatus } from '@/server/services/email-warmup-types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WorkspaceSendAsAlias } from '@/server/integrations/google-workspace/token-storage';
import { useToast } from '@/hooks/use-toast';

// ─────────────────────────────────────────────────────────────
// Google Workspace section
// ─────────────────────────────────────────────────────────────

function WorkspaceSection() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [connected, setConnected] = useState(false);
    const [sendAs, setSendAs] = useState('');
    const [aliases, setAliases] = useState<WorkspaceSendAsAlias[]>([]);
    const [editSendAs, setEditSendAs] = useState('');
    const [editingAlias, setEditingAlias] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const oauthSuccess = searchParams.get('success') === 'google_workspace_connected';
    const oauthError = searchParams.get('error');

    useEffect(() => {
        getWorkspaceStatus()
            .then((s) => {
                setConnected(s.connected);
                setSendAs(s.sendAs ?? '');
                setAliases(s.sendAsAliases ?? []);
                setEditSendAs(s.sendAs ?? '');
            })
            .catch(() => {
                // resolveOrgId may throw if no org context — show disconnected
            })
            .finally(() => setIsLoading(false));
    }, [oauthSuccess]);

    const handleConnect = async () => {
        try {
            const url = await getWorkspaceOAuthUrl('/dashboard/settings?tab=email');
            window.location.href = url;
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Could not start connection', description: err.message ?? 'Check your account has an org.' });
        }
    };

    const handleSelectAlias = (email: string) => {
        startTransition(async () => {
            const result = await selectSendAs(email);
            if (result.success) {
                setSendAs(email);
                toast({ title: 'Sending address updated', description: email });
            } else {
                toast({ variant: 'destructive', title: 'Failed to update', description: result.error });
            }
        });
    };

    const handleSaveSendAs = () => {
        startTransition(async () => {
            const result = await saveWorkspaceSendAs(editSendAs);
            if (result.success) {
                setSendAs(editSendAs);
                setEditingAlias(false);
                toast({ title: 'Send-as address saved' });
            } else {
                toast({ variant: 'destructive', title: 'Failed to save', description: result.error });
            }
        });
    };

    const handleDisconnect = () => {
        startTransition(async () => {
            await disconnectWorkspaceAction();
            setConnected(false);
            setSendAs('');
            toast({ title: 'Google Workspace disconnected' });
        });
    };

    const handleTest = () => {
        startTransition(async () => {
            const r = await sendTestEmail('workspace');
            toast(r.success
                ? { title: 'Test email sent', description: 'Check your inbox.' }
                : { variant: 'destructive', title: 'Test failed', description: r.error }
            );
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center border">
                            <Mail className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Google Workspace</CardTitle>
                            <CardDescription>Personalized 1:1 emails — welcome, follow-ups, manual outreach</CardDescription>
                        </div>
                    </div>
                    {connected ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            <Check className="h-3 w-3 mr-1" /> Connected
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-muted-foreground">Not connected</Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {oauthError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Connection failed: {oauthError === 'oauth_config_error' ? 'OAuth not configured — contact support.' : oauthError}</span>
                    </div>
                )}
                {oauthSuccess && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>
                            Google Workspace connected
                            {sendAs ? <> — sending as <strong>{sendAs}</strong></> : '. Set a send-as address below if needed.'}
                        </span>
                    </div>
                )}

                <div className="text-sm text-muted-foreground space-y-1.5">
                    <p className="font-medium text-foreground">Used for:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                        <li>Welcome emails to new customers</li>
                        <li>Personalized follow-up messages</li>
                        <li>1:1 manual outreach from agents</li>
                        <li>Order confirmation &amp; transactional updates</li>
                    </ul>
                </div>

                {connected && (
                    <div className="space-y-2 pt-1">
                        <Label className="text-sm">Sending from</Label>

                        {aliases.length > 1 ? (
                            // Multiple verified addresses — show a picker
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between h-9 font-normal" disabled={isPending}>
                                        <span className="truncate">{sendAs || 'Select address…'}</span>
                                        <ChevronsUpDown className="h-4 w-4 ml-2 flex-shrink-0 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-72">
                                    <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                                        Verified addresses on this account
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {aliases.map((alias) => (
                                        <DropdownMenuItem
                                            key={alias.email}
                                            onClick={() => handleSelectAlias(alias.email)}
                                            className="flex items-center justify-between gap-2"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{alias.email}</p>
                                                {alias.displayName && alias.displayName !== alias.email && (
                                                    <p className="text-xs text-muted-foreground truncate">{alias.displayName}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {alias.isPrimary && (
                                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">primary</span>
                                                )}
                                                {sendAs === alias.email && (
                                                    <Check className="h-3.5 w-3.5 text-primary" />
                                                )}
                                            </div>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            // Single address — just show it
                            <p className="text-sm font-medium">
                                {sendAs || <span className="text-muted-foreground italic">Not detected — reconnect</span>}
                            </p>
                        )}

                        <p className="text-xs text-muted-foreground">
                            {aliases.length > 1
                                ? 'Choose which verified address to use for outbound emails.'
                                : 'To add more addresses, set them up as "Send mail as" aliases in Gmail settings, then reconnect.'}
                        </p>
                    </div>
                )}
            </CardContent>

            <CardFooter className="border-t pt-4 gap-2">
                {isLoading ? (
                    <Button disabled variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Checking...</Button>
                ) : connected ? (
                    <>
                        <Button size="sm" variant="outline" onClick={handleTest} disabled={isPending || !sendAs}>
                            <Send className="h-4 w-4 mr-2" />Send test
                        </Button>
                        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={handleConnect} disabled={isPending}>
                            <RefreshCw className="h-4 w-4 mr-2" />Reconnect
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto" onClick={handleDisconnect} disabled={isPending}>
                            Disconnect
                        </Button>
                    </>
                ) : (
                    <Button size="sm" onClick={handleConnect} disabled={isPending}>
                        <ExternalLink className="h-4 w-4 mr-2" />Connect Google Workspace
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────
// Mailjet section
// ─────────────────────────────────────────────────────────────

function MailjetSection() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [connected, setConnected] = useState(false);
    const [fromEmail, setFromEmail] = useState('');
    const [fromName, setFromName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [newFromEmail, setNewFromEmail] = useState('');
    const [newFromName, setNewFromName] = useState('');
    const [showSecret, setShowSecret] = useState(false);

    useEffect(() => {
        getMailjetStatus().then((s) => {
            setConnected(s.connected);
            setFromEmail(s.fromEmail ?? '');
            setFromName(s.fromName ?? '');
            setNewFromEmail(s.fromEmail ?? '');
            setNewFromName(s.fromName ?? '');
            setIsLoading(false);
        });
    }, []);

    const handleSave = () => {
        startTransition(async () => {
            const result = await saveMailjetConfig({ apiKey, secretKey, fromEmail: newFromEmail, fromName: newFromName });
            if (result.success) {
                setConnected(true);
                setFromEmail(newFromEmail);
                setFromName(newFromName);
                setApiKey('');
                setSecretKey('');
                setShowForm(false);
                toast({ title: 'Mailjet configured' });
            } else {
                toast({ variant: 'destructive', title: 'Configuration failed', description: result.error });
            }
        });
    };

    const handleDisconnect = () => {
        startTransition(async () => {
            await disconnectMailjet();
            setConnected(false);
            setFromEmail('');
            setFromName('');
            toast({ title: 'Mailjet disconnected' });
        });
    };

    const handleTest = () => {
        startTransition(async () => {
            const r = await sendTestEmail('mailjet');
            toast(r.success
                ? { title: 'Test email sent', description: 'Check your inbox.' }
                : { variant: 'destructive', title: 'Test failed', description: r.error }
            );
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center border">
                            <Zap className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Mailjet</CardTitle>
                            <CardDescription>Bulk &amp; marketing emails — newsletters, campaigns, win-back sequences</CardDescription>
                        </div>
                    </div>
                    {connected ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            <Check className="h-3 w-3 mr-1" /> Active
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-muted-foreground">Not configured</Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-1.5">
                    <p className="font-medium text-foreground">Used for:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                        <li>Weekly newsletters to your customer list</li>
                        <li>Campaign blasts (Craig agent)</li>
                        <li>Win-back &amp; loyalty reward sequences</li>
                        <li>Birthday &amp; anniversary promotions</li>
                    </ul>
                </div>

                {connected && !showForm && (
                    <div className="flex flex-col gap-1 text-sm pt-1">
                        <span className="text-muted-foreground">Sending from:</span>
                        <span className="font-medium">{fromName} &lt;{fromEmail}&gt;</span>
                    </div>
                )}

                {showForm && (
                    <div className="space-y-3 pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                            Enter your Mailjet API credentials. Find them at{' '}
                            <a href="https://app.mailjet.com/account/apikeys" target="_blank" rel="noopener noreferrer" className="underline">
                                app.mailjet.com/account/apikeys
                            </a>.
                        </p>
                        <div className="space-y-1">
                            <Label className="text-xs">API Key</Label>
                            <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••••••••••" className="h-9 font-mono text-sm" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Secret Key</Label>
                            <div className="relative">
                                <Input
                                    type={showSecret ? 'text' : 'password'}
                                    value={secretKey}
                                    onChange={(e) => setSecretKey(e.target.value)}
                                    placeholder="••••••••••••••••"
                                    className="h-9 font-mono text-sm pr-9"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSecret((p) => !p)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-1">
                            <Label className="text-xs">From Email</Label>
                            <Input value={newFromEmail} onChange={(e) => setNewFromEmail(e.target.value)} placeholder="marketing@yourdomain.com" className="h-9" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">From Name</Label>
                            <Input value={newFromName} onChange={(e) => setNewFromName(e.target.value)} placeholder="Thrive Syracuse" className="h-9" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            The from email must be a verified sender in your Mailjet account.
                        </p>
                    </div>
                )}
            </CardContent>

            <CardFooter className="border-t pt-4 gap-2">
                {isLoading ? (
                    <Button disabled variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Checking...</Button>
                ) : showForm ? (
                    <>
                        <Button size="sm" onClick={handleSave} disabled={isPending || !apiKey || !secretKey || !newFromEmail}>
                            {isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                            Save credentials
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} disabled={isPending}>Cancel</Button>
                    </>
                ) : connected ? (
                    <>
                        <Button size="sm" variant="outline" onClick={handleTest} disabled={isPending}>
                            <Send className="h-4 w-4 mr-2" />Send test
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowForm(true)} disabled={isPending}>Update credentials</Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto" onClick={handleDisconnect} disabled={isPending}>
                            Disconnect
                        </Button>
                    </>
                ) : (
                    <Button size="sm" onClick={() => setShowForm(true)}>Configure Mailjet</Button>
                )}
            </CardFooter>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────
// Warmup callout — shown below Mailjet when connected
// ─────────────────────────────────────────────────────────────

function WarmupCallout({ orgId }: { orgId: string | null }) {
    const [status, setStatus] = useState<WarmupStatus | null>(null);

    useEffect(() => {
        if (!orgId) return;
        getMyWarmupStatus(orgId).then(setStatus);
    }, [orgId]);

    if (!orgId || status === null) return null;

    if (status.active) {
        const limitDisplay = status.dailyLimit === Infinity ? 'Unlimited' : status.dailyLimit?.toLocaleString();
        return (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-200 text-sm">
                <TrendingUp className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-purple-900">
                        Warm-up active — Day {status.currentDay}/{28} · {limitDisplay}/day limit
                    </p>
                    <p className="text-purple-700 text-xs mt-0.5">
                        {status.sentToday?.toLocaleString() ?? 0} sent today.
                        Campaigns over the limit are automatically deferred.
                    </p>
                </div>
                <Button size="sm" variant="outline" className="flex-shrink-0 border-purple-300 text-purple-700 hover:bg-purple-100" asChild>
                    <Link href="/dashboard/settings/email-warmup">View</Link>
                </Button>
            </div>
        );
    }

    // Not active — prompt to start
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-900">Start email warm-up before your first campaign</p>
                <p className="text-amber-700 text-xs mt-0.5">
                    New sending domains need a 28-day ramp to avoid spam filters.
                    Sending cold risks your domain reputation.
                </p>
            </div>
            <Button size="sm" className="flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white" asChild>
                <Link href="/dashboard/settings/email-warmup">Start warm-up</Link>
            </Button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Cloudflare DNS connector — shown below Workspace when connected
// ─────────────────────────────────────────────────────────────

function recordLabel(name: string): string {
    if (name.startsWith('_dmarc')) return 'DMARC';
    if (name.includes('._domainkey')) return 'DKIM';
    return 'SPF';
}

function statusBadge(status: DnsRecordStatus['status']) {
    if (status === 'present') {
        return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full"><Check className="h-3 w-3" />OK</span>;
    }
    if (status === 'missing') {
        return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full"><AlertCircle className="h-3 w-3" />Missing</span>;
    }
    return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full"><X className="h-3 w-3" />Conflict</span>;
}

function CloudflareDnsSection() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [cfConnected, setCfConnected] = useState(false);
    const [zoneName, setZoneName] = useState('');
    const [records, setRecords] = useState<DnsRecordStatus[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showTokenForm, setShowTokenForm] = useState(false);
    const [apiToken, setApiToken] = useState('');
    const [manualDomain, setManualDomain] = useState('');

    const allPresent = records?.every(r => r.status === 'present') ?? false;

    useEffect(() => {
        getCloudflareStatus().then((s) => {
            setCfConnected(s.connected);
            setZoneName(s.zoneName ?? '');
            setRecords(s.records ?? null);
            setIsLoading(false);
        });
    }, []);

    const handleSaveToken = () => {
        startTransition(async () => {
            const result = await saveCloudflareApiToken(apiToken, manualDomain || undefined);
            if (result.success) {
                setCfConnected(true);
                setZoneName(result.zoneName ?? '');
                setApiToken('');
                setManualDomain('');
                setShowTokenForm(false);
                toast({ title: 'Cloudflare connected', description: result.zoneName ? `Zone: ${result.zoneName}` : 'Token saved' });
                const s = await getCloudflareStatus();
                setRecords(s.records ?? null);
                setZoneName(s.zoneName ?? '');
            } else {
                toast({ variant: 'destructive', title: 'Connection failed', description: result.error });
            }
        });
    };

    const handleApply = () => {
        startTransition(async () => {
            const result = await applyEmailDnsRecords();
            if (result.success) {
                toast({
                    title: 'DNS records applied',
                    description: result.results?.map(r => `${r.name}: ${r.action}`).join(' · '),
                });
                const s = await getCloudflareStatus();
                setRecords(s.records ?? null);
            } else {
                toast({ variant: 'destructive', title: 'Failed to apply records', description: result.error });
            }
        });
    };

    const handleDisconnect = () => {
        startTransition(async () => {
            await disconnectCloudflareAction();
            setCfConnected(false);
            setZoneName('');
            setRecords(null);
            toast({ title: 'Cloudflare disconnected' });
        });
    };

    if (isLoading) return null;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center border">
                            <Cloud className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Cloudflare DNS</CardTitle>
                            <CardDescription>Auto-create SPF, DKIM &amp; DMARC records for {zoneName || 'your domain'}</CardDescription>
                        </div>
                    </div>
                    {cfConnected ? (
                        allPresent
                            ? <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><Check className="h-3 w-3 mr-1" />All records set</Badge>
                            : <Badge className="bg-amber-100 text-amber-800 border-amber-200"><AlertCircle className="h-3 w-3 mr-1" />Records needed</Badge>
                    ) : (
                        <Badge variant="outline" className="text-muted-foreground">Not connected</Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {!cfConnected && !showTokenForm && (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Connect your Cloudflare account to automatically create email DNS records.
                            Without SPF, DKIM, and DMARC, your emails will land in spam.
                        </p>
                        <div className="rounded-lg bg-muted/50 border p-3 space-y-2 text-xs text-muted-foreground">
                            <p className="font-medium text-foreground text-sm">How it works</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Click <strong>Connect Cloudflare</strong> below</li>
                                <li>Create an API token in your Cloudflare dashboard (we&apos;ll link you there)</li>
                                <li>Paste the token here &mdash; we auto-detect your zone</li>
                                <li>Click <strong>Apply Records</strong> to create all DNS entries instantly</li>
                            </ol>
                        </div>
                    </div>
                )}

                {showTokenForm && (
                    <div className="space-y-4 border-t pt-3">
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-2">
                            <p className="text-sm font-medium text-blue-900">Step 1: Create an API Token</p>
                            <ol className="list-decimal list-inside space-y-1 text-xs text-blue-800">
                                <li>
                                    Open{' '}
                                    <a
                                        href="https://dash.cloudflare.com/profile/api-tokens"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline font-medium inline-flex items-center gap-0.5"
                                    >
                                        Cloudflare API Tokens<ExternalLink className="h-3 w-3" />
                                    </a>
                                </li>
                                <li>Click <strong>Create Token</strong></li>
                                <li>Use the <strong>&quot;Edit zone DNS&quot;</strong> template</li>
                                <li>Under <strong>Zone Resources</strong>, select your domain</li>
                                <li>Click <strong>Continue to summary</strong> then <strong>Create Token</strong></li>
                                <li>Copy the token and paste it below</li>
                            </ol>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm font-medium">Step 2: Paste your token</p>
                            <div className="space-y-1">
                                <Label className="text-xs">API Token</Label>
                                <Input
                                    value={apiToken}
                                    onChange={(e) => setApiToken(e.target.value)}
                                    placeholder="Paste your Cloudflare API token"
                                    className="h-9 font-mono text-sm"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Domain <span className="text-muted-foreground font-normal">(optional &mdash; auto-detected if blank)</span></Label>
                                <Input
                                    value={manualDomain}
                                    onChange={(e) => setManualDomain(e.target.value)}
                                    placeholder="e.g. ecstaticedibles.com"
                                    className="h-9 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {cfConnected && records && (
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">DNS record status on {zoneName}</p>
                        <div className="rounded-lg border overflow-hidden text-xs">
                            {records.map((rec) => (
                                <div key={rec.name} className="flex items-center justify-between px-3 py-2.5 border-b last:border-0 gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-foreground">{recordLabel(rec.name)}</span>
                                            <span className="text-muted-foreground font-mono truncate">{rec.name}</span>
                                        </div>
                                        {rec.status === 'conflict' && rec.currentContent && (
                                            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
                                                Current: {rec.currentContent}
                                            </p>
                                        )}
                                    </div>
                                    {statusBadge(rec.status)}
                                </div>
                            ))}
                        </div>
                        {!allPresent && (
                            <p className="text-xs text-muted-foreground">
                                Click <strong>Apply Records</strong> to create or update missing records automatically.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>

            <CardFooter className="border-t pt-4 gap-2">
                {showTokenForm ? (
                    <>
                        <Button size="sm" onClick={handleSaveToken} disabled={isPending || !apiToken}>
                            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                            Connect
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowTokenForm(false)} disabled={isPending}>Cancel</Button>
                    </>
                ) : cfConnected ? (
                    <>
                        {!allPresent && (
                            <Button size="sm" onClick={handleApply} disabled={isPending}>
                                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                Apply records
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => startTransition(async () => {
                            const s = await getCloudflareStatus();
                            setRecords(s.records ?? null);
                            setZoneName(s.zoneName ?? '');
                        })} disabled={isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}Refresh
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto" onClick={handleDisconnect} disabled={isPending}>
                            Disconnect
                        </Button>
                    </>
                ) : (
                    <Button size="sm" onClick={() => setShowTokenForm(true)}>
                        <Cloud className="h-4 w-4 mr-2" />Connect Cloudflare
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────
// Amazon SES — custom sending domain verification
// ─────────────────────────────────────────────────────────────

function SesDomainSection() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [sesStatus, setSesStatus] = useState<{
        configured: boolean; domain: string | null; fromEmail: string | null; fromName: string | null;
        verificationStatus: string | null; dkimStatus: string | null;
        dnsRecords: Array<{ type: string; name: string; value: string; purpose: string }>;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showSetup, setShowSetup] = useState(false);
    const [domain, setDomain] = useState('');
    const [fromEmail, setFromEmail] = useState('');
    const [fromName, setFromName] = useState('');
    const [showDns, setShowDns] = useState(false);

    useEffect(() => {
        getSesStatus().then((s) => {
            setSesStatus(s);
            setIsLoading(false);
        });
    }, []);

    const isVerified = sesStatus?.verificationStatus === 'Success' && sesStatus?.dkimStatus === 'Success';
    const isPendingVerification = sesStatus?.configured && !isVerified;

    const handleInitiate = () => {
        if (!domain || !fromEmail || !fromName) {
            toast({ variant: 'destructive', title: 'All fields required' });
            return;
        }
        startTransition(async () => {
            const result = await initiateSesVerification(domain, fromEmail, fromName);
            if (result.success) {
                toast({ title: 'Domain verification started', description: 'Add the DNS records below to verify your domain.' });
                const s = await getSesStatus();
                setSesStatus(s);
                setShowSetup(false);
                setShowDns(true);
            } else {
                toast({ variant: 'destructive', title: 'Verification failed', description: result.error });
            }
        });
    };

    const handleRefresh = () => {
        startTransition(async () => {
            const result = await refreshSesVerification();
            if (result.success) {
                const s = await getSesStatus();
                setSesStatus(s);
                const verified = result.verificationStatus === 'Success' && result.dkimStatus === 'Success';
                toast({
                    title: verified ? 'Domain verified!' : 'Verification in progress',
                    description: `Domain: ${result.verificationStatus}, DKIM: ${result.dkimStatus}`,
                });
            } else {
                toast({ variant: 'destructive', title: 'Refresh failed', description: result.error });
            }
        });
    };

    const handleApplyCloudflare = () => {
        startTransition(async () => {
            const result = await applySesDnsRecords();
            if (result.success) {
                toast({ title: 'SES DNS records applied via Cloudflare', description: `${result.results?.length} records created/updated` });
                handleRefresh();
            } else {
                toast({ variant: 'destructive', title: 'Failed to apply DNS', description: result.error });
            }
        });
    };

    const handleSendTest = () => {
        startTransition(async () => {
            const result = await sendTestEmail('ses');
            toast(result.success
                ? { title: 'Test email sent via SES' }
                : { variant: 'destructive', title: 'Test failed', description: result.error });
        });
    };

    const handleDisconnect = () => {
        startTransition(async () => {
            await disconnectSes();
            setSesStatus({ configured: false, domain: null, fromEmail: null, fromName: null, verificationStatus: null, dkimStatus: null, dnsRecords: [] });
            toast({ title: 'SES domain disconnected' });
        });
    };

    if (isLoading) return null;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-orange-500" />
                        <CardTitle className="text-base">Custom Sending Domain (SES)</CardTitle>
                    </div>
                    {isVerified && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Verified</Badge>}
                    {isPendingVerification && <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>}
                    {!sesStatus?.configured && <Badge variant="outline">Not configured</Badge>}
                </div>
                <CardDescription>
                    Send emails from your own domain (e.g., hello@yourdispensary.com) instead of @bakedbot.ai.
                    {sesStatus?.configured && sesStatus.domain && (
                        <span className="block mt-1 font-medium text-foreground">
                            Domain: {sesStatus.domain} — From: {sesStatus.fromEmail}
                        </span>
                    )}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Setup form */}
                {(showSetup || !sesStatus?.configured) && !sesStatus?.configured && (
                    <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
                        <div className="space-y-2">
                            <Label htmlFor="ses-domain">Sending Domain</Label>
                            <Input id="ses-domain" placeholder="yourdispensary.com" value={domain} onChange={(e) => {
                                setDomain(e.target.value);
                                if (!fromEmail && e.target.value.includes('.')) {
                                    setFromEmail(`hello@${e.target.value}`);
                                }
                            }} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ses-from-email">From Email</Label>
                            <Input id="ses-from-email" placeholder="hello@yourdispensary.com" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ses-from-name">From Name</Label>
                            <Input id="ses-from-name" placeholder="Your Dispensary" value={fromName} onChange={(e) => setFromName(e.target.value)} />
                        </div>
                        <Button size="sm" onClick={handleInitiate} disabled={isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                            Verify Domain
                        </Button>
                    </div>
                )}

                {/* DNS records display */}
                {sesStatus?.configured && sesStatus.dnsRecords.length > 0 && (
                    <div className="space-y-2">
                        <button
                            className="text-sm font-medium flex items-center gap-1 hover:underline"
                            onClick={() => setShowDns(!showDns)}
                        >
                            {showDns ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            DNS Records ({sesStatus.dnsRecords.length})
                        </button>
                        {showDns && (
                            <div className="rounded-lg border overflow-hidden text-xs">
                                <div className="grid grid-cols-[60px_1fr_1fr_80px] bg-muted px-3 py-2 font-medium">
                                    <span>Type</span>
                                    <span>Name</span>
                                    <span>Value</span>
                                    <span>Purpose</span>
                                </div>
                                {sesStatus.dnsRecords.map((rec, i) => (
                                    <div key={i} className="grid grid-cols-[60px_1fr_1fr_80px] px-3 py-1.5 border-t">
                                        <span className="font-mono font-medium">{rec.type}</span>
                                        <span className="truncate text-muted-foreground font-mono" title={rec.name}>{rec.name}</span>
                                        <span className="truncate text-muted-foreground font-mono" title={rec.value}>{rec.value}</span>
                                        <span className="capitalize">{rec.purpose}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Status display */}
                {isPendingVerification && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-amber-800">DNS records need to be added</p>
                            <p className="text-amber-700 mt-0.5">
                                Add the records above to your domain&apos;s DNS. If your DNS is on Cloudflare (connected above), click &quot;Apply via Cloudflare&quot; to auto-create them.
                                After adding, click Refresh to check status.
                            </p>
                            <p className="text-amber-600 mt-1 text-xs">
                                Domain: {sesStatus?.verificationStatus ?? 'Pending'} · DKIM: {sesStatus?.dkimStatus ?? 'Pending'}
                            </p>
                        </div>
                    </div>
                )}

                {isVerified && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-800">Domain verified. Emails send as <strong>{sesStatus?.fromEmail}</strong>.</span>
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex gap-2 flex-wrap">
                {sesStatus?.configured && (
                    <>
                        {isPendingVerification && (
                            <Button size="sm" variant="outline" onClick={handleApplyCloudflare} disabled={isPending}>
                                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Cloud className="h-4 w-4 mr-2" />}
                                Apply via Cloudflare
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            Refresh
                        </Button>
                        {isVerified && (
                            <Button size="sm" variant="outline" onClick={handleSendTest} disabled={isPending}>
                                <Send className="h-4 w-4 mr-2" />Test
                            </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto" onClick={handleDisconnect} disabled={isPending}>
                            Disconnect
                        </Button>
                    </>
                )}
            </CardFooter>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────
// Routing reference
// ─────────────────────────────────────────────────────────────

function RoutingReferenceCard() {
    const [open, setOpen] = useState(false);

    return (
        <Card className="border-dashed">
            <button
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-muted/40 transition-colors rounded-lg"
                onClick={() => setOpen((p) => !p)}
            >
                <span className="font-medium">How email routing works</span>
                {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {open && (
                <div className="px-4 pb-4 text-sm space-y-3">
                    <p className="text-muted-foreground">The dispatcher automatically picks the right sender based on email type:</p>
                    <div className="rounded-lg border overflow-hidden text-xs">
                        <div className="grid grid-cols-3 bg-muted px-3 py-2 font-medium">
                            <span>Email type</span>
                            <span>Channel</span>
                            <span>Fallback</span>
                        </div>
                        {[
                            ['Campaign blast', 'Amazon SES', 'Mailjet (org) → Platform'],
                            ['Win-back / birthday', 'Amazon SES', 'Mailjet (org) → Platform'],
                            ['Loyalty rewards', 'Amazon SES', 'Mailjet (org) → Platform'],
                            ['Welcome email', 'Amazon SES', 'Workspace → Platform'],
                            ['Follow-up / manual', 'Amazon SES', 'Workspace → Platform'],
                            ['Order confirmation', 'Amazon SES', 'Workspace → Platform'],
                        ].map(([type, channel, fallback]) => (
                            <div key={type} className="grid grid-cols-3 px-3 py-1.5 border-t">
                                <span className="text-muted-foreground">{type}</span>
                                <span className="font-medium">{channel}</span>
                                <span className="text-muted-foreground">{fallback}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────────────────────

export function EmailSettingsTab() {
    const { orgId } = useUserRole();
    const [mailjetConnected, setMailjetConnected] = useState(false);

    useEffect(() => {
        getMailjetStatus().then((s) => setMailjetConnected(s.connected));
    }, []);

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold">Email Channels</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Amazon SES is your primary sender. Connect optional channels for fallback or free-tier volume.
                </p>
            </div>

            <WorkspaceSection />
            {/* CloudflareDnsSection is self-contained — shows "connect" prompt if no zone found */}
            <CloudflareDnsSection />

            <Separator />

            <SesDomainSection />

            <MailjetSection />
            {mailjetConnected && <WarmupCallout orgId={orgId} />}

            <RoutingReferenceCard />
        </div>
    );
}
