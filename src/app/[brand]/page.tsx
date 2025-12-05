import Chatbot from '@/components/chatbot';
import { MenuPage } from '@/components/menu-page';
import { demoProducts } from '@/lib/demo/demo-data';

// This would be fetched based on brand param
const MOCK_BRAND_CONFIG = {
    hasMenu: true,
    hasChatbot: true,
    primaryColor: '#10b981',
};

export default async function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
    // In a real app, use params.brand to fetch config
    const { brand } = await params;
    const brandSlug = brand;

    return (
        <main className="relative min-h-screen">
            {/* 
          If the brand has a menu, show the MenuPage.
          For the demo, MenuPage redirects to /shop/[id], which might not be what we want 
          for a white-labeled custom domain site.
          Ideally, MenuPage should render the grid HERE.
          
          However, reusing the existing MenuPage component (which currently redirects) 
          is a placeholder. 
          
          For this implementation, let's render a basic placeholder that ACTUALLY shows content
          instead of redirecting, or just render the Chatbot if menu is disabled.
       */}

            <div className="container mx-auto py-8">
                <h1 className="text-3xl font-bold mb-6 capitalize">{brandSlug.replace('-', ' ')}</h1>

                <div className="p-8 border rounded-lg bg-card text-card-foreground shadow-sm">
                    <h2 className="text-xl mb-4">Welcome to our store</h2>
                    <p className="text-muted-foreground mb-4">
                        This is the default public page for <strong>{brandSlug}</strong>.
                    </p>
                    <p className="text-sm">
                        (This page is served via <code>src/app/[brand]/page.tsx</code>)
                    </p>

                    {/* 
                We can embed the Product Grid here directly later.
                For now, let's just show the chatbot.
            */}
                </div>
            </div>

            {MOCK_BRAND_CONFIG.hasChatbot && (
                <Chatbot
                    products={demoProducts}
                    brandId={brandSlug} // Pass the slug as ID for now
                    initialOpen={true}
                />
            )}
        </main>
    );
}
