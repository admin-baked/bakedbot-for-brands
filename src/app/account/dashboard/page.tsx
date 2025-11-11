
'use client';

import { useMemo } from 'react';
import type { Review, UserInteraction, OrderDoc } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Sparkles, Star } from 'lucide-react';
import Header from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import { Skeleton } from '@/components/ui/skeleton';
import CustomerReviewHistory from './components/customer-review-history';
import CustomerOrderHistory from './components/customer-order-history';
import CustomerUploads from './components/customer-uploads';
import FavoriteLocation from './components/favorite-location';
import { useStore } from '@/hooks/use-store';
import { demoLocations } from '@/lib/data';
import { useMenuData } from '@/hooks/use-menu-data';
import { Timestamp } from 'firebase/firestore';


function MetricCard({ title, value, icon: Icon, isLoading }: { title: string; value: string | number; icon: React.ElementType; isLoading: boolean }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-7 w-1/2" />
                ) : (
                    <div className="text-2xl font-bold">{value}</div>
                )}
            </CardContent>
        </Card>
    );
}

const demoCustomer = {
    favoriteLocationId: '1',
    orders: [
        { id: 'demo1', createdAt: Timestamp.now(), status: 'completed', totals: { total: 47.50 } },
        { id: 'demo2', createdAt: Timestamp.now(), status: 'ready', totals: { total: 88.00 } },
    ] as OrderDoc[],
    reviews: [
        { id: 'rev1', productId: '1', rating: 5, text: 'Absolutely love the Cosmic Caramels! Perfect for relaxing.' },
        { id: 'rev2', productId: '4', rating: 4, text: 'OG Galaxy is a classic. Great for winding down.' },
    ] as Review[],
    interactions: [
        { recommendedProductIds: ['1', '2'] },
        { recommendedProductIds: ['4'] }
    ] as Partial<UserInteraction>[],
};


export default function CustomerDashboardPage() {
    const { isUsingDemoData, isLoading } = useMenuData();
    const { favoriteLocationId, setFavoriteLocationId } = useStore();

    const handleSetFavorite = async (locationId: string | null) => {
        // In demo mode, this just updates the local state.
        // In live mode, it would also update Firestore.
        setFavoriteLocationId(locationId);
    };

    const stats = useMemo(() => {
        if (!isUsingDemoData) {
            // NOTE: Live data fetching logic would go here
            return { chatbotInteractions: 0, productsRecommended: 0, reviewsSubmitted: 0 };
        }
        
        return {
            chatbotInteractions: demoCustomer.interactions.length,
            productsRecommended: demoCustomer.interactions.reduce((acc, i) => acc + (i.recommendedProductIds?.length || 0), 0),
            reviewsSubmitted: demoCustomer.reviews.length,
        };
    }, [isUsingDemoData]);

    const displayFavoriteId = isUsingDemoData ? (favoriteLocationId || demoCustomer.favoriteLocationId) : favoriteLocationId;

    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 bg-muted/20">
                <div className="container mx-auto px-4 py-8">
                     <div>
                        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
                        <p className="text-muted-foreground">
                            Here's a summary of your activity and contributions.
                        </p>
                    </div>

                    <div className="mt-6">
                        <FavoriteLocation
                            favoriteId={displayFavoriteId}
                            onSetFavorite={handleSetFavorite}
                        />
                    </div>
                    
                    <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <MetricCard title="Chatbot Interactions" value={stats.chatbotInteractions} icon={MessageSquare} isLoading={isLoading} />
                        <MetricCard title="Products Recommended" value={stats.productsRecommended} icon={Sparkles} isLoading={isLoading} />
                        <MetricCard title="Reviews Submitted" value={stats.reviewsSubmitted} icon={Star} isLoading={isLoading} />
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                             <CustomerOrderHistory orders={isUsingDemoData ? demoCustomer.orders : []} isLoading={isLoading} />
                        </div>
                        <div className="space-y-8">
                             <CustomerReviewHistory reviews={isUsingDemoData ? demoCustomer.reviews : []} isLoading={isLoading} />
                             <CustomerUploads />
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
