/**
 * Dispensary Order Dashboard
 * Displays incoming orders and allows status management
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Order {
    id: string;
    customerName: string;
    items: { name: string; quantity: number }[];
    total: number;
    status: string;
    paymentStatus: string;
    createdAt: Date;
}

export default function DispensaryOrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = useCallback(async () => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch('/api/dispensary/orders', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setOrders(data.orders || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        fetchOrders();
    }, [fetchOrders, user]);

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            const token = await user?.getIdToken();
            await fetch(`/api/dispensary/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });
            fetchOrders();
        } catch (error) {
            console.error('Error updating order:', error);
        }
    };

    if (loading) return <div>Loading orders...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Incoming Orders</h1>
            <div className="space-y-4">
                {orders.map((order) => (
                    <Card key={order.id} className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold">{order.customerName}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {order.items.length} items • ${order.total.toFixed(2)}
                                </p>
                                <div className="mt-2 space-x-2">
                                    <Badge>{order.status}</Badge>
                                    <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                                        {order.paymentStatus}
                                    </Badge>
                                </div>
                            </div>
                            <div className="space-x-2">
                                {order.status === 'confirmed' && (
                                    <Button size="sm" onClick={() => updateOrderStatus(order.id, 'preparing')}>
                                        Start Preparing
                                    </Button>
                                )}
                                {order.status === 'preparing' && (
                                    <Button size="sm" onClick={() => updateOrderStatus(order.id, 'ready')}>
                                        Mark Ready
                                    </Button>
                                )}
                                {order.status === 'ready' && (
                                    <Button size="sm" onClick={() => updateOrderStatus(order.id, 'completed')}>
                                        Complete
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
