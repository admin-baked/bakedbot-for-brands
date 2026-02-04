
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Product } from '@/types/domain';
import Image from 'next/image';
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { calculateProductScore, getScoreColor } from '@/lib/scoring';
import { Button } from '@/components/ui/button';
import { getPriceTier, TIER_CONFIG } from '@/lib/product-tiers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useTransition } from 'react';
import { deleteProduct } from '../actions';
import { useToast } from '@/hooks/use-toast';

function DeleteAction({ productId, productName }: { productId: string; productName: string }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Deletion Failed',
          description: result.message,
        });
      } else {
        toast({
          title: 'Success!',
          description: result.message,
        });
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Delete product
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the product
            <span className="font-semibold"> {productName}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            {isPending ? 'Deleting...' : 'Continue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'imageUrl',
    header: 'Image',
    cell: ({ row }) => {
      const imageUrl = row.getValue('imageUrl') as string;
      const name = row.getValue('name') as string;
      return (
        <div className="relative h-12 w-12 rounded-md overflow-hidden border bg-muted">
          {imageUrl ? (
            <Image src={imageUrl} alt={name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              No Image
            </div>
          )}
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
    id: 'tier',
    header: 'Tier',
    cell: ({ row }) => {
      const price = row.original.price || 0;
      const tier = getPriceTier(price);
      const config = TIER_CONFIG[tier];
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.bgClass} ${config.textClass}`}>
          {config.label}
        </span>
      );
    },
    filterFn: (row, id, filterValue) => {
      if (!filterValue || filterValue === 'all') return true;
      const price = row.original.price || 0;
      const tier = getPriceTier(price);
      return tier === filterValue;
    }
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => {
      const source = (row.getValue('source') as string) || 'manual';
      const isLive = source === 'pos';
      const isDelayed = ['cannmenus', 'leafly', 'discovery'].includes(source);

      return (
        <div className="flex items-center">
          {isLive && (
            <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-500">
              Live
            </span>
          )}
          {isDelayed && (
            <span className="inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-500" title="Backup data (may be delayed)">
              Delayed
            </span>
          )}
          {!isLive && !isDelayed && (
            <span className="inline-flex items-center rounded-full border border-gray-500/30 bg-gray-500/10 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              Manual
            </span>
          )}
        </div>
      );
    }
  },
  {
    accessorKey: 'id', // Virtual column for Score
    id: 'score',
    header: 'Product Score',
    cell: ({ row }) => {
      const product = row.original;
      const { total, tips } = calculateProductScore(product);
      const colorClass = getScoreColor(total);

      return (
        <div className="flex items-center gap-2 group relative">
          <div className={`px-2 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
            {total}/100
          </div>
          {total < 100 && (
            <div className="absolute left-full top-0 ml-2 w-48 p-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
              <p className="font-bold mb-1">Improvement Tips:</p>
              <ul className="list-disc pl-3">
                {tips.slice(0, 3).map(t => <li key={t}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      );
    }
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
              <DropdownMenuSeparator />
              <DeleteAction productId={product.id} productName={product.name} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
