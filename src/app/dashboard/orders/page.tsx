
'use client';

import { useState, useEffect } from "react";
import { OrdersTable } from "./components/orders-table";
import { useUser } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/hooks/use-store";
import { useMenuData } from "@/hooks/use-menu-data";
import { useOrders } from "@/firebase/firestore/use-orders";
import type { OrderData } from "./components/orders-table";


export default function OrdersPage() {
  const { user, isUserLoading } = useUser();
  const { locations } = useMenuData();
  const { _hasHydrated } = useStore();
  const { data: ordersData, isLoading: areOrdersLoading } = useOrders();

  const [orders, setOrders] = useState<OrderData[]>([]);

  useEffect(() => {
    if (areOrdersLoading || !_hasHydrated || !locations || !ordersData) {
      setOrders([]);
      return;
    };

    const getLocationName = (id: string) => {
        return locations.find(l => l.id === id)?.name || "Unknown Location";
    };

    const formattedOrders = ordersData.map((order) => {
        return {
            id: order.id,
            customerName: order.customerName,
            date: order.orderDate.toDate().toLocaleDateString(),
            status: order.status,
            total: `$${order.totalAmount.toFixed(2)}`,
            location: getLocationName(order.locationId),
        };
    });
    setOrders(formattedOrders);

  }, [areOrdersLoading, ordersData, locations, _hasHydrated]);


  if (areOrdersLoading || !_hasHydrated || isUserLoading) {
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
      <OrdersTable data={orders} />
    </div>
  );
}
