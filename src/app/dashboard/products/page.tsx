
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { makeProductRepo } from '@/server/repos/productRepo';
import type { Product } from '@/types/domain';
import { demoProducts } from '@/lib/data';
import { ProductsDataTable } from './components/products-data-table';
import { columns } from './components/products-table-columns';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardProductsPage() {
  const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
  
  let products: Product[] = [];
  
  if (isDemo) {
    products = demoProducts;
  } else {
    try {
        const { firestore } = await createServerClient();
        const productRepo = makeProductRepo(firestore);
        // In a real app, you'd get the brandId from the user's session
        const brandId = 'default'; 
        products = await productRepo.getAllByBrand(brandId);
    } catch (error) {
        console.error("Failed to fetch products for dashboard:", error);
        // Fallback to demo data on error
        products = demoProducts;
    }
  }
  
  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
             {/* The header is now handled by the layout */}
             <div/>
            <Button asChild>
                <Link href="/dashboard/products/new">
                    <PlusCircle className="mr-2" /> Add Product
                </Link>
            </Button>
        </div>
        <ProductsDataTable columns={columns} data={products} />
    </div>
  );
}
