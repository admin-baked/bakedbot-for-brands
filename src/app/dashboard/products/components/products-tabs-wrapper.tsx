'use client';

/**
 * ProductsTabsWrapper
 *
 * Adds "Products" + "Analytics" top-level tabs to the products page.
 * Receives serialized products from the server component.
 */

import React, { useRef, useState } from 'react';
import { BarChart2, Table2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductsDataTable } from './products-data-table';
import { columns } from './products-table-columns';
import { ProductsAnalyticsTab } from './analytics-tab';
import { ProductBriefingCards } from './product-briefing-cards';
import type { Product } from '@/types/domain';

interface Props {
    products: Product[];
    orgId: string;
}

export function ProductsTabsWrapper({ products, orgId }: Props) {
    const [tab, setTab] = useState<'products' | 'analytics'>('products');
    const tableRef = useRef<HTMLDivElement>(null);

    const handleBriefingAction = (cardId: string) => {
        // Switch to products tab and scroll to table
        setTab('products');
        setTimeout(() => {
            tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    return (
        <div className="space-y-4">
            <ProductBriefingCards products={products} onFilterTable={handleBriefingAction} />

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

                <TabsContent value="products" className="mt-4" ref={tableRef}>
                    <ProductsDataTable columns={columns} data={products} />
                </TabsContent>

                <TabsContent value="analytics" className="mt-4">
                    <ProductsAnalyticsTab orgId={orgId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
