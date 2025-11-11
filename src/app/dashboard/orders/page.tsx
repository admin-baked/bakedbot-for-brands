
'use client';

import { useMemo, useState, useEffect } from "react";
import { OrdersTable, type OrderData } from "./components/orders-table";
import { useUser } from "@/firebase/auth/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderDoc } from "@/firebase/converters";
import { useMenuData } from "@/hooks/use-menu-data";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { useFirebase } from "@/firebase/provider";
import { orderConverter } from "@/firebase/converters";

export default function OrdersPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { locations } = useMenuData(); 
  
  const [userProfile, setUserProfile] = useState<any>(null);
  
  useEffect(() => {
    if (user && firestore) {
      const unsub = onSnapshot(doc(firestore, 'users', user.uid), (doc) => {
        setUserProfile(doc.data());
      });
      return () => unsub();
    }
  }, [user, firestore]);

  const ordersQuery = useMemo(() => {
    if (!firestore || !userProfile) return null;
    
    const baseQuery = collection(firestore, 'orders').withConverter(orderConverter);

    // For dispensary managers, only show orders for their location
    if (userProfile.role === 'dispensary' && userProfile.locationId) {
        return query(baseQuery, where('locationId', '==', userProfile.locationId));
    }
    
    // For brand/owner, show all orders
    if (userProfile.role === 'brand' || userProfile.role === 'owner') {
        return query(baseQuery);
    }

    // Default to a query that returns nothing if role isn't right
    // This prevents accidental data leakage to customer roles on this page.
    return query(baseQuery, where('userId', '==', 'nonexistent-user'));
  }, [firestore, userProfile]);
  
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
        location: getLocationName(order.locationId),
        locationId: order.locationId,
    }));
  }, [orders, locations]);

  const isLoading = areOrdersLoading || isUserLoading || !userProfile;

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
