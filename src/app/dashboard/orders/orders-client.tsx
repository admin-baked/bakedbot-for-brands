'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Loader2, Package, RefreshCw, MoreVertical, CheckCircle, Clock, XCircle, Truck } from 'lucide-react';
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

export default function OrdersPageClient({ orgId, initialOrders }: OrdersPageClientProps) {
    const { toast } = useToast();
    const [orders, setOrders] = useState<OrderDoc[]>(initialOrders || []);
    const [loading, setLoading] = useState(!initialOrders);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                    <p className="text-muted-foreground">Manage and track customer orders in real-time.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadOrders} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>
                        {orders.length} orders found.
                    </CardDescription>
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
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((order) => (
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
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
