'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function MenuPageFallback() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="relative h-64 md:h-80 w-full rounded-lg overflow-hidden mb-12">
                <Skeleton className="h-full w-full" />
            </div>
             <div className="mb-12">
                <Skeleton className="h-8 w-1/3 mx-auto mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
             <div className="text-center mb-12">
                 <Skeleton className="h-10 w-48 mx-auto" />
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
                <section key={i} className="mb-12">
                    <Skeleton className="h-8 w-1/4 mb-6" />
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                        {Array.from({ length: 5 }).map((_, j) => (
                            <div key={j} className="overflow-hidden shadow-md flex flex-col">
                                <Skeleton className="aspect-square w-full" />
                                <div className="p-4 flex-1 space-y-2">
                                    <Skeleton className="h-5 w-1/3" />
                                    <Skeleton className="h-6 w-3/4" />
                                </div>
                                <div className="p-4 pt-0 flex justify-between items-center">
                                    <Skeleton className="h-7 w-1/4" />
                                    <Skeleton className="h-10 w-10 rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    )
}

const MenuClientDynamic = dynamic(() => import('./menu/components/menu-client'), {
    suspense: true,
    ssr: false 
});

export function MenuPageDynamic() {
    return (
        <Suspense fallback={<MenuPageFallback/>}>
            <MenuClientDynamic />
        </Suspense>
    );
}
