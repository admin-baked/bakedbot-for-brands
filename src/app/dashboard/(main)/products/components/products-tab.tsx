
'use client';

import { ProductsDataTable } from '@/app/dashboard/products/components/products-data-table';
import { columns } from '@/app/dashboard/products/components/products-table-columns';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types/domain';

interface ProductsTabProps {
    initialProducts: Product[];
}

export default function ProductsTab({ initialProducts }: ProductsTabProps) {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Products</h2>
                    <p className="text-muted-foreground">
                        Manage your brand's product catalog.
                    </p>
                </div>
                <Button>
                    <PlusCircle className="mr-2" /> Add Product
                </Button>
            </div>
            <ProductsDataTable columns={columns} data={initialProducts} />
        </div>
    );
}
