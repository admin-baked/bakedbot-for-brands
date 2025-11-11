
'use client';

import { useMemo, useEffect, useState } from 'react';
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
import { useMenuData } from '@/hooks/use-menu-data';
import { collection, query, where, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase } from '@/firebase/provider';
import { demoCustomer } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';


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

export default function CustomerDashboardPage() {
    const { isUsingDemoData, isLoading: isMenuLoading } = useMenuData();
    const { favoriteLocationId, setFavoriteLocationId: setStoreFavoriteId } = useStore();
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    // Set local state from store or live user profile
    const [currentFavoriteId, setCurrentFavoriteId] = useState<string | null>(null);

     // Fetch data specifically for the logged-in user in live mode
    const interactionsQuery = useMemo(() => !isUsingDemoData && user && firestore ? query(collection(firestore, `users/${user.uid}/interactions`)) : null, [isUsingDemoData, user, firestore]);
    const reviewsQuery = useMemo(() => !isUsingDemoData && user && firestore ? query(collection(firestore, 'reviews'), where('userId', '==', user.uid)) : null, [isUsingDemoData, user, firestore]);
    const ordersQuery = useMemo(() => !isUsingDemoData && user && firestore ? query(collection(firestore, 'orders'), where('userId', '==', user.uid)) : null, [isUsingDemoData, user, firestore]);

    const { data: liveInteractions, isLoading: areInteractionsLoading } = useCollection<UserInteraction>(interactionsQuery);
    const { data: liveReviews, isLoading: areReviewsLoading } = useCollection<Review>(reviewsQuery);
    const { data: liveOrders, isLoading: areOrdersLoading } = useCollection<OrderDoc>(ordersQuery);

    // Determine which data to use
    const isLoading = isMenuLoading || (isUserLoading && !isUsingDemoData) || areInteractionsLoading || areReviewsLoading || areOrdersLoading;
    const interactions = isUsingDemoData ? demoCustomer.interactions : liveInteractions;
    const reviews = isUsingDemoData ? demoCustomer.reviews : liveReviews;
    const orders = isUsingDemoData ? demoCustomer.orders : liveOrders;
    
     useEffect(() => {
        if (isUsingDemoData) {
            setCurrentFavoriteId(demoCustomer.favoriteLocationId);
            setStoreFavoriteId(demoCustomer.favoriteLocationId);
        } else if (user && firestore) {
            const unsub = onSnapshot(doc(firestore, 'users', user.uid), (doc) => {
                const favId = doc.data()?.favoriteLocationId || null;
                setCurrentFavoriteId(favId);
                setStoreFavoriteId(favId);
            });
            return () => unsub();
        }
    }, [isUsingDemoData, user, firestore, setStoreFavoriteId]);


    const handleSetFavorite = async (locationId: string | null) => {
        setCurrentFavoriteId(locationId); // Optimistic UI update
        if (isUsingDemoData) {
             toast({ title: "Favorites are disabled in Demo Mode."});
             return;
        }
        
        if (user && firestore) {
            const userDocRef = doc(firestore, 'users', user.uid);
            try {
                await updateDoc(userDocRef, { favoriteLocationId: locationId });
                setStoreFavoriteId(locationId);
                toast({ title: 'Favorite location updated!' });
            } catch (error) {
                console.error('Failed to update favorite location:', error);
                toast({ variant: 'destructive', title: 'Error saving favorite.' });
                // Revert on failure by re-fetching from the store
                setCurrentFavoriteId(favoriteLocationId); 
            }
        }
    };

    const stats = useMemo(() => {
        if (isLoading) return { chatbotInteractions: 0, productsRecommended: 0, reviewsSubmitted: 0 };
        
        return {
            chatbotInteractions: interactions?.length || 0,
            productsRecommended: interactions?.reduce((acc, i) => acc + (i.recommendedProductIds?.length || 0), 0) || 0,
            reviewsSubmitted: reviews?.length || 0,
        };
    }, [isLoading, interactions, reviews]);

    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 bg-muted/20">
                <div className="container mx-auto px-4 py-8">
                     <div>
                        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
                        <p className="text-muted-foreground">
                            {isUsingDemoData ? "Here's a sample of your activity and contributions." : "Here's a summary of your activity and contributions."}
                        </p>
                    </div>

                    <div className="mt-6">
                        <FavoriteLocation
                            favoriteId={currentFavoriteId}
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
                             <CustomerOrderHistory orders={orders as OrderDoc[] | null} isLoading={isLoading} />
                        </div>
                        <div className="space-y-8">
                             <CustomerReviewHistory reviews={reviews as Review[] | null} isLoading={isLoading} />
                             <CustomerUploads />
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
