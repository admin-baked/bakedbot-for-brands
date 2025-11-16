
'use client';
export const dynamic = 'force-dynamic';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { UserInteraction } from '@/firebase/converters';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, collectionGroup, Timestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import TopProductsCard from './components/top-products-card';
import BottomProductsCard from './components/bottom-products-card';
import InteractionsChart from './components/interactions-chart';
import { formatNumber } from '@/lib/utils';
import { useUser } from '@/firebase/auth/use-user';
import { interactionConverter, productConverter } from '@/firebase/converters';
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
  const [currentBrandId, setCurrentBrandId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        const claims = idTokenResult.claims as Record<string, unknown>;
        if (claims.brandId) setCurrentBrandId(claims.brandId as string);
      });
    }
  }, [user]);

  const interactionsQuery = useMemo(() => {
    if (!firestore || !currentBrandId) return null;
    const base = collectionGroup(firestore, 'interactions').withConverter(interactionConverter);
    // Fetch last 30 days of interactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoTimestamp = Timestamp.fromDate(thirtyDaysAgo);
    
    return query(base, where('brandId', '==', currentBrandId), where('interactionDate', '>=', thirtyDaysAgoTimestamp));
  }, [firestore, currentBrandId]);

  const productsQuery = useMemo(() => {
    if (!firestore || !currentBrandId) return null;
    return query(collection(firestore, 'products').withConverter(productConverter), where('brandId', '==', currentBrandId));
  }, [firestore, currentBrandId]);

  const { data: interactions, isLoading: areInteractionsLoading } = useCollection<UserInteraction>(
    interactionsQuery,
    { debugPath: `**/interactions?brandId=${currentBrandId}` }
  );
  const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery, { debugPath: `/products?brandId=${currentBrandId}` });

  const isLoading = isUserLoading || areInteractionsLoading || areProductsLoading;

  const { stats, topProducts, bottomProducts } = useMemo(() => {
    if (!interactions || !products) {
      return {
        stats: { chatbotInteractions: 0, productsRecommended: 0, totalLikes: 0, totalDislikes: 0 },
        topProducts: [] as Product[],
        bottomProducts: [] as Product[],
      };
    }
    const sortedByLikes = [...products].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    const sortedByDislikes = [...products].sort((a, b) => (b.dislikes || 0) - (a.dislikes || 0));
    return {
      stats: {
        chatbotInteractions: interactions.length,
        productsRecommended: interactions.reduce((acc, i) => acc + (i.recommendedProductIds?.length || 0), 0),
        totalLikes: products.reduce((acc, p) => acc + (p.likes || 0), 0),
        totalDislikes: products.reduce((acc, p) => acc + (p.dislikes || 0), 0),
      },
      topProducts: sortedByLikes.slice(0, 3),
      bottomProducts: sortedByDislikes.slice(0, 3),
    };
  }, [interactions, products]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's a summary of your BakedBot AI performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Chatbot Interactions" value={formatNumber(stats.chatbotInteractions)} icon={MessageSquare} isLoading={isLoading} />
        <MetricCard title="Products Recommended" value={formatNumber(stats.productsRecommended)} icon={Sparkles} isLoading={isLoading} />
        <MetricCard title="Total Likes" value={formatNumber(stats.totalLikes)} icon={ThumbsUp} isLoading={isLoading} />
        <MetricCard title="Total Dislikes" value={formatNumber(stats.totalDislikes)} icon={ThumbsDown} isLoading={isLoading} />
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
