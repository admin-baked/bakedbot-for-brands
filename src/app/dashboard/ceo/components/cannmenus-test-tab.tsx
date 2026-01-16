'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, Package, Store } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { searchCannMenusRetailers } from '../actions';
import type { CannMenusResult } from '@/server/actions/cannmenus';
// import { type RetailerLocation } from '@/lib/cannmenus-api'; // Unused now

type BrandResult = {
    id: number;
    brand_name: string;
    aproperhigh_brand_website?: string;
};

export default function CannMenusTestTab() {
    const [brandSearch, setBrandSearch] = useState('');
    const [retailerSearch, setRetailerSearch] = useState('');
    const [brandLoading, setBrandLoading] = useState(false);
    const [retailerLoading, setRetailerLoading] = useState(false);
    const [brandResults, setBrandResults] = useState<BrandResult[]>([]);
    const [retailerResults, setRetailerResults] = useState<CannMenusResult[]>([]);
    const [brandMeta, setBrandMeta] = useState<any>(null);
    const [retailerMeta, setRetailerMeta] = useState<any>(null);

    async function searchBrands() {
        if (!brandSearch.trim()) return;

        setBrandLoading(true);
        try {
            const response = await fetch(`/api/cannmenus/brands?search=${encodeURIComponent(brandSearch)}`);
            const data = await response.json();
            setBrandResults(data.data?.data || []);
            setBrandMeta(data.data?.pagination || null);
        } catch (error) {
            console.error('Brand search failed:', error);
            setBrandResults([]);
            setBrandMeta(null);
        } finally {
            setBrandLoading(false);
        }
    }

    async function searchRetailers() {
        if (!retailerSearch.trim()) return;

        setRetailerLoading(true);
        try {
            // Updated to use Server Action directly
            const results = await searchCannMenusRetailers(retailerSearch);

            // Server Action returns mixed results, filter for dispensaries
            const dispensaries = results.filter(r => r.type === 'dispensary');

            // Server Action returns CannMenusResult[] which matches our state type
            setRetailerResults(dispensaries);
            setRetailerMeta(null); // Pagination not currently supported by action wrapper

            if (dispensaries.length === 0) {
                console.log('No retailers found for search:', retailerSearch);
            }
        } catch (error) {
            console.error('Retailer search failed:', error);
            setRetailerResults([]);
            setRetailerMeta(null);
        } finally {
            setRetailerLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        CannMenus Integration Test
                    </CardTitle>
                    <CardDescription>
                        Test the CannMenus API integration by searching for brands and retailers.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="brands">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="brands">Brands</TabsTrigger>
                            <TabsTrigger value="retailers">Retailers</TabsTrigger>
                        </TabsList>

                        <TabsContent value="brands" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="brand-search">Search Brands</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="brand-search"
                                        placeholder="e.g., Cookies, Stiiizy, Kiva"
                                        value={brandSearch}
                                        onChange={(e) => setBrandSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && searchBrands()}
                                    />
                                    <Button onClick={searchBrands} disabled={brandLoading || !brandSearch.trim()}>
                                        {brandLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            {brandMeta && (
                                <div className="flex gap-2 text-sm text-muted-foreground">
                                    <Badge variant="secondary">
                                        {brandMeta.total_records} total results
                                    </Badge>
                                    <Badge variant="secondary">
                                        Page {brandMeta.current_page} of {brandMeta.total_pages}
                                    </Badge>
                                </div>
                            )}

                            <ScrollArea className="h-[400px] rounded-md border p-4">
                                {brandResults.length === 0 && !brandLoading && (
                                    <p className="text-sm text-muted-foreground text-center py-8">
                                        No results. Try searching for a brand name.
                                    </p>
                                )}
                                <div className="space-y-2">
                                    {brandResults.map((brand) => (
                                        <Card key={brand.id}>
                                            <CardHeader className="p-4">
                                                <CardTitle className="text-sm">{brand.brand_name}</CardTitle>
                                                <CardDescription className="text-xs">
                                                    ID: {brand.id}
                                                    {brand.aproperhigh_brand_website && (
                                                        <> • <a href={brand.aproperhigh_brand_website} target="_blank" rel="noopener noreferrer" className="hover:underline">Website</a></>
                                                    )}
                                                </CardDescription>
                                            </CardHeader>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="retailers" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="retailer-search">Search Retailers</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="retailer-search"
                                        placeholder="e.g., Cookies, MedMen, Curaleaf"
                                        value={retailerSearch}
                                        onChange={(e) => setRetailerSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && searchRetailers()}
                                    />
                                    <Button onClick={searchRetailers} disabled={retailerLoading || !retailerSearch.trim()}>
                                        {retailerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            {retailerMeta && (
                                <div className="flex gap-2 text-sm text-muted-foreground">
                                    <Badge variant="secondary">
                                        {retailerMeta.total_records} total results
                                    </Badge>
                                    <Badge variant="secondary">
                                        Page {retailerMeta.current_page} of {retailerMeta.total_pages}
                                    </Badge>
                                </div>
                            )}

                            <ScrollArea className="h-[400px] rounded-md border p-4">
                                {retailerResults.length === 0 && !retailerLoading && (
                                    <p className="text-sm text-muted-foreground text-center py-8">
                                        No results. Try searching for a dispensary name.
                                    </p>
                                )}
                                <div className="space-y-2">
                                    {retailerResults.map((retailer) => (
                                        <Card key={retailer.id}>
                                            <CardHeader className="p-4">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <Store className="h-4 w-4" />
                                                    {retailer.name}
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    ID: {retailer.id}
                                                    {/* City/State removed to match CannMenusResult type */}
                                                </CardDescription>
                                            </CardHeader>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
