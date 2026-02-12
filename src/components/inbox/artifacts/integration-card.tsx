'use client';

/**
 * Inbox Integration Card
 *
 * Inline connection card for requesting third-party service integrations (OAuth, API keys, etc.)
 * Supports Google Workspace, POS systems, marketing platforms, and more.
 */

import React, { useState } from 'react';
import { Link, Plug, Key, Lock, ArrowRight, ExternalLink, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInboxStore } from '@/lib/store/inbox-store';
import { useToast } from '@/hooks/use-toast';
import type { InboxArtifact } from '@/types/inbox';
import type { IntegrationRequest } from '@/types/service-integrations';
import { INTEGRATION_METADATA } from '@/types/service-integrations';

interface InboxIntegrationCardProps {
    artifact: InboxArtifact;
    className?: string;
}

export function InboxIntegrationCard({ artifact, className }: InboxIntegrationCardProps) {
    const { updateArtifact } = useInboxStore();
    const { toast } = useToast();
    const integrationData = artifact.data as IntegrationRequest;
    const metadata = INTEGRATION_METADATA[integrationData.provider];

    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    /**
     * Handle OAuth flow (Google, Square, etc.)
     */
    const handleOAuthConnect = () => {
        // Build OAuth URL with returnTo parameter
        const service = integrationData.provider === 'gmail' ? 'gmail' :
            integrationData.provider === 'google_calendar' ? 'calendar' :
                integrationData.provider === 'google_sheets' ? 'sheets' :
                    integrationData.provider === 'google_drive' ? 'drive' :
                        integrationData.provider;

        const returnTo = integrationData.threadId
            ? `/dashboard/inbox?thread=${integrationData.threadId}`
            : '/dashboard/inbox';

        const url = `/api/auth/google?service=${service}&redirect=${encodeURIComponent(returnTo)}`;

        // Redirect to OAuth flow
        window.location.href = url;
    };

    /**
     * Handle API key submission (POS systems, marketing platforms)
     */
    const handleApiKeySubmit = async () => {
        if (!apiKey.trim()) {
            toast({
                variant: 'destructive',
                title: 'API Key Required',
                description: 'Please enter your API key to connect.',
            });
            return;
        }

        setLoading(true);

        try {
            // TODO: Implement API key save action
            const response = await fetch('/api/integrations/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: integrationData.provider,
                    apiKey,
                    apiSecret: apiSecret || undefined,
                    username: username || undefined,
                    password: password || undefined,
                }),
            });

            if (!response.ok) throw new Error('Failed to connect');

            // Update artifact status to connected
            updateArtifact(artifact.id, { status: 'approved' });

            toast({
                title: 'Connected Successfully',
                description: `${metadata.name} is now connected and ready to use.`,
            });

            setShowForm(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Connection Failed',
                description: error.message || 'Failed to connect. Please check your credentials.',
            });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Render auth method icon
     */
    const getAuthIcon = () => {
        switch (integrationData.authMethod) {
            case 'oauth':
                return <Lock className="h-4 w-4 text-blue-600" />;
            case 'api_key':
                return <Key className="h-4 w-4 text-purple-600" />;
            case 'jwt':
                return <Link className="h-4 w-4 text-green-600" />;
            default:
                return <Plug className="h-4 w-4 text-gray-600" />;
        }
    };

    /**
     * Get category color
     */
    const getCategoryColor = () => {
        const colors: Record<string, string> = {
            workspace: 'bg-blue-100 text-blue-700 border-blue-200',
            pos: 'bg-green-100 text-green-700 border-green-200',
            marketing: 'bg-purple-100 text-purple-700 border-purple-200',
            loyalty: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            payment: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            communication: 'bg-pink-100 text-pink-700 border-pink-200',
            analytics: 'bg-orange-100 text-orange-700 border-orange-200',
        };
        return colors[integrationData.category] || colors.workspace;
    };

    /**
     * Render API key form for non-OAuth integrations
     */
    const renderApiKeyForm = () => (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="space-y-1.5">
                <Label htmlFor="apiKey" className="text-xs">
                    API Key {integrationData.authMethod === 'jwt' && '(JWT Token)'}
                </Label>
                <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="h-8 text-xs"
                />
            </div>

            {integrationData.authMethod === 'api_key' && (
                <div className="space-y-1.5">
                    <Label htmlFor="apiSecret" className="text-xs">
                        API Secret <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                        id="apiSecret"
                        type="password"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="Enter your API secret"
                        className="h-8 text-xs"
                    />
                </div>
            )}

            {integrationData.authMethod === 'credentials' && (
                <>
                    <div className="space-y-1.5">
                        <Label htmlFor="username" className="text-xs">Username</Label>
                        <Input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-xs">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className="h-8 text-xs"
                        />
                    </div>
                </>
            )}

            {metadata.docsUrl && (
                <a
                    href={metadata.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                    <ExternalLink className="h-3 w-3" />
                    How to get your API key
                </a>
            )}
        </div>
    );

    return (
        <Card className={cn('overflow-hidden border-2', className)}>
            <CardHeader className="p-4 pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                        {/* Provider Icon */}
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                            <span className="text-2xl">{metadata.icon}</span>
                        </div>

                        {/* Header Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm">{metadata.name}</h4>
                                {getAuthIcon()}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {metadata.description}
                            </p>

                            {/* Category + Setup Time */}
                            <div className="flex items-center gap-2 mt-2">
                                <Badge
                                    variant="outline"
                                    className={cn('h-5 px-1.5 text-[10px] capitalize', getCategoryColor())}
                                >
                                    {integrationData.category}
                                </Badge>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {integrationData.setupTime || metadata.setupTime}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 pt-0 space-y-3">
                {/* Why This Integration */}
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <p className="text-xs text-blue-900">
                        <strong>Why connect:</strong> {integrationData.reason}
                    </p>
                    {integrationData.enablesAction && (
                        <p className="text-xs text-blue-700 mt-1">
                            Enables: <code className="px-1 py-0.5 bg-blue-100 rounded">{integrationData.enablesAction}</code>
                        </p>
                    )}
                </div>

                {/* API Key Form (if shown) */}
                {showForm && integrationData.authMethod !== 'oauth' && renderApiKeyForm()}
            </CardContent>

            <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                {/* OAuth Connect Button */}
                {integrationData.authMethod === 'oauth' && (
                    <Button
                        onClick={handleOAuthConnect}
                        className="w-full"
                        size="sm"
                    >
                        <Lock className="h-4 w-4 mr-2" />
                        Connect with {metadata.name}
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                )}

                {/* API Key Connect Flow */}
                {integrationData.authMethod !== 'oauth' && !showForm && (
                    <Button
                        onClick={() => setShowForm(true)}
                        className="w-full"
                        size="sm"
                    >
                        <Key className="h-4 w-4 mr-2" />
                        Connect {metadata.name}
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                )}

                {/* Submit API Key */}
                {showForm && integrationData.authMethod !== 'oauth' && (
                    <div className="flex gap-2 w-full">
                        <Button
                            onClick={() => setShowForm(false)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleApiKeySubmit}
                            size="sm"
                            className="flex-1"
                            disabled={loading || !apiKey.trim()}
                        >
                            {loading ? (
                                <>Loading...</>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Connect
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {/* Alternative: Go to Settings */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => window.open('/dashboard/integrations', '_blank')}
                >
                    Or connect in Settings
                    <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
            </CardFooter>
        </Card>
    );
}
