/**
 * Order History Component
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ArrowRight } from 'lucide-react';

export function OrderHistory() {
    // TODO: Fetch orders from Firestore
    const orders: any[] = [];

    if (orders.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>Your past orders will appear here</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Package className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Start shopping to see your order history here
                        </p>
                        <Button asChild>
                            <a href="/dashboard/menu">Browse Products</a>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>View and track your orders</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Order list will go here */}
            </CardContent>
        </Card>
    );
}
