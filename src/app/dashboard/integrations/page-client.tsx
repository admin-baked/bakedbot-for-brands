'use client';

import { useState } from 'react';
import { saveIntegrationConfig, testConnection, syncMenu } from './actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { POSProvider } from '@/lib/pos/types';

export default function IntegrationsPageClient() {
    const { toast } = useToast();
    const [provider, setProvider] = useState<POSProvider>('dutchie');
    const [storeId, setStoreId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [lastSync, setLastSync] = useState<any>(null);

    const handleTest = async () => {
        setLoading(true);
        try {
            const result = await testConnection(provider, { storeId, apiKey });
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
            await saveIntegrationConfig(provider, { storeId, apiKey });
            toast({ title: 'Configuration Saved' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error Saving' });
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setLoading(true);
        try {
            const result = await syncMenu(provider, { storeId, apiKey });
            if (result.success) {
                setLastSync(result);
                toast({ title: 'Sync Complete', description: `Updated ${result.syncedCount} items.` });
            } else {
                toast({ variant: 'destructive', title: 'Sync Failed', description: result.error });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                <p className="text-muted-foreground">Connect your Point of Sale system for real-time inventory.</p>
            </div>

            <Tabs defaultValue="available" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="available">Active Connections</TabsTrigger>
                    <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
                </TabsList>
                <TabsContent value="available" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>POS Configuration</CardTitle>
                            <CardDescription>Enter your API credentials to enable sync.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Provider</Label>
                                <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="dutchie">Dutchie</SelectItem>
                                        <SelectItem value="jane">iHeartJane</SelectItem>
                                        <SelectItem value="manual" disabled>Manual (CSV)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Store ID / Disp ID</Label>
                                <Input value={storeId} onChange={e => setStoreId(e.target.value)} placeholder="e.g. 12345 or my-store-name" />
                            </div>

                            {provider === 'dutchie' && (
                                <div className="space-y-2">
                                    <Label>API Key (Optional for Public Menu)</Label>
                                    <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk_live_..." />
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between border-t pt-6">
                            <Button variant="ghost" onClick={handleTest} disabled={loading}>Test Connection</Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleSync} disabled={loading}>Sync Now</Button>
                                <Button onClick={handleSave} disabled={loading}>Save Settings</Button>
                            </div>
                        </CardFooter>
                    </Card>

                    {lastSync && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded text-green-800">
                            Last Sync: {lastSync.syncedCount} items processed successfully.
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="marketplace">
                    <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
                        More integrations (Treez, Blaze, Flowhub) coming soon.
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
