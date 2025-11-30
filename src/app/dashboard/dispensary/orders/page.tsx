/**
 * Dispensary Order Dashboard
 * Displays incoming orders and allows status management
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { logger } from '@/lib/logger';
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

    useEffect(() => {
        if (!user) return;

        const { firestore } = initializeFirebase();
        let unsubscribe: () => void;

        const setupListener = async () => {
            try {
                const token = await user.getIdTokenResult();
                // In a real app, we'd get the dispensaryId from the user profile or claims
                // For now, we'll listen to all orders to ensure it works for the demo
                // const dispensaryId = token.claims.dispensaryId as string;

                const ordersQuery = query(
                    collection(firestore, 'orders'),
                    // where('dispensaryId', '==', dispensaryId), // Uncomment when dispensaryId is fully wired
                    where('status', 'in', ['confirmed', 'preparing', 'ready']),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );

                unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
                    const newOrders = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdAt: doc.data().createdAt?.toDate(),
                    })) as Order[];
                    setOrders(newOrders);
                    setLoading(false);
                }, (error) => {
                    logger.error("Error listening to orders:", error instanceof Error ? error : new Error(String(error)));
                    setLoading(false);
                });
            } catch (error) {
                logger.error("Error setting up listener:", error instanceof Error ? error : new Error(String(error)));
                setLoading(false);
            }
        };

        setupListener();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]);

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/dispensary/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                const data = await res.json();
                alert(`Error: ${data.error || 'Failed to update order'}`);
            }
            // No need to fetchOrders() as the snapshot listener will update automatically
        } catch (error) {
            logger.error('Error updating order:', error instanceof Error ? error : new Error(String(error)));
            alert('Failed to update order status');
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
                {orders.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        No active orders found.
                    </div>
                )}
            </div>
        </div>
    );
}
