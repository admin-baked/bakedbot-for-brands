'use client';

// src/app/dashboard/ceo/components/foot-traffic-tab.tsx
/**
 * Foot Traffic Control Center
 * Super Admin interface for managing geo zones, SEO pages, drop alerts, and local offers
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
    MapPin,
    Plus,
    Trash2,
    Edit2,
    Bell,
    Tag,
    FileText,
    RefreshCw,
    Eye,
    Loader2,
    Globe,
    TrendingUp,
    Users,
    DollarSign,
    Zap,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    MoreHorizontal,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
// import { db } from '@/firebase/client'; // Removed client db usage
// import { collection, getDocs, query, orderBy } from 'firebase/firestore'; // Removed
import {
    getSeoPagesAction,
    seedSeoPageAction,
    deleteSeoPageAction,
    getFootTrafficMetrics,
    getBrandPagesAction,
    deleteBrandPageAction,
    toggleBrandPagePublishAction,
    bulkPublishBrandPagesAction,
    toggleSeoPagePublishAction,
    bulkSeoPageStatusAction,
    setTop25PublishedAction
} from '../actions';
import { Checkbox } from '@/components/ui/checkbox';

// Brand Page Components
import { BrandPageCreatorDialog } from './brand-page-creator-dialog';
import { BulkImportSection } from './bulk-import-section';

// ... existing imports
import type { GeoZone, DropAlertConfig, LocalOffer, LocalSEOPage, FootTrafficMetrics, BrandSEOPage } from '@/types/foot-traffic';
import { Sparkles } from 'lucide-react';

// Mock data for demonstration
const MOCK_GEO_ZONES: GeoZone[] = [
    {
        id: 'zone_1',
        name: 'Los Angeles Metro',
        description: 'Greater LA area including Hollywood, DTLA, and surrounding neighborhoods',
        zipCodes: ['90001', '90002', '90003', '90004', '90005', '90006', '90007', '90008', '90010', '90011'],
        radiusMiles: 15,
        centerLat: 34.0522,
        centerLng: -118.2437,
        state: 'CA',
        city: 'Los Angeles',
        priority: 10,
        enabled: true,
        features: {
            seoPages: true,
            dropAlerts: true,
            localOffers: true,
            geoDiscovery: true,
        },
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-12-01'),
        createdBy: 'martez@bakedbot.ai',
    },
    {
        id: 'zone_2',
        name: 'San Francisco Bay',
        description: 'Bay Area including SF, Oakland, and San Jose',
        zipCodes: ['94102', '94103', '94104', '94105', '94107', '94108', '94109', '94110'],
        radiusMiles: 25,
        centerLat: 37.7749,
        centerLng: -122.4194,
        state: 'CA',
        city: 'San Francisco',
        priority: 8,
        enabled: true,
        features: {
            seoPages: true,
            dropAlerts: true,
            localOffers: false,
            geoDiscovery: true,
        },
        createdAt: new Date('2024-02-20'),
        updatedAt: new Date('2024-11-15'),
        createdBy: 'martez@bakedbot.ai',
    },
    {
        id: 'zone_3',
        name: 'Chicago Metro',
        description: 'Chicago and surrounding suburbs',
        zipCodes: ['60601', '60602', '60603', '60604', '60605', '60606', '60607', '60608'],
        radiusMiles: 20,
        centerLat: 41.8781,
        centerLng: -87.6298,
        state: 'IL',
        city: 'Chicago',
        priority: 7,
        enabled: false,
        features: {
            seoPages: true,
            dropAlerts: false,
            localOffers: false,
            geoDiscovery: true,
        },
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-10-20'),
        createdBy: 'jack@bakedbot.ai',
    },
];

const MOCK_METRICS: FootTrafficMetrics = {
    period: 'month',
    startDate: new Date('2024-11-01'),
    endDate: new Date('2024-11-30'),
    seo: {
        totalPages: 156,
        totalPageViews: 24500,
        topZipCodes: [
            { zipCode: '90210', views: 3200 },
            { zipCode: '94102', views: 2800 },
            { zipCode: '60601', views: 2100 },
        ],
    },
    alerts: {
        configured: 42,
        triggered: 187,
        sent: 1456,
        conversionRate: 12.5,
    },
    offers: {
        active: 8,
        totalImpressions: 45000,
        totalRedemptions: 892,
        revenueGenerated: 28450,
    },
    discovery: {
        searchesPerformed: 8900,
        productsViewed: 34000,
        retailerClicks: 4500,
    },
};

import { useMockData } from '@/hooks/use-mock-data';

// ... existing imports

export default function FootTrafficTab() {
    const { toast } = useToast();
    const { isMock } = useMockData();
    const [activeTab, setActiveTab] = useState('overview');

    // Initialize with empty or mock depending on mode, or useEffect to set
    const [geoZones, setGeoZones] = useState<GeoZone[]>([]);
    // Initialize with empty object to avoid null checks
    const [metrics, setMetrics] = useState<FootTrafficMetrics>({
        period: 'month',
        startDate: new Date(),
        endDate: new Date(),
        seo: { totalPages: 0, totalPageViews: 0, topZipCodes: [] },
        alerts: { configured: 0, triggered: 0, sent: 0, conversionRate: 0 },
        offers: { active: 0, totalImpressions: 0, totalRedemptions: 0, revenueGenerated: 0 },
        discovery: { searchesPerformed: 0, productsViewed: 0, retailerClicks: 0 },
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);

    useEffect(() => {
        if (isMock) {
            setGeoZones(MOCK_GEO_ZONES);
            setMetrics(MOCK_METRICS);
        } else {
            // In live mode, we would fetch from Firestore
            // For now, we'll start empty to avoid showing fake data
            setGeoZones([]);
            // Keep default empty metrics
        }
    }, [isMock]);

    // SEO Page State
    const [seoPages, setSeoPages] = useState<LocalSEOPage[]>([]);
    const [isGeneratePageOpen, setIsGeneratePageOpen] = useState(false);
    const [seedData, setSeedData] = useState({ zipCode: '', featuredDispensaryName: '' });
    const [isSeeding, setIsSeeding] = useState(false);

    // Pagination State - configurable 10-100
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Selection State for bulk actions
    const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
    const [isAllSelected, setIsAllSelected] = useState(false);

    // Status Filter
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

    // Bulk action loading state
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    // Brand Page State
    const [brandPages, setBrandPages] = useState<BrandSEOPage[]>([]);
    const [isBrandPageDialogOpen, setIsBrandPageDialogOpen] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: keyof LocalSEOPage | 'name'; direction: 'asc' | 'desc' } | null>(null);
    const [brandSortConfig, setBrandSortConfig] = useState<{ key: keyof BrandSEOPage; direction: 'asc' | 'desc' } | null>(null);

    // Sort Handler for SEO Pages
    const handleSort = (key: keyof LocalSEOPage | 'name') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Sort Handler for Brand Pages
    const handleBrandSort = (key: keyof BrandSEOPage) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (brandSortConfig && brandSortConfig.key === key && brandSortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setBrandSortConfig({ key, direction });
    };

    // Compute filtered and sorted pages
    const filteredSeoPages = seoPages
        .filter(page => {
            if (statusFilter === 'all') return true;
            if (statusFilter === 'published') return page.published === true;
            if (statusFilter === 'draft') return page.published !== true;
            return true;
        })
        .sort((a, b) => {
            if (!sortConfig) return 0;
            const { key, direction } = sortConfig;

            let aValue: any = a[key as keyof LocalSEOPage];
            let bValue: any = b[key as keyof LocalSEOPage];

            // Handle special cases or nested keys if needed (none currently for LocalSEOPage)
            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });

    const sortedBrandPages = [...brandPages].sort((a, b) => {
        if (!brandSortConfig) return 0;
        const { key, direction } = brandSortConfig;

        let aValue: any = a[key];
        let bValue: any = b[key];

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Compute status counts
    const publishedCount = seoPages.filter(p => p.published === true).length;
    const draftCount = seoPages.filter(p => p.published !== true).length;

    // Handle select all
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const currentPageIds = filteredSeoPages
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map(p => p.id || p.zipCode);
            setSelectedPages(new Set(currentPageIds));
            setIsAllSelected(true);
        } else {
            setSelectedPages(new Set());
            setIsAllSelected(false);
        }
    };

    // Handle single select
    const handleSelectPage = (pageId: string, checked: boolean) => {
        const newSelected = new Set(selectedPages);
        if (checked) {
            newSelected.add(pageId);
        } else {
            newSelected.delete(pageId);
        }
        setSelectedPages(newSelected);
        setIsAllSelected(false);
    };

    // Handle bulk publish/unpublish
    const handleBulkUpdateStatus = async (publish: boolean) => {
        if (selectedPages.size === 0) {
            toast({ title: 'No Selection', description: 'Please select pages first.', variant: 'destructive' });
            return;
        }

        setIsBulkUpdating(true);
        try {
            // Determine page type from first selected page
            const firstPage = seoPages.find(p => selectedPages.has(p.id || p.zipCode));
            const pageType = firstPage?.pageType === 'dispensary' ? 'dispensary' : 'zip';

            const result = await bulkSeoPageStatusAction(
                Array.from(selectedPages),
                pageType,
                publish
            );

            if (result.error) {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            } else {
                toast({ title: 'Success', description: result.message });
                setSelectedPages(new Set());
                setIsAllSelected(false);
                fetchSeoPages();
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update pages.', variant: 'destructive' });
        } finally {
            setIsBulkUpdating(false);
        }
    };

    // Handle Set Top 25 Published
    const handleSetTop25Published = async () => {
        setIsBulkUpdating(true);
        try {
            const result = await setTop25PublishedAction();
            if (result.error) {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            } else {
                toast({
                    title: 'Success',
                    description: `Published: ${result.published}, Draft: ${result.draft}`
                });
                fetchSeoPages();
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update pages.', variant: 'destructive' });
        } finally {
            setIsBulkUpdating(false);
        }
    };

    // Fetch SEO Pages
    const fetchSeoPages = async () => {
        try {
            // Replaced with Server Action
            const pages = await getSeoPagesAction();
            setSeoPages(pages);

            // Also fetch metrics
            const metricsData = await getFootTrafficMetrics();
            setMetrics(metricsData);
        } catch (error) {
            console.error('Error fetching SEO pages:', error);
        }
    };

    // Fetch Brand Pages
    const fetchBrandPages = async () => {
        try {
            const pages = await getBrandPagesAction();
            setBrandPages(pages);
        } catch (error) {
            console.error('Error fetching brand pages:', error);
        }
    };

    // Handle delete brand page
    const handleDeleteBrandPage = async (id: string) => {
        if (!confirm('Are you sure you want to delete this brand page?')) return;
        try {
            const result = await deleteBrandPageAction(id);
            if (result.error) {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            } else {
                toast({ title: 'Deleted', description: result.message });
                fetchBrandPages();
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete brand page.', variant: 'destructive' });
        }
    };

    // Handle toggle publish
    const handleToggleBrandPagePublish = async (id: string, published: boolean) => {
        try {
            const result = await toggleBrandPagePublishAction(id, published);
            if (result.error) {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            } else {
                toast({ title: published ? 'Published' : 'Unpublished', description: result.message });
                fetchBrandPages();
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update publish status.', variant: 'destructive' });
        }
    };

    useEffect(() => {
        if (activeTab === 'seo-pages') {
            fetchSeoPages();
            fetchBrandPages();
        }
    }, [activeTab]);

    const handleGeneratePage = async () => {
        if (!seedData.zipCode) {
            toast({
                title: 'Missing ZIP Code',
                description: 'Please enter a valid ZIP code.',
                variant: 'destructive',
            });
            return;
        }

        setIsSeeding(true);

        try {
            // Replaced with Server Action
            const result = await seedSeoPageAction(seedData);

            if (result.error) {
                toast({
                    title: 'Generation Failed',
                    description: result.message,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Page Generated',
                    description: result.message,
                });
                setSeedData({ zipCode: '', featuredDispensaryName: '' });
                setIsGeneratePageOpen(false);
                fetchSeoPages(); // Refresh list
            }

        } catch (error) {
            console.error('Error seeding page:', error);
            toast({
                title: 'Generation Failed',
                description: 'Could not generate the SEO page. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSeeding(false);
        }

    };

    const handleDeletePage = async (zipCode: string) => {
        if (!confirm(`Are you sure you want to delete the SEO page for ${zipCode}?`)) {
            return;
        }

        try {
            const result = await deleteSeoPageAction(zipCode);
            if (result.error) {
                toast({
                    title: 'Delete Failed',
                    description: result.message,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Page Deleted',
                    description: result.message,
                });
                fetchSeoPages(); // Refresh list
            }
        } catch (error) {
            console.error('Error deleting page:', error);
            toast({
                title: 'Delete Failed',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
    };


    // New zone form state
    const [newZone, setNewZone] = useState({
        name: '',
        description: '',
        zipCodes: '',
        radiusMiles: 15,
        state: '',
        city: '',
        priority: 5,
    });

    const handleAddZone = async () => {
        if (!newZone.name || !newZone.zipCodes || !newZone.state) {
            toast({
                title: 'Missing Fields',
                description: 'Please fill in all required fields.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const zone: GeoZone = {
            id: `zone_${Date.now()}`,
            name: newZone.name,
            description: newZone.description,
            zipCodes: newZone.zipCodes.split(',').map(z => z.trim()),
            radiusMiles: newZone.radiusMiles,
            centerLat: 0, // Would be calculated from ZIP codes
            centerLng: 0,
            state: newZone.state,
            city: newZone.city,
            priority: newZone.priority,
            enabled: true,
            features: {
                seoPages: true,
                dropAlerts: true,
                localOffers: true,
                geoDiscovery: true,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'martez@bakedbot.ai',
        };

        setGeoZones([...geoZones, zone]);
        setIsAddZoneOpen(false);
        setNewZone({
            name: '',
            description: '',
            zipCodes: '',
            radiusMiles: 15,
            state: '',
            city: '',
            priority: 5,
        });

        toast({
            title: 'Zone Created',
            description: `${zone.name} has been added successfully.`,
        });

        setIsLoading(false);
    };

    const handleToggleZone = (zoneId: string, enabled: boolean) => {
        setGeoZones(zones =>
            zones.map(z =>
                z.id === zoneId ? { ...z, enabled, updatedAt: new Date() } : z
            )
        );

        toast({
            title: enabled ? 'Zone Enabled' : 'Zone Disabled',
            description: `The zone has been ${enabled ? 'activated' : 'deactivated'}.`,
        });
    };

    const handleDeleteZone = (zoneId: string) => {
        setGeoZones(zones => zones.filter(z => z.id !== zoneId));
        toast({
            title: 'Zone Deleted',
            description: 'The geo zone has been removed.',
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Foot Traffic Control Center</h2>
                    <p className="text-muted-foreground">
                        Manage geo zones, SEO pages, drop alerts, and local offers powered by CannMenus
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Zap className="h-3 w-3 mr-1" />
                        CannMenus Connected
                    </Badge>
                </div>
            </div>

            {/* Sub-tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="geo-zones">
                        <MapPin className="h-4 w-4 mr-2" />
                        Geo Zones
                    </TabsTrigger>
                    <TabsTrigger value="seo-pages">
                        <FileText className="h-4 w-4 mr-2" />
                        SEO Pages
                    </TabsTrigger>
                    <TabsTrigger value="drop-alerts">
                        <Bell className="h-4 w-4 mr-2" />
                        Drop Alerts
                    </TabsTrigger>
                    <TabsTrigger value="local-offers">
                        <Tag className="h-4 w-4 mr-2" />
                        Local Offers
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Metrics Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">SEO Pages</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.seo.totalPages}</div>
                                <p className="text-xs text-muted-foreground">
                                    {(metrics.seo.totalPageViews || 0).toLocaleString()} page views this month
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                                <Bell className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.alerts.configured}</div>
                                <p className="text-xs text-muted-foreground">
                                    {metrics.alerts.conversionRate}% conversion rate
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Offers</CardTitle>
                                <Tag className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.offers.active}</div>
                                <p className="text-xs text-muted-foreground">
                                    {metrics.offers.totalRedemptions} redemptions
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Revenue Impact</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    ${metrics.offers.revenueGenerated.toLocaleString()}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    From local offers this month
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Active Geo Zones Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Geo Zones</CardTitle>
                            <CardDescription>
                                {geoZones.filter(z => z.enabled).length} of {geoZones.length} zones active
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {geoZones.filter(z => z.enabled).slice(0, 5).map(zone => (
                                    <div key={zone.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                                                <MapPin className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{zone.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {zone.zipCodes.length} ZIP codes • {zone.radiusMiles} mi radius
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">Priority: {zone.priority}</Badge>
                                            {zone.features.seoPages && <Badge variant="secondary">SEO</Badge>}
                                            {zone.features.dropAlerts && <Badge variant="secondary">Alerts</Badge>}
                                            {zone.features.localOffers && <Badge variant="secondary">Offers</Badge>}
                                        </div>
                                    </div>
                                ))}
                                {geoZones.filter(z => z.enabled).length === 0 && (
                                    <div className="text-center py-4 text-muted-foreground">
                                        <MapPin className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                                        <p>No active geo zones found.</p>
                                        <Button variant="link" onClick={() => setActiveTab('geo-zones')}>Create a Zone</Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top ZIP Codes */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Performing ZIP Codes</CardTitle>
                            <CardDescription>By page views this month</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {metrics.seo.topZipCodes.length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground">
                                        <p>No data available yet.</p>
                                    </div>
                                ) : (
                                    metrics.seo.topZipCodes.map((zip, index) => (
                                        <div key={zip.zipCode} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium">
                                                    {index + 1}
                                                </div>
                                                <span className="font-mono">{zip.zipCode}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium">{zip.views.toLocaleString()}</p>
                                                <p className="text-xs text-muted-foreground">views</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Geo Zones Tab */}
                <TabsContent value="geo-zones" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Geographic Zones</h3>
                            <p className="text-sm text-muted-foreground">
                                Define marketing zones by ZIP code ranges for targeted foot traffic campaigns
                            </p>
                        </div>
                        <Dialog open={isAddZoneOpen} onOpenChange={setIsAddZoneOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Zone
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Create New Geo Zone</DialogTitle>
                                    <DialogDescription>
                                        Define a geographic area for targeted foot traffic campaigns
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="zone-name">Zone Name *</Label>
                                        <Input
                                            id="zone-name"
                                            placeholder="e.g., Los Angeles Metro"
                                            value={newZone.name}
                                            onChange={e => setNewZone({ ...newZone, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="zone-description">Description</Label>
                                        <Textarea
                                            id="zone-description"
                                            placeholder="Brief description of the zone..."
                                            value={newZone.description}
                                            onChange={e => setNewZone({ ...newZone, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="zone-state">State *</Label>
                                            <Select
                                                value={newZone.state}
                                                onValueChange={value => setNewZone({ ...newZone, state: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select state" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="CA">California</SelectItem>
                                                    <SelectItem value="CO">Colorado</SelectItem>
                                                    <SelectItem value="IL">Illinois</SelectItem>
                                                    <SelectItem value="MI">Michigan</SelectItem>
                                                    <SelectItem value="NV">Nevada</SelectItem>
                                                    <SelectItem value="OR">Oregon</SelectItem>
                                                    <SelectItem value="WA">Washington</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="zone-city">City</Label>
                                            <Input
                                                id="zone-city"
                                                placeholder="e.g., Los Angeles"
                                                value={newZone.city}
                                                onChange={e => setNewZone({ ...newZone, city: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="zone-zips">ZIP Codes * (comma-separated)</Label>
                                        <Textarea
                                            id="zone-zips"
                                            placeholder="90001, 90002, 90003, ..."
                                            value={newZone.zipCodes}
                                            onChange={e => setNewZone({ ...newZone, zipCodes: e.target.value })}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Enter ZIP codes separated by commas. You can also enter ranges like 90001-90099.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="zone-radius">Radius (miles)</Label>
                                            <Input
                                                id="zone-radius"
                                                type="number"
                                                min={1}
                                                max={50}
                                                value={newZone.radiusMiles}
                                                onChange={e => setNewZone({ ...newZone, radiusMiles: parseInt(e.target.value) || 15 })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="zone-priority">Priority (1-10)</Label>
                                            <Input
                                                id="zone-priority"
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={newZone.priority}
                                                onChange={e => setNewZone({ ...newZone, priority: parseInt(e.target.value) || 5 })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddZoneOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleAddZone} disabled={isLoading}>
                                        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        Create Zone
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Zones Table */}
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Zone</TableHead>
                                        <TableHead>State</TableHead>
                                        <TableHead>ZIP Codes</TableHead>
                                        <TableHead>Radius</TableHead>
                                        <TableHead>Features</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {geoZones.map(zone => (
                                        <TableRow key={zone.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{zone.name}</p>
                                                    {zone.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                                            {zone.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{zone.state}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-sm">{zone.zipCodes.length}</span>
                                            </TableCell>
                                            <TableCell>{zone.radiusMiles} mi</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {zone.features.seoPages && (
                                                        <Badge variant="secondary" className="text-xs">SEO</Badge>
                                                    )}
                                                    {zone.features.dropAlerts && (
                                                        <Badge variant="secondary" className="text-xs">Alerts</Badge>
                                                    )}
                                                    {zone.features.localOffers && (
                                                        <Badge variant="secondary" className="text-xs">Offers</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{zone.priority}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={zone.enabled}
                                                    onCheckedChange={checked => handleToggleZone(zone.id, checked)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteZone(zone.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SEO Pages Tab */}
                {/* SEO Pages Tab */}
                <TabsContent value="seo-pages" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Neighborhood Budtender Pages</h3>
                            <p className="text-sm text-muted-foreground">
                                Auto-generated SEO pages for local cannabis search rankings
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={fetchSeoPages}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh All
                            </Button>

                            <Dialog open={isGeneratePageOpen} onOpenChange={setIsGeneratePageOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Generate Page
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Generate SEO Page</DialogTitle>
                                        <DialogDescription>
                                            Manually seed a new local landing page.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>ZIP Code</Label>
                                            <Input
                                                placeholder="e.g. 90004"
                                                value={seedData.zipCode}
                                                onChange={(e) => setSeedData({ ...seedData, zipCode: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Featured Dispensary (Optional)</Label>
                                            <Input
                                                placeholder="Search by name..."
                                                value={seedData.featuredDispensaryName}
                                                onChange={(e) => setSeedData({ ...seedData, featuredDispensaryName: e.target.value })}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                If found, this dispensary will be highlighted on the page.
                                            </p>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsGeneratePageOpen(false)}>Cancel</Button>
                                        <Button onClick={handleGeneratePage} disabled={isSeeding}>
                                            {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Generate
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* SEO Pages Stats */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{seoPages.length}</div>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer hover:border-green-400 transition-colors" onClick={() => setStatusFilter('published')}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    Published
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer hover:border-yellow-400 transition-colors" onClick={() => setStatusFilter('draft')}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-yellow-600" />
                                    Draft
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-yellow-600">{draftCount}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Page Views (30d)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics?.seo.totalPageViews.toLocaleString() ?? 0}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bulk Actions Toolbar */}
                    <Card className="p-4">
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Filter Buttons */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Filter:</span>
                                <Button
                                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter('all')}
                                >
                                    All ({seoPages.length})
                                </Button>
                                <Button
                                    variant={statusFilter === 'published' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter('published')}
                                >
                                    Published ({publishedCount})
                                </Button>
                                <Button
                                    variant={statusFilter === 'draft' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter('draft')}
                                >
                                    Draft ({draftCount})
                                </Button>
                            </div>

                            {/* Bulk Actions */}
                            {selectedPages.size > 0 && (
                                <div className="flex items-center gap-2 border-l pl-4">
                                    <span className="text-sm text-muted-foreground">{selectedPages.size} selected</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleBulkUpdateStatus(true)}
                                        disabled={isBulkUpdating}
                                    >
                                        {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                                        Publish Selected
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleBulkUpdateStatus(false)}
                                        disabled={isBulkUpdating}
                                    >
                                        {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                                        Set to Draft
                                    </Button>
                                </div>
                            )}

                            {/* Set Top 25 Button */}
                            <div className="ml-auto flex items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleSetTop25Published}
                                    disabled={isBulkUpdating}
                                >
                                    {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                                    Set Top 25 Published
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* SEO Pages Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Generated Pages ({filteredSeoPages.length})</CardTitle>
                            <CardDescription>Preview and manage auto-generated local pages</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={isAllSelected}
                                                onCheckedChange={handleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('zipCode')}>
                                            ZIP Code {sortConfig?.key === 'zipCode' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('city')}>
                                            City {sortConfig?.key === 'city' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('state')}>
                                            State {sortConfig?.key === 'state' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </TableHead>
                                        <TableHead>Featured</TableHead>
                                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('published')}>
                                            Status {sortConfig?.key === 'published' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSeoPages.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                {seoPages.length === 0
                                                    ? 'No pages generated yet. Click "Generate Page" to start.'
                                                    : 'No pages match the current filter.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSeoPages
                                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                            .map(page => {
                                                const pageId = page.id || page.zipCode;
                                                return (
                                                    <TableRow key={pageId}>
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={selectedPages.has(pageId)}
                                                                onCheckedChange={(checked) => handleSelectPage(pageId, !!checked)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-mono font-medium">{page.zipCode}</TableCell>
                                                        <TableCell>{page.city || 'Unknown'}</TableCell>
                                                        <TableCell><Badge variant="outline">{page.state || 'N/A'}</Badge></TableCell>
                                                        <TableCell>
                                                            {page.featuredDispensaryName ? (
                                                                <Badge variant="default" className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-0">
                                                                    {page.featuredDispensaryName}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-sm">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {page.published ? (
                                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                    Published
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-0">
                                                                    <XCircle className="h-3 w-3 mr-1" />
                                                                    Draft
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                                        <span className="sr-only">Open menu</span>
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                    <DropdownMenuItem onClick={() => window.open(`/local/${page.zipCode}`, '_blank')}>
                                                                        <Eye className="mr-2 h-4 w-4" /> View Page
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => toast({ title: "Refreshed", description: "Snapshot updated." })}>
                                                                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh Snapshot
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => toast({ title: "Partner Featured", description: "Partner added to page." })}>
                                                                        <Plus className="mr-2 h-4 w-4" /> Feature Partner
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => toast({ title: "Unpublished", description: "Page has been hidden." })}>
                                                                        <XCircle className="mr-2 h-4 w-4" /> Unpublish
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => toast({ title: "Analytics", description: "Opening analytics view..." })}>
                                                                        <TrendingUp className="mr-2 h-4 w-4" /> View Analytics
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        className="text-destructive focus:text-destructive"
                                                                        onClick={() => handleDeletePage(page.zipCode)}
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Page
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                    )}
                                </TableBody>
                            </Table>

                            {/* Pagination Controls */}
                            {filteredSeoPages.length > itemsPerPage && (
                                <div className="flex items-center justify-between py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Show</span>
                                        <Select
                                            value={itemsPerPage.toString()}
                                            onValueChange={(value) => {
                                                setItemsPerPage(parseInt(value));
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="w-[80px] h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="25">25</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                                <SelectItem value="100">100</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <span className="text-sm text-muted-foreground">per page</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="text-sm text-muted-foreground">
                                            Page {currentPage} of {Math.ceil(filteredSeoPages.length / itemsPerPage)}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredSeoPages.length / itemsPerPage)))}
                                            disabled={currentPage >= Math.ceil(filteredSeoPages.length / itemsPerPage)}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Brand Pages Section */}
                    <div className="mt-8 pt-8 border-t">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                    Brand Pages
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Brand-specific SEO pages for targeted foot traffic campaigns
                                </p>
                            </div>
                            <Button onClick={() => setIsBrandPageDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Generate Brand Page
                            </Button>
                        </div>

                        {/* Brand Pages Stats */}
                        <div className="grid gap-4 md:grid-cols-3 mb-6">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Total Brand Pages</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{brandPages.length}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Published</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">
                                        {brandPages.filter(p => p.published).length}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Drafts</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {brandPages.filter(p => !p.published).length}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Brand Pages Table */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Brand Page Directory</CardTitle>
                                    <CardDescription>Manage brand-specific local landing pages</CardDescription>
                                </div>
                                {brandPages.filter(p => !p.published).length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            const draftCount = brandPages.filter(p => !p.published).length;
                                            if (!confirm(`Publish all ${draftCount} draft brand pages?`)) return;
                                            const result = await bulkPublishBrandPagesAction(true);
                                            toast({
                                                title: result.error ? 'Error' : 'Published!',
                                                description: result.message,
                                                variant: result.error ? 'destructive' : 'default'
                                            });
                                            if (!result.error) fetchBrandPages();
                                        }}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Publish All Drafts ({brandPages.filter(p => !p.published).length})
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleBrandSort('brandName')}>
                                                Brand {brandSortConfig?.key === 'brandName' && (brandSortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </TableHead>
                                            <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleBrandSort('zipCodes')}>
                                                ZIP Code {brandSortConfig?.key === 'zipCodes' && (brandSortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </TableHead>
                                            <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleBrandSort('city')}>
                                                City {brandSortConfig?.key === 'city' && (brandSortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </TableHead>
                                            <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleBrandSort('state')}>
                                                State {brandSortConfig?.key === 'state' && (brandSortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </TableHead>
                                            <TableHead>CTA</TableHead>
                                            <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleBrandSort('published')}>
                                                Status {brandSortConfig?.key === 'published' && (brandSortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {brandPages.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    No brand pages yet. Click "Generate Brand Page" to create one.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            sortedBrandPages
                                                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                                .map(page => (
                                                    <TableRow key={page.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {page.logoUrl ? (
                                                                    <img src={page.logoUrl} alt={page.brandName} className="h-6 w-6 rounded" />
                                                                ) : (
                                                                    <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                                                                        <Sparkles className="h-3 w-3 text-primary" />
                                                                    </div>
                                                                )}
                                                                <span className="font-medium">{page.brandName}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-mono">{page.zipCodes?.[0] || '-'}</TableCell>
                                                        <TableCell>{page.city}</TableCell>
                                                        <TableCell><Badge variant="outline">{page.state}</Badge></TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="capitalize">
                                                                {page.ctaType?.replace(/_/g, ' ') || 'default'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {page.published ? (
                                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                    Published
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary">
                                                                    Draft
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                                        <span className="sr-only">Open menu</span>
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                    <DropdownMenuItem onClick={() => page.zipCodes?.[0] && window.open(`/brands/${page.brandSlug}/near/${page.zipCodes[0]}`, '_blank')}>
                                                                        <Eye className="mr-2 h-4 w-4" /> View Page
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    {page.published ? (
                                                                        <DropdownMenuItem onClick={() => handleToggleBrandPagePublish(page.id, false)}>
                                                                            <XCircle className="mr-2 h-4 w-4" /> Unpublish
                                                                        </DropdownMenuItem>
                                                                    ) : (
                                                                        <DropdownMenuItem onClick={() => handleToggleBrandPagePublish(page.id, true)}>
                                                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Publish
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        className="text-destructive focus:text-destructive"
                                                                        onClick={() => handleDeleteBrandPage(page.id)}
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bulk Import Section */}
                    <Card className="mt-8">
                        <CardContent className="pt-6">
                            <BulkImportSection onImportComplete={fetchBrandPages} />
                        </CardContent>
                    </Card>

                    {/* Brand Page Creator Dialog */}
                    <BrandPageCreatorDialog
                        open={isBrandPageDialogOpen}
                        onOpenChange={setIsBrandPageDialogOpen}
                        onSuccess={fetchBrandPages}
                    />
                </TabsContent>

                {/* Drop Alerts Tab */}
                <TabsContent value="drop-alerts" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Drop Alerts Engine</h3>
                            <p className="text-sm text-muted-foreground">
                                Automated notifications for restocks, price drops, and competitor stockouts
                            </p>
                        </div>
                        <Button onClick={() => toast({
                            title: 'Coming Soon',
                            description: 'Alert rule creation will be available in a future update.',
                        })}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Alert Rule
                        </Button>
                    </div>

                    {/* Alert Stats */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Configured</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.alerts.configured}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Triggered (30d)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.alerts.triggered}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Sent</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.alerts.sent.toLocaleString()}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.alerts.conversionRate}%</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Alert Rules */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Alert Rules</CardTitle>
                            <CardDescription>Configure automatic alert triggers</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Alert Type</TableHead>
                                        <TableHead>Targeting</TableHead>
                                        <TableHead>Channels</TableHead>
                                        <TableHead>Triggered</TableHead>
                                        <TableHead>Conversions</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[
                                        { type: 'Restock Alert', target: 'All Products', channels: ['SMS', 'Email'], triggered: 87, conversions: 12, enabled: true },
                                        { type: 'Price Drop', target: 'Flower Category', channels: ['SMS', 'Push'], triggered: 45, conversions: 8, enabled: true },
                                        { type: 'Competitor Stockout', target: 'Top 10 SKUs', channels: ['Email'], triggered: 23, conversions: 5, enabled: true },
                                        { type: 'Flash Sale', target: 'Concentrates', channels: ['SMS', 'Email', 'Push'], triggered: 32, conversions: 15, enabled: false },
                                    ].map((alert, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Bell className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{alert.type}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{alert.target}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {alert.channels.map(ch => (
                                                        <Badge key={ch} variant="secondary" className="text-xs">{ch}</Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>{alert.triggered}</TableCell>
                                            <TableCell>{alert.conversions}</TableCell>
                                            <TableCell>
                                                <Switch checked={alert.enabled} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Local Offers Tab */}
                <TabsContent value="local-offers" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Dynamic Local Offers</h3>
                            <p className="text-sm text-muted-foreground">
                                AI-generated hyperlocal promotions with compliance pre-flight
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => toast({
                                title: 'Coming Soon',
                                description: 'AI-generated offers will be available in a future update.',
                            })}>
                                <Zap className="h-4 w-4 mr-2" />
                                AI Generate
                            </Button>
                            <Button onClick={() => toast({
                                title: 'Coming Soon',
                                description: 'Manual offer creation will be available in a future update.',
                            })}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Offer
                            </Button>
                        </div>
                    </div>

                    {/* Offer Stats */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Active</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.offers.active}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Impressions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.offers.totalImpressions.toLocaleString()}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Redemptions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.offers.totalRedemptions}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">${metrics.offers.revenueGenerated.toLocaleString()}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Offers List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Offers</CardTitle>
                            <CardDescription>Manage active and pending offers</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Offer</TableHead>
                                        <TableHead>Zone</TableHead>
                                        <TableHead>Discount</TableHead>
                                        <TableHead>Valid Until</TableHead>
                                        <TableHead>Compliance</TableHead>
                                        <TableHead>Generated By</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[
                                        { title: '20% Off Flower Friday', zone: 'Los Angeles Metro', discount: '20%', validUntil: 'Dec 8', compliance: 'approved', generatedBy: 'AI', status: 'active' },
                                        { title: 'BOGO Edibles Weekend', zone: 'San Francisco Bay', discount: 'BOGO', validUntil: 'Dec 10', compliance: 'approved', generatedBy: 'Manual', status: 'active' },
                                        { title: '$10 Off First Purchase', zone: 'All Zones', discount: '$10', validUntil: 'Dec 31', compliance: 'pending', generatedBy: 'AI', status: 'pending' },
                                        { title: 'Concentrate Clearance', zone: 'Denver Metro', discount: '30%', validUntil: 'Dec 15', compliance: 'rejected', generatedBy: 'AI', status: 'draft' },
                                    ].map((offer, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{offer.title}</TableCell>
                                            <TableCell>{offer.zone}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{offer.discount}</Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{offer.validUntil}</TableCell>
                                            <TableCell>
                                                {offer.compliance === 'approved' && (
                                                    <Badge className="bg-green-100 text-green-700">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Approved
                                                    </Badge>
                                                )}
                                                {offer.compliance === 'pending' && (
                                                    <Badge variant="secondary">
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                        Pending
                                                    </Badge>
                                                )}
                                                {offer.compliance === 'rejected' && (
                                                    <Badge variant="destructive">
                                                        <XCircle className="h-3 w-3 mr-1" />
                                                        Rejected
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={offer.generatedBy === 'AI' ? 'secondary' : 'outline'}>
                                                    {offer.generatedBy === 'AI' && <Zap className="h-3 w-3 mr-1" />}
                                                    {offer.generatedBy}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {offer.status === 'active' && <Badge className="bg-green-100 text-green-700">Active</Badge>}
                                                {offer.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                                                {offer.status === 'draft' && <Badge variant="outline">Draft</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
