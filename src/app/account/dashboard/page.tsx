
'use client';
export const dynamic = 'force-dynamic';

import { useMemo, useEffect, useState } from 'react';
import type { Review, UserInteraction, OrderDoc } from '@/firebase/converters';
import { MessageSquare, Sparkles, Star } from 'lucide-react';
import Header from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import { Skeleton } from '@/components/ui/skeleton';
import CustomerReviewHistory from './components/customer-review-history';
import CustomerOrderHistory from './components/customer-order-history';
import CustomerUploads from './components/customer-uploads';
import FavoriteLocation from './components/favorite-location';
import { useStore } from '@/hooks/use-store';
import { collection, query, where, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDemoMode } from '@/context/demo-mode';
import { demoCustomer } from '@/lib/data';
import type { DeepPartial } from '@/types/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isLoading: boolean;
}

function MetricCard({ title, value, icon: Icon, isLoading }: MetricCardProps) {
    return (
        <div className="rounded-lg border bg-card p-4">
             <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium tracking-tight">{title}</h3>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2">
                {isLoading ? (
                    <Skeleton className="h-7 w-1/2" />
                ) : (
                    <div className="text-2xl font-bold">{value}</div>
                )}
            </div>
        </div>
    );
}

export default function CustomerDashboardPage() {
    const { isDemo } = useDemoMode();
    const { setFavoriteLocationId: setStoreFavoriteId } = useStore();
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    // Unified state for all user data
    const [userData, setUserData] = useState<{
        profile: any;
        orders: DeepPartial<OrderDoc>[];
        reviews: Partial<Review>[];
        interactions: Partial<UserInteraction>[];
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const setFavoriteLocationId = useStore(state => state.setFavoriteLocationId);

    // Effect to fetch all user data from a single listener
    useEffect(() => {
        if (isDemo) {
            setUserData({
                profile: { favoriteLocationId: demoCustomer.favoriteRetailerId },
                orders: demoCustomer.orders,
                reviews: demoCustomer.reviews,
                interactions: demoCustomer.interactions,
            });
            setFavoriteLocationId(demoCustomer.favoriteRetailerId);
            setIsLoading(false);
            return;
        }

        if (!isUserLoading && user && firestore) {
            setIsLoading(true);
            const userDocRef = doc(firestore, 'users', user.uid);
            
            // This single listener gets the user profile and can be extended
            // to fetch sub-collections efficiently in the future.
            const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const profileData = docSnap.data();
                    setUserData(prev => ({
                        ...(prev || { orders: [], reviews: [], interactions: [] }),
                        profile: profileData,
                    }));
                    setFavoriteLocationId(profileData.favoriteLocationId || null);
                }
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching user data:", error);
                setIsLoading(false);
            });

            // Set up separate listeners for sub-collections for now
            const ordersQuery = query(collection(firestore, 'orders'), where('userId', '==', user.uid));
            const reviewsQuery = query(collection(firestore, 'reviews'), where('userId', '==', user.uid));
            const interactionsQuery = query(collection(firestore, `users/${user.uid}/interactions`));

            const unsubOrders = onSnapshot(ordersQuery, (snap) => setUserData(prev => ({ ...prev!, orders: snap.docs.map(d => ({id: d.id, ...d.data()})) })));
            const unsubReviews = onSnapshot(reviewsQuery, (snap) => setUserData(prev => ({ ...prev!, reviews: snap.docs.map(d => ({id: d.id, ...d.data()})) })));
            const unsubInteractions = onSnapshot(interactionsQuery, (snap) => setUserData(prev => ({ ...prev!, interactions: snap.docs.map(d => ({id: d.id, ...d.data()})) })));

            return () => {
                unsubscribe();
                unsubOrders();
                unsubReviews();
                unsubInteractions();
            };
        } else if (!isUserLoading) {
            setIsLoading(false);
        }
    }, [isDemo, user, firestore, isUserLoading, setFavoriteLocationId]);


    const handleSetFavorite = async (locationId: string | null) => {
        if (isDemo) {
             toast({ title: "Favorites are disabled in Demo Mode."});
             return;
        }
        
        if (user && firestore) {
            const userDocRef = doc(firestore, 'users', user.uid);
            const favoriteData = { favoriteLocationId: locationId };
            
            try {
                // Use setDoc with merge to handle both creation and updates
                await setDoc(userDocRef, favoriteData, { merge: true });
                setStoreFavoriteId(locationId);
                toast({ title: 'Favorite location updated!' });
            } catch (serverError: any) {
                console.error('Failed to update favorite location:', serverError);
                toast({ variant: 'destructive', title: 'Error saving favorite.' });
                
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'write', 
                    requestResourceData: favoriteData,
                  });
          
                  errorEmitter.emit('permission-error', permissionError);
            }
        }
    };

    const stats = useMemo(() => {
        if (!userData) return { chatbotInteractions: 0, productsRecommended: 0, reviewsSubmitted: 0 };
        return {
            chatbotInteractions: userData.interactions.length,
            productsRecommended: userData.interactions.reduce((acc, i) => acc + (i.recommendedProductIds?.length || 0), 0),
            reviewsSubmitted: userData.reviews.length,
        };
    }, [userData]);


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
                            favoriteId={userData?.profile?.favoriteLocationId || null}
                            onSetFavorite={handleSetFavorite}
                        />
                    
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <MetricCard title="Chatbot Interactions" value={stats.chatbotInteractions} icon={MessageSquare} isLoading={isLoading} />
                            <MetricCard title="Products Recommended" value={stats.productsRecommended} icon={Sparkles} isLoading={isLoading} />
                            <MetricCard title="Reviews Submitted" value={stats.reviewsSubmitted} icon={Star} isLoading={isLoading} />
                        </div>

                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                                <CustomerOrderHistory orders={userData?.orders || []} isLoading={isLoading} />
                            </div>
                            <div className="space-y-8">
                                <CustomerReviewHistory reviews={userData?.reviews || []} isLoading={isLoading} />
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
