'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Users, UserPlus, AlertTriangle, Crown, Search,
    Download, Upload, Loader2, TrendingUp, Filter, Sparkles
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CustomerProfile, CustomerSegment, CRMStats, getSegmentInfo, SegmentSuggestion } from '@/types/customers';
import { getCustomers, getSuggestedSegments, type CustomersData } from './actions';
import { CustomerImport } from '@/components/crm/customer-import';

interface CRMDashboardProps {
    initialData?: CustomersData;
    brandId: string;
}

export default function CRMDashboard({ initialData, brandId }: CRMDashboardProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(!initialData);
    const [data, setData] = useState<CustomersData | null>(initialData || null);
    const [search, setSearch] = useState('');
    const [activeSegment, setActiveSegment] = useState<CustomerSegment | 'all'>('all');
    const [suggestions, setSuggestions] = useState<SegmentSuggestion[]>([]);
    const [showImportDialog, setShowImportDialog] = useState(false);

    // Debug: Log customer count
    useEffect(() => {
        console.log('[CRM_DASHBOARD] Data received:', {
            customersCount: data?.customers.length,
            hasStats: !!data?.stats,
        });
    }, [data]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getCustomers(brandId);
            setData(result);

            // Load AI suggestions
            const segs = await getSuggestedSegments(brandId);
            setSuggestions(segs);
        } catch (error) {
            console.error('Failed to load customers:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load customer data' });
        } finally {
            setLoading(false);
        }
    }, [brandId, toast]);

    useEffect(() => {
        if (!initialData) {
            loadData();
        } else {
            // Load suggestions async
            getSuggestedSegments(brandId).then(setSuggestions).catch(console.error);
        }
    }, [initialData, brandId, loadData]);

    const handleExport = () => {
        if (!data?.customers.length) return;

        const headers = ['Email', 'Name', 'Segment', 'Total Spent', 'Orders', 'Last Order', 'Tier'];
        const rows = data.customers.map(c => [
            c.email,
            c.displayName || '',
            c.segment,
            `$${c.totalSpent.toFixed(2)}`,
            c.orderCount.toString(),
            c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : 'N/A',
            c.tier
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.map(v => `"${v}"`).join(','))].join('\n');

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "customers.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filter customers
    const filteredCustomers = data?.customers.filter(c => {
        // Segment filter
        if (activeSegment !== 'all' && c.segment !== activeSegment) return false;

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            return (
                c.email.toLowerCase().includes(searchLower) ||
                c.displayName?.toLowerCase().includes(searchLower) ||
                c.firstName?.toLowerCase().includes(searchLower) ||
                c.lastName?.toLowerCase().includes(searchLower)
            );
        }
        return true;
    }) || [];

    // Debug: Log filter results
    console.log('[CRM_DASHBOARD] Filter results:', {
        totalCustomers: data?.customers.length,
        filteredCount: filteredCustomers.length,
        activeSegment,
        searchTerm: search,
    });

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const stats = data?.stats;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer CRM</h1>
                    <p className="text-muted-foreground">
                        Build personalized profiles and drive targeted marketing.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                    </Button>
                    <Button variant="outline" onClick={loadData} disabled={loading}>
                        <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={handleExport} disabled={!data?.customers.length}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            +{stats?.newThisMonth || 0} this month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
                        <Crown className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.vipCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Top spenders</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.atRiskCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Need win-back</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. LTV</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${stats?.avgLifetimeValue?.toFixed(0) || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Lifetime value</p>
                    </CardContent>
                </Card>
            </div>

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            AI Segment Suggestions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                            {suggestions.map((s, i) => (
                                <div key={i} className="p-4 bg-background rounded-lg border">
                                    <div className="font-medium text-lg">{s.name}</div>
                                    <div className="text-sm text-muted-foreground mt-1">{s.description}</div>
                                    <div className="text-xs mt-3 font-medium text-primary">{s.estimatedCount} customers</div>
                                    {s.reasoning && (
                                        <div className="text-sm mt-3 text-foreground/80 border-t pt-3">
                                            {s.reasoning}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Segment Tabs & Customer Table */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                            <CardTitle>Customer List</CardTitle>
                            <CardDescription>
                                {filteredCustomers.length} customers {activeSegment !== 'all' ? `in ${activeSegment}` : ''}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search customers..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 w-64"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeSegment} onValueChange={(v) => setActiveSegment(v as CustomerSegment | 'all')}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="vip">VIP</TabsTrigger>
                            <TabsTrigger value="loyal">Loyal</TabsTrigger>
                            <TabsTrigger value="new">New</TabsTrigger>
                            <TabsTrigger value="at_risk">At Risk</TabsTrigger>
                            <TabsTrigger value="slipping">Slipping</TabsTrigger>
                        </TabsList>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Segment</TableHead>
                                    <TableHead>Total Spent</TableHead>
                                    <TableHead>Orders</TableHead>
                                    <TableHead>Last Order</TableHead>
                                    <TableHead>Tier</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCustomers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {search ? 'No matching customers found.' : 'No customers yet. Orders will appear here.'}
                                        </TableCell>
                                    </TableRow>
                                ) : filteredCustomers.slice(0, 50).map(customer => {
                                    const segInfo = getSegmentInfo(customer.segment);
                                    return (
                                        <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{customer.displayName || customer.email}</div>
                                                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={segInfo.color}>{segInfo.label}</Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">${customer.totalSpent.toFixed(2)}</TableCell>
                                            <TableCell>{customer.orderCount}</TableCell>
                                            <TableCell suppressHydrationWarning>
                                                {customer.lastOrderDate
                                                    ? new Date(customer.lastOrderDate).toLocaleDateString()
                                                    : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">{customer.tier}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        {filteredCustomers.length > 50 && (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                                Showing 50 of {filteredCustomers.length} customers
                            </div>
                        )}
                    </Tabs>
                </CardContent>
            </Card>

            {/* Import Dialog */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Import Customers</DialogTitle>
                    </DialogHeader>
                    <CustomerImport
                        orgId={brandId}
                        onImportComplete={() => {
                            setShowImportDialog(false);
                            loadData();
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
