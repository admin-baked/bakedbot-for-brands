
'use client';

import { useState, useEffect } from "react";
import { collectionGroup, getDocs, Timestamp, Firestore } from "firebase/firestore";
import { OrdersTable } from "./components/orders-table";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useFirebase, useUser } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/hooks/use-store";

// Define the shape of a review document from Firestore
type OrderDoc = {
  id: string;
  customerName: string;
  orderDate: Timestamp;
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  totalAmount: number;
  locationId: string;
};

// Define the shape of the data we'll pass to the table
export type OrderData = {
  id: string;
  customerName: string;
  date: string;
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  total: string;
  location: string;
};

async function getOrders(firestore: Firestore, locations: any[]): Promise<OrderData[]> {
  const ordersQuery = collectionGroup(firestore, "orders");
  const querySnapshot = await getDocs(ordersQuery).catch(serverError => {
    const permissionError = new FirestorePermissionError({
      path: 'orders', // Path for a collection group query
      operation: 'list',
    });
    errorEmitter.emit('permission-error', permissionError);
    // Return an empty snapshot to prevent further errors down the chain
    return { docs: [] } as unknown as typeof querySnapshot;
  });

  if (!querySnapshot) return [];
  
  const allLocations = locations;
  const getLocationName = (id: string) => {
    return allLocations.find(l => l.id === id)?.name || "Unknown Location";
  };


  const orders = querySnapshot.docs.map((orderDoc) => {
    const order = orderDoc.data() as OrderDoc;
    return {
      id: orderDoc.id,
      customerName: order.customerName,
      date: order.orderDate.toDate().toLocaleDateString(),
      status: order.status,
      total: `$${order.totalAmount.toFixed(2)}`,
      location: getLocationName(order.locationId),
    };
  });

  // Sort orders by most recent first
  return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default function OrdersPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const { locations, isDemoMode } = useStore();
  
  const demoLocations = [
    { id: 'demo1', name: 'Windy City Cannabis', address: '923 W Weed St', city: 'Chicago', state: 'IL', zip: '60642', phone: '(312) 874-7042', email: 'orders@windycity.demo', lat: 41.908, lon: -87.653 },
    { id: 'demo2', name: 'Sunnyside Dispensary', address: '436 N Clark St', city: 'Chicago', state: 'IL', zip: '60654', phone: '(312) 212-0300', email: 'orders@sunnyside.demo', lat: 41.890, lon: -87.632 },
    { id: 'demo3', name: 'Dispensary 33', address: '5001 N Clark St', city: 'Chicago', state: 'IL', zip: '60640', phone: '(773) 754-8822', email: 'orders@dispensary33.demo', lat: 41.973, lon: -87.668 },
  ];
  
  const currentLocations = isDemoMode ? demoLocations : locations;

  useEffect(() => {
    if (!isUserLoading && user && firestore) {
      setIsFetchingData(true);
      getOrders(firestore, currentLocations).then(data => {
        setOrders(data);
        setIsFetchingData(false);
      }).catch(err => {
        console.error("Failed to fetch orders:", err);
        setIsFetchingData(false);
      });
    } else if (!isUserLoading && !user) {
        setIsFetchingData(false);
    }
  }, [firestore, user, isUserLoading, isDemoMode]);


  if (isFetchingData) {
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
