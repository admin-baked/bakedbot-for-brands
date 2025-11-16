
'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Home, MapPin, CheckCircle, Clock, PackageCheck, Package, CircleX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useMenuData } from '@/hooks/use-menu-data';
import { Separator } from '@/components/ui/separator';
import { QRDisplay } from './components/qr-display';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/firebase/provider';
import { doc, onSnapshot, setDoc, query, where, collection, getDocs, limit } from 'firebase/firestore';
import type { OrderDoc } from '@/firebase/converters';
import { orderConverter } from '@/firebase/converters';
import { Footer } from '@/app/components/footer';


function OrderPageClient() {
    const params = useParams();
    const searchParams = useSearchParams();
    const orderId = typeof params.orderId === 'string' ? params.orderId : '';
    const userIdFromUrl = searchParams.get('userId');
    const { locations: retailers } = useMenuData();
    const { firestore } = useFirebase();

    const [order, setOrder] = useState<OrderDoc | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const orderUrl = typeof window !== 'undefined' ? window.location.href : '';

    useEffect(() => {
        if (!firestore || !orderId) {
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        const orderRef = doc(firestore, 'orders', orderId).withConverter(orderConverter);

        // Real-time listener for the order
        const unsubscribe = onSnapshot(orderRef, (docSnap) => {
            if (docSnap.exists()) {
                const orderData = docSnap.data();
                setOrder(orderData);
                
                // If a user ID was passed from a successful checkout,
                // and the order belongs to a newly created anonymous user,
                // we update the order to link it to the actual user.
                if (userIdFromUrl && orderData.userId.startsWith('anon_')) {
                    console.log(`Linking anonymous order ${orderId} to user ${userIdFromUrl}`);
                    setDoc(orderRef, { userId: userIdFromUrl }, { merge: true })
                        .catch(err => console.error("Failed to link user to order:", err));

                    // Backfill previous anonymous orders from the same email
                    const backfillQuery = query(
                        collection(firestore, "orders"),
                        where("customer.email", "==", orderData.customer.email),
                        where("userId", "!=", userIdFromUrl),
                        limit(5)
                    );
                    
                    getDocs(backfillQuery).then(querySnapshot => {
                        const batch = firestore ? firestore.batch() : null;
                        querySnapshot.forEach(doc => {
                           if (doc.data().userId.startsWith('anon_') && batch) {
                               console.log(`Backfilling order ${doc.id} for user ${userIdFromUrl}`);
                               batch.update(doc.ref, { userId: userIdFromUrl });
                           }
                        });
                        batch?.commit().catch(err => console.error("Failed to backfill orders:", err));
                    });
                }
            } else {
                setError(new Error("Order not found."));
            }
            setIsLoading(false);
        }, (err) => {
            setError(err);
            setIsLoading(false);
        });

        return () => unsubscribe(); // Cleanup listener on unmount

    }, [firestore, orderId, userIdFromUrl]);
    
    const pickupLocation = retailers?.find(loc => loc.id === order?.retailerId);

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
    
    const getStatusStyles = (status: OrderDoc['status']) => {
        switch (status) {
            case 'submitted': return { icon: Play, className: 'bg-gray-500/20 text-gray-700' };
            case 'pending': return { icon: Clock, className: 'bg-yellow-500/20 text-yellow-700' };
            case 'confirmed': return { icon: CheckCircle, className: 'bg-blue-500/20 text-blue-700' };
            case 'ready': return { icon: PackageCheck, className: 'bg-teal-500/20 text-teal-700' };
            case 'completed': return { icon: Package, className: 'bg-green-500/20 text-green-700' };
            case 'cancelled': return { icon: CircleX, className: 'bg-red-500/20 text-red-700' };
            default: return { icon: Clock, className: 'bg-gray-500/20 text-gray-700' };
        }
    };


    if (!order) {
        return <OrderPageSkeleton />;
    }
    
    const { icon: StatusIcon, className: statusClassName } = getStatusStyles(order.status);

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
             <Card className="shadow-lg">
                <CardHeader className="text-center space-y-4">
                    <span className="font-bold text-lg">BakedBot AI</span>
                    <CardTitle className="text-3xl">Order Confirmed</CardTitle>
                    <CardDescription>Thank you, {order.customer.name}! Your order is being prepared.</CardDescription>
                     <div className="flex items-center justify-center gap-2">
                       <span className="text-sm text-muted-foreground">Order ID:</span>
                       <span className="font-mono text-xs text-muted-foreground bg-muted rounded px-2 py-1">#{orderId.substring(0,7)}</span>
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
                            <p>{order.createdAt.toDate().toLocaleDateString()}</p>
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-muted-foreground">Status</h3>
                             <Badge className={cn('capitalize', statusClassName)}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {order.status}
                             </Badge>
                        </div>
                    </div>
                    
                    {pickupLocation && (
                        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                            <h3 className="font-semibold flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> Pickup Location</h3>
                            <p className="font-medium text-primary">{pickupLocation.name}</p>
                            <p className="text-sm">{pickupLocation.address}, {pickupLocation.city}, {pickupLocation.state} ${pickupLocation.zip}</p>
                        </div>
                    )}
                    
                    <div>
                        <h3 className="font-semibold text-muted-foreground mb-2">Order Summary</h3>
                        <div className="space-y-2">
                             {order.items.map(item => (
                                <div key={item.productId} className="flex justify-between items-center text-sm">
                                    <div>
                                        <span className="font-medium">{item.name}</span>
                                        <span className="text-muted-foreground"> &times; {item.qty}</span>
                                    </div>
                                    <span className="font-medium">${(item.price * item.qty).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <Separator className="my-4" />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>${order.totals.total.toFixed(2)}</span>
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


export default function OrderConfirmationPage() {
    return (
       <div className="min-h-screen bg-background flex flex-col">
        <main className='flex-1'>
            <Suspense fallback={<OrderPageSkeleton />}>
                <OrderPageClient />
            </Suspense>
        </main>
        <Footer />
       </div>
    )
}
