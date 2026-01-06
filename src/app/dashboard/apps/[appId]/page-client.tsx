'use client';

import { useState, useEffect } from 'react';
import { saveIntegrationConfig, testConnection, syncMenu } from '@/app/dashboard/integrations/actions'; // Reuse actions
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { POSProvider } from '@/lib/pos/types';

interface AppConfigProps {
    appId: string;
}

export default function AppConfigPageClient({ appId }: AppConfigProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [storeId, setStoreId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [clientId, setClientId] = useState('');
    const [orderAheadClientId, setOrderAheadClientId] = useState('');
    const [orderAheadClientToken, setOrderAheadClientToken] = useState('');
    const [loading, setLoading] = useState(false);

    // Filter provider based on appId
    const provider = (['dutchie', 'jane'].includes(appId) ? appId : 'dutchie') as POSProvider;
    const isSupported = ['dutchie', 'jane'].includes(appId);

    // Pre-load existing credentials on mount
    useEffect(() => {
        const loadExisting = async () => {
            try {
                const { getIntegrationConfig } = await import('@/app/dashboard/integrations/actions');
                const config = await getIntegrationConfig(provider);
                if (config) {
                    setStoreId(config.storeId || '');
                    setApiKey(config.apiKey || '');
                    setClientId(config.clientId || '');
                    setOrderAheadClientId(config.orderAheadClientId || '');
                    setOrderAheadClientToken(config.orderAheadClientToken || '');
                }
            } catch (e) {
                console.log('No existing config found');
            }
        };
        if (isSupported) {
            loadExisting();
        }
    }, [provider, isSupported]);

    if (!isSupported) {
        return <div className="p-8">App configuration not supported yet.</div>;
    }

    const handleTest = async () => {
        setLoading(true);
        try {
            const config = { storeId, apiKey, clientId, orderAheadClientId, orderAheadClientToken };
            const result = await testConnection(provider, config);
            if (result.success) {
                toast({ title: 'Connection Successful', description: `Found ${result.count} products.` });
            } else {
                toast({ variant: 'destructive', title: 'Connection Failed', description: result.error });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const config = { storeId, apiKey, clientId, orderAheadClientId, orderAheadClientToken };
            await saveIntegrationConfig(provider, config);
            toast({ title: 'App Installed & Saved' });
            router.push('/dashboard/apps');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error Saving' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
            <Button variant="ghost" className="mb-4" onClick={() => router.push('/dashboard/apps')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to App Store
            </Button>

            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight capitalize">Configure {appId}</h1>
                <p className="text-muted-foreground">Enter your credentials to enable this integration.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Connection Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Store ID / Disp ID</Label>
                        <Input value={storeId} onChange={e => setStoreId(e.target.value)} placeholder="e.g. 12345" />
                    </div>

                    {provider === 'dutchie' && (
                        <>
                        <div className="space-y-2">
                            <Label>API Key (Optional)</Label>
                            <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk_live_..." />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Client ID (Platform)</Label>
                            <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="UUID" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Order Ahead Client ID</Label>
                                <Input value={orderAheadClientId} onChange={e => setOrderAheadClientId(e.target.value)} placeholder="Legacy ID" />
                            </div>
                            <div className="space-y-2">
                                <Label>Order Ahead Token</Label>
                                <Input type="password" value={orderAheadClientToken} onChange={e => setOrderAheadClientToken(e.target.value)} placeholder="Token" />
                            </div>
                        </div>
                        </>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-6">
                    <Button variant="ghost" onClick={handleTest} disabled={loading}>Test Connection</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Install & Save'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
