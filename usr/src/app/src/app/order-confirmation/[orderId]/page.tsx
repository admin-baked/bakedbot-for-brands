

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle, ShoppingCart, CookingPot, PackageCheck, PartyPopper, XCircle } from "lucide-react";
import { useDoc } from "@/firebase/firestore/use-doc";
import { orderConverter, retailerConverter, type OrderDoc } from "@/firebase/converters";
import { doc } from 'firebase/firestore';
import { useFirebase } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/domain";

const statusSteps: OrderStatus[] = ['submitted', 'confirmed', 'ready', 'completed'];

const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
        case 'submitted':
            return { icon: ShoppingCart, text: "We've received your order and are sending it to the dispensary.", progress: 25 };
        case 'confirmed':
            return { icon: CookingPot, text: "The dispensary has confirmed your order and is preparing it now.", progress: 50 };
        case 'ready':
            return { icon: PackageCheck, text: "Good news! Your order is packed and ready for pickup.", progress: 75 };
        case 'completed':
            return { icon: PartyPopper, text: "Your order has been picked up. Enjoy!", progress: 100 };
        case 'cancelled':
             return { icon: XCircle, text: "This order has been cancelled.", progress: 0 };
        default:
            return { icon: ShoppingCart, text: "Order received.", progress: 10 };
    }
}


export default function OrderConfirmationPage({ params }: { params: { orderId: string }}) {
    const { firestore } = useFirebase();

    // Fetch the order in real-time
    const orderRef = firestore ? doc(firestore, 'orders', params.orderId).withConverter(orderConverter) : null;
    const { data: order, isLoading: isOrderLoading } = useDoc<OrderDoc>(orderRef);
    
    // Fetch the retailer details using the retailerId from the order
    const retailerRef = (firestore && order?.retailerId) ? doc(firestore, 'dispensaries', order.retailerId).withConverter(retailerConverter) : null;
    const { data: retailer, isLoading: isRetailerLoading } = useDoc(retailerRef);

    const isLoading = isOrderLoading || isRetailerLoading;

    if (isLoading) {
        return (
             <div className="container mx-auto max-w-2xl py-12 px-4">
                 <Card>
                    <CardHeader className="text-center">
                        <Skeleton className="h-12 w-12 mx-auto rounded-full" />
                        <Skeleton className="h-8 w-64 mx-auto mt-4" />
                        <Skeleton className="h-4 w-48 mx-auto mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 border rounded-md space-y-3">
                           <Skeleton className="h-4 w-1/2" />
                           <Skeleton className="h-4 w-1/3" />
                        </div>
                         <div className="p-4 border rounded-md space-y-3">
                           <Skeleton className="h-10 w-full" />
                           <Skeleton className="h-4 w-3/4 mx-auto" />
                        </div>
                        <Separator />
                        <div className="space-y-4">
                             {[...Array(2)].map((_, i) => (
                                <div key={i} className="flex gap-4">
                                     <Skeleton className="h-16 w-16 rounded-md" />
                                     <div className="flex-1 space-y-2">
                                         <Skeleton className="h-5 w-3/4" />
                                         <Skeleton className="h-4 w-1/4" />
                                     </div>
                                      <Skeleton className="h-5 w-16" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                 </Card>
             </div>
        )
    }

    if (!order) {
        return (
            <div className="container mx-auto max-w-2xl py-12 px-4 text-center">
                <Card>
                    <CardHeader>
                        <CardTitle>Order Not Found</CardTitle>
                        <CardDescription>We couldn&apos;t find an order with that ID.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    const { icon: StatusIcon, text: statusText, progress } = getStatusInfo(order.status);

    return (
        <div className="container mx-auto max-w-2xl py-12 px-4">
            <Card>
                <CardHeader className="text-center items-center">
                    <StatusIcon className={cn("h-16 w-16", order.status === 'completed' ? 'text-green-500' : 'text-primary')} />
                    <CardTitle className="mt-4 text-3xl">
                       {order.status === 'completed' ? 'Order Completed!' : 'Order Status'}
                    </CardTitle>
                    <CardDescription className="text-base max-w-md mx-auto">
                       {statusText}
                    </CardDescription>
                    <p className="text-sm text-muted-foreground pt-2">Order ID: #{order.id.substring(0, 7)}</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {order.status !== 'cancelled' && (
                        <div className="px-4 pt-4">
                            <Progress value={progress} className="w-full" />
                            <div className="grid grid-cols-4 mt-2 text-xs text-muted-foreground">
                                {statusSteps.map((step, index) => (
                                    <div key={step} className={cn("text-center capitalize", index > statusSteps.indexOf(order.status) ? "opacity-50" : "font-semibold text-primary")}>
                                        {step}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                   
                   <Separator />
                   <div>
                     <h3 className="font-semibold mb-4">Order Summary</h3>
                     <div className="space-y-4">
                        {order.items.map(item => (
                            <div key={item.productId} className="flex items-center gap-4">
                                <div className="font-semibold">{item.qty}x</div>
                                <div className="flex-1">
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                                </div>
                                <div className="font-medium">${(item.price * item.qty).toFixed(2)}</div>
                            </div>
                        ))}
                     </div>
                   </div>
                   <Separator />
                   <div className="space-y-1 text-sm text-right">
                       <div className="flex justify-between">
                           <span className="text-muted-foreground">Subtotal</span>
                           <span>${order.totals.subtotal.toFixed(2)}</span>
                       </div>
                        <div className="flex justify-between">
                           <span className="text-muted-foreground">Taxes (est.)</span>
                           <span>${order.totals.tax.toFixed(2)}</span>
                       </div>
                        <div className="flex justify-between font-bold text-base mt-2">
                           <span>Total</span>
                           <span>${order.totals.total.toFixed(2)}</span>
                       </div>
                   </div>
                   <Separator />
                    <div className="rounded-lg border bg-muted/50 p-4">
                         <h3 className="font-semibold flex items-center gap-2 mb-2">Pickup Location</h3>
                         {retailer ? (
                             <>
                                <p className="font-bold">{retailer.name}</p>
                                <p className="text-sm text-muted-foreground">{retailer.address}, ${retailer.city}, ${retailer.state} ${retailer.zip}</p>
                             </>
                         ): (
                             <p className="text-sm text-muted-foreground">Loading location details...</p>
                         )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Link href="/menu/default" passHref>
                        <Button className="w-full">Continue Shopping</Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
