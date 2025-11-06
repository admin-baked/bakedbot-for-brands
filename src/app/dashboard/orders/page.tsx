
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
    { id: 'demo1', name: 'Green Leaf Central', address: '123 Main St', city: 'Metropolis', state: 'IL', zip: '12345', phone: '(555) 123-4567', lat: 40.7128, lon: -74.0060 },
    { id: 'demo2', name: 'Herbal Haven Downtown', address: '456 Oak Ave', city: 'Metropolis', state: 'IL', zip: '12346', phone: '(555) 987-6543', lat: 40.7580, lon: -73.9855 },
    { id: 'demo3', name: 'Bloom Apothecary North', address: '789 Pine Ln', city: 'Springfield', state: 'IL', zip: '67890', phone: '(555) 234-5678', lat: 39.7817, lon: -89.6501 },
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
