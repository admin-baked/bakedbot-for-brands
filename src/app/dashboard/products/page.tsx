
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { makeProductRepo } from '@/server/repos/productRepo';
import type { Product } from '@/types/domain';
import { demoProducts } from '@/lib/demo/demo-data';
import { ProductsDataTable } from './components/products-data-table';
import { columns } from './components/products-table-columns';
import { PlusCircle, Import } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { DEMO_BRAND_ID } from '@/lib/config';

import { logger } from '@/lib/logger';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
export const dynamic = 'force-dynamic';


export default async function DashboardProductsPage() {
    const isDemo = (await cookies()).get('isUsingDemoData')?.value === 'true';

    let products: Product[] = [];
    let showPosAlert = false;
    let user: any = null;

    if (isDemo) {
        products = demoProducts;
        user = { role: 'brand', brandId: DEMO_BRAND_ID };
    } else {
        try {
            user = await requireUser(['brand', 'owner', 'dispensary']);
            const brandId = user.brandId;

            const { firestore } = await createServerClient();
            const productRepo = makeProductRepo(firestore);

            if (user.role === 'dispensary') {
                // Dispensary Logic
                // 1. Fetch Products
                // Dispensaries might store products with brandId=dispensaryId or handle differently.
                // For now, assume products are linked to their UID if no brandId.
                // Actually `brandId` on User for dispensary might be their Org ID.
                // Let's rely on `productRepo.getAllByBrand` using their ID.
                products = await productRepo.getAllByBrand(user.uid); // or brandId if set

                // 2. Check POS Config
                const dispDoc = await firestore.collection('dispensaries').doc(user.uid).get();
                const posConfig = dispDoc.data()?.posConfig;
                if (!posConfig || !posConfig.provider) {
                    showPosAlert = true;
                }
            } else if (user.role === 'owner') {
                // Owner sees all products
                products = await productRepo.getAll();
            } else if (brandId) {
                products = await productRepo.getAllByBrand(brandId);
            } else {
                // This case should ideally not be hit if role is 'brand'
                // but it's a good safeguard for brand users without a brandId.
                return <p>You are not associated with a brand.</p>
            }
        } catch (error) {
            if ((error as Error).message.includes('Unauthorized')) {
                redirect('/brand-login');
            }
            logger.error("Failed to fetch products for dashboard:", error instanceof Error ? error : new Error(String(error)));
            // Fallback to demo data on error for resilience, though you might want a proper error page
            products = demoProducts;
            user = { role: 'brand' }; // Fallback user to prevent crash in render
        }
    }

    return (
        <div className="flex flex-col gap-6">
            {showPosAlert && (
                <Alert className="bg-yellow-500/10 border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Connect Point of Sale</AlertTitle>
                    <AlertDescription>
                        Connect your POS (Dutchie, Jane, etc.) for real-time inventory synchronization.
                        Currently using manual or backup data which may be delayed.
                    </AlertDescription>
                </Alert>
            )}
            <div className="flex items-center justify-between">
                {/* The header is now handled by the layout */}
                <div className="flex gap-2">
                    <Link href="/dashboard/products/import" passHref>
                        <Button variant="outline">
                            <Import className="mr-2 h-4 w-4" /> Import from CannMenus
                        </Button>
                    </Link>
                    <Link href="/dashboard/products/new" passHref>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                    </Link>
                </div>
            </div>
            <ProductsDataTable columns={columns} data={products} />
        </div>
    );
}
