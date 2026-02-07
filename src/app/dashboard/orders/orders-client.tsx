'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Loader2, Package, RefreshCw, MoreVertical, CheckCircle, Clock, XCircle, Truck, Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOrders, updateOrderStatus, type FormState } from './actions';
import type { OrderDoc, OrderStatus } from '@/types/orders';

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
    const [orders, setOrders] = useState<OrderDoc[]>(initialOrders || []);
    const [loading, setLoading] = useState(!initialOrders);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getOrders({ orgId });
            if (result.success && result.data) {
                setOrders(result.data);
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
    }, [orgId, toast]);

    useEffect(() => {
        if (!initialOrders) {
            loadOrders();
        }
    }, [initialOrders, loadOrders]);

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                    <p className="text-muted-foreground">Manage and track customer orders in real-time.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredOrders.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={loadOrders} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <Card className="p-4">
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
                                        <TableRow key={order.id}>
                                            <TableCell className="font-mono text-xs">
                                                #{order.id.slice(-6).toUpperCase()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{order.customer.name}</span>
                                                    <span className="text-xs text-muted-foreground">{order.customer.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`capitalize ${STATUS_COLORS[order.status] || ''}`}>
                                                    {order.status}
                                                </Badge>
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
        </div>
    );
}
