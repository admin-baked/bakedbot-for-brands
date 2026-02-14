'use client';

// src/app/dashboard/ceo/components/foot-traffic-tab.tsx
/**
 * Foot Traffic Control Center
 * Super Admin interface for managing SEO pages (Brand & Location)
 */

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
    MapPin,
    Plus,
    Trash2,
    Edit2,
    FileText,
    RefreshCw,
    Eye,
    Zap,
    Search,
    Filter,
    ArrowUpDown,
    CheckCircle2,
    XCircle,
    MoreHorizontal,
    Loader2,
    Globe,
    TrendingUp,
    Users,
    DollarSign,
    Sparkles,
    Bell,
    Tag,
    AlertTriangle
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    getSeoPagesAction,
    deleteSeoPageAction,
    getFootTrafficMetrics,
    getBrandPagesAction,
    deleteBrandPageAction,
    toggleBrandPagePublishAction,
    bulkSeoPageStatusAction,
    setTop25PublishedAction,
    refreshSeoPageDataAction,
    getDispensaryPagesAction,
    deleteDispensaryPageAction,
    toggleDispensaryPagePublishAction,
    getDiscoveryJobStatusAction
} from '../actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// Components
import { BrandPageCreatorDialog } from './brand-page-creator-dialog';
import { BulkImportSection } from './bulk-import-section';
import { QuickGeneratorDialog } from './quick-generator-dialog';
import { DiscoveryPilotDialog } from './discovery-pilot-dialog';
import { runNationalSeedAction } from '../actions';
import { runDayDayOptimization } from '@/server/actions/dayday-seo-content';

// Types
import type { LocalSEOPage, FootTrafficMetrics, BrandSEOPage, DispensarySEOPage, GeoZone, DropAlertConfig, LocalOffer } from '@/types/foot-traffic';
import { useMockData } from '@/hooks/use-mock-data';
import { Rocket } from 'lucide-react';
import { Pagination, usePagination } from '@/components/ui/pagination';
import Link from 'next/link';

