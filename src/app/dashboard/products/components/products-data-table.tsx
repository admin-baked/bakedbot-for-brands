
'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { TIER_CONFIG, type PriceTier } from '@/lib/product-tiers';
import type { Product } from '@/types/domain';
import { AIDescriptionDialog } from './ai-description-dialog';
import { syncProductsFromPos, getPosConfig } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function ProductsDataTable<TData extends Product, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const { toast } = useToast();
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [tierFilter, setTierFilter] = React.useState<string>('all');
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [aiDialogOpen, setAiDialogOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [posProvider, setPosProvider] = React.useState<string | null>(null);

  // Load POS config on mount
  React.useEffect(() => {
    getPosConfig().then(config => {
      setPosProvider(config.provider);
    });
  }, []);

  // Add selection column to columns
  const columnsWithSelection: ColumnDef<TData, TValue>[] = React.useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    ...columns,
  ], [columns]);

  // Filter data by tier
  const filteredData = React.useMemo(() => {
    if (tierFilter === 'all') return data;
    return data.filter(item => {
      const price = (item as any).price || 0;
      if (tierFilter === 'budget') return price < 30;
      if (tierFilter === 'mid') return price >= 30 && price < 60;
      if (tierFilter === 'premium') return price >= 60 && price < 100;
      if (tierFilter === 'luxury') return price >= 100;
      return true;
    });
  }, [data, tierFilter]);

  const table = useReactTable({
    data: filteredData,
    columns: columnsWithSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  const selectedProducts = table.getFilteredSelectedRowModel().rows.map(row => row.original);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncProductsFromPos();
      if (result.success) {
        toast({
          title: 'Sync Complete',
          description: `Synced ${result.count || 0} products from ${result.provider || 'POS'}.`
        });
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Sync Failed',
          description: result.error || 'Failed to sync products'
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBulkAI = () => {
    setSelectedProduct(null);
    setAiDialogOpen(true);
  };

  const handleSingleAI = (product: Product) => {
    setSelectedProduct(product);
    setAiDialogOpen(true);
  };

  const tierCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: data.length, budget: 0, mid: 0, premium: 0, luxury: 0 };
    data.forEach(item => {
      const price = (item as any).price || 0;
      if (price < 30) counts.budget++;
      else if (price < 60) counts.mid++;
      else if (price < 100) counts.premium++;
      else counts.luxury++;
    });
    return counts;
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Tier Filter Tabs */}
      <Tabs value={tierFilter} onValueChange={setTierFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({tierCounts.all})</TabsTrigger>
          <TabsTrigger value="budget" className="text-green-600">Budget ({tierCounts.budget})</TabsTrigger>
          <TabsTrigger value="mid" className="text-blue-600">Mid ({tierCounts.mid})</TabsTrigger>
          <TabsTrigger value="premium" className="text-purple-600">Premium ({tierCounts.premium})</TabsTrigger>
          <TabsTrigger value="luxury" className="text-amber-600">Luxury ({tierCounts.luxury})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Filter by product name..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          {selectedProducts.length > 0 && (
            <Button variant="outline" onClick={handleBulkAI}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Describe ({selectedProducts.length})
            </Button>
          )}
          {posProvider && (
            <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Sync from {posProvider}</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Selection Info */}
      {selectedProducts.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {selectedProducts.length} of {filteredData.length} product(s) selected
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
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
                <TableCell colSpan={columnsWithSelection.length} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {filteredData.length} products
        </div>
        <div className="flex items-center space-x-2">
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

      {/* AI Description Dialog */}
      <AIDescriptionDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        product={selectedProduct}
        products={selectedProduct ? undefined : selectedProducts}
        onSuccess={() => {
          setRowSelection({});
          router.refresh();
        }}
      />
    </div>
  );
}
