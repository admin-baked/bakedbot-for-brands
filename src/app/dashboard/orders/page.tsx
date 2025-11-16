
'use client';
export const dynamic = 'force-dynamic';

import { useMemo, useState, useEffect } from "react";
import { OrdersTable, type OrderData } from "./components/orders-table";
import { useUser } from "@/firebase/auth/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderDoc } from "@/firebase/converters";
import { useMenuData } from "@/hooks/use-menu-data";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, where } from 'firebase/firestore';
import { useFirebase } from "@/firebase/provider";
import { orderConverter } from "@/firebase/converters";

export default function OrdersPage() {
  const firebase = useFirebase();
  const firestore = firebase?.firestore;
  const { user, isUserLoading } = useUser();
  const { locations } = useMenuData(); 
  
  const [userClaims, setUserClaims] = useState<any>(null);
  
  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then(idTokenResult => {
          setUserClaims(idTokenResult.claims);
      });
    }
  }, [user]);

  const ordersQuery = useMemo(() => {
    // CRITICAL: Do not build the query until the user claims are loaded.
    if (!firestore || !userClaims) return null;
    
    const baseQuery = collection(firestore, 'orders').withConverter(orderConverter);

    // For dispensary managers, only show orders for their assigned location from the secure claim
    if (userClaims.role === 'dispensary' && userClaims.locationId) {
        return query(baseQuery, where('retailerId', '==', userClaims.locationId));
    }
    
    // For brand/owner, show all orders
    if (userClaims.role === 'brand' || userClaims.role === 'owner') {
        return query(baseQuery);
    }

    // Default to a query that returns nothing if role isn't right
    return query(baseQuery, where('userId', '==', 'nonexistent-user'));
  }, [firestore, userClaims]);
  
  const { data: orders, isLoading: areOrdersLoading } = useCollection<OrderDoc>(ordersQuery);
  
  const formattedOrders = useMemo((): OrderData[] => {
    if (!orders) return [];

    const getLocationName = (id: string) => {
        return locations.find(l => l.id === id)?.name || "Unknown Location";
    };

    return orders.map((order) => ({
        id: order.id,
        customerName: order.customer.name,
        date: order.createdAt.toDate().toLocaleDateString(),
        status: order.status,
        total: `$${order.totals.total.toFixed(2)}`,
        location: getLocationName(order.retailerId),
        retailerId: order.retailerId,
    }));
  }, [orders, locations]);

  const isLoading = areOrdersLoading || isUserLoading || !userClaims;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <div>
            <Skeleton className="h-9 w-1/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
        </div>
        <div className="rounded-md border bg-card">
            <div className="p-4">
                 <Skeleton className="h-10 w-64" />
            </div>
            <div className="border-t p-4 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customer Orders</h1>
        <p className="text-muted-foreground">
          View and manage all incoming orders for fulfillment.
        </p>
      </div>
      <OrdersTable data={formattedOrders} />
    </div>
  );
}
