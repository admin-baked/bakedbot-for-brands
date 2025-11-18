
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Truck, MapPin } from "lucide-react";
import { useDoc } from "@/firebase/use-doc";
import { orderConverter, retailerConverter, type OrderDoc } from "@/firebase/converters";
import { doc } from 'firebase/firestore';
import { useFirebase } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function OrderConfirmationPage({ params }: { params: { orderId: string }}) {
    const { firestore } = useFirebase();

    // Fetch the order
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
                         <Separator />
                         <div className="space-y-2 text-right">
                             <Skeleton className="h-4 w-32 ml-auto" />
                             <Skeleton className="h-4 w-28 ml-auto" />
                             <Skeleton className="h-6 w-40 ml-auto mt-2" />
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
                        <CardDescription>We couldn't find an order with that ID.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto max-w-2xl py-12 px-4">
            <Card>
                <CardHeader className="text-center items-center">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                    <CardTitle className="mt-4 text-3xl">Order Confirmed</CardTitle>
                    <CardDescription className="text-base">
                       Thank you, {order.customer.name}! Your order has been placed successfully.
                    </CardDescription>
                    <p className="text-sm text-muted-foreground pt-2">Order ID: #{order.id.substring(0, 7)}</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="rounded-lg border bg-muted/50 p-4">
                         <h3 className="font-semibold flex items-center gap-2 mb-2"><MapPin className="h-5 w-5 text-primary" /> Pickup Location</h3>
                         {retailer ? (
                             <>
                                <p className="font-bold">{retailer.name}</p>
                                <p className="text-sm text-muted-foreground">{retailer.address}, {retailer.city}, {retailer.state} {retailer.zip}</p>
                             </>
                         ): (
                             <p className="text-sm text-muted-foreground">Loading location details...</p>
                         )}
                    </div>
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
                   <div className="text-center text-muted-foreground text-sm">
                       You will receive an email confirmation shortly and another email when your order is ready for pickup.
                   </div>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href="/menu/default">Continue Shopping</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
