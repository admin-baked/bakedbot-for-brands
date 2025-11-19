
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { OrderDoc, Retailer } from '@/types/domain';
import { format } from 'date-fns';
import Link from 'next/link';

interface CustomerAccountViewProps {
  user: { name?: string | null; email?: string | null };
  orders: OrderDoc[];
  retailers: Retailer[];
}

const getInitials = (name?: string | null) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function CustomerAccountView({ user, orders = [], retailers = [] }: CustomerAccountViewProps) {
  
  const retailersById = new Map(retailers.map(r => [r.id, r]));
  
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="items-center text-center">
              <Avatar className="h-20 w-20 text-2xl">
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <CardTitle className="mt-2">{user.name || 'Valued Customer'}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" className="w-full">Edit Profile</Button>
            </CardFooter>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>My Order History</CardTitle>
              <CardDescription>A list of your recent online orders.</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>You haven't placed any orders yet.</p>
                  <Button asChild variant="link">
                    <Link href="/menu/default">Start Shopping</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => {
                    const retailer = retailersById.get(order.retailerId);
                    return (
                        <div key={order.id} className="border p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold">Order #{order.id.substring(0, 7)}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(order.createdAt.toDate(), 'MMMM d, yyyy')}
                                    </p>
                                </div>
                                <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>{order.status}</Badge>
                            </div>
                            <Separator className="my-3" />
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-muted-foreground">Pickup from:</p>
                                    <p className="text-sm font-medium">{retailer?.name || order.retailerId}</p>
                                </div>
                                <p className="font-bold text-lg">${order.totals.total.toFixed(2)}</p>
                            </div>
                            <Link href={`/order-confirmation/${order.id}`} passHref>
                              <Button variant="outline" size="sm" className="w-full mt-3">
                                  View Details
                              </Button>
                            </Link>
                        </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
