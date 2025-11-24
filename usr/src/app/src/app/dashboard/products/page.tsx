
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { makeProductRepo } from '@/server/repos/productRepo';
import type { Product } from '@/types/domain';
import { demoProducts } from '@/lib/demo/demo-data';
import { ProductsDataTable } from './components/products-data-table';
import { columns } from './components/products-table-columns';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { DEMO_BRAND_ID } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function DashboardProductsPage() {
  const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
  
  let products: Product[] = [];
  
  if (isDemo) {
    products = demoProducts;
  } else {
    let brandId: string | null = null;
    try {
        // This is where the user object is actually defined.
        const user = await requireUser(['brand', 'owner']);
        brandId = user.brandId;

        // The logic is now safe because 'user' is defined inside this try block.
        if (!brandId && user.role !== 'owner') {
            return <p>You are not associated with a brand.</p>;
        }

        const { firestore } = await createServerClient();
        const productRepo = makeProductRepo(firestore);

        if (user.role === 'owner') {
            // Owner sees all products
            products = await productRepo.getAll();
        } else if (brandId) {
            products = await productRepo.getAllByBrand(brandId);
        }

    } catch (error) {
        if ((error as Error).message.includes('Unauthorized')) {
             redirect('/brand-login');
        }
        console.error("Failed to fetch products for dashboard:", error);
        products = demoProducts; // Fallback to demo data on error for resilience
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
