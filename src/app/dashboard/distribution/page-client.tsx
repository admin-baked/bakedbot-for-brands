'use client';

import { useState, useMemo } from 'react';
import type { DistributionData } from './actions';
import DistributionMap from '@/components/distribution-map';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Store, Map as MapIcon, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageClientProps {
    data: DistributionData;
    brandId: string;
}

export default function DistributionPageClient({ data, brandId }: PageClientProps) {
    const [selectedProductId, setSelectedProductId] = useState<string>('all');

    // Filter logic
    const activeRetailers = useMemo(() => {
        if (selectedProductId === 'all') {
            return data.retailers;
        }
        const validIds = data.stockMap[selectedProductId] || [];
        return data.retailers.filter(r => validIds.includes(r.id));
    }, [selectedProductId, data]);

    // Aggregate by State
    const stateCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        activeRetailers.forEach(r => {
            const st = r.state?.toUpperCase() || 'UNKNOWN';
            counts[st] = (counts[st] || 0) + 1;
        });
        return counts;
    }, [activeRetailers]);

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">SKU Distribution</h1>
                    <p className="text-muted-foreground">Visualize your product placement across the network.</p>
                </div>
                <div className="w-full md:w-64">
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by Product" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Products</SelectItem>
                            {data.products.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Map (Takes up 2/3) */}
                <Card className="lg:col-span-2 shadow-md border-primary/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapIcon className="h-5 w-5" />
                            Geographic Coverage
                        </CardTitle>
                        <CardDescription>
                            {selectedProductId === 'all' ? 'All Retail Partners' : 'Stocking Locations'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DistributionMap retailerCountsByState={stateCounts} />
                    </CardContent>
                </Card>

                {/* Stats & List (Takes up 1/3) */}
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Doors</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{activeRetailers.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">States Active</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{Object.keys(stateCounts).length}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="h-[400px] flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Store className="h-4 w-4" />
                                Top Locations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[180px]">Name</TableHead>
                                        <TableHead>State</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activeRetailers.slice(0, 10).map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-medium text-xs truncate max-w-[120px]" title={r.name}>
                                                {r.name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{r.state}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {activeRetailers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                                                No retailers found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
