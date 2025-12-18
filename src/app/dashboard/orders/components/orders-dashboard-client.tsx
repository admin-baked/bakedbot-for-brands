// src/app/dashboard/orders/components/orders-dashboard-client.tsx
'use client';

import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { OrderDoc } from '@/types/domain';
import { orderConverter } from '@/firebase/converters';
import { OrdersDataTable } from './orders-data-table';
import { columns } from './orders-table-columns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';

interface OrdersDashboardClientProps {
  locationId: string;
}

const OrderList = ({ orders, isLoading }: { orders: OrderDoc[] | null, isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }
  return <OrdersDataTable columns={columns} data={orders || []} />;
}

export default function OrdersDashboardClient({ locationId }: OrdersDashboardClientProps) {
  const { firestore } = useFirebase();

  // Define queries for each status tab
  const pendingQuery = firestore ? query(
    collection(firestore, 'orders'),
    where('retailerId', '==', locationId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  ).withConverter(orderConverter) : null;

  const submittedQuery = firestore ? query(
    collection(firestore, 'orders'),
    where('retailerId', '==', locationId),
    where('status', '==', 'submitted'),
    orderBy('createdAt', 'desc')
  ).withConverter(orderConverter) : null;

  const confirmedQuery = firestore ? query(
    collection(firestore, 'orders'),
    where('retailerId', '==', locationId),
    where('status', '==', 'confirmed'),
    orderBy('createdAt', 'desc')
  ).withConverter(orderConverter) : null;

  const preparingQuery = firestore ? query(
    collection(firestore, 'orders'),
    where('retailerId', '==', locationId),
    where('status', '==', 'preparing'),
    orderBy('createdAt', 'desc')
  ).withConverter(orderConverter) : null;

  const readyQuery = firestore ? query(
    collection(firestore, 'orders'),
    where('retailerId', '==', locationId),
    where('status', '==', 'ready'),
    orderBy('createdAt', 'desc')
  ).withConverter(orderConverter) : null;

  const completedQuery = firestore ? query(
    collection(firestore, 'orders'),
    where('retailerId', '==', locationId),
    where('status', 'in', ['completed', 'cancelled']),
    orderBy('createdAt', 'desc')
  ).withConverter(orderConverter) : null;


  const { data: pendingOrders, isLoading: loadingPending } = useCollection<OrderDoc>(pendingQuery);
  const { data: submittedOrders, isLoading: loadingSubmitted } = useCollection<OrderDoc>(submittedQuery);
  const { data: confirmedOrders, isLoading: loadingConfirmed } = useCollection<OrderDoc>(confirmedQuery);
  const { data: preparingOrders, isLoading: loadingPreparing } = useCollection<OrderDoc>(preparingQuery);
  const { data: readyOrders, isLoading: loadingReady } = useCollection<OrderDoc>(readyQuery);
  const { data: completedOrders, isLoading: loadingCompleted } = useCollection<OrderDoc>(completedQuery);


  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="submitted">
        <TabsList>
          <TabsTrigger value="submitted">New</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="preparing">Preparing</TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
          <TabsTrigger value="completed">History</TabsTrigger>
        </TabsList>
        <TabsContent value="submitted" className="mt-6">
          <OrderList orders={submittedOrders} isLoading={loadingSubmitted} />
        </TabsContent>
        <TabsContent value="confirmed" className="mt-6">
          <OrderList orders={confirmedOrders} isLoading={loadingConfirmed} />
        </TabsContent>
        <TabsContent value="preparing" className="mt-6">
          <OrderList orders={preparingOrders} isLoading={loadingPreparing} />
        </TabsContent>
        <TabsContent value="ready" className="mt-6">
          <OrderList orders={readyOrders} isLoading={loadingReady} />
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          <OrderList orders={completedOrders} isLoading={loadingCompleted} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
