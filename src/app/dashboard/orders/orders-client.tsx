'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Loader2, Package, RefreshCw, MoreVertical, CheckCircle, Clock, XCircle, Truck, Search, Download, ArrowUpDown, ArrowUp, ArrowDown, Sparkles, AlertTriangle, Crown, Mail, Trash2, Radio, Calendar } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getOrders, updateOrderStatus, analyzeOrderWithAI, refreshOrdersCache, type FormState } from './actions';
import type { OrderDoc, OrderStatus } from '@/types/orders';
import { useOptionalFirebase } from '@/firebase/use-optional-firebase';
import { collection, query, where, onSnapshot, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { logger } from '@/lib/logger';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Eye, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';

interface OrdersPageClientProps {
    orgId: string;
    initialOrders?: OrderDoc[];
}

const STATUS_COLORS: Record<OrderStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    submitted: 'bg-blue-100 text-blue-700 border-blue-200',
    confirmed: 'bg-sky-100 text-sky-700 border-sky-200',
    preparing: 'bg-purple-100 text-purple-700 border-purple-200',
    ready: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
};

type SortField = 'id' | 'customer' | 'status' | 'total' | 'date';
type SortDirection = 'asc' | 'desc' | null;

export default function OrdersPageClient({ orgId, initialOrders }: OrdersPageClientProps) {
    const { toast } = useToast();
    const firebase = useOptionalFirebase();
    const [orders, setOrders] = useState<OrderDoc[]>(initialOrders || []);
    const [loading, setLoading] = useState(!initialOrders);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [aiInsights, setAiInsights] = useState<{ orderId: string; insights: string } | null>(null);
    const [analyzingOrderId, setAnalyzingOrderId] = useState<string | null>(null);
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<OrderDoc | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [isRealtime, setIsRealtime] = useState(false);
    const [isPOSSource, setIsPOSSource] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [dateRangeStart, setDateRangeStart] = useState('');
    const [dateRangeEnd, setDateRangeEnd] = useState('');
    const unsubscribeRef = useRef<Unsubscribe | null>(null);

    const loadOrders = useCallback(async (overrideStartDate?: string, overrideEndDate?: string) => {
        setLoading(true);
        // Use explicit overrides if provided (e.g., empty string = clear filter)
        // Otherwise fall back to current state values
        const resolvedStart = overrideStartDate !== undefined ? overrideStartDate : dateRangeStart;
        const resolvedEnd = overrideEndDate !== undefined ? overrideEndDate : dateRangeEnd;
        try {
            const result = await getOrders({
                orgId,
                startDate: resolvedStart || undefined,
                endDate: resolvedEnd || undefined,
            });
            if (result.success && result.data) {
                setOrders(result.data);
                // Detect if orders are from POS (they have IDs starting with alleaves_ or numeric IDs)
                const hasPOSOrders = result.data.some(o =>
                    o.id.startsWith('alleaves_') || /^\d+$/.test(o.id)
                );
                setIsPOSSource(hasPOSOrders);
            } else {
                toast({
                    variant: 'destructive',
                    title: "Error",
                    description: result.error || "Failed to fetch orders from server."
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Failed to fetch orders from server."
            });
        } finally{
            setLoading(false);
        }
    }, [orgId, dateRangeStart, dateRangeEnd, toast]);

    // Manual refresh with cache invalidation
    const handleManualRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            // Invalidate cache first
            const result = await refreshOrdersCache(orgId);
            if (result.success) {
                setLastRefreshed(result.refreshedAt || new Date());
                // Then reload data
                await loadOrders();
                toast({
                    title: "Refreshed",
                    description: "Orders updated with latest data from POS system.",
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Refresh Failed",
                description: error instanceof Error ? error.message : "Failed to refresh orders."
            });
        } finally {
            setRefreshing(false);
        }
    }, [orgId, loadOrders, toast]);

    useEffect(() => {
        if (!initialOrders) {
            loadOrders();
        } else {
            // Set initial last refreshed time
            setLastRefreshed(new Date());
        }
    }, [initialOrders, loadOrders]);

    // Real-time Firestore listener for orders
    // Note: For POS-integrated orgs (like Alleaves), orders come from POS API, not Firestore
    // The real-time listener supplements but doesn't replace POS orders
    useEffect(() => {
        if (!firebase?.firestore || !orgId) {
            setIsRealtime(false);
            return;
        }

        // Clean up any existing listener
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        try {
            // Set up real-time listener on orders collection
            const ordersRef = collection(firebase.firestore, 'orders');

            // Query orders where retailerId matches orgId
            const q = query(
                ordersRef,
                where('retailerId', '==', orgId),
                orderBy('createdAt', 'desc'),
                limit(500)
            );

            unsubscribeRef.current = onSnapshot(
                q,
                (snapshot) => {
                    const liveOrders = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            // Convert Firestore Timestamps to Dates for client
                            createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? new Date(),
                            updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
                            shippedAt: data.shippedAt?.toDate?.() ?? data.shippedAt,
                            deliveredAt: data.deliveredAt?.toDate?.() ?? data.deliveredAt,
                        } as OrderDoc;
                    });

                    // Only use real-time if we actually have Firestore orders
                    // If empty, orders are likely from POS API (fetched server-side)
                    if (liveOrders.length > 0) {
                        setOrders(liveOrders);
                        setIsRealtime(true);
                        setLoading(false);
                        logger.info('[ORDERS] Real-time Firestore update', { count: liveOrders.length });
                    } else {
                        // No Firestore orders - orders come from POS API
                        // Don't overwrite existing orders, just mark as not real-time
                        setIsRealtime(false);
                        logger.info('[ORDERS] No Firestore orders (POS-synced org)');
                    }
                },
                (error) => {
                    // Firestore listener error - fall back to server fetch
                    logger.warn('[ORDERS] Firestore listener error', { error: error.message });
                    setIsRealtime(false);
                }
            );

            logger.info('[ORDERS] Real-time listener established', { orgId });

        } catch (error) {
            logger.error('[ORDERS] Failed to set up real-time listener', { error: String(error) });
            setIsRealtime(false);
        }

        // Cleanup on unmount or orgId change
        return () => {
            if (unsubscribeRef.current) {
                try {
                    unsubscribeRef.current();
                } catch (cleanupError) {
                    logger.warn('[ORDERS] Error during listener cleanup', { error: String(cleanupError) });
                }
                unsubscribeRef.current = null;
            }
        };
    }, [firebase?.firestore, orgId]);

    // Filter and search orders
    const filteredOrders = useMemo(() => {
        let filtered = orders;

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => order.status === statusFilter);
        }

        // Apply search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(order =>
                order.id.toLowerCase().includes(query) ||
                order.customer.name.toLowerCase().includes(query) ||
                order.customer.email.toLowerCase().includes(query)
            );
        }

        // Apply sorting
        if (sortField && sortDirection) {
            filtered = [...filtered].sort((a, b) => {
                let aVal: any, bVal: any;

                switch (sortField) {
                    case 'id':
                        aVal = a.id;
                        bVal = b.id;
                        break;
                    case 'customer':
                        aVal = a.customer.name;
                        bVal = b.customer.name;
                        break;
                    case 'status':
                        aVal = a.status;
                        bVal = b.status;
                        break;
                    case 'total':
                        aVal = a.totals.total;
                        bVal = b.totals.total;
                        break;
                    case 'date':
                        aVal = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                        bVal = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                        break;
                    default:
                        return 0;
                }

                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [orders, statusFilter, searchQuery, sortField, sortDirection]);

    // Calculate pagination
    const totalPages = useMemo(() => Math.ceil(filteredOrders.length / pageSize), [filteredOrders.length, pageSize]);
    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredOrders.slice(startIndex, endIndex);
    }, [filteredOrders, currentPage, pageSize]);

    // Reset to page 1 when filters or page size change
    useEffect(() => {
        setCurrentPage(1);
    }, [pageSize, searchQuery, statusFilter]);

    // Auto-refresh orders (fallback when real-time isn't available)
    useEffect(() => {
        // Skip polling if real-time listener is active
        if (isRealtime || !autoRefresh) return;

        const interval = setInterval(() => {
            loadOrders();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [autoRefresh, loadOrders, isRealtime]);

    // Calculate revenue metrics
    const metrics = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOrders = orders.filter(o => {
            const orderDate = o.createdAt instanceof Date ? o.createdAt : new Date(0);
            return orderDate >= today;
        });

        const totalRevenue = orders.reduce((sum, o) => sum + o.totals.total, 0);
        const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totals.total, 0);
        const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
        const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'submitted').length;

        return {
            totalRevenue,
            todayRevenue,
            avgOrderValue,
            pendingCount,
            totalOrders: orders.length
        };
    }, [orders]);

    const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
        setUpdatingId(orderId);

        const formData = new FormData();
        formData.append('orderId', orderId);
        formData.append('newStatus', newStatus);

        const prevState: FormState = { message: '', error: false };
        const result = await updateOrderStatus(prevState, formData);

        if (!result.error) {
            toast({
                title: "Status Updated",
                description: result.message
            });
            // Update local state
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        } else {
            toast({
                variant: 'destructive',
                title: "Update Failed",
                description: result.message
            });
        }
        setUpdatingId(null);
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            // Toggle direction or reset
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortField(null);
                setSortDirection(null);
            } else {
                setSortDirection('asc');
            }
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleExportCSV = () => {
        const csvHeaders = ['Order ID', 'Customer Name', 'Customer Email', 'Status', 'Total', 'Date'];
        const csvRows = filteredOrders.map(order => [
            order.id,
            order.customer.name,
            order.customer.email,
            order.status,
            order.totals.total.toFixed(2),
            order.createdAt instanceof Date ? order.createdAt.toLocaleString() : 'N/A'
        ]);

        const csvContent = [
            csvHeaders.join(','),
            ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `orders-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Export Successful",
            description: `Exported ${filteredOrders.length} orders to CSV`
        });
    };

    const handleAIInsights = async (orderId: string) => {
        setAnalyzingOrderId(orderId);
        try {
            const result = await analyzeOrderWithAI(orderId);
            if (result.success && result.insights) {
                setAiInsights({ orderId, insights: result.insights });
            } else {
                toast({
                    variant: 'destructive',
                    title: "Analysis Failed",
                    description: result.error || "Could not analyze order"
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Failed to analyze order with AI"
            });
        } finally {
            setAnalyzingOrderId(null);
        }
    };

    // Detect potential fraud
    const detectFraud = (order: OrderDoc): { isSuspicious: boolean; reason: string } => {
        // High-value first order
        if (order.totals.total > 500 && order.customer.email.includes('no-email')) {
            return { isSuspicious: true, reason: 'High-value order without email' };
        }

        // Unusually large quantity
        const totalItems = order.items.reduce((sum, item) => sum + item.qty, 0);
        if (totalItems > 20) {
            return { isSuspicious: true, reason: 'Unusually large quantity' };
        }

        // Very high order value
        if (order.totals.total > 1000) {
            return { isSuspicious: true, reason: 'High-value transaction' };
        }

        return { isSuspicious: false, reason: '' };
    };

    // Detect VIP customers based on order history
    const detectVIP = (order: OrderDoc): { isVIP: boolean; reason: string } => {
        const customerOrders = orders.filter(o => o.customer.email === order.customer.email);
        const totalSpent = customerOrders.reduce((sum, o) => sum + o.totals.total, 0);
        const avgOrderValue = totalSpent / customerOrders.length;

        // VIP criteria
        if (customerOrders.length >= 10) {
            return { isVIP: true, reason: `${customerOrders.length} orders` };
        }
        if (totalSpent > 2000) {
            return { isVIP: true, reason: `$${totalSpent.toFixed(0)} lifetime value` };
        }
        if (avgOrderValue > 200) {
            return { isVIP: true, reason: `$${avgOrderValue.toFixed(0)} avg order` };
        }

        return { isVIP: false, reason: '' };
    };

    // Bulk selection handlers
    const handleSelectAll = () => {
        if (selectedOrders.size === paginatedOrders.length) {
            setSelectedOrders(new Set());
        } else {
            setSelectedOrders(new Set(paginatedOrders.map(o => o.id)));
        }
    };

    const handleSelectOrder = (orderId: string) => {
        const newSelected = new Set(selectedOrders);
        if (newSelected.has(orderId)) {
            newSelected.delete(orderId);
        } else {
            newSelected.add(orderId);
        }
        setSelectedOrders(newSelected);
    };

    const handleBulkStatusUpdate = async (newStatus: OrderStatus) => {
        if (selectedOrders.size === 0) return;

        setBulkUpdating(true);
        let successCount = 0;
        let failCount = 0;

        for (const orderId of selectedOrders) {
            const formData = new FormData();
            formData.append('orderId', orderId);
            formData.append('newStatus', newStatus);

            const prevState: FormState = { message: '', error: false };
            const result = await updateOrderStatus(prevState, formData);

            if (!result.error) {
                successCount++;
                // Update local state
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            } else {
                failCount++;
            }
        }

        setBulkUpdating(false);
        setSelectedOrders(new Set());

        toast({
            title: successCount > 0 ? "Bulk Update Complete" : "Bulk Update Failed",
            description: `${successCount} orders updated${failCount > 0 ? `, ${failCount} failed` : ''}`,
            variant: failCount > 0 ? 'destructive' : 'default'
        });
    };

    const handleBulkEmail = () => {
        if (selectedOrders.size === 0) return;

        const selectedOrdersList = paginatedOrders.filter(o => selectedOrders.has(o.id));
        const emails = selectedOrdersList.map(o => o.customer.email).join(',');

        // Open email client with pre-filled recipients
        window.location.href = `mailto:${emails}?subject=Order Update&body=Hello,`;

        toast({
            title: "Email Client Opened",
            description: `${selectedOrders.size} customer emails loaded`
        });
    };

    const handleClearSelection = () => {
        setSelectedOrders(new Set());
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                    <p className="text-muted-foreground">
                        Manage and track customer orders{isRealtime ? ' — updates appear instantly' : isPOSSource ? ' — synced from POS' : ''}.
                    </p>
                </div>
                <div className="flex gap-2 items-center">
                    {isPOSSource && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            <Truck className="h-3 w-3 mr-1" />
                            POS Synced
                        </Badge>
                    )}
                    {isRealtime ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 animate-pulse">
                            <Radio className="h-3 w-3 mr-1" />
                            Live
                        </Badge>
                    ) : (
                        <Button
                            variant={autoRefresh ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredOrders.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                    <div className="flex items-center gap-2">
                        {lastRefreshed && (
                            <span className="text-xs text-muted-foreground">
                                Last synced: {(() => {
                                    const seconds = Math.floor((new Date().getTime() - lastRefreshed.getTime()) / 1000);
                                    if (seconds < 60) return `${seconds}s ago`;
                                    const minutes = Math.floor(seconds / 60);
                                    if (minutes < 60) return `${minutes}m ago`;
                                    const hours = Math.floor(minutes / 60);
                                    return `${hours}h ago`;
                                })()}
                            </span>
                        )}
                        <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={refreshing || loading}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${(refreshing || loading) ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Revenue Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${metrics.totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            From {metrics.totalOrders} orders
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${metrics.todayRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            {((metrics.todayRevenue / metrics.totalRevenue) * 100).toFixed(1)}% of total
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${metrics.avgOrderValue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all orders
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.pendingCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Need attention
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedOrders.size > 0 && (
                <Card className="p-4 border-primary">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={true}
                                onCheckedChange={handleClearSelection}
                            />
                            <span className="font-medium text-sm">
                                {selectedOrders.size} order{selectedOrders.size > 1 ? 's' : ''} selected
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={bulkUpdating}>
                                        {bulkUpdating ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                        )}
                                        Update Status
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Change Status for {selectedOrders.size} orders</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('confirmed')}>
                                        <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />
                                        Mark as Confirmed
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('preparing')}>
                                        <Clock className="mr-2 h-4 w-4 text-purple-500" />
                                        Mark as Preparing
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('ready')}>
                                        <Package className="mr-2 h-4 w-4 text-indigo-500" />
                                        Mark as Ready
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('completed')}>
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                        Mark as Completed
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('cancelled')} className="text-destructive">
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Cancel Orders
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="outline" size="sm" onClick={handleBulkEmail}>
                                <Mail className="mr-2 h-4 w-4" />
                                Email Customers
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Clear Selection
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Search and Filters */}
            <Card className="p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by order ID, customer name, or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')} className="w-full lg:w-auto">
                            <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full lg:w-auto">
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="pending">Pending</TabsTrigger>
                                <TabsTrigger value="submitted">New</TabsTrigger>
                                <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                                <TabsTrigger value="preparing">Preparing</TabsTrigger>
                                <TabsTrigger value="ready">Ready</TabsTrigger>
                                <TabsTrigger value="completed">Completed</TabsTrigger>
                                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Date Range Filter */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                            <Calendar className="h-4 w-4" />
                            <span>Date range:</span>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                            <Input
                                type="date"
                                value={dateRangeStart}
                                onChange={(e) => setDateRangeStart(e.target.value)}
                                className="w-[160px]"
                                placeholder="Start date"
                            />
                            <span className="text-sm text-muted-foreground">to</span>
                            <Input
                                type="date"
                                value={dateRangeEnd}
                                onChange={(e) => setDateRangeEnd(e.target.value)}
                                className="w-[160px]"
                                placeholder="End date"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    handleManualRefresh();
                                }}
                                disabled={refreshing || loading}
                            >
                                Apply
                            </Button>
                            {(dateRangeStart || dateRangeEnd) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                        setDateRangeStart('');
                                        setDateRangeEnd('');
                                        await loadOrders('', '');
                                    }}
                                    disabled={refreshing || loading}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle>Recent Orders</CardTitle>
                            <CardDescription>
                                Showing {paginatedOrders.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} to {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} orders
                                {filteredOrders.length < orders.length && ` (filtered from ${orders.length} total)`}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Orders per page:</span>
                            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading && orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Loading orders...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                            <h3 className="text-lg font-medium">No orders yet</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto mt-1">
                                Customer orders will appear here once they are submitted through your discovery hub.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={paginatedOrders.length > 0 && selectedOrders.size === paginatedOrders.length}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all"
                                            />
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 hover:bg-transparent"
                                                onClick={() => handleSort('id')}
                                            >
                                                Order ID
                                                {sortField === 'id' && sortDirection === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
                                                {sortField === 'id' && sortDirection === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
                                                {sortField !== 'id' && <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />}
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 hover:bg-transparent"
                                                onClick={() => handleSort('customer')}
                                            >
                                                Customer
                                                {sortField === 'customer' && sortDirection === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
                                                {sortField === 'customer' && sortDirection === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
                                                {sortField !== 'customer' && <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />}
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 hover:bg-transparent"
                                                onClick={() => handleSort('status')}
                                            >
                                                Status
                                                {sortField === 'status' && sortDirection === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
                                                {sortField === 'status' && sortDirection === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
                                                {sortField !== 'status' && <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />}
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 hover:bg-transparent"
                                                onClick={() => handleSort('total')}
                                            >
                                                Total
                                                {sortField === 'total' && sortDirection === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
                                                {sortField === 'total' && sortDirection === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
                                                {sortField !== 'total' && <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />}
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 hover:bg-transparent"
                                                onClick={() => handleSort('date')}
                                            >
                                                Date
                                                {sortField === 'date' && sortDirection === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
                                                {sortField === 'date' && sortDirection === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
                                                {sortField !== 'date' && <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedOrders.map((order) => (
                                        <TableRow key={order.id} className={selectedOrders.has(order.id) ? 'bg-muted/50' : ''}>
                                            <TableCell className="w-12">
                                                <Checkbox
                                                    checked={selectedOrders.has(order.id)}
                                                    onCheckedChange={() => handleSelectOrder(order.id)}
                                                    aria-label={`Select order ${order.id}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                #{order.id.slice(-6).toUpperCase()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">{order.customer.name}</span>
                                                        {detectVIP(order).isVIP && (
                                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                                                <Crown className="h-3 w-3 mr-1" />
                                                                VIP
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">{order.customer.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className={`capitalize ${STATUS_COLORS[order.status] || ''}`}>
                                                        {order.status}
                                                    </Badge>
                                                    {detectFraud(order).isSuspicious && (
                                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs">
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                            Review
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                ${order.totals.total.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {order.createdAt ? (
                                                    (order.createdAt as any).toDate ? (order.createdAt as any).toDate().toLocaleString() : new Date(order.createdAt as any).toLocaleString()
                                                ) : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={updatingId === order.id}>
                                                            {updatingId === order.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <MoreVertical className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => setSelectedOrderForDetails(order)}>
                                                            <Eye className="mr-2 h-4 w-4 text-gray-500" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleAIInsights(order.id)} disabled={analyzingOrderId === order.id}>
                                                            {analyzingOrderId === order.id ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                                                            )}
                                                            AI Insights
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'confirmed')}>
                                                            <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />
                                                            Confirm Order
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'preparing')}>
                                                            <Clock className="mr-2 h-4 w-4 text-purple-500" />
                                                            Start Preparing
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'ready')}>
                                                            <Package className="mr-2 h-4 w-4 text-indigo-500" />
                                                            Mark Ready
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'completed')}>
                                                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                            Complete Order
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'cancelled')} className="text-destructive">
                                                            <XCircle className="mr-2 h-4 w-4" />
                                                            Cancel Order
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="py-4 border-t">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                        itemsPerPage={pageSize}
                                        totalItems={filteredOrders.length}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* AI Insights Dialog */}
            <Dialog open={!!aiInsights} onOpenChange={(open) => !open && setAiInsights(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            AI Order Insights
                        </DialogTitle>
                        <DialogDescription>
                            AI-powered analysis for order #{aiInsights?.orderId.slice(-6).toUpperCase()}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="prose prose-sm max-w-none">
                        <div
                            className="whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                                __html: aiInsights?.insights.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || ''
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Order Details Sheet */}
            <Sheet open={!!selectedOrderForDetails} onOpenChange={(open) => !open && setSelectedOrderForDetails(null)}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    {selectedOrderForDetails && (
                        <>
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    Order #{selectedOrderForDetails.id.slice(-6).toUpperCase()}
                                </SheetTitle>
                                <SheetDescription>
                                    Order details and history
                                </SheetDescription>
                            </SheetHeader>

                            <div className="mt-6 space-y-6">
                                {/* Status Badge */}
                                <div>
                                    <Badge variant="outline" className={`capitalize ${STATUS_COLORS[selectedOrderForDetails.status] || ''}`}>
                                        {selectedOrderForDetails.status}
                                    </Badge>
                                </div>

                                {/* Customer Information */}
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-sm text-muted-foreground">Customer</h3>
                                    <div className="space-y-1">
                                        <p className="font-medium">{selectedOrderForDetails.customer.name}</p>
                                        <p className="text-sm text-muted-foreground">{selectedOrderForDetails.customer.email}</p>
                                        {selectedOrderForDetails.customer.phone && (
                                            <p className="text-sm text-muted-foreground">{selectedOrderForDetails.customer.phone}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-sm text-muted-foreground">Items ({selectedOrderForDetails.items.length})</h3>
                                    <div className="space-y-3">
                                        {selectedOrderForDetails.items.map((item, index) => (
                                            <div key={index} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{item.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Quantity: {item.qty} × ${item.price.toFixed(2)}
                                                    </p>
                                                </div>
                                                <p className="font-medium">${(item.qty * item.price).toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Order Totals */}
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-sm text-muted-foreground">Order Summary</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Subtotal</span>
                                            <span>${selectedOrderForDetails.totals.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Tax</span>
                                            <span>${selectedOrderForDetails.totals.tax.toFixed(2)}</span>
                                        </div>
                                        {selectedOrderForDetails.totals.discount && selectedOrderForDetails.totals.discount > 0 && (
                                            <div className="flex justify-between text-green-600">
                                                <span>Discount</span>
                                                <span>-${selectedOrderForDetails.totals.discount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-bold text-base pt-2 border-t">
                                            <span>Total</span>
                                            <span>${selectedOrderForDetails.totals.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Metadata */}
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-sm text-muted-foreground">Order Information</h3>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Order ID</span>
                                            <span className="font-mono">{selectedOrderForDetails.id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Created</span>
                                            <span>
                                                {selectedOrderForDetails.createdAt instanceof Date
                                                    ? selectedOrderForDetails.createdAt.toLocaleString()
                                                    : new Date(selectedOrderForDetails.createdAt as any).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Mode</span>
                                            <Badge variant="outline" className="capitalize">
                                                {selectedOrderForDetails.mode}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="space-y-2 pt-4 border-t">
                                    <h3 className="font-semibold text-sm text-muted-foreground">Quick Actions</h3>
                                    <div className="flex flex-col gap-2">
                                        <Button variant="outline" onClick={() => handleAIInsights(selectedOrderForDetails.id)} className="w-full justify-start">
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            AI Insights
                                        </Button>
                                        <Button variant="outline" onClick={() => window.location.href = `mailto:${selectedOrderForDetails.customer.email}`} className="w-full justify-start">
                                            <Mail className="mr-2 h-4 w-4" />
                                            Email Customer
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
