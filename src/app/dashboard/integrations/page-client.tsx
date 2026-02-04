'use client';

import { useState } from 'react';
import { saveIntegrationConfig, testConnection, syncMenu, enableApp } from './actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Store, Zap, Package, Users, BarChart3, Settings, Check, ExternalLink } from 'lucide-react';
import type { POSProvider } from '@/lib/pos/types';

// App definitions for the App Store
const APPS = [
    {
        id: 'alleaves',
        name: 'Alleaves',
        category: 'POS',
        description: 'Sync inventory and orders from Alleaves POS.',
        icon: '🌿',
        status: 'available',
        featured: true,
    },
    {
        id: 'dutchie',
        name: 'Dutchie',
        category: 'POS',
        description: 'Sync inventory, orders, and customers from Dutchie POS.',
        icon: '🛒',
        status: 'available',
        featured: true,
    },
    {
        id: 'gmail',
        name: 'Gmail',
        category: 'Marketing',
        description: 'Authorize agents to draft and send emails via your account.',
        icon: '📧',
        status: 'available',
        featured: true,
    },
    {
        id: 'jane',
        name: 'iHeartJane',
        category: 'POS',
        description: 'Connect your Jane menu for product and inventory sync.',
        icon: '💚',
        status: 'available',
        featured: true,
    },
    {
        id: 'treez',
        name: 'Treez',
        category: 'POS',
        description: 'Integrate with Treez for full inventory and order management.',
        icon: '🌲',
        status: 'available', // Unlocked
        featured: true,
    },
    {
        id: 'blaze',
        name: 'Blaze',
        category: 'POS',
        description: 'Sync products and inventory from Blaze POS.',
        icon: '🔥',
        status: 'available', // Unlocked
    },
    {
        id: 'flowhub',
        name: 'Flowhub',
        category: 'POS',
        description: 'Connect Flowhub for compliance-ready inventory sync.',
        icon: '📦',
        status: 'available', // Unlocked
    },
    {
        id: 'mailchimp',
        name: 'Mailchimp',
        category: 'Marketing',
        description: 'Sync customer segments for email campaigns.',
        icon: '📧',
        status: 'available', // Unlocked
    },
    {
        id: 'klaviyo',
        name: 'Klaviyo',
        category: 'Marketing',
        description: 'Advanced email automation for cannabis brands.',
        icon: '💌',
        status: 'available', // Unlocked
    },
    {
        id: 'springbig',
        name: 'Springbig',
        category: 'Loyalty',
        description: 'Loyalty program integration for dispensaries.',
        icon: '⭐',
        status: 'available', // Unlocked
    },
];

const CATEGORIES = ['All', 'POS', 'Marketing', 'Loyalty'];

export default function AppStorePage() {
    const { toast } = useToast();
    const [provider, setProvider] = useState<POSProvider>('dutchie');
    const [storeId, setStoreId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [lastSync, setLastSync] = useState<any>(null);
    const [selectedCategory, setSelectedCategory] = useState('All');

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

    const handleConnect = async (appId: string) => {
        setLoading(true);
        try {
            await enableApp(appId);
            toast({ title: 'App Connected', description: `Permission granted for ${appId}.` });
            // Ideally refresh local state to show "Installed"
        } catch (error) {
            toast({ variant: 'destructive', title: 'Connection Failed' });
        } finally {
            setLoading(false);
        }
    };

    const filteredApps = APPS.filter(app =>
        selectedCategory === 'All' || app.category === selectedCategory
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Store className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">App Store</h1>
                </div>
                <p className="text-muted-foreground">
                    Connect your favorite tools and services to supercharge your business.
                </p>
            </div>

            <Tabs defaultValue="browse" className="w-full">
                <TabsList>
                    <TabsTrigger value="browse">Browse Apps</TabsTrigger>
                    <TabsTrigger value="installed">My Apps</TabsTrigger>
                    <TabsTrigger value="configure">Configure</TabsTrigger>
                </TabsList>

                {/* Browse Apps Tab */}
                <TabsContent value="browse" className="mt-6">
                    {/* Category Filter */}
                    <div className="flex gap-2 mb-6">
                        {CATEGORIES.map(cat => (
                            <Button
                                key={cat}
                                variant={selectedCategory === cat ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>

                    {/* Featured Apps */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            Featured Integrations
                        </h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            {filteredApps.filter(a => a.featured).map(app => (
                                <Card key={app.id} className="hover:border-primary/50 transition-colors">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl">{app.icon}</span>
                                                <div>
                                                    <CardTitle className="text-lg">{app.name}</CardTitle>
                                                    <Badge variant="outline" className="text-xs">{app.category}</Badge>
                                                </div>
                                            </div>
                                            {app.status === 'available' ? (
                                                <Badge className="bg-green-100 text-green-800">Available</Badge>
                                            ) : (
                                                <Badge variant="secondary">Coming Soon</Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{app.description}</p>
                                    </CardContent>
                                    <CardFooter>
                                        {app.status === 'available' ? (
                                        <Button className="w-full" size="sm" onClick={() => handleConnect(app.id)}>
                                                <Check className="h-4 w-4 mr-2" /> Connect
                                            </Button>
                                        ) : (
                                            <Button className="w-full" size="sm" variant="outline" disabled>
                                                Coming Soon
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* All Apps */}
                    <h2 className="text-lg font-semibold mb-4">All Apps</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {filteredApps.map(app => (
                            <Card key={app.id} className="hover:border-primary/50 transition-colors">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-2xl">{app.icon}</span>
                                        <div>
                                            <div className="font-medium">{app.name}</div>
                                            <div className="text-xs text-muted-foreground">{app.category}</div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">{app.description}</p>
                                    {app.status === 'available' ? (
                                        <Button size="sm" variant="outline" className="w-full" onClick={() => handleConnect(app.id)}>Connect</Button>
                                    ) : (
                                        <Button size="sm" variant="ghost" className="w-full" disabled>Coming Soon</Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* My Apps Tab */}
                <TabsContent value="installed" className="mt-6">
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Apps Connected Yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Browse the App Store to connect your first integration.
                            </p>
                            <Button onClick={() => { }}>Browse Apps</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Configure Tab */}
                <TabsContent value="configure" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                POS Configuration
                            </CardTitle>
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
                                        <SelectItem value="alleaves">Alleaves</SelectItem>
                                        <SelectItem value="dutchie">Dutchie</SelectItem>
                                        <SelectItem value="jane">iHeartJane</SelectItem>
                                        <SelectItem value="treez">Treez</SelectItem>
                                        <SelectItem value="manual">Manual (CSV)</SelectItem>
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
            </Tabs>
        </div>
    );
}
