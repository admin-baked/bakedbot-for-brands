'use client';

/**
 * Domain Settings Tab
 *
 * Allows brands and dispensaries to connect custom domains to their BakedBot menu.
 * Supports two connection methods:
 * - CNAME: For subdomains (e.g., shop.mybrand.com)
 * - Nameserver: For full domains (e.g., mybrandmenu.com)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    Copy,
    RefreshCw,
    Trash2,
    Globe,
    Server,
    ExternalLink,
    ShieldCheck,
    Clock,
    XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import {
    addCustomDomain,
    verifyCustomDomain,
    removeCustomDomain,
    getDomainStatus,
} from '@/server/actions/domain-management';
import type { CustomDomainConfig, DomainConnectionType } from '@/types/tenant';
import { BAKEDBOT_CNAME_TARGET, BAKEDBOT_NAMESERVERS, getDNSInstructions } from '@/lib/dns-utils';

export default function DomainSettingsTab() {
    const { toast } = useToast();
    const { orgId: tenantId } = useUserRole();

    // State
    const [domain, setDomain] = useState('');
    const [connectionType, setConnectionType] = useState<DomainConnectionType>('cname');
    const [domainConfig, setDomainConfig] = useState<CustomDomainConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    // Load existing domain config on mount
    useEffect(() => {
        async function loadDomainStatus() {
            if (!tenantId) return;

            setIsLoading(true);
            try {
                const result = await getDomainStatus(tenantId);
                if (result.success && result.config) {
                    setDomainConfig(result.config);
                    setDomain(result.config.domain);
                    setConnectionType(result.config.connectionType);
                }
            } catch (error) {
                console.error('Failed to load domain status:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadDomainStatus();
    }, [tenantId]);

    // Add domain handler
    const handleAddDomain = async () => {
        if (!tenantId || !domain.trim()) return;

        setIsSaving(true);
        try {
            const result = await addCustomDomain(tenantId, domain.trim(), connectionType);

            if (result.success && result.config) {
                // Cast to full config - timestamps will be populated when we re-fetch from Firestore
                setDomainConfig(result.config as CustomDomainConfig);
                toast({ title: 'Domain added', description: 'Follow the DNS instructions below to verify.' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to add domain.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add domain.' });
        } finally {
            setIsSaving(false);
        }
    };

    // Verify domain handler
    const handleVerify = async () => {
        if (!tenantId) return;

        setIsVerifying(true);
        try {
            const result = await verifyCustomDomain(tenantId);

            if (result.success) {
                // Reload config to get updated status
                const statusResult = await getDomainStatus(tenantId);
                if (statusResult.config) {
                    setDomainConfig(statusResult.config);
                }
                toast({ title: 'Domain verified!', description: 'Your custom domain is now active.' });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Verification failed',
                    description: result.error || 'DNS records not found. Please check your configuration.',
                });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Verification failed.' });
        } finally {
            setIsVerifying(false);
        }
    };

    // Remove domain handler
    const handleRemove = async () => {
        if (!tenantId) return;

        if (!confirm('Are you sure you want to remove this custom domain?')) return;

        setIsRemoving(true);
        try {
            const result = await removeCustomDomain(tenantId);

            if (result.success) {
                setDomainConfig(null);
                setDomain('');
                toast({ title: 'Domain removed', description: 'Custom domain has been disconnected.' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to remove domain.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove domain.' });
        } finally {
            setIsRemoving(false);
        }
    };

    // Copy to clipboard helper
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: `${label} copied to clipboard` });
    };

    // Get DNS instructions
    const dnsInstructions = domainConfig
        ? getDNSInstructions(domainConfig.domain, domainConfig.verificationToken, domainConfig.connectionType)
        : null;

    // Render status badge
    const renderStatusBadge = () => {
        if (!domainConfig) return null;

        const status = domainConfig.verificationStatus;

        if (status === 'verified') {
            return (
                <Badge className="bg-green-500 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                </Badge>
            );
        }

        if (status === 'failed') {
            return (
                <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Failed
                </Badge>
            );
        }

        return (
            <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Pending Verification
            </Badge>
        );
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Domain Overview Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Custom Domain</CardTitle>
                            <CardDescription>
                                Connect your own domain to your BakedBot menu for a branded experience.
                            </CardDescription>
                        </div>
                        {renderStatusBadge()}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* If domain is verified, show status */}
                    {domainConfig?.verificationStatus === 'verified' && (
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-green-800 dark:text-green-200">
                                        Domain Active
                                    </h3>
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        Your menu is live at{' '}
                                        <a
                                            href={`https://${domainConfig.domain}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium underline inline-flex items-center gap-1"
                                        >
                                            {domainConfig.domain}
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRemove}
                                    disabled={isRemoving}
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                    {isRemoving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* If no domain or pending, show configuration form */}
                    {(!domainConfig || domainConfig.verificationStatus !== 'verified') && (
                        <>
                            {/* Connection Type Selector */}
                            {!domainConfig && (
                                <div className="space-y-3">
                                    <Label>Connection Method</Label>
                                    <Tabs
                                        value={connectionType}
                                        onValueChange={(v) => setConnectionType(v as DomainConnectionType)}
                                    >
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="cname" className="gap-2">
                                                <Globe className="h-4 w-4" />
                                                CNAME (Subdomain)
                                            </TabsTrigger>
                                            <TabsTrigger value="nameserver" className="gap-2">
                                                <Server className="h-4 w-4" />
                                                Nameserver (Full Domain)
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    <p className="text-xs text-muted-foreground">
                                        {connectionType === 'cname'
                                            ? 'Best for subdomains like shop.yourbrand.com. You keep control of your main domain.'
                                            : 'Best for dedicated domains like yourbrandshop.com. BakedBot manages all DNS for this domain.'}
                                    </p>
                                </div>
                            )}

                            {/* Domain Input */}
                            <div className="space-y-2">
                                <Label htmlFor="domain">Domain Name</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="domain"
                                        placeholder={
                                            connectionType === 'cname'
                                                ? 'shop.yourbrand.com'
                                                : 'yourbrandshop.com'
                                        }
                                        value={domain}
                                        onChange={(e) => setDomain(e.target.value)}
                                        disabled={!!domainConfig}
                                    />
                                    {!domainConfig && (
                                        <Button onClick={handleAddDomain} disabled={isSaving || !domain.trim()}>
                                            {isSaving ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : null}
                                            Add Domain
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* DNS Instructions */}
                            {domainConfig && dnsInstructions && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="font-medium text-blue-800 dark:text-blue-200">
                                                    DNS Configuration Required
                                                </h4>
                                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                                    Add the following DNS records at your domain registrar, then click
                                                    &quot;Verify Domain&quot;.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* TXT Record for Verification */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">Step 1: Add TXT Record (Verification)</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-[100px_1fr_auto] gap-3 items-center text-sm">
                                                <span className="font-medium text-muted-foreground">Type</span>
                                                <code className="bg-muted px-2 py-1 rounded">TXT</code>
                                                <div />

                                                <span className="font-medium text-muted-foreground">Host</span>
                                                <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                                                    {dnsInstructions.txtRecord.host}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        copyToClipboard(dnsInstructions.txtRecord.host, 'Host')
                                                    }
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>

                                                <span className="font-medium text-muted-foreground">Value</span>
                                                <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                                                    {dnsInstructions.txtRecord.value}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        copyToClipboard(dnsInstructions.txtRecord.value, 'Value')
                                                    }
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Connection Record (CNAME or NS) */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">
                                                Step 2: Add {dnsInstructions.connectionRecord.type} Record
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-[100px_1fr_auto] gap-3 items-center text-sm">
                                                <span className="font-medium text-muted-foreground">Type</span>
                                                <code className="bg-muted px-2 py-1 rounded">
                                                    {domainConfig.connectionType === 'cname' ? 'CNAME' : 'NS'}
                                                </code>
                                                <div />

                                                <span className="font-medium text-muted-foreground">Host</span>
                                                <code className="bg-muted px-2 py-1 rounded">
                                                    {dnsInstructions.connectionRecord.host}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            dnsInstructions.connectionRecord.host,
                                                            'Host'
                                                        )
                                                    }
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>

                                                <span className="font-medium text-muted-foreground">Value</span>
                                                <div className="bg-muted px-2 py-1 rounded text-xs">
                                                    {Array.isArray(dnsInstructions.connectionRecord.value) ? (
                                                        <ul className="space-y-1">
                                                            {dnsInstructions.connectionRecord.value.map((ns) => (
                                                                <li key={ns}>
                                                                    <code>{ns}</code>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <code>{dnsInstructions.connectionRecord.value}</code>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            Array.isArray(dnsInstructions.connectionRecord.value)
                                                                ? dnsInstructions.connectionRecord.value.join('\n')
                                                                : dnsInstructions.connectionRecord.value,
                                                            'Value'
                                                        )
                                                    }
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Error message if verification failed */}
                                    {domainConfig.verificationError && (
                                        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                            <div className="flex items-start gap-2">
                                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="font-medium text-red-800 dark:text-red-200">
                                                        Verification Error
                                                    </h4>
                                                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                                        {domainConfig.verificationError}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <Button
                                            onClick={handleVerify}
                                            disabled={isVerifying}
                                            className="flex-1"
                                        >
                                            {isVerifying ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                            )}
                                            Verify Domain
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleRemove}
                                            disabled={isRemoving}
                                        >
                                            {isRemoving ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        DNS changes can take up to 48 hours to propagate, but usually complete within
                                        a few minutes. You can click &quot;Verify Domain&quot; multiple times to check.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* SEO Benefits Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        SEO Benefits
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Unlike embedded menus (iframes), custom domains provide{' '}
                        <strong>full SEO benefits</strong>. Your menu content will be indexed by search
                        engines under your own domain, helping customers find your products directly.
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Your domain appears in search results
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Product pages indexed under your brand
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Build domain authority over time
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
