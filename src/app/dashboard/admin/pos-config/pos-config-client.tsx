'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, RefreshCw, Settings2, Plug, Unplug } from 'lucide-react';
import {
    type LocationWithPOS,
    type POSConfigFormData,
    getLocationPOSConfig,
    testPOSConnection,
    savePOSConfig,
    triggerMenuSync,
    disablePOSConfig,
} from './actions';

interface POSConfigClientProps {
    initialLocations: LocationWithPOS[];
}

export function POSConfigClient({ initialLocations }: POSConfigClientProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Form state
    const [formData, setFormData] = useState<POSConfigFormData>({
        locationId: '',
        provider: 'alleaves',
        username: '',
        password: '',
        pin: '',
        storeId: '',
    });

    const selectedLocation = initialLocations.find(l => l.id === selectedLocationId);

    const handleLocationChange = async (locationId: string) => {
        setSelectedLocationId(locationId);
        setTestResult(null);
        setFormData(prev => ({ ...prev, locationId }));

        if (!locationId) return;

        setIsLoading(true);
        try {
            const config = await getLocationPOSConfig(locationId);
            if (config) {
                setFormData({
                    locationId,
                    provider: (config.provider as 'alleaves' | 'dutchie') || 'alleaves',
                    username: config.username || '',
                    password: config.password || '',
                    pin: config.pin || '',
                    storeId: config.storeId || '',
                });
            } else {
                setFormData({
                    locationId,
                    provider: 'alleaves',
                    username: '',
                    password: '',
                    pin: '',
                    storeId: '',
                });
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to load configuration', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestConnection = async () => {
        if (!formData.username || !formData.password || !formData.storeId) {
            toast({ title: 'Missing Fields', description: 'Please fill in username, password, and store ID', variant: 'destructive' });
            return;
        }

        setIsTesting(true);
        setTestResult(null);
        try {
            const result = await testPOSConnection(formData);
            setTestResult(result);
            if (result.success) {
                toast({ title: 'Connection Successful', description: result.message });
            } else {
                toast({ title: 'Connection Failed', description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            setTestResult({ success: false, message: error.message || 'Test failed' });
            toast({ title: 'Error', description: error.message || 'Connection test failed', variant: 'destructive' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = async () => {
        if (!formData.locationId) {
            toast({ title: 'No Location', description: 'Please select a location first', variant: 'destructive' });
            return;
        }

        startTransition(async () => {
            try {
                const result = await savePOSConfig(formData);
                if (result.success) {
                    toast({ title: 'Saved', description: result.message });
                } else {
                    toast({ title: 'Error', description: result.message, variant: 'destructive' });
                }
            } catch (error: any) {
                toast({ title: 'Error', description: error.message || 'Failed to save', variant: 'destructive' });
            }
        });
    };

    const handleSync = async () => {
        if (!selectedLocationId) return;

        setIsSyncing(true);
        try {
            const result = await triggerMenuSync(selectedLocationId);
            if (result.success) {
                toast({ title: 'Sync Complete', description: result.message });
            } else {
                toast({ title: 'Sync Failed', description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Sync failed', variant: 'destructive' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDisable = async () => {
        if (!selectedLocationId) return;

        startTransition(async () => {
            try {
                const result = await disablePOSConfig(selectedLocationId);
                if (result.success) {
                    toast({ title: 'Disabled', description: result.message });
                    // Reset form
                    setFormData({
                        locationId: selectedLocationId,
                        provider: 'alleaves',
                        username: '',
                        password: '',
                        pin: '',
                        storeId: '',
                    });
                } else {
                    toast({ title: 'Error', description: result.message, variant: 'destructive' });
                }
            } catch (error: any) {
                toast({ title: 'Error', description: error.message || 'Failed to disable', variant: 'destructive' });
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Location Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        Select Location
                    </CardTitle>
                    <CardDescription>
                        Choose a dispensary location to configure its POS integration.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Select value={selectedLocationId} onValueChange={handleLocationChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a location..." />
                        </SelectTrigger>
                        <SelectContent>
                            {initialLocations.map(location => (
                                <SelectItem key={location.id} value={location.id}>
                                    <div className="flex items-center gap-2">
                                        <span>{location.name}</span>
                                        {location.city && location.state && (
                                            <span className="text-muted-foreground text-sm">
                                                ({location.city}, {location.state})
                                            </span>
                                        )}
                                        {location.posConfig?.provider && (
                                            <Badge variant={location.posConfig.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                                                {location.posConfig.provider}
                                            </Badge>
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedLocation && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-muted-foreground">Org ID:</span>{' '}
                                    <span className="font-mono">{selectedLocation.orgId}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Location ID:</span>{' '}
                                    <span className="font-mono">{selectedLocation.id}</span>
                                </div>
                                {selectedLocation.posConfig?.syncedAt && (
                                    <div className="col-span-2">
                                        <span className="text-muted-foreground">Last Synced:</span>{' '}
                                        {new Date(selectedLocation.posConfig.syncedAt).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Configuration Form */}
            {selectedLocationId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plug className="h-5 w-5" />
                            POS Credentials
                        </CardTitle>
                        <CardDescription>
                            Enter the POS system credentials for this location.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="provider">POS Provider</Label>
                                        <Select
                                            value={formData.provider}
                                            onValueChange={(v) => setFormData(prev => ({ ...prev, provider: v as 'alleaves' | 'dutchie' }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="alleaves">Alleaves</SelectItem>
                                                <SelectItem value="dutchie" disabled>Dutchie (Coming Soon)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="username">Username</Label>
                                            <Input
                                                id="username"
                                                type="text"
                                                value={formData.username}
                                                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                                placeholder="user@example.com"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="storeId">Store ID</Label>
                                            <Input
                                                id="storeId"
                                                type="text"
                                                value={formData.storeId}
                                                onChange={(e) => setFormData(prev => ({ ...prev, storeId: e.target.value }))}
                                                placeholder="1000"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="pin">PIN (Optional)</Label>
                                            <Input
                                                id="pin"
                                                type="text"
                                                value={formData.pin}
                                                onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                                                placeholder="1234"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Test Result */}
                                {testResult && (
                                    <div className={`flex items-center gap-2 p-3 rounded-lg ${testResult.success ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
                                        {testResult.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                        <span>{testResult.message}</span>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap gap-3 pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        onClick={handleTestConnection}
                                        disabled={isTesting || isPending}
                                    >
                                        {isTesting ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Plug className="h-4 w-4 mr-2" />
                                        )}
                                        Test Connection
                                    </Button>

                                    <Button
                                        onClick={handleSave}
                                        disabled={isPending || isTesting}
                                    >
                                        {isPending ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                        )}
                                        Save Configuration
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        onClick={handleSync}
                                        disabled={isSyncing || isPending || !selectedLocation?.posConfig?.provider}
                                    >
                                        {isSyncing ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                        )}
                                        Sync Menu Now
                                    </Button>

                                    {selectedLocation?.posConfig?.status === 'active' && (
                                        <Button
                                            variant="destructive"
                                            onClick={handleDisable}
                                            disabled={isPending}
                                        >
                                            <Unplug className="h-4 w-4 mr-2" />
                                            Disable Integration
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Locations Overview */}
            <Card>
                <CardHeader>
                    <CardTitle>All Locations</CardTitle>
                    <CardDescription>
                        Overview of POS integration status across all locations.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="divide-y">
                        {initialLocations.map(location => (
                            <div
                                key={location.id}
                                className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/50 px-2 -mx-2 rounded"
                                onClick={() => handleLocationChange(location.id)}
                            >
                                <div>
                                    <div className="font-medium">{location.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {location.city && location.state ? `${location.city}, ${location.state}` : location.orgId}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {location.posConfig?.provider ? (
                                        <>
                                            <Badge variant={location.posConfig.status === 'active' ? 'default' : 'secondary'}>
                                                {location.posConfig.provider}
                                            </Badge>
                                            {location.posConfig.status === 'active' ? (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </>
                                    ) : (
                                        <Badge variant="outline">No POS</Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                        {initialLocations.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No locations found. Create locations first.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
