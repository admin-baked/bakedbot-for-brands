'use client';

/**
 * Synced Products Grid - Shows imported products with source badges
 * Powers: Headless Menu, Smokey AI, Brand Pages, Widgets
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Package, ExternalLink, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useOptionalFirebase } from '@/firebase/use-optional-firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    imageUrl?: string;
    source?: 'cannmenus' | 'leafly' | 'pos' | 'manual';
}

interface SyncedProductsGridProps {
    brandId: string;
    maxDisplay?: number;
}

export function SyncedProductsGrid({ brandId, maxDisplay = 6 }: SyncedProductsGridProps) {
    const firebase = useOptionalFirebase();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        async function fetchProducts() {
            if (!firebase?.firestore || !brandId) {
                setLoading(false);
                return;
            }

            try {
                // Get total count
                const allQuery = query(
                    collection(firebase.firestore, 'products'),
                    where('brandId', '==', brandId)
                );
                const allSnap = await getDocs(allQuery);
                setTotalCount(allSnap.size);

                // Get limited display set
                const displayQuery = query(
                    collection(firebase.firestore, 'products'),
                    where('brandId', '==', brandId),
                    orderBy('name'),
                    limit(maxDisplay)
                );
                const displaySnap = await getDocs(displayQuery);

                const prods = displaySnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Product[];

                setProducts(prods);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchProducts();
    }, [firebase, brandId, maxDisplay]);

    const getSourceBadge = (source?: string) => {
        switch (source) {
            case 'cannmenus':
                return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">CannMenus</Badge>;
            case 'leafly':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">Leafly</Badge>;
            case 'pos':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">POS</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">Manual</Badge>;
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-48">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (products.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Your Products</CardTitle>
                        <Button size="sm" asChild>
                            <Link href="/dashboard/products/import">
                                <Plus className="h-4 w-4 mr-2" />
                                Import Products
                            </Link>
                        </Button>
                    </div>
                    <CardDescription>Import products to power your Headless Menu, AI Budtender, and Brand Pages.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-8 text-center border-dashed border rounded-lg bg-muted/50">
                        <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground font-medium">No products synced yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Search CannMenus, Leafly, or upload your catalog
                        </p>
                        <Button className="mt-4" asChild>
                            <Link href="/dashboard/products/import">
                                Find My Products
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Your Products</CardTitle>
                        <CardDescription>
                            {totalCount} products powering your Headless Menu, AI Budtender & Brand Pages
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard/menu">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Menu
                            </Link>
                        </Button>
                        <Button size="sm" asChild>
                            <Link href="/dashboard/products/import">
                                <Plus className="h-4 w-4 mr-2" />
                                Import More
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {products.map((product) => (
                        <div key={product.id} className="group relative">
                            <div className="aspect-square rounded-lg border bg-muted/50 overflow-hidden">
                                {product.imageUrl ? (
                                    <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        width={200}
                                        height={200}
                                        className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="h-8 w-8 text-muted-foreground/30" />
                                    </div>
                                )}
                            </div>
                            <div className="mt-2">
                                <p className="text-sm font-medium truncate">{product.name}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-muted-foreground">{product.category}</span>
                                    {getSourceBadge(product.source)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {totalCount > maxDisplay && (
                    <div className="mt-4 text-center">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/dashboard/menu">
                                View all {totalCount} products →
                            </Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
