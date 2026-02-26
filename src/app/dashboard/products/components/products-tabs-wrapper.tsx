'use client';

/**
 * ProductsTabsWrapper
 *
 * Adds "Products" + "Analytics" top-level tabs to the products page.
 * Receives serialized products from the server component.
 */

import React, { useState } from 'react';
import { BarChart2, Table2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductsDataTable } from './products-data-table';
import { columns } from './products-table-columns';
import { ProductsAnalyticsTab } from './analytics-tab';
import type { Product } from '@/types/domain';

interface Props {
    products: Product[];
    orgId: string;
}

export function ProductsTabsWrapper({ products, orgId }: Props) {
    const [tab, setTab] = useState<'products' | 'analytics'>('products');

    return (
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'products' | 'analytics')}>
            <TabsList>
                <TabsTrigger value="products" className="gap-2">
                    <Table2 className="h-4 w-4" />
                    Products ({products.length})
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2">
                    <BarChart2 className="h-4 w-4" />
                    Analytics
                </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="mt-4">
                <ProductsDataTable columns={columns} data={products} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
                <ProductsAnalyticsTab orgId={orgId} />
            </TabsContent>
        </Tabs>
    );
}
