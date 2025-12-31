'use client';

// src/app/dashboard/ceo/components/foot-traffic-tab.tsx
/**
 * Foot Traffic Control Center
 * Super Admin interface for managing SEO pages (Brand & Location)
 */

import { useState, useEffect } from 'react';
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
    refreshSeoPageDataAction
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

// Types
import type { LocalSEOPage, FootTrafficMetrics, BrandSEOPage, GeoZone, DropAlertConfig, LocalOffer } from '@/types/foot-traffic';
import { useMockData } from '@/hooks/use-mock-data';
import { Rocket } from 'lucide-react';

export default function FootTrafficTab() {
    const { toast } = useToast();
    const { isMock } = useMockData();
    const [activeTab, setActiveTab] = useState('pages');

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

    // Page Data State
    const [seoPages, setSeoPages] = useState<LocalSEOPage[]>([]);
    const [brandPages, setBrandPages] = useState<BrandSEOPage[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Dialogs
    const [isBrandCreatorOpen, setIsBrandCreatorOpen] = useState(false);
    const [isQuickGeneratorOpen, setIsQuickGeneratorOpen] = useState(false);
    const [isPilotOpen, setIsPilotOpen] = useState(false);

    // Filters & Selection
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
    const [isAllSelected, setIsAllSelected] = useState(false);
    
    // Pagination (Simple)
    const [pageTypeCallback, setPageTypeCallback] = useState<'zip' | 'brand'>('zip');

    // Initial Fetch
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [localPages, bPages, metricsData] = await Promise.all([
                getSeoPagesAction(),
                getBrandPagesAction(),
                getFootTrafficMetrics()
            ]);
            setSeoPages(localPages);
            setBrandPages(bPages);
            setMetrics(metricsData);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast({ title: 'Error', description: 'Failed to load data.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    // Filter Logic
    const filteredPages = seoPages.filter(page => {
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
                    {/* Discovery Pilot Button */}
                    <Button 
                        onClick={() => setIsPilotOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                    >
                        <Rocket className="h-4 w-4 mr-2" />
                        Run Discovery
                    </Button>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="pages">Location Pages (ZIPs)</TabsTrigger>
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
                                        <TableHead>Location</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Metrics</TableHead>
                                        <TableHead>Last Updated</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPages.slice(0, 50).map((page) => (
                                        <TableRow key={page.id}>
                                            <TableCell>
                                                <Checkbox 
                                                    checked={selectedPages.has(page.id)}
                                                    onCheckedChange={(c) => handleSelectPage(page.id, c as boolean)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{page.city}, {page.state}</div>
                                                <div className="text-sm text-muted-foreground font-mono">{page.zipCode}</div>
                                            </TableCell>
                                            <TableCell>
                                                {page.published ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Published</Badge>
                                                ) : (
                                                    <Badge variant="outline">Draft</Badge>
                                                )}
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
                            {filteredPages.length > 50 && (
                                <div className="p-4 text-center text-sm text-muted-foreground border-t">
                                    Showing first 50 results (Optimization needed for pagination)
                                </div>
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
                                        <TableHead>Brand Name</TableHead>
                                        <TableHead>Target Area</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {brandPages.map((page) => (
                                        <TableRow key={page.id}>
                                            <TableCell className="font-medium">{page.brandName}</TableCell>
                                            <TableCell>
                                                {page.city}, {page.state}
                                                <div className="text-xs text-muted-foreground">
                                                    {page.zipCodes.length} ZIPs ({page.radiusMiles}mi radius)
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => toggleBrandPagePublishAction(page.id, !page.published).then(fetchData)}
                                                >
                                                    {page.published ? (
                                                        <Badge className="bg-green-100 text-green-700">Live</Badge>
                                                    ) : (
                                                        <Badge variant="outline">Draft</Badge>
                                                    )}
                                                </Button>
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
