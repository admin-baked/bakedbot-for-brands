
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import MenuAltClient from './components/menu-alt-client';

function MenuPageFallback() {
    return (
        <div className="container mx-auto px-4 py-8">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
                <div className="flex flex-col gap-6">
                    <Skeleton className="h-40 rounded-2xl" />
                    <Skeleton className="h-40 rounded-2xl" />
                </div>
            </div>
             <div className="mb-12">
                <Skeleton className="h-8 w-1/3 mx-auto mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                </div>
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
                <section key={i} className="mb-12">
                    <Skeleton className="h-8 w-1/4 mb-6" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, j) => (
                            <div key={j} className="overflow-hidden rounded-lg shadow-md flex flex-col">
                                <Skeleton className="aspect-square w-full" />
                                <div className="p-4 flex-1 space-y-2">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
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

export default function MenuAltPage() {
    return (
        <Suspense fallback={<MenuPageFallback/>}>
            <MenuAltClient />
        </Suspense>
    );
}
