'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    Package, 
    CheckCircle, 
    User, 
    Phone, 
    Mail, 
    Store, 
    Gift, 
    Sparkles,
    Mic,
    MessageSquare,
    ArrowRight,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { getScanOrderData, updateScanOrderStatus, type ScanOrderData } from '../actions';
import { cn } from '@/lib/utils';

interface ScanPageClientProps {
    orderId: string;
}

export default function ScanPageClient({ orderId }: ScanPageClientProps) {
    const [data, setData] = useState<ScanOrderData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        async function loadData() {
            const result = await getScanOrderData(orderId);
            setData(result);
            setIsLoading(false);
        }
        loadData();
    }, [orderId]);

    const handleStatusUpdate = async (newStatus: 'confirmed' | 'ready' | 'completed') => {
        setIsUpdating(true);
        const result = await updateScanOrderStatus(orderId, newStatus);
        if (result.success) {
            setData(prev => prev ? {
                ...prev,
                order: prev.order ? { ...prev.order, status: newStatus } : null
            } : null);
        }
        setIsUpdating(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-slate-900 dark:to-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!data?.order) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-background p-4">
                <Card className="max-w-lg mx-auto mt-12">
                    <CardHeader className="text-center">
                        <CardTitle>Order Not Found</CardTitle>
                        <CardDescription>This order doesn't exist or has been removed.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const { order, dispensary } = data;
    const isUnclaimed = dispensary && !dispensary.claimed;

    const statusActions = {
        submitted: { next: 'confirmed', label: 'Confirm Order', color: 'bg-blue-600' },
        confirmed: { next: 'ready', label: 'Mark Ready', color: 'bg-orange-600' },
        ready: { next: 'completed', label: 'Complete Pickup', color: 'bg-emerald-600' },
        completed: { next: null, label: 'Completed', color: 'bg-green-600' },
    };

    const currentAction = statusActions[order.status as keyof typeof statusActions] || statusActions.submitted;

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-slate-900 dark:to-background p-4 pb-32">
            <div className="max-w-lg mx-auto space-y-6 pt-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                        <Package className="h-4 w-4" />
                        <span>Order #{order.id.substring(0, 7)}</span>
                    </div>
                    <h1 className="text-2xl font-bold">Customer Pickup</h1>
                </div>

                {/* Unclaimed Banner - Claim + Free Budtender Pitch */}
                {isUnclaimed && (
                    <Card className="border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 shadow-lg overflow-hidden">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Gift className="h-5 w-5 text-emerald-600" />
                                <CardTitle className="text-lg text-emerald-800 dark:text-emerald-200">Claim Your Page — It's Free!</CardTitle>
                            </div>
                            <CardDescription className="text-emerald-700 dark:text-emerald-300">
                                Get <strong>3 free orders/month</strong> + our <strong>FREE AI Budtender Tool</strong>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0">
                            {/* Free Budtender Pitch */}
                            <div className="bg-white/60 dark:bg-slate-900/60 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-600" />
                                    <span className="font-semibold text-sm">Free AI Budtender Co-Pilot</span>
                                </div>
                                <ul className="text-sm text-muted-foreground space-y-2">
                                    <li className="flex items-center gap-2">
                                        <Mic className="h-4 w-4 text-emerald-600" />
                                        <span>Voice chat with Smokey about menu & recommendations</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-blue-600" />
                                        <span>Instant product knowledge at your fingertips</span>
                                    </li>
                                </ul>
                            </div>
                            <Link 
                                href={`/claim?retailerId=${dispensary.id}&orderId=${order.id}`}
                                className="block"
                            >
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                                    Claim Free Page <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Order Details Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Order Details</CardTitle>
                            <Badge className={cn(
                                "capitalize",
                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                order.status === 'ready' ? 'bg-orange-100 text-orange-800' :
                                order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                'bg-slate-100 text-slate-800'
                            )}>
                                {order.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Customer Info */}
                        <div className="rounded-lg border p-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <User className="h-4 w-4" />
                                {order.customer.name}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                {order.customer.phone}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                {order.customer.email}
                            </div>
                        </div>

                        <Separator />

                        {/* Items */}
                        <div className="space-y-3">
                            <h4 className="font-medium text-sm">Items ({order.items.length})</h4>
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <span>{item.qty}x {item.name}</span>
                                    <span className="font-medium">${(item.price * item.qty).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <Separator />

                        {/* Totals */}
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>${order.totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax</span>
                                <span>${order.totals.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-base pt-2">
                                <span>Total</span>
                                <span>${order.totals.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Dispensary Info */}
                {dispensary && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <Store className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">{dispensary.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {dispensary.address}, {dispensary.city}, {dispensary.state}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Bottom Action Bar */}
            {order.status !== 'completed' && order.status !== 'cancelled' && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t shadow-lg">
                    <div className="max-w-lg mx-auto">
                        <Button 
                            className={cn("w-full text-white gap-2", currentAction.color)}
                            size="lg"
                            onClick={() => currentAction.next && handleStatusUpdate(currentAction.next as any)}
                            disabled={isUpdating || !currentAction.next}
                        >
                            {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle className="h-4 w-4" />
                            )}
                            {currentAction.label}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
