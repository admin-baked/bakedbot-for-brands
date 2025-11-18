import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { demoProducts } from '@/lib/data';
import ContentAITab from './components/content-ai-tab';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function ProductContentAIPage() {
    const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
    let products = [];
    
    if (isDemo) {
        products = demoProducts;
    } else {
        try {
            const { firestore } = await createServerClient();
            const productRepo = makeProductRepo(firestore);
            const brandId = 'default'; 
            products = await productRepo.getAllByBrand(brandId);
        } catch (error) {
            console.error("Failed to fetch products for content generator:", error);
            products = demoProducts;
        }
    }
    
    return <ContentAITab initialProducts={products} />;
}
