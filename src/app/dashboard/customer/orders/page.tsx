// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Package, 
    ChevronRight, 
    Store, 
    Clock,
    RefreshCw,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { getCustomerOrderHistory, type CustomerOrderHistoryData } from './actions';
import { cn } from '@/lib/utils';

export default function CustomerOrderHistoryPage() {
    const [data, setData] = useState<CustomerOrderHistoryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            const result = await getCustomerOrderHistory();
            setData(result);
            setIsLoading(false);
        }
        loadData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'ready': return 'bg-orange-100 text-orange-800';
            case 'confirmed': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Order History</h1>
                    <p className="text-muted-foreground">View your past orders and reorder favorites</p>
                </div>
                <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Order List */}
            {data?.orders.length === 0 ? (
                <Card className="py-12 text-center">
                    <CardContent>
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold text-lg">No orders yet</h3>
                        <p className="text-muted-foreground mb-4">Start shopping to see your orders here</p>
                        <Link href="/menu/default">
                            <Button className="bg-emerald-600 hover:bg-emerald-700">
                                Browse Menu
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {data?.orders.map(order => (
                        <Link key={order.id} href={`/order-confirmation/${order.id}`}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                                <Package className="h-6 w-6 text-emerald-600" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold">Order #{order.id.substring(0, 7)}</p>
                                                    <Badge className={cn("capitalize text-xs", getStatusColor(order.status))}>
                                                        {order.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Store className="h-3 w-3" />
                                                        {order.retailerName}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {order.items.length} items
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="font-bold">${order.total.toFixed(2)}</p>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