export default function FootTrafficTab() {
    const { toast } = useToast();
    const { isMock } = useMockData();
    const [activeTab, setActiveTab] = useState('pages');

    // Page Data State
    const [seoPages, setSeoPages] = useState<LocalSEOPage[]>([]);
    const [brandPages, setBrandPages] = useState<BrandSEOPage[]>([]);
    const [dispensaryPages, setDispensaryPages] = useState<DispensarySEOPage[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filters & Selection
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());

    // Dialogs
    const [isBrandCreatorOpen, setIsBrandCreatorOpen] = useState(false);
    const [isQuickGeneratorOpen, setIsQuickGeneratorOpen] = useState(false);
    const [isPilotOpen, setIsPilotOpen] = useState(false);
    const [jobStatus, setJobStatus] = useState<any>(null);

    // Sorting State
    const [zipSort, setZipSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'zipCode', direction: 'asc' });
    const [brandPSort, setBrandPSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'brandName', direction: 'asc' });
    const [dispPSort, setDispPSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dispensaryName', direction: 'asc' });

    // Filter Logic (Moved up to be used in Sorted ZIPs)
    const filteredPages = useMemo(() => {
        return seoPages.filter(page => {
            const matchesSearch = 
                page.zipCode.includes(searchQuery) || 
                (page.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (page.state || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesStatus = 
                statusFilter === 'all' || 
                (statusFilter === 'published' && page.published) || 
                (statusFilter === 'draft' && !page.published);

            return matchesSearch && matchesStatus;
        });
    }, [seoPages, searchQuery, statusFilter]);

    // Sorted ZIPs
    const sortedZips = useMemo(() => {
        return [...filteredPages].sort((a, b) => {
            let aVal: any, bVal: any;
            if (zipSort.key === 'metrics.pageViews') {
                aVal = a.metrics?.pageViews || 0;
                bVal = b.metrics?.pageViews || 0;
            } else {
                aVal = String(a[zipSort.key as keyof LocalSEOPage] || '');
                bVal = String(b[zipSort.key as keyof LocalSEOPage] || '');
            }
            if (aVal < bVal) return zipSort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return zipSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredPages, zipSort]);

    // Sorted Brand Pages
    const sortedBrandPages = useMemo(() => {
        return [...brandPages].sort((a, b) => {
            const aVal = String(a[brandPSort.key as keyof BrandSEOPage] || '');
            const bVal = String(b[brandPSort.key as keyof BrandSEOPage] || '');
            if (aVal < bVal) return brandPSort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return brandPSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [brandPages, brandPSort]);

    // Sorted Dispensary Pages
    const sortedDispensaryPages = useMemo(() => {
        return [...dispensaryPages].sort((a, b) => {
            const aVal = String(a[dispPSort.key as keyof DispensarySEOPage] || '');
            const bVal = String(b[dispPSort.key as keyof DispensarySEOPage] || '');
            if (aVal < bVal) return dispPSort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return dispPSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [dispensaryPages, dispPSort]);

    // Pagination for ZIP Pages
    const {
        currentPage: zipPage,
        totalPages: zipTotalPages,
        paginatedItems: paginatedZips,
        setCurrentPage: setZipPage,
        totalItems: totalZipItems
    } = usePagination(sortedZips, 10);

    // Pagination for Brand Pages
    const {
        currentPage: brandPPage,
        totalPages: brandPTotalPages,
        paginatedItems: paginatedBrandPages,
        setCurrentPage: setBrandPPage,
        totalItems: totalBrandPItems
    } = usePagination(sortedBrandPages, 10);

    // Pagination for Dispensary Pages
    const {
        currentPage: dispPPage,
        totalPages: dispPTotalPages,
        paginatedItems: paginatedDispensaryPages,
        setCurrentPage: setDispPPage,
        totalItems: totalDispPItems
    } = usePagination(sortedDispensaryPages, 10);

    const toggleZipSort = (key: string) => {
        setZipSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleBrandPSort = (key: string) => {
        setBrandPSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleDispPSort = (key: string) => {
        setDispPSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortIcon = ({ column, currentSort }: { column: string, currentSort: { key: string, direction: 'asc' | 'desc' } }) => {
        if (currentSort.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
        return currentSort.direction === 'asc' ? 
            <TrendingUp className="ml-2 h-4 w-4 text-primary rotate-0" /> : 
            <TrendingUp className="ml-2 h-4 w-4 text-primary rotate-180" />;
    };

    // Metrics State
    const [metrics, setMetrics] = useState<FootTrafficMetrics>({
        period: 'month',
        startDate: new Date(),
        endDate: new Date(),
        seo: { totalPages: 0, totalPageViews: 0, topZipCodes: [] },
        alerts: { configured: 0, triggered: 0, sent: 0, conversionRate: 0 },
        offers: { active: 0, totalImpressions: 0, totalRedemptions: 0, revenueGenerated: 0 },
        discovery: { searchesPerformed: 0, productsViewed: 0, retailerClicks: 0 },
    });

    // Results & Indicators
    const totalSelected = selectedPages.size;
    const [isAllSelected, setIsAllSelected] = useState(false);
    
    // Pagination (Simple)
    const [pageTypeCallback, setPageTypeCallback] = useState<'zip' | 'brand'>('zip');

    // Initial Fetch
    useEffect(() => {
        fetchData();
    }, []);

    // Poll for Job Status
    useEffect(() => {
        const interval = setInterval(async () => {
            const status = await getDiscoveryJobStatusAction();
            setJobStatus(status);
            
            // Auto-refresh when job completes
            if (status?.status === 'completed' && status?.endTime) {
                const endTime = new Date(status.endTime).getTime();
                const now = Date.now();
                if (now - endTime < 10000) { // Only refresh if it completed recently (last 10s)
                   // We could verify strictness but essentially we want to catch the transition
                }
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Separate effect to handle completion refresh to avoid interval complexity
        if (jobStatus?.status === 'completed' && !isLoading) {
             // Maybe explicitly trigger refresh if we see a change?
             // For now let's just rely on global "Refresh" or user action, OR
             // simple logic: if itemsFound > itemsProcessed (running) -> fine.
        }
    }, [jobStatus?.status]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [localPages, bPages, dPages, metricsData] = await Promise.all([
                getSeoPagesAction(),
                getBrandPagesAction(),
                getDispensaryPagesAction(),
                getFootTrafficMetrics()
            ]);
            setSeoPages(localPages);
            setBrandPages(bPages);
            setDispensaryPages(dPages);
            setMetrics(metricsData);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast({ title: 'Error', description: 'Failed to load data.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };


    // Selection Handlers
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedPages(new Set(filteredPages.map(p => p.id)));
            setIsAllSelected(true);
        } else {
            setSelectedPages(new Set());
            setIsAllSelected(false);
        }
    };

    const handleSelectPage = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedPages);
        if (checked) newSelected.add(id);
        else newSelected.delete(id);
        setSelectedPages(newSelected);
        setIsAllSelected(false);
    };

    // Bulk Actions
    const handleBulkStatus = async (publish: boolean) => {
        if (selectedPages.size === 0) return;
        try {
            await bulkSeoPageStatusAction(Array.from(selectedPages), 'zip', publish);
            toast({ title: 'Success', description: `Updated ${selectedPages.size} pages.` });
            fetchData();
            setSelectedPages(new Set());
        } catch (error) {
            toast({ title: 'Error', variant: 'destructive' });
        }
    };

    // Delete Action
    const handleDelete = async (id: string, type: 'zip' | 'brand') => {
        if (!confirm('Are you sure?')) return;
        try {
            if (type === 'zip') await deleteSeoPageAction(id);
            else await deleteBrandPageAction(id);
            
            toast({ title: 'Deleted', description: 'Page removed successfully.' });
            fetchData();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete page.', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Discovery Hub</h2>
                    <p className="text-muted-foreground">
                        Generate and manage SEO pages for Brands, Dispensaries, and Locations.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => fetchData()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button 
                        variant="secondary"
                        onClick={() => setIsBrandCreatorOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Brand Page
                    </Button>
                    {/* Custom Discovery Button */}
                    <Button 
                        variant="outline"
                        onClick={() => setIsPilotOpen(true)}
                    >
                        <Rocket className="h-4 w-4 mr-2" />
                        Custom Discovery
                    </Button>
                    {/* Seed All Markets - Creates all 3 page types */}
                    <Button 
                        onClick={async () => {
                            toast({ title: 'Starting National Seed...', description: 'Creating Dispensary + Brand + Location pages for Chicago & Detroit' });
                            const result = await runNationalSeedAction();
                            if (result.error) {
                                toast({ title: 'Error', description: result.message, variant: 'destructive' });
                            } else {
                                toast({ title: 'Started!', description: result.message });
                                setTimeout(fetchData, 3000); // Refresh after delay
                            }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                    >
                        <Globe className="h-4 w-4 mr-2" />
                        Seed All Markets
                    </Button>
                    {/* Run Day Day SEO - Optimizes page content with AI */}
                    <Button 
                        variant="outline"
                        className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                        onClick={async () => {
                            toast({ title: 'Day Day Activated 🔍', description: 'Generating unique SEO content for all pages...' });
                            try {
                                const result = await runDayDayOptimization();
                                const total = result.zip.optimized + result.dispensary.optimized + result.brand.optimized;
                                toast({ 
                                    title: 'Day Day Complete ✨', 
                                    description: `Optimized ${total} pages (ZIP: ${result.zip.optimized}, Dispensary: ${result.dispensary.optimized}, Brand: ${result.brand.optimized})` 
                                });
                                fetchData();
                            } catch (e: any) {
                                toast({ title: 'Error', description: e.message, variant: 'destructive' });
                            }
                        }}
                    >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Run Day Day
                    </Button>
                </div>
            </div>

            {/* Job Status Banner */}
            {jobStatus && jobStatus.status === 'running' && (
                <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-4 rounded-md flex items-center justify-between animate-pulse">
                     <div className="flex items-center">
                        <Loader2 className="h-5 w-5 text-indigo-600 animate-spin mr-3" />
                         <div>
                            <p className="font-medium text-indigo-700">Discovery Engine Running...</p>
                             <p className="text-sm text-indigo-600">
                                Found {jobStatus.itemsFound || 0} items. Processing {jobStatus.itemsProcessed || 0}...
                             </p>
                        </div>
                   </div>
                </div>
            )}

            {/* Status Legend */}
            <div className="flex flex-wrap items-center gap-6 px-4 py-3 bg-muted/30 rounded-lg border text-sm">
                <span className="font-semibold text-muted-foreground">Status Legend:</span>
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm" />
                    <span>Live & Optimized (Day Day)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-amber-400 shadow-sm" />
                    <span>Live (Seeder Only)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500 shadow-sm" />
                    <span>Draft / Unpublished</span>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="pages">Location Pages (ZIPs)</TabsTrigger>
                    <TabsTrigger value="dispensaries">Dispensary Pages</TabsTrigger>
                    <TabsTrigger value="brands">Brand Pages</TabsTrigger>
                    <TabsTrigger value="import">Bulk Import</TabsTrigger>
                </TabsList>

                {/* ZIP Pages Tab */}
                <TabsContent value="pages" className="space-y-4">
                    {/* Filters Toolbar */}
                    <div className="flex items-center justify-between gap-4 bg-background p-1 rounded-lg border">
                        <div className="flex items-center gap-2 flex-1 px-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search ZIP, City, State..." 
                                className="border-0 focus-visible:ring-0 shadow-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 pr-2">
                            {selectedPages.size > 0 && (
                                <>
                                    <span className="text-sm text-muted-foreground">{selectedPages.size} selected</span>
                                    <Button size="sm" variant="outline" onClick={() => handleBulkStatus(true)}>Publish</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleBulkStatus(false)}>Unpublish</Button>
                                </>
                            )}
                            <div className="h-6 w-px bg-border mx-2" />
                            <select 
                                className="text-sm bg-transparent border-none outline-none text-muted-foreground hover:text-foreground cursor-pointer"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                            >
                                <option value="all">All Status</option>
                                <option value="published">Published</option>
                                <option value="draft">Drafts</option>
                            </select>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-20 text-center text-muted-foreground">Loading pages...</div>
                    ) : filteredPages.length === 0 ? (
                        <div className="py-20 text-center border rounded-lg border-dashed bg-muted/10">
                            <p className="text-muted-foreground mb-4">No pages found matching your filters.</p>
                            <Button onClick={() => setIsPilotOpen(true)}>Generate Your First Batch</Button>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox 
                                                checked={isAllSelected}
                                                onCheckedChange={handleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleZipSort('city')}
                                        >
                                            <div className="flex items-center">
                                                Location
                                                <SortIcon column="city" currentSort={zipSort} />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleZipSort('published')}
                                        >
                                            <div className="flex items-center">
                                                Status
                                                <SortIcon column="published" currentSort={zipSort} />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleZipSort('metrics.pageViews')}
                                        >
                                            <div className="flex items-center">
                                                Metrics
                                                <SortIcon column="metrics.pageViews" currentSort={zipSort} />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleZipSort('lastRefreshed')}
                                        >
                                            <div className="flex items-center">
                                                Last Updated
                                                <SortIcon column="lastRefreshed" currentSort={zipSort} />
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedZips.map((page) => (
                                        <TableRow key={page.id}>
                                            <TableCell>
                                                <Checkbox 
                                                    checked={selectedPages.has(page.id)}
                                                    onCheckedChange={(c) => handleSelectPage(page.id, c as boolean)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {/* SEO Optimization Status Indicator */}
                                                    <span 
                                                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                                            !page.published 
                                                                ? 'bg-red-500'     // Red = Draft
                                                                : (page as any).seoOptimized 
                                                                    ? 'bg-emerald-500' // Green = Optimized
                                                                    : 'bg-amber-400'   // Yellow = Seeder
                                                        }`}
                                                        title={!page.published ? 'Draft' : ((page as any).seoOptimized ? 'Day Day Optimized' : 'Awaiting Optimization')}
                                                    />
                                                    <div>
                                                        <Link href={`/zip/${page.zipCode}`} target="_blank" className="font-medium hover:underline hover:text-primary">
                                                            {page.city}, {page.state}
                                                        </Link>
                                                        <div className="text-sm text-muted-foreground font-mono">{page.zipCode}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/zip/${page.zipCode}`} target="_blank">
                                                    {page.published ? (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 cursor-pointer">Published</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="cursor-pointer hover:bg-muted">Draft</Badge>
                                                    )}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <span className="font-bold">{page.metrics?.pageViews || 0}</span> views
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {page.productCount || 0} products
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {page.lastRefreshed ? new Date(page.lastRefreshed).toLocaleDateString() : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(page.id, 'zip')}>
                                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {filteredPages.length > 0 && (
                                <Pagination
                                    currentPage={zipPage}
                                    totalPages={zipTotalPages}
                                    onPageChange={setZipPage}
                                    itemsPerPage={10}
                                    totalItems={totalZipItems}
                                    className="p-4 border-t"
                                />
                            )}
                        </div>
                    )}
                </TabsContent>

                {/* Brand Pages Tab */}
                <TabsContent value="brands">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Brand Pages</CardTitle>
                                <CardDescription>Custom landing pages for brands targeting specific zones</CardDescription>
                            </div>
                            <Button size="sm" onClick={() => setIsBrandCreatorOpen(true)}>Create New</Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead 
                                            className="cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleBrandPSort('brandName')}
                                        >
                                            <div className="flex items-center">
                                                Brand Name
                                                <SortIcon column="brandName" currentSort={brandPSort} />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleBrandPSort('city')}
                                        >
                                            <div className="flex items-center">
                                                Target Area
                                                <SortIcon column="city" currentSort={brandPSort} />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleBrandPSort('published')}
                                        >
                                            <div className="flex items-center">
                                                Status
                                                <SortIcon column="published" currentSort={brandPSort} />
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedBrandPages.map((page) => (
                                        <TableRow key={page.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {/* Status Dot */}
                                                    <span 
                                                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                                            !page.published 
                                                                ? 'bg-red-500'
                                                                : (page.contentBlock ? 'bg-emerald-500' : 'bg-amber-400') // Heuristic for brands
                                                        }`}
                                                    />
                                                    <Link href={`/brands/${page.brandSlug}`} target="_blank" className="font-medium hover:underline hover:text-primary">
                                                        {page.brandName}
                                                    </Link>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {page.city}, {page.state}
                                                <div className="text-xs text-muted-foreground">
                                                    {page.zipCodes.length} ZIPs ({page.radiusMiles}mi radius)
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/brands/${page.brandSlug}`} target="_blank">
                                                    {page.published ? (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer">Live</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="cursor-pointer hover:bg-muted">Draft</Badge>
                                                    )}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(page.id, 'brand')}>
                                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {brandPages.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No brand pages created yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            {brandPages.length > 0 && (
                                <Pagination
                                    currentPage={brandPPage}
                                    totalPages={brandPTotalPages}
                                    onPageChange={setBrandPPage}
                                    itemsPerPage={10}
                                    totalItems={totalBrandPItems}
                                    className="p-4 border-t"
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Dispensary Pages Tab */}
                <TabsContent value="dispensaries" className="space-y-4">
                    <Card>
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                                <span>Discovered Dispensaries ({dispensaryPages.length})</span>
                                <span className="text-xs text-muted-foreground">
                                    Dispensaries found via Discovery. Brands are extracted from these.
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead 
                                            className="cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleDispPSort('dispensaryName')}
                                        >
                                            <div className="flex items-center">
                                                Dispensary
                                                <SortIcon column="dispensaryName" currentSort={dispPSort} />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleDispPSort('city')}
                                        >
                                            <div className="flex items-center">
                                                Location
                                                <SortIcon column="city" currentSort={dispPSort} />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleDispPSort('zipCode')}
                                        >
                                            <div className="flex items-center">
                                                ZIP
                                                <SortIcon column="zipCode" currentSort={dispPSort} />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleDispPSort('published')}
                                        >
                                            <div className="flex items-center">
                                                Status
                                                <SortIcon column="published" currentSort={dispPSort} />
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => toggleDispPSort('updatedAt')}
                                        >
                                            <div className="flex items-center">
                                                Last Updated
                                                <SortIcon column="updatedAt" currentSort={dispPSort} />
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedDispensaryPages.map(page => (
                                        <TableRow key={page.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {/* SEO Optimization Status Indicator */}
                                                    <span 
                                                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                                            !page.published
                                                                ? 'bg-red-500' // Red = Unpublished
                                                                : (page as any).seoOptimized 
                                                                    ? 'bg-emerald-500' // Green = Optimized
                                                                    : 'bg-amber-400'   // Yellow = Basic
                                                        }`}
                                                        title={!page.published ? 'Draft' : ((page as any).seoOptimized ? 'Day Day Optimized' : 'Awaiting Day Day Optimization')}
                                                    />
                                                    {page.logoUrl && (
                                                        <img 
                                                            src={page.logoUrl} 
                                                            alt={page.dispensaryName} 
                                                            className="h-8 w-8 rounded object-cover"
                                                        />
                                                    )}
                                                    <div>
                                                        <Link href={`/dispensaries/${page.dispensarySlug}`} target="_blank" className="font-medium hover:underline hover:text-primary block">
                                                            {page.dispensaryName}
                                                        </Link>
                                                        <div className="text-xs text-muted-foreground">
                                                            {page.dispensarySlug}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {page.city}, {page.state}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{page.zipCode}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/dispensaries/${page.dispensarySlug}`} target="_blank">
                                                    {page.published ? (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 cursor-pointer">Live</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="cursor-pointer hover:bg-muted">Draft</Badge>
                                                    )}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">
                                                    {new Date(page.updatedAt).toLocaleDateString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => deleteDispensaryPageAction(page.id).then(fetchData)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {dispensaryPages.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No dispensary pages discovered yet. Run Discovery to find dispensaries.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            {dispensaryPages.length > 0 && (
                                <Pagination
                                    currentPage={dispPPage}
                                    totalPages={dispPTotalPages}
                                    onPageChange={setDispPPage}
                                    itemsPerPage={10}
                                    totalItems={totalDispPItems}
                                    className="p-4 border-t"
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Bulk Import Tab */}
                <TabsContent value="import">
                    <BulkImportSection onImportComplete={fetchData} />
                </TabsContent>
            </Tabs>

            {/* Dialogs */}
            <BrandPageCreatorDialog 
                open={isBrandCreatorOpen} 
                onOpenChange={setIsBrandCreatorOpen}
                onSuccess={fetchData}
            />

            <QuickGeneratorDialog 
                open={isQuickGeneratorOpen} 
                onOpenChange={setIsQuickGeneratorOpen}
                onSuccess={fetchData}
            />

            <DiscoveryPilotDialog 
                open={isPilotOpen} 
                onOpenChange={setIsPilotOpen}
                onSuccess={fetchData}
            />
        </div>
    );
}
