'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@/firebase/auth/use-user';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Home, MapPin, QrCode } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { useMenuData } from '@/hooks/use-menu-data';
import { Separator } from '@/components/ui/separator';
import { QRDisplay } from './components/qr-display';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/firebase/provider';
import { doc, onSnapshot, collection, query } from 'firebase/firestore';
import type { OrderDoc, OrderItemDoc } from '@/lib/types';


function OrderPageClient() {
    const params = useParams();
    const searchParams = useSearchParams();
    const orderId = typeof params.orderId === 'string' ? params.orderId : '';
    const { user } = useUser();
    const { locations } = useMenuData();
    const { firestore } = useFirebase();

    const [order, setOrder] = useState<OrderDoc | null>(null);
    const [items, setItems] = useState<OrderItemDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const urlUserId = searchParams.get('userId');
    const finalUserId = user?.uid || urlUserId;

    useEffect(() => {
        if (!firestore || !finalUserId || !orderId || finalUserId === 'guest') {
            setIsLoading(false);
            if (finalUserId === 'guest') {
                // This is expected for guest checkouts
                setOrder(null);
            }
            return;
        }
        
        setIsLoading(true);
        const orderRef = doc(firestore, 'users', finalUserId, 'orders', orderId);

        const unsubscribeOrder = onSnapshot(orderRef, (docSnap) => {
            if (docSnap.exists()) {
                setOrder({ id: docSnap.id, ...docSnap.data() } as OrderDoc);
            } else {
                setError(new Error("Order not found."));
            }
            // Handled items loading separately
        }, (err) => {
            setError(err);
            setIsLoading(false);
        });

        const itemsQuery = query(collection(orderRef, 'orderItems'));
        const unsubscribeItems = onSnapshot(itemsQuery, (querySnap) => {
            setItems(querySnap.docs.map(d => ({ id: d.id, ...d.data() } as OrderItemDoc)));
            setIsLoading(false); // Consider loading finished when items are also loaded
        }, (err) => {
            setError(err);
            setIsLoading(false);
        });

        return () => {
            unsubscribeOrder();
            unsubscribeItems();
        };

    }, [firestore, orderId, finalUserId]);
    
    const pickupLocation = locations?.find(loc => loc.id === order?.locationId);

    const orderUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (isLoading) {
        return <OrderPageSkeleton />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20">
                <h1 className="text-2xl font-bold">Order Not Found</h1>
                <p className="text-muted-foreground mt-2">
                  {error ? `Error: ${error.message}` : "We couldn't find the order you were looking for."}
                </p>
                <Button asChild className="mt-6">
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Menu
                    </Link>
                </Button>
            </div>
        );
    }
    
     const getStatusClass = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/20 text-yellow-700';
            case 'confirmed': return 'bg-blue-500/20 text-blue-700';
            case 'ready': return 'bg-teal-500/20 text-teal-700';
            case 'completed': return 'bg-green-500/20 text-green-700';
            case 'cancelled': return 'bg-red-500/20 text-red-700';
            default: return 'bg-gray-500/20 text-gray-700';
        }
    };

    if (!order && finalUserId === 'guest') {
         return (
            <div className="max-w-2xl mx-auto py-8 px-4">
                <Card className="shadow-lg">
                    <CardHeader className="text-center space-y-4">
                        <Logo />
                        <CardTitle className="text-3xl">Order Confirmed!</CardTitle>
                        <CardDescription>Thank you for your order! It is now being prepared.</CardDescription>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-sm text-muted-foreground">Order ID:</span>
                            <span className="font-mono text-xs text-muted-foreground bg-muted rounded px-2 py-1">#{orderId}</span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center justify-center gap-4 border-y py-6">
                            <Suspense fallback={<Skeleton className="h-48 w-48" />}>
                                <QRDisplay text={orderUrl} />
                            </Suspense>
                            <div className='text-center'>
                                <p className='font-semibold'>Show this QR code at the dispensary.</p>
                                <p className='text-sm text-muted-foreground'>This will help us quickly locate your order.</p>
                            </div>
                        </div>
                        <p className="text-center text-sm text-muted-foreground">You will receive an email confirmation with your full order details shortly.</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <p className="text-xs text-center text-muted-foreground">
                            Please bring a valid, government-issued photo ID for pickup.
                        </p>
                        <Button asChild variant="outline">
                            <Link href="/">
                                <Home className="mr-2" /> Continue Shopping
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (!order) {
        return <OrderPageSkeleton />;
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
             <Card className="shadow-lg">
                <CardHeader className="text-center space-y-4">
                    <Logo />
                    <CardTitle className="text-3xl">Order Confirmed</CardTitle>
                    <CardDescription>Thank you, {order!.customerName}! Your order is being prepared.</CardDescription>
                     <div className="flex items-center justify-center gap-2">
                       <span className="text-sm text-muted-foreground">Order ID:</span>
                       <span className="font-mono text-xs text-muted-foreground bg-muted rounded px-2 py-1">#{orderId}</span>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="flex flex-col items-center justify-center gap-4 border-y py-6">
                        <Suspense fallback={<Skeleton className="h-48 w-48" />}>
                          <QRDisplay text={orderUrl} />
                        </Suspense>
                        <div className='text-center'>
                           <p className='font-semibold'>Show this QR code at the dispensary.</p>
                           <p className='text-sm text-muted-foreground'>This will help us quickly locate your order.</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-muted-foreground">Order Date</h3>
                            <p>{order!.orderDate.toDate().toLocaleDateString()}</p>
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-muted-foreground">Status</h3>
                             <Badge className={cn('capitalize', getStatusClass(order!.status))}>{order!.status}</Badge>
                        </div>
                    </div>
                    
                    {pickupLocation && (
                        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                            <h3 className="font-semibold flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> Pickup Location</h3>
                            <p className="font-medium text-primary">{pickupLocation.name}</p>
                            <p className="text-sm">{pickupLocation.address}, {pickupLocation.city}, {pickupLocation.state} {pickupLocation.zip}</p>
                        </div>
                    )}
                    
                    <div>
                        <h3 className="font-semibold text-muted-foreground mb-2">Order Summary</h3>
                        <div className="space-y-2">
                             {items.map(item => (
                                <div key={item.id} className="flex justify-between items-center text-sm">
                                    <div>
                                        <span className="font-medium">{item.productName}</span>
                                        <span className="text-muted-foreground"> &times; {item.quantity}</span>
                                    </div>
                                    <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <Separator className="my-4" />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>${order!.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                </CardContent>
                <CardFooter className="flex-col gap-4">
                     <p className="text-xs text-center text-muted-foreground">
                        You will receive an email confirmation shortly. Please bring a valid, government-issued photo ID for pickup.
                     </p>
                     <Button asChild variant="outline">
                        <Link href="/">
                            <Home className="mr-2" /> Continue Shopping
                        </Link>
                     </Button>
                </CardFooter>
             </Card>
        </div>
    );
}

function OrderPageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader className="text-center space-y-4">
           <Skeleton className="h-10 w-36 mx-auto" />
           <Skeleton className="h-8 w-1/2 mx-auto" />
           <Skeleton className="h-5 w-2/3 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center gap-4 border-y py-6">
                <Skeleton className="h-48 w-48 rounded-lg" />
                <div className="text-center space-y-2">
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
            </div>
        </CardContent>
         <CardFooter className="flex-col gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-48" />
        </CardFooter>
      </Card>
    </div>
  );
}


export default function OrderPage() {
    return (
        <Suspense fallback={<OrderPageSkeleton />}>
            <OrderPageClient />
        </Suspense>
    )
}
