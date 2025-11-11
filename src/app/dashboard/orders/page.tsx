
'use client';

import { useState, useEffect, useMemo } from "react";
import { OrdersTable } from "./components/orders-table";
import { useUser } from "@/firebase/auth/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirebase } from "@/firebase/provider";
import { collectionGroup, query, onSnapshot, orderBy, DocumentData } from 'firebase/firestore';
import type { OrderData } from "./components/orders-table";
import type { OrderDoc } from "@/lib/types";
import { useMenuData } from "@/hooks/use-menu-data";

export default function OrdersPage() {
  const { isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { locations } = useMenuData(); // Use the standardized hook
  
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [areOrdersLoading, setAreOrdersLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    setAreOrdersLoading(true);
    const ordersQuery = query(collectionGroup(firestore, 'orders'), orderBy("orderDate", "desc"));
    
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as OrderDoc[];
        setOrders(ordersData);
        setAreOrdersLoading(false);
    }, (error) => {
        console.error("Error fetching orders:", error);
        setAreOrdersLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  const formattedOrders = useMemo(() => {
    const getLocationName = (id: string) => {
        return locations.find(l => l.id === id)?.name || "Unknown Location";
    };

    return orders.map((order) => ({
        id: order.id,
        customerName: order.customerName,
        date: order.orderDate.toDate().toLocaleDateString(),
        status: order.status,
        total: `$${order.totalAmount.toFixed(2)}`,
        location: getLocationName(order.locationId),
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
