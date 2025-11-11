
'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, ArrowUpDown, CheckCircle, Clock, PackageCheck, Package, CircleX } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { updateOrderStatus } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useStore } from '@/hooks/use-store';


// Define the shape of the data we'll pass to the table
export type OrderData = {
  id: string;
  customerName: string;
  date: string;
  status: 'submitted' | 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  total: string;
  location: string;
  locationId: string;
};

const getStatusStyles = (status: OrderData['status']) => {
    switch (status) {
        case 'submitted': return { icon: Clock, className: 'bg-gray-500/20 text-gray-700' };
        case 'pending': return { icon: Clock, className: 'bg-yellow-500/20 text-yellow-700' };
        case 'confirmed': return { icon: CheckCircle, className: 'bg-blue-500/20 text-blue-700' };
        case 'ready': return { icon: PackageCheck, className: 'bg-teal-500/20 text-teal-700' };
        case 'completed': return { icon: Package, className: 'bg-green-500/20 text-green-700' };
        case 'cancelled': return { icon: CircleX, className: 'bg-red-500/20 text-red-700' };
        default: return { icon: Clock, className: 'bg-gray-500/20 text-gray-700' };
    }
};


// Action menu for each row
const OrderActions = ({ orderId }: { orderId: string }) => {
  const { toast } = useToast();
  const { user } = useUser();
  const [isPending, setIsPending] = React.useState(false);

  const handleStatusChange = async (status: OrderData['status']) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
    }
    
    setIsPending(true);
    const idToken = await user.getIdToken();
    const result = await updateOrderStatus(orderId, status, idToken);
    
    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    } else {
      toast({ title: 'Success', description: result.message });
      // The table will update automatically due to real-time listener
    }
    setIsPending(false);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(orderId)}>
          Copy Order ID
        </DropdownMenuItem>
         <DropdownMenuSub>
            <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleStatusChange('confirmed')}>Confirmed</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('ready')}>Ready for Pickup</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('completed')}>Completed</DropdownMenuItem>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem 
            className="text-destructive focus:text-destructive"
            onClick={() => handleStatusChange('cancelled')}
        >
            Cancel Order
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const columns: ColumnDef<OrderData>[] = [
    {
    accessorKey: 'id',
    header: 'Order ID',
     cell: ({ row }) => <span className="font-mono text-xs">#{row.original.id.slice(0, 7)}...</span>,
  },
  {
    accessorKey: 'customerName',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Customer
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'location',
    header: 'Location',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
        const status = row.original.status;
        const { icon: Icon, className } = getStatusStyles(status);
        return (
            <Badge className={cn("capitalize", className)}>
                <Icon className="mr-1 h-3 w-3" />
                {status}
            </Badge>
        )
    },
  },
   {
    accessorKey: 'total',
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => {
      return <div className="text-right font-medium">{row.getValue("total")}</div>
    },
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    id: 'actions',
    cell: ({ row }) => <OrderActions orderId={row.original.id} />,
  },
];

export function OrdersTable({ data }: { data: OrderData[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center p-4">
        <Input
          placeholder="Filter by customer..."
          value={(table.getColumn('customerName')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('customerName')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className="border-t">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 p-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
