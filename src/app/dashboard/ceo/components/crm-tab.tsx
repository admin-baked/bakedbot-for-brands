'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Store, Search, Globe, CheckCircle, XCircle, Inbox, Send, ArrowUpDown, TrendingUp } from 'lucide-react';
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
import { getBrands, getDispensaries, getPlatformLeads, getCRMStats, type CRMBrand, type CRMDispensary, type CRMLead, type CRMFilters } from '@/server/services/crm-service';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { inviteToClaimAction } from '../actions';

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
    const [stats, setStats] = useState<{ totalBrands: number; totalDispensaries: number; claimedBrands: number; claimedDispensaries: number; totalPlatformLeads: number } | null>(null);

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

    // Leads (Platform)
    const [leads, setLeads] = useState<CRMLead[]>([]);
    const [leadsLoading, setLeadsLoading] = useState(true);
    const [leadSearch, setLeadSearch] = useState(''); // Search by email/company

    // Sorting State
    const [brandSort, setBrandSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
    const [dispSort, setDispSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

    // Sorted Brands
    const sortedBrands = useMemo(() => {
        return [...brands].sort((a, b) => {
            const aVal = String(a[brandSort.key as keyof CRMBrand] || '');
            const bVal = String(b[brandSort.key as keyof CRMBrand] || '');
            if (aVal < bVal) return brandSort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return brandSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [brands, brandSort]);

    // Sorted Dispensaries
    const sortedDispensaries = useMemo(() => {
        return [...dispensaries].sort((a, b) => {
            const aVal = String(a[dispSort.key as keyof CRMDispensary] || '');
            const bVal = String(b[dispSort.key as keyof CRMDispensary] || '');
            if (aVal < bVal) return dispSort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return dispSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [dispensaries, dispSort]);

    // Paginated Brands
    const {
        currentPage: brandsPage,
        totalPages: brandsTotalPages,
        paginatedItems: paginatedBrands,
        setCurrentPage: setBrandsPage,
        totalItems: totalBrandsItems
    } = usePagination(sortedBrands, 10);

    // Paginated Dispensaries
    const {
        currentPage: dispPage,
        totalPages: dispTotalPages,
        paginatedItems: paginatedDispensaries,
        setCurrentPage: setDispPage,
        totalItems: totalDispItems
    } = usePagination(sortedDispensaries, 10);

    // Paginated Leads
    const {
        currentPage: leadsPage,
        totalPages: leadsTotalPages,
        paginatedItems: paginatedLeads,
        setCurrentPage: setLeadsPage,
        totalItems: totalLeadsItems
    } = usePagination(leads, 10);

    useEffect(() => {
        loadStats();
        loadBrands();
        loadDispensaries();
        loadLeads();
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
            const filters: CRMFilters = { limit: 200 }; // Increase limit
            if (brandState !== 'All States') filters.state = brandState;
            if (brandSearch) filters.search = brandSearch;
            const data = await getBrands(filters);
            setBrands(data);
            setBrandsPage(1); // Reset page
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setBrandsLoading(false);
        }
    };

    const loadDispensaries = async () => {
        setDispensariesLoading(true);
        try {
            const filters: CRMFilters = { limit: 200 }; // Increase limit
            if (dispState !== 'All States') filters.state = dispState;
            if (dispSearch) filters.search = dispSearch;
            const data = await getDispensaries(filters);
            setDispensaries(data);
            setDispPage(1); // Reset page
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setDispensariesLoading(false);
        }
    };

    const loadLeads = async () => {
        setLeadsLoading(true);
        try {
            const filters: CRMFilters = { limit: 200 }; // Increase limit
            if (leadSearch) filters.search = leadSearch;
            const data = await getPlatformLeads(filters);
            setLeads(data);
            setLeadsPage(1); // Reset page
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setLeadsLoading(false);
        }
    };

    const handleBrandSearch = () => {
        loadBrands();
    };

    const handleDispSearch = () => {
        loadDispensaries();
    };

    const handleLeadSearch = () => {
        loadLeads();
    };

    const toggleBrandSort = (key: string) => {
        setBrandSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleDispSort = (key: string) => {
        setDispSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleInvite = async (type: 'brand' | 'dispensary', org: CRMBrand | CRMDispensary) => {
        try {
            const result = await inviteToClaimAction(org.id, type);

            if (!result.error) {
                toast({ title: 'Success', description: result.message || `Invite sent successfully` });
                // Reload to show updated status
                if (type === 'brand') loadBrands();
                else loadDispensaries();
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to send invite' });
        }
    };

    const SortIcon = ({ column, currentSort }: { column: string, currentSort: { key: string, direction: 'asc' | 'desc' } }) => {
        if (currentSort.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
        return currentSort.direction === 'asc' ? 
            <TrendingUp className="ml-2 h-4 w-4 text-primary rotate-0" /> : 
            <TrendingUp className="ml-2 h-4 w-4 text-primary rotate-180" />;
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
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Inbound Leads</CardDescription>
                            <CardTitle className="text-3xl text-blue-600">{stats.totalPlatformLeads}</CardTitle>
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
                    <TabsTrigger value="leads" className="gap-2">
                        <Inbox className="h-4 w-4" />
                        Inbound Leads
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
                                            <TableHead 
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleBrandSort('name')}
                                            >
                                                <div className="flex items-center">
                                                    Name
                                                    <SortIcon column="name" currentSort={brandSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead>States</TableHead>
                                            <TableHead 
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleBrandSort('isNational')}
                                            >
                                                <div className="flex items-center">
                                                    Type
                                                    <SortIcon column="isNational" currentSort={brandSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleBrandSort('source')}
                                            >
                                                <div className="flex items-center">
                                                    Source
                                                    <SortIcon column="source" currentSort={brandSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleBrandSort('claimStatus')}
                                            >
                                                <div className="flex items-center">
                                                    Status
                                                    <SortIcon column="claimStatus" currentSort={brandSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleBrandSort('discoveredAt')}
                                            >
                                                <div className="flex items-center">
                                                    Discovered
                                                    <SortIcon column="discoveredAt" currentSort={brandSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedBrands.map((brand) => (
                                            <TableRow key={brand.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {brand.logoUrl && (
                                                            <img src={brand.logoUrl} alt={brand.name} className="h-6 w-6 rounded-full object-cover" />
                                                        )}
                                                        <div>
                                                            <div>{brand.name}</div>
                                                            {brand.website && (
                                                                <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center hover:underline">
                                                                    <Globe className="h-3 w-3 mr-1" />
                                                                    {new URL(brand.website).hostname}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {brand.states.map(s => (
                                                            <Badge key={s} variant="outline" className="text-[10px] py-0">{s}</Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={brand.isNational ? "default" : "secondary"}>
                                                        {brand.isNational ? 'National' : 'Local'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">{brand.source}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {brand.claimStatus === 'claimed' ? (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                                            Claimed
                                                        </Badge>
                                                    ) : brand.claimStatus === 'invited' ? (
                                                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                                                            Invited
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-muted-foreground">Unclaimed</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(brand.discoveredAt).toLocaleDateString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {brand.claimStatus !== 'claimed' && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                                            onClick={() => handleInvite('brand', brand)}
                                                        >
                                                            <Send className="h-3 w-3" />
                                                            Invite
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {brands.length > 0 && !brandsLoading && (
                                <Pagination
                                    currentPage={brandsPage}
                                    totalPages={brandsTotalPages}
                                    onPageChange={setBrandsPage}
                                    itemsPerPage={10}
                                    totalItems={totalBrandsItems}
                                    className="mt-4"
                                />
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
                                            <TableHead 
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleDispSort('name')}
                                            >
                                                <div className="flex items-center">
                                                    Name
                                                    <SortIcon column="name" currentSort={dispSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleDispSort('state')}
                                            >
                                                <div className="flex items-center">
                                                    Location
                                                    <SortIcon column="state" currentSort={dispSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleDispSort('address')}
                                            >
                                                <div className="flex items-center">
                                                    Address
                                                    <SortIcon column="address" currentSort={dispSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleDispSort('source')}
                                            >
                                                <div className="flex items-center">
                                                    Source
                                                    <SortIcon column="source" currentSort={dispSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleDispSort('claimStatus')}
                                            >
                                                <div className="flex items-center">
                                                    Status
                                                    <SortIcon column="claimStatus" currentSort={dispSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead 
                                                className="cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => toggleDispSort('discoveredAt')}
                                            >
                                                <div className="flex items-center">
                                                    Discovered
                                                    <SortIcon column="discoveredAt" currentSort={dispSort} />
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedDispensaries.map((disp) => (
                                            <TableRow key={disp.id}>
                                                <TableCell className="font-medium">{disp.name}</TableCell>
                                                <TableCell>
                                                    {disp.city && `${disp.city}, `}{disp.state}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {disp.address || 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">{disp.source || 'discovery'}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {disp.claimStatus === 'claimed' ? (
                                                        <Badge className="bg-green-100 text-green-800">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Claimed
                                                        </Badge>
                                                    ) : disp.claimStatus === 'invited' ? (
                                                        <Badge className="bg-blue-100 text-blue-800">
                                                            <Inbox className="h-3 w-3 mr-1" />
                                                            Invited
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Unclaimed
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {disp.discoveredAt ? new Date(disp.discoveredAt).toLocaleDateString() : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {disp.claimStatus !== 'claimed' && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                                            onClick={() => handleInvite('dispensary', disp)}
                                                        >
                                                            <Send className="h-3 w-3" />
                                                            Invite
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {dispensaries.length > 0 && !dispensariesLoading && (
                                <Pagination
                                    currentPage={dispPage}
                                    totalPages={dispTotalPages}
                                    onPageChange={setDispPage}
                                    itemsPerPage={10}
                                    totalItems={totalDispItems}
                                    className="mt-4"
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>


                {/* Leads Tab */}
                <TabsContent value="leads" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Inbound Platform Leads</CardTitle>
                            <CardDescription>
                                B2B prospects captured via Agent Playground and claim flows.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Filters */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Search by email or company..."
                                    value={leadSearch}
                                    onChange={(e) => setLeadSearch(e.target.value)}
                                    className="max-w-xs"
                                />
                                <Button onClick={handleLeadSearch}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Table */}
                            {leadsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : leads.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No leads found. Check Agent Playground activity.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Company</TableHead>
                                            <TableHead>Source</TableHead>
                                            <TableHead>Demos</TableHead>
                                            <TableHead>Captured</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedLeads.map((lead) => (
                                            <TableRow key={lead.id}>
                                                <TableCell className="font-medium">
                                                    <div>{lead.email}</div>
                                                </TableCell>
                                                <TableCell>{lead.company}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{lead.source}</Badge>
                                                </TableCell>
                                                <TableCell>{lead.demoCount}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {new Date(lead.createdAt).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {leads.length > 0 && !leadsLoading && (
                                <Pagination
                                    currentPage={leadsPage}
                                    totalPages={leadsTotalPages}
                                    onPageChange={setLeadsPage}
                                    itemsPerPage={10}
                                    totalItems={totalLeadsItems}
                                    className="mt-4"
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
