// src/app/dashboard/orders/components/orders-table-columns.tsx
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { OrderDoc } from '@/types/domain';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, Check, MoreHorizontal, PackageCheck, ThumbsUp, Truck, X } from 'lucide-react';
import { useFormState, useFormStatus } from 'react-dom';
import { updateOrderStatus } from '../actions';
import { useEffect, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';

function StatusUpdateButton({ orderId, newStatus, label, icon: Icon, variant }: { orderId: string, newStatus: string, label: string, icon: React.ElementType, variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null }) {
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useFormState(updateOrderStatus, { message: '', error: false });
  const { toast } = useToast();

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.error ? 'Error' : 'Success',
        description: state.message,
        variant: state.error ? 'destructive' : 'default',
      });
    }
  }, [state, toast]);

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('newStatus', newStatus);
    startTransition(() => formAction(formData));
  };

  return (
    <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={isPending}>
      <button onClick={handleSubmit} className="flex items-center w-full">
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </button>
    </DropdownMenuItem>
  );
}

export const columns: ColumnDef<OrderDoc>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Order ID
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-mono text-sm">#{String(row.getValue('id')).substring(0, 7)}</div>,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as { toDate: () => Date };
      return <div title={format(date.toDate(), 'PPpp')}>{formatDistanceToNow(date.toDate(), { addSuffix: true })}</div>;
    },
  },
  {
    accessorKey: 'customer',
    header: 'Customer',
    cell: ({ row }) => {
      const customer = row.getValue('customer') as { name: string; email: string };
      return (
        <div>
          <div className="font-medium">{customer.name}</div>
          <div className="text-xs text-muted-foreground">{customer.email}</div>
        </div>
      )
    },
  },
  {
    accessorKey: 'totals',
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => {
      const totals = row.getValue('totals') as { total: number };
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(totals.total);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'items',
    header: () => <div className="text-center">Items</div>,
    cell: ({ row }) => {
      const items = row.getValue('items') as any[];
      return <div className="text-center">{items.reduce((acc, item) => acc + item.qty, 0)}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Update Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {order.status === 'submitted' && (
                <>
                  <StatusUpdateButton orderId={order.id} newStatus="confirmed" label="Confirm Order" icon={Check} />
                  <StatusUpdateButton orderId={order.id} newStatus="cancelled" label="Cancel Order" icon={X} variant="destructive" />
                </>
              )}
              {order.status === 'confirmed' && (
                <>
                  <StatusUpdateButton orderId={order.id} newStatus="preparing" label="Start Preparing" icon={Truck} />
                  <StatusUpdateButton orderId={order.id} newStatus="ready" label="Mark Ready" icon={PackageCheck} />
                  <StatusUpdateButton orderId={order.id} newStatus="cancelled" label="Cancel Order" icon={X} variant="destructive" />
                </>
              )}
              {order.status === 'preparing' && (
                <>
                  <StatusUpdateButton orderId={order.id} newStatus="ready" label="Ready for Pickup" icon={PackageCheck} />
                  <StatusUpdateButton orderId={order.id} newStatus="cancelled" label="Cancel Order" icon={X} variant="destructive" />
                </>
              )}
              {order.status === 'ready' && (
                <>
                  <StatusUpdateButton orderId={order.id} newStatus="completed" label="Mark as Completed" icon={ThumbsUp} />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
