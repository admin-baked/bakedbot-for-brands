
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { makeProductRepo } from '@/server/repos/productRepo';
import type { Product } from '@/types/domain';
import { demoProducts } from '@/server/demo/demo-data';
import { ProductsDataTable } from './components/products-data-table';
import { columns } from './components/products-table-columns';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardProductsPage() {
  const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
  
  let products: Product[] = [];
  
  if (isDemo) {
    products = demoProducts;
  } else {
    let brandId: string | null = null;
    try {
        const user = await requireUser(['brand', 'owner']);
        brandId = user.brandId;
    } catch (error) {
        redirect('/brand-login');
    }

    if (!brandId) {
        // This case should ideally not be hit if role is 'brand'
        // but it's a good safeguard.
        return <p>You are not associated with a brand.</p>
    }

    try {
        const { firestore } = await createServerClient();
        const productRepo = makeProductRepo(firestore);
        products = await productRepo.getAllByBrand(brandId);
    } catch (error) {
        console.error("Failed to fetch products for dashboard:", error);
        // Fallback to demo data on error for resilience, though you might want a proper error page
        products = demoProducts;
    }
  }
  
  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
             {/* The header is now handled by the layout */}
             <div/>
            <Link href="/dashboard/products/new" passHref>
              <Button>
                <PlusCircle /> Add Product
              </Button>
            </Link>
        </div>
        <ProductsDataTable columns={columns} data={products} />
    </div>
  );
}
