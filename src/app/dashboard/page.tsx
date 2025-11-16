
'use client';
export const dynamic = 'force-dynamic';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Sparkles, ThumbsUp, ThumbsDown, Package } from 'lucide-react';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { UserInteraction, OrderDoc } from '@/firebase/converters';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, collectionGroup, Timestamp, orderBy } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import TopProductsCard from './components/top-products-card';
import BottomProductsCard from './components/bottom-products-card';
import InteractionsChart from './components/interactions-chart';
import { formatNumber } from '@/lib/utils';
import { useUser } from '@/firebase/auth/use-user';
import { interactionConverter, productConverter, orderConverter } from '@/firebase/converters';
import type { Product } from '@/types/domain';

function MetricCard({ title, value, icon: Icon, isLoading }: { title: string; value: string | number; icon: React.ElementType; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>{isLoading ? <Skeleton className="h-7 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}</CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const firebase = useFirebase();
  const firestore = firebase?.firestore;
  const { user, isUserLoading } = useUser();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        setUserProfile(idTokenResult.claims);
      });
    }
  }, [user]);

  const brandId = userProfile?.brandId;
  const locationId = userProfile?.locationId;
  const userRole = userProfile?.role;

  const interactionsQuery = useMemo(() => {
    if (!firestore || !brandId || userRole === 'dispensary') return null;
    const base = collectionGroup(firestore, 'interactions').withConverter(interactionConverter);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return query(base, where('brandId', '==', brandId), where('interactionDate', '>=', Timestamp.fromDate(thirtyDaysAgo)));
  }, [firestore, brandId, userRole]);

  const productsQuery = useMemo(() => {
    if (!firestore || !brandId || userRole === 'dispensary') return null;
    return query(collection(firestore, 'products').withConverter(productConverter), where('brandId', '==', brandId));
  }, [firestore, brandId, userRole]);
  
  const dispensaryOrdersQuery = useMemo(() => {
    if (!firestore || userRole !== 'dispensary' || !locationId) return null;
    const base = collection(firestore, 'orders').withConverter(orderConverter);
    return query(base, where('retailerId', '==', locationId), orderBy('createdAt', 'desc'));
  }, [firestore, userRole, locationId]);

  const { data: interactions, isLoading: areInteractionsLoading } = useCollection<UserInteraction>(
    interactionsQuery,
    { debugPath: `**/interactions?brandId=${brandId}` }
  );
  const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery, { debugPath: `/products?brandId=${brandId}` });
  const { data: dispensaryOrders, isLoading: areOrdersLoading } = useCollection<OrderDoc>(dispensaryOrdersQuery);

  const isLoading = isUserLoading || (userRole !== 'dispensary' && (areInteractionsLoading || areProductsLoading)) || (userRole === 'dispensary' && areOrdersLoading);

  const brandStats = useMemo(() => {
    if (userRole === 'dispensary' || !interactions || !products) {
      return { chatbotInteractions: 0, productsRecommended: 0, totalLikes: 0, totalDislikes: 0 };
    }
    return {
      chatbotInteractions: interactions.length,
      productsRecommended: interactions.reduce((acc, i) => acc + (i.recommendedProductIds?.length || 0), 0),
      totalLikes: products.reduce((acc, p) => acc + (p.likes || 0), 0),
      totalDislikes: products.reduce((acc, p) => acc + (p.dislikes || 0), 0),
    };
  }, [userRole, interactions, products]);
  
  const dispensaryStats = useMemo(() => {
    if (userRole !== 'dispensary' || !dispensaryOrders) {
      return { totalOrders: 0, todaysOrders: 0 };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
        totalOrders: dispensaryOrders.length,
        todaysOrders: dispensaryOrders.filter(o => o.createdAt.toDate() >= today).length,
    }
  }, [userRole, dispensaryOrders]);
  

  const topProducts = useMemo(() => {
    if (userRole === 'dispensary' || !products) return [];
    return [...products].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3);
  }, [userRole, products]);

  const bottomProducts = useMemo(() => {
    if (userRole === 'dispensary' || !products) return [];
    return [...products].sort((a, b) => (b.dislikes || 0) - (a.dislikes || 0)).slice(0, 3);
  }, [userRole, products]);
  
  if (userRole === 'dispensary') {
    return (
         <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dispensary Dashboard</h1>
                <p className="text-muted-foreground">Welcome! Here's a quick look at your location's activity.</p>
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Today's Orders" value={dispensaryStats.todaysOrders} icon={Package} isLoading={isLoading} />
                <MetricCard title="Total Orders" value={dispensaryStats.totalOrders} icon={Package} isLoading={isLoading} />
            </div>
            {/* Add more dispensary-specific components here */}
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's a summary of your BakedBot AI performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Chatbot Interactions" value={formatNumber(brandStats.chatbotInteractions)} icon={MessageSquare} isLoading={isLoading} />
        <MetricCard title="Products Recommended" value={formatNumber(brandStats.productsRecommended)} icon={Sparkles} isLoading={isLoading} />
        <MetricCard title="Total Likes" value={formatNumber(brandStats.totalLikes)} icon={ThumbsUp} isLoading={isLoading} />
        <MetricCard title="Total Dislikes" value={formatNumber(brandStats.totalDislikes)} icon={ThumbsDown} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <InteractionsChart interactions={interactions || []} isLoading={isLoading} />
        </div>

        <div className="space-y-8">
          <TopProductsCard products={topProducts} isLoading={isLoading} />
          <BottomProductsCard products={bottomProducts} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

