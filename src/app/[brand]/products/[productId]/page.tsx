import { createServerClient } from '@/firebase/server-client';
import type { Product, Brand } from '@/types/domain';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button'; // Assuming shadcn ui
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Share2 } from 'lucide-react';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { ProductAvailability } from './product-availability';
import type { Metadata, ResolvingMetadata } from 'next';

import { demoProducts } from '@/lib/demo/demo-data';

// Helper to fetch data
async function getProductData(brandSlug: string, productId: string) {
    // 0. Handle Demo 40 Tons Data
    if (brandSlug === 'demo-40tons') {
        const product = demoProducts.find(p => p.id === productId) as Product | undefined;
        const brand: Brand = {
            id: 'demo-40tons',
            name: '40 Tons',
            logoUrl: 'https://storage.googleapis.com/bakedbot-global-assets/40tons-logo.png',
            chatbotConfig: {
                basePrompt: 'You are a knowledgeable budtender for 40 Tons Cannabis.',
                welcomeMessage: 'Welcome to 40 Tons - Breaking the chains of cannabis injustice.',
            },
        };

        if (product) {
            // Ensure product has the correct brandId for consistency
            return { brand, product: { ...product, brandId: 'demo-40tons' } };
        }
        return { brand, product: null };
    }

    const { firestore } = await createServerClient();

    // 1. Get Brand - treat brandSlug as brand ID
    let brand: Brand | null = null;
    const brandDoc = await firestore.collection('brands').doc(brandSlug).get();
    if (brandDoc.exists) {
        brand = { id: brandDoc.id, ...brandDoc.data() } as Brand;
    }

    // 2. Get Product
    const productDoc = await firestore.collection('products').doc(productId).get();
    let product: Product | null = null;

    if (productDoc.exists) {
        product = { id: productDoc.id, ...productDoc.data() } as Product;
    }

    return { brand, product };
}

// SEO Generation
export async function generateMetadata(
    { params }: { params: Promise<{ brand: string; productId: string }> },
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { brand: brandSlug, productId } = await params;
    const { brand, product } = await getProductData(brandSlug, productId);

    if (!product || !brand) {
        return { title: 'Product Not Found' };
    }

    const previousImages = (await parent).openGraph?.images || [];

    return {
        title: `${product.name} | ${brand.name}`,
        description: product.description || `Buy ${product.name} from ${brand.name}.`,
        openGraph: {
            title: product.name,
            description: product.description,
            images: [product.imageUrl, ...previousImages],
        },
    };
}

export default async function ProductPage({ params }: { params: Promise<{ brand: string; productId: string }> }) {
    const { brand: brandSlug, productId } = await params;
    const { brand, product } = await getProductData(brandSlug, productId);

    if (!product || !brand) {
        notFound();
    }

    // JSON-LD Schema
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: product.imageUrl,
        description: product.description,
        brand: {
            '@type': 'Brand',
            name: brand.name,
        },
        offers: {
            '@type': 'Offer',
            url: `https://bakedbot.ai/${brandSlug}/products/${productId}`, // Placeholder domain
            priceCurrency: 'USD',
            price: product.price,
            availability: 'https://schema.org/InStock',
        },
    };

    return (
        <main className="min-h-screen bg-background">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <div className="container mx-auto py-8 px-4 md:px-6">
                <div className="mb-6">
                    <Link href={`/${brandSlug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Menu
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
                    {/* Image Column */}
                    <div className="relative aspect-square md:aspect-[4/5] bg-muted rounded-xl overflow-hidden border">
                        <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                            priority
                        />
                        {product.category && (
                            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                                {product.category}
                            </div>
                        )}
                    </div>

                    {/* Content Column */}
                    <div className="flex flex-col justify-center">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">{product.name}</h1>

                            <ProductAvailability product={product} />

                            <div className="prose prose-stone dark:prose-invert max-w-none mb-8">
                                <p className="text-lg leading-relaxed text-muted-foreground">
                                    {product.description}
                                </p>
                            </div>

                            {/* Effects / Terpenes placeholders (to be populated from real data later) */}
                            <div className="space-y-6 mb-10">
                                {/* Example Effect Badges */}
                                {/* 
                                 <div>
                                     <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Effects</h3>
                                     <div className="flex flex-wrap gap-2">
                                         <Badge variant="secondary">Relaxing</Badge>
                                         <Badge variant="secondary">Euphoric</Badge>
                                     </div>
                                 </div>
                                 */}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <AddToCartButton product={product} />
                                <Button variant="outline" size="lg" className="flex-1 sm:flex-none">
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Share
                                </Button>
                            </div>

                            <p className="mt-8 text-xs text-muted-foreground">
                                * Prices may vary by retailer location. Taxes not included.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
