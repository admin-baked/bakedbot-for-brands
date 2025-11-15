'use client';
export const dynamic = 'force-dynamic';

import { useMemo, useEffect, useState } from 'react';
import type { Review, UserInteraction, OrderDoc } from '@/firebase/converters';
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
import { collection, query, where, doc, setDoc, onSnapshot, collectionGroup } from 'firebase/firestore';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { orderConverter, reviewConverter, interactionConverter } from '@/firebase/converters';
import { useDemoMode } from '@/context/demo-mode';
import { demoCustomer } from '@/lib/data';
import type { DeepPartial } from '@/types/utils';


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
    const { isDemo, setIsDemo } = useDemoMode();
    const { favoriteLocationId, setFavoriteLocationId: setStoreFavoriteId } = useStore();
    const { user, isUserLoading } = useUser();
    const firebase = useFirebase();
    const firestore = firebase?.firestore;
    const { toast } = useToast();
    
    const [currentFavoriteId, setCurrentFavoriteId] = useState<string | null>(null);

    // Set up queries for user-specific data
    const ordersQuery = useMemo(() => {
        if (isDemo || !user || !firestore) return null;
        const baseQuery = collection(firestore, 'orders').withConverter(orderConverter);
        return query(baseQuery, where('userId', '==', user.uid));
    }, [isDemo, user, firestore]);
    
    const reviewsQuery = useMemo(() => {
        if (isDemo || !user || !firestore) return null;
        const baseQuery = collectionGroup(firestore, 'reviews').withConverter(reviewConverter);
        return query(baseQuery, where('userId', '==', user.uid));
    }, [isDemo, user, firestore]);

    const interactionsQuery = useMemo(() => {
        if (isDemo || !user || !firestore) return null;
        const baseQuery = collection(firestore, `users/${user.uid}/interactions`).withConverter(interactionConverter);
        return query(baseQuery);
    }, [isDemo, user, firestore]);

    // Fetch live data using the queries
    const { data: liveOrders, isLoading: areOrdersLoading } = useCollection<OrderDoc>(ordersQuery);
    const { data: liveReviews, isLoading: areReviewsLoading } = useCollection<Review>(reviewsQuery); 
    const { data: liveInteractions, isLoading: areInteractionsLoading } = useCollection<UserInteraction>(interactionsQuery);

    const isLoading = isUserLoading || (!isDemo && (areOrdersLoading || areReviewsLoading || areInteractionsLoading));

     useEffect(() => {
        if (isDemo) {
            const demoFavoriteId = demoCustomer.favoriteLocationId;
            setCurrentFavoriteId(demoFavoriteId);
            setStoreFavoriteId(demoFavoriteId);
            return;
        }

        if (!isUserLoading && user && firestore) {
            const unsub = onSnapshot(doc(firestore, 'users', user.uid), (doc) => {
                const favId = doc.data()?.favoriteLocationId || null;
                setCurrentFavoriteId(favId);
                setStoreFavoriteId(favId);
            });
            return () => unsub();
        }
    }, [isDemo, user, firestore, setStoreFavoriteId, isUserLoading]);


    const handleSetFavorite = async (locationId: string | null) => {
        setCurrentFavoriteId(locationId); // Optimistic UI update
        if (isDemo) {
             toast({ title: "Favorites are disabled in Demo Mode."});
             return;
        }
        
        if (user && firestore) {
            const userDocRef = doc(firestore, 'users', user.uid);
            const favoriteData = { favoriteLocationId: locationId };
            
            // Use setDoc with merge: true to handle both creation and updates
            setDoc(userDocRef, favoriteData, { merge: true })
                .then(() => {
                    setStoreFavoriteId(locationId);
                    toast({ title: 'Favorite location updated!' });
                })
                .catch(async (serverError) => {
                    console.error('Failed to update favorite location:', serverError);
                    toast({ variant: 'destructive', title: 'Error saving favorite.' });
                    setCurrentFavoriteId(favoriteLocationId); // Revert on failure
                    
                    const permissionError = new FirestorePermissionError({
                        path: userDocRef.path,
                        operation: 'write', // Use 'write' for set with merge
                        requestResourceData: favoriteData,
                      });
              
                      errorEmitter.emit('permission-error', permissionError);
                });
        }
    };

    const stats = useMemo(() => {
        if (isLoading && !isDemo) return { chatbotInteractions: 0, productsRecommended: 0, reviewsSubmitted: 0 };
        
        const interactions = isDemo ? demoCustomer.interactions : liveInteractions;
        const reviews = isDemo ? demoCustomer.reviews : liveReviews;

        return {
            chatbotInteractions: interactions?.length || 0,
            productsRecommended: interactions?.reduce((acc, i) => acc + (i.recommendedProductIds?.length || 0), 0) || 0,
            reviewsSubmitted: reviews?.length || 0,
        };
    }, [isLoading, isDemo, liveInteractions, liveReviews]);

    const orders = (isDemo ? demoCustomer.orders : liveOrders) as DeepPartial<OrderDoc>[] | null;
    const reviews = (isDemo ? demoCustomer.reviews : liveReviews) as Review[] | null;


    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 bg-muted/20">
                <div className="container mx-auto px-4 py-8">
                     <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
                        <p className="text-muted-foreground">
                            Here's a summary of your activity and contributions.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <FavoriteLocation
                            favoriteId={currentFavoriteId}
                            onSetFavorite={handleSetFavorite}
                        />
                    
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <MetricCard title="Chatbot Interactions" value={stats.chatbotInteractions} icon={MessageSquare} isLoading={isLoading} />
                            <MetricCard title="Products Recommended" value={stats.productsRecommended} icon={Sparkles} isLoading={isLoading} />
                            <MetricCard title="Reviews Submitted" value={stats.reviewsSubmitted} icon={Star} isLoading={isLoading} />
                        </div>

                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                                <CustomerOrderHistory orders={orders} isLoading={isLoading} />
                            </div>
                            <div className="space-y-8">
                                <CustomerReviewHistory reviews={reviews} isLoading={isLoading} />
                                <CustomerUploads />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
