
'use client';

import { useMemo } from "react";
import { OrdersTable, type OrderData } from "./components/orders-table";
import { useUser } from "@/firebase/auth/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderDoc } from "@/lib/types";
import { useMenuData } from "@/hooks/use-menu-data";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collectionGroup, query, orderBy } from 'firebase/firestore';
import { useFirebase } from "@/firebase/provider";

export default function OrdersPage() {
  const { firestore } = useFirebase();
  const { isUserLoading } = useUser();
  const { locations } = useMenuData(); 
  
  const ordersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore]);
  
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

  if (areOrdersLoading || isUserLoading) {
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
