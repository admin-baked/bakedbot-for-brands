'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import type { OrderDoc } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CustomerOrderHistoryProps {
  orders: OrderDoc[] | null;
  isLoading: boolean;
}

const getStatusClass = (status: string) => {
    switch (status) {
        case 'pending': return 'bg-yellow-500/20 text-yellow-700';
        case 'confirmed': return 'bg-blue-500/20 text-blue-700';
        case 'ready': return 'bg-teal-500/20 text-teal-700';
        case 'completed': return 'bg-green-500/20 text-green-700';
        case 'cancelled': return 'bg-red-500/20 text-red-700';
        default: return 'bg-gray-500/20 text-gray-700';
    }
};

export default function CustomerOrderHistory({ orders, isLoading }: CustomerOrderHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Package /> Order History</CardTitle>
        <CardDescription>A list of your recent purchases.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">You haven't placed any orders yet.</p>
            <Button variant="link" asChild><Link href="/">Start Shopping</Link></Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell>
                        <Link href={`/order-confirmation/${order.id}`} className="font-mono text-xs text-primary hover:underline">
                            #{order.id.substring(0, 7)}...
                        </Link>
                    </TableCell>
                    <TableCell>{order.createdAt.toDate().toLocaleDateString()}</TableCell>
                    <TableCell><Badge className={cn("capitalize", getStatusClass(order.status))}>{order.status}</Badge></TableCell>
                    <TableCell className="text-right">${order.totals.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
