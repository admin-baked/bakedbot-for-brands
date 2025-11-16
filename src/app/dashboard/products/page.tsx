'use client';
export const dynamic = 'force-dynamic';

import { useMemo, useState, useEffect } from "react";
import { ProductsTable } from "./components/products-table";
import { useUser } from "@/firebase/auth/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/firebase/converters";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { collection, query, where } from 'firebase/firestore';
import { useFirebase } from "@/firebase/provider";
import { useCollection } from "@/firebase/firestore/use-collection";
import { productConverter } from "@/firebase/converters";

export default function ProductsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const [currentBrandId, setCurrentBrandId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        const claims = idTokenResult.claims;
        if (claims.brandId) setCurrentBrandId(claims.brandId as string);
      });
    }
  }, [user]);

  const productsQuery = useMemo(() => {
    if (!firestore || !currentBrandId) return null;
    return query(collection(firestore, 'products').withConverter(productConverter), where('brandId', '==', currentBrandId));
  }, [firestore, currentBrandId]);

  const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);

  const formattedProducts = useMemo(() => {
    if (!products) return [];
    
    return products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price ? `$${product.price.toFixed(2)}` : '$0.00',
        likes: product.likes || 0,
        dislikes: product.dislikes || 0,
    }));
  }, [products]);

  const isLoading = areProductsLoading || isUserLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <div>
            <Skeleton className="h-9 w-1/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
        </div>
        <div className="rounded-md border bg-card">
            <div className="p-4 flex justify-between">
                 <Skeleton className="h-10 w-64" />
                 <Skeleton className="h-10 w-32" />
            </div>
            <div className="border-t p-4 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground">
            Manage your product catalog.
            </p>
        </div>
        <Button asChild>
            <Link href="/dashboard/settings?tab=data">
                <PlusCircle className="mr-2" />
                Add or Import Products
            </Link>
        </Button>
      </div>
      <ProductsTable data={formattedProducts} />
    </div>
  );
}
