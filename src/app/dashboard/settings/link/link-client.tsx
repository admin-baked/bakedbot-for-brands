'use client';

/**
 * Link Dispensary Page Client
 * 
 * Allows dispensary users to search for and link their business
 * from CannMenus, or create a new dispensary manually.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Store, MapPin, Package, Loader2, CheckCircle, Plus, ExternalLink } from 'lucide-react';
import { searchDispensariesAction, linkDispensaryAction, createManualDispensaryAction } from '@/server/actions/link-dispensary';
import { WiringScreen } from './components/wiring-screen';

interface DispensaryResult {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    source: 'cannmenus' | 'leafly' | 'discovery' | 'manual';
    productCount?: number;
}

export default function LinkDispensaryPageClient() {
    const { toast } = useToast();
    const router = useRouter();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchZip, setSearchZip] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<DispensaryResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Linking state
    const [isLinking, setIsLinking] = useState(false);
    const [wiringStatus, setWiringStatus] = useState<'idle' | 'active'>('idle');
    const [linkedDispensaryName, setLinkedDispensaryName] = useState('');

    // Manual entry state
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualName, setManualName] = useState('');
    const [manualAddress, setManualAddress] = useState('');
    const [manualCity, setManualCity] = useState('');
    const [manualState, setManualState] = useState('');
    const [manualZip, setManualZip] = useState('');

    const handleSearch = async () => {
        if (!searchQuery && !searchZip) {
            toast({ variant: 'destructive', title: 'Please enter a name or ZIP code' });
            return;
        }

        setIsSearching(true);
        setHasSearched(true);

        try {
            const result = await searchDispensariesAction(searchQuery, searchZip);
            if (result.success && result.data) {
                setResults(result.data.dispensaries);
                if (result.data.dispensaries.length === 0) {
                    toast({ title: 'No results found', description: 'Try a different search or create manually.' });
                }
            } else {
                toast({ variant: 'destructive', title: 'Search failed', description: result.message });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Search error' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleLink = async (dispensary: DispensaryResult) => {
        setIsLinking(true);

        try {
            const result = await linkDispensaryAction(dispensary.id, dispensary.name, dispensary);
            if (result.success) {
                // Trigger Wiring Animation instead of immediate redirect
                setLinkedDispensaryName(dispensary.name);
                setWiringStatus('active');
            } else {
                toast({ variant: 'destructive', title: 'Failed to link', description: result.message });
                setIsLinking(false);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Link error' });
            setIsLinking(false);
        }
    };

    const handleManualCreate = async () => {
        if (!manualName || !manualCity || !manualState) {
            toast({ variant: 'destructive', title: 'Please fill in required fields' });
            return;
        }

        setIsLinking(true);

        try {
            const result = await createManualDispensaryAction(
                manualName,
                manualAddress,
                manualCity,
                manualState,
                manualZip
            );
            if (result.success) {
                 // Trigger Wiring Animation
                setLinkedDispensaryName(manualName);
                setWiringStatus('active');
            } else {
                toast({ variant: 'destructive', title: 'Failed to create', description: result.message });
                setIsLinking(false);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Create error' });
            setIsLinking(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
            <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Store className="h-8 w-8 text-emerald-600" />
                    Link Your Dispensary
                </h1>
                <p className="text-muted-foreground">
                    Search for your dispensary to import your menu and data automatically.
                </p>
            </div>

            {/* Search Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Search CannMenus</CardTitle>
                    <CardDescription>
                        Find your dispensary by name or ZIP code
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <Label htmlFor="search" className="sr-only">Dispensary Name</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Dispensary name..."
                                    className="pl-9"
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                        </div>
                        <div className="w-full sm:w-32">
                            <Label htmlFor="zip" className="sr-only">ZIP Code</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="zip"
                                    value={searchZip}
                                    onChange={e => setSearchZip(e.target.value)}
                                    placeholder="ZIP"
                                    className="pl-9"
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                        </div>
                        <Button onClick={handleSearch} disabled={isSearching}>
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                        </Button>
                    </div>

                    {/* Results */}
                    {hasSearched && (
                        <div className="space-y-2 pt-4 border-t">
                            {results.length > 0 ? (
                                results.map(dispensary => (
                                    <div
                                        key={dispensary.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                                                <Store className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium">{dispensary.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {[dispensary.city, dispensary.state].filter(Boolean).join(', ')}
                                                    {dispensary.productCount && (
                                                        <span className="ml-2 text-emerald-600">
                                                            • {dispensary.productCount} products
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleLink(dispensary)}
                                            disabled={isLinking}
                                        >
                                            {isLinking ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    This is mine
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No dispensaries found matching your search.</p>
                                    <p className="text-sm mt-1">Try a different name or create manually below.</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Manual Creation Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Can't find your dispensary?
                    </CardTitle>
                    <CardDescription>
                        Create your dispensary manually and connect your POS later.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!showManualForm ? (
                        <Button variant="outline" onClick={() => setShowManualForm(true)}>
                            Enter Details Manually
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <Label htmlFor="manualName">Dispensary Name *</Label>
                                    <Input
                                        id="manualName"
                                        value={manualName}
                                        onChange={e => setManualName(e.target.value)}
                                        placeholder="e.g. Essex Apothecary"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label htmlFor="manualAddress">Street Address</Label>
                                    <Input
                                        id="manualAddress"
                                        value={manualAddress}
                                        onChange={e => setManualAddress(e.target.value)}
                                        placeholder="123 Main St"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="manualCity">City *</Label>
                                    <Input
                                        id="manualCity"
                                        value={manualCity}
                                        onChange={e => setManualCity(e.target.value)}
                                        placeholder="Boston"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label htmlFor="manualState">State *</Label>
                                        <Input
                                            id="manualState"
                                            value={manualState}
                                            onChange={e => setManualState(e.target.value)}
                                            placeholder="MA"
                                            maxLength={2}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="manualZip">ZIP</Label>
                                        <Input
                                            id="manualZip"
                                            value={manualZip}
                                            onChange={e => setManualZip(e.target.value)}
                                            placeholder="02101"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleManualCreate} disabled={isLinking}>
                                    {isLinking ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : null}
                                    Create Dispensary
                                </Button>
                                <Button variant="ghost" onClick={() => setShowManualForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button variant="outline" size="sm" asChild>
                    <a href="/dashboard/apps/dutchie">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Connect Dutchie
                    </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                    <a href="/dashboard/apps/jane">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Connect Jane
                    </a>
                </Button>
            </div>
            {/* Wiring Animation Overlay */}
            {wiringStatus === 'active' && (
                <WiringScreen 
                    dispensaryName={linkedDispensaryName}
                    onComplete={() => router.push('/dashboard')}
                />
            )}
        </div>
    );
}
