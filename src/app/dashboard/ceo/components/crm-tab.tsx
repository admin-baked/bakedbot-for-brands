'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Store, Search, Globe, CheckCircle, XCircle } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getBrands, getDispensaries, getCRMStats, type CRMBrand, type CRMDispensary, type CRMFilters } from '@/server/services/crm-service';

const US_STATES = [
    'All States',
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
];

export default function CRMTab() {
    const { toast } = useToast();

    // Stats
    const [stats, setStats] = useState<{ totalBrands: number; totalDispensaries: number; claimedBrands: number; claimedDispensaries: number } | null>(null);

    // Brands
    const [brands, setBrands] = useState<CRMBrand[]>([]);
    const [brandsLoading, setBrandsLoading] = useState(true);
    const [brandSearch, setBrandSearch] = useState('');
    const [brandState, setBrandState] = useState('All States');

    // Dispensaries
    const [dispensaries, setDispensaries] = useState<CRMDispensary[]>([]);
    const [dispensariesLoading, setDispensariesLoading] = useState(true);
    const [dispSearch, setDispSearch] = useState('');
    const [dispState, setDispState] = useState('All States');

    useEffect(() => {
        loadStats();
        loadBrands();
        loadDispensaries();
    }, []);

    const loadStats = async () => {
        try {
            const data = await getCRMStats();
            setStats(data);
        } catch (e: any) {
            console.error('Failed to load CRM stats', e);
        }
    };

    const loadBrands = async () => {
        setBrandsLoading(true);
        try {
            const filters: CRMFilters = {};
            if (brandState !== 'All States') filters.state = brandState;
            if (brandSearch) filters.search = brandSearch;
            const data = await getBrands(filters);
            setBrands(data);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setBrandsLoading(false);
        }
    };

    const loadDispensaries = async () => {
        setDispensariesLoading(true);
        try {
            const filters: CRMFilters = {};
            if (dispState !== 'All States') filters.state = dispState;
            if (dispSearch) filters.search = dispSearch;
            const data = await getDispensaries(filters);
            setDispensaries(data);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setDispensariesLoading(false);
        }
    };

    const handleBrandSearch = () => {
        loadBrands();
    };

    const handleDispSearch = () => {
        loadDispensaries();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">CRM Lite</h2>
                <p className="text-muted-foreground">Track brands and dispensaries discovered via page generation</p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total Brands</CardDescription>
                            <CardTitle className="text-3xl">{stats.totalBrands}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total Dispensaries</CardDescription>
                            <CardTitle className="text-3xl">{stats.totalDispensaries}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Claimed Brands</CardDescription>
                            <CardTitle className="text-3xl text-green-600">{stats.claimedBrands}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Claimed Dispensaries</CardDescription>
                            <CardTitle className="text-3xl text-green-600">{stats.claimedDispensaries}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="brands">
                <TabsList>
                    <TabsTrigger value="brands" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Brands
                    </TabsTrigger>
                    <TabsTrigger value="dispensaries" className="gap-2">
                        <Store className="h-4 w-4" />
                        Dispensaries
                    </TabsTrigger>
                </TabsList>

                {/* Brands Tab */}
                <TabsContent value="brands" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Discovered Brands</CardTitle>
                            <CardDescription>
                                Brands found during page generation. National brands appear in 3+ states.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Filters */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Search brands..."
                                    value={brandSearch}
                                    onChange={(e) => setBrandSearch(e.target.value)}
                                    className="max-w-xs"
                                />
                                <Select value={brandState} onValueChange={setBrandState}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="State" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {US_STATES.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleBrandSearch}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Table */}
                            {brandsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : brands.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No brands found. Run page generation to discover brands.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>States</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Claim Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {brands.slice(0, 50).map((brand) => (
                                            <TableRow key={brand.id}>
                                                <TableCell className="font-medium">{brand.name}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {brand.states.slice(0, 3).map(s => (
                                                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                                                        ))}
                                                        {brand.states.length > 3 && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                +{brand.states.length - 3}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {brand.isNational ? (
                                                        <Badge className="bg-purple-100 text-purple-800">
                                                            <Globe className="h-3 w-3 mr-1" />
                                                            National
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary">Regional</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {brand.claimStatus === 'claimed' ? (
                                                        <Badge className="bg-green-100 text-green-800">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Claimed
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Unclaimed
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Dispensaries Tab */}
                <TabsContent value="dispensaries" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Discovered Dispensaries</CardTitle>
                            <CardDescription>
                                Dispensaries found during page generation.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Filters */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Search dispensaries..."
                                    value={dispSearch}
                                    onChange={(e) => setDispSearch(e.target.value)}
                                    className="max-w-xs"
                                />
                                <Select value={dispState} onValueChange={setDispState}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="State" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {US_STATES.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleDispSearch}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Table */}
                            {dispensariesLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : dispensaries.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No dispensaries found. Run page generation to discover dispensaries.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Claim Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dispensaries.slice(0, 50).map((disp) => (
                                            <TableRow key={disp.id}>
                                                <TableCell className="font-medium">{disp.name}</TableCell>
                                                <TableCell>
                                                    {disp.city && `${disp.city}, `}{disp.state}
                                                </TableCell>
                                                <TableCell>
                                                    {disp.claimStatus === 'claimed' ? (
                                                        <Badge className="bg-green-100 text-green-800">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Claimed
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Unclaimed
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
