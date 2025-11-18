
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { makeProductRepo } from '@/server/repos/productRepo';
import { ProductsDataTable } from './components/products-data-table';
import { columns } from './components/products-table-columns';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { demoProducts } from '@/lib/data';
import type { Product } from '@/types/domain';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
    const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
    let products: Product[] = [];

    if (isDemo) {
        products = demoProducts;
    } else {
        const { auth, firestore } = await createServerClient();
        const sessionCookie = cookies().get('__session')?.value;
        if (!sessionCookie) {
          redirect('/brand-login');
        }

        let brandId: string;
        try {
            const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
            brandId = decodedToken.brandId;
            if (!brandId) {
                redirect('/dashboard'); // Not a brand user
            }
        } catch (error) {
            redirect('/brand-login');
        }

        const productRepo = makeProductRepo(firestore);
        products = await productRepo.getAllByBrand(brandId);
    }
    
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Products</h1>
                    <p className="text-muted-foreground">
                    Manage your brand's product catalog.
                    </p>
                </div>
                <Button>
                    <PlusCircle className="mr-2" /> Add Product
                </Button>
            </div>
            <ProductsDataTable columns={columns} data={products} />
        </div>
    );
}
