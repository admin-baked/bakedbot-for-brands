
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Product } from '@/types/domain';
import Image from 'next/image';
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'imageUrl',
    header: 'Image',
    cell: ({ row }) => {
        const imageUrl = row.getValue('imageUrl') as string;
        const name = row.getValue('name') as string;
        return (
            <div className="relative h-12 w-12 rounded-md overflow-hidden border">
                <Image src={imageUrl} alt={name} fill className="object-cover" />
            </div>
        )
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Product Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
  },
  {
    accessorKey: 'price',
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Base Price
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('price'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const product = row.original;
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
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.id)}>
                    Copy product ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={`/dashboard/products/${product.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit product
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete product
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      );
    },
  },
];
