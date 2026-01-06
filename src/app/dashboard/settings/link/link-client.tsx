'use client';

/**
 * Link Dispensary Page Client (Discovery Powered)
 * 
 * Allows dispensary users to search for and link their business
 * using BakedBot Discovery (FireCrawl).
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Store, MapPin, Package, Loader2, CheckCircle, Plus, ExternalLink, Globe } from 'lucide-react';
import { searchEntities, linkEntity, type DiscoveryEntity } from '@/server/actions/discovery-search';
import { WiringScreen } from './components/wiring-screen';

export default function LinkDispensaryPageClient() {
    const { toast } = useToast();
    const router = useRouter();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchZip, setSearchZip] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<DiscoveryEntity[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Linking state
    const [isLinking, setIsLinking] = useState(false);
    const [wiringStatus, setWiringStatus] = useState<'idle' | 'active'>('idle');
    const [linkedEntityName, setLinkedEntityName] = useState('');

    const handleSearch = async () => {
        if (!searchQuery && !searchZip) {
            toast({ variant: 'destructive', title: 'Please enter a name or ZIP code' });
            return;
        }

        setIsSearching(true);
        setHasSearched(true);

        try {
            // Use new Discovery Search
            const result = await searchEntities(searchQuery, 'dispensary', searchZip);
            
            if (result.success && result.data) {
                setResults(result.data);
                if (result.data.length === 0) {
                    toast({ title: 'No results found', description: 'Try including your city or state.' });
                }
            } else {
                toast({ variant: 'destructive', title: 'Search failed', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Search error' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleLink = async (entity: DiscoveryEntity) => {
        setIsLinking(true);

        try {
            // Use new Link Entity action
            const result = await linkEntity(entity);
            
            if (result.success) {
                // Trigger Wiring Animation
                setLinkedEntityName(entity.name);
                setWiringStatus('active');
            } else {
                toast({ variant: 'destructive', title: 'Failed to link', description: result.error });
                setIsLinking(false);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Link error' });
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
                    Search for your dispensary using BakedBot Discovery to import your menu and data automatically.
                </p>
            </div>

            {/* Search Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Search Business</CardTitle>
                    <CardDescription>
                        Find your dispensary by name, city, or ZIP code
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
                            <Label htmlFor="zip" className="sr-only">ZIP / City</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="zip"
                                    value={searchZip}
                                    onChange={e => setSearchZip(e.target.value)}
                                    placeholder="ZIP/City"
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
                                results.map(entity => (
                                    <div
                                        key={entity.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                                                <Store className="h-5 w-5" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <div className="font-medium truncate">{entity.name}</div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <Globe className="h-3 w-3" />
                                                    <a href={entity.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px]">
                                                        {entity.url}
                                                    </a>
                                                </div>
                                                {entity.description && (
                                                    <div className="text-xs text-muted-foreground mt-1 truncate max-w-sm">
                                                        {entity.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleLink(entity)}
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
                                    <p>No results found via BakedBot Discovery.</p>
                                    <p className="text-sm mt-1">Try refining your search terms.</p>
                                </div>
                            )}
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
                    dispensaryName={linkedEntityName}
                    onComplete={() => router.push('/dashboard')}
                />
            )}
        </div>
    );
}
