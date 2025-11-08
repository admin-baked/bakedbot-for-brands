'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

const SKELETON_CATEGORIES = ['Edibles', 'Flower', 'Vapes'];

const ProductSkeleton = () => (
    <Card className="overflow-hidden shadow-md flex flex-col">
        <Skeleton className="aspect-square w-full" />
        <CardContent className="p-4 flex-1 space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
            <Skeleton className="h-7 w-1/4" />
            <Skeleton className="h-10 w-10 rounded-md" />
        </CardFooter>
    </Card>
);

const MenuClientSkeleton = () => {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-80 w-full rounded-lg mb-12" />
        <div className="mb-12">
            <Skeleton className="h-8 w-1/3 mx-auto mb-4" />
            <div className="md:grid md:grid-cols-3 md:gap-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        </div>
        <div className="text-center mb-12">
            <Skeleton className="h-8 w-1/4 mx-auto" />
        </div>
        <div className="space-y-12">
            {SKELETON_CATEGORIES.map(category => (
                <section key={category}>
                    <h2 className="text-3xl font-bold font-teko tracking-wider uppercase mb-6">
                        <Skeleton className="h-8 w-1/4" />
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                        {Array.from({ length: 5 }).map((_, i) => <ProductSkeleton key={i} />)}
                    </div>
                </section>
            ))}
        </div>
      </div>
    );
};


const MenuClientDynamic = dynamic(() => import('./menu-client'), {
  ssr: false,
  loading: () => <MenuClientSkeleton />,
});

export default MenuClientDynamic;
