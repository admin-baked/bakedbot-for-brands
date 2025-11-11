
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Sparkles, ThumbsUp, ThumbsDown, ArrowRight, Database } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Product, Review, UserInteraction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import TopProductsCard from './components/top-products-card';
import BottomProductsCard from './components/bottom-products-card';
import { formatNumber } from '@/lib/utils';
import { useUser } from '@/firebase/auth/use-user';


function MetricCard({ title, value, icon: Icon, isLoading }: { title: string, value: string | number, icon: React.ElementType, isLoading: boolean }) {
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
    )
}

export default function DashboardPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  // The brand ID from the user's custom claims.
  // In a real app, you'd get this from the ID token result.
  const currentBrandId = 'acme';

  // Correctly query the collection group for brand-level analytics.
  const interactionsQuery = useMemo(() => {
      if (!firestore || !currentBrandId) return null;
      return query(collectionGroup(firestore, 'interactions'), where("brandId", "==", currentBrandId));
  }, [firestore, currentBrandId]);

  const productsQuery = useMemo(() => firestore ? query(collection(firestore, 'products')) : null, [firestore]);

  // Pass a debugPath for better error messages
  const { data: interactions, isLoading: areInteractionsLoading } = useCollection<UserInteraction>(
    interactionsQuery,
    { debugPath: `**/interactions?brandId=${currentBrandId}` }
  );

  const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery, { debugPath: '/products' });

  const isLoading = areInteractionsLoading || areProductsLoading;

  const { stats, topProducts, bottomProducts } = useMemo(() => {
    if (!interactions || !products) {
      return {
        stats: {
          chatbotInteractions: 0,
          productsRecommended: 0,
          totalLikes: 0,
          totalDislikes: 0,
        },
        topProducts: [],
        bottomProducts: [],
      };
    }
    
    const sortedByLikes = [...products].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    const sortedByDislikes = [...products].sort((a, b) => (b.dislikes || 0) - (a.dislikes || 0));

    return {
      stats: {
        chatbotInteractions: interactions.length,
        productsRecommended: interactions.reduce((acc, interaction) => acc + (interaction.recommendedProductIds?.length || 0), 0),
        totalLikes: products.reduce((acc, product) => acc + (product.likes || 0), 0),
        totalDislikes: products.reduce((acc, product) => acc + (product.dislikes || 0), 0),
      },
      topProducts: sortedByLikes.slice(0, 3),
      bottomProducts: sortedByDislikes.slice(0, 3),
    };
  }, [interactions, products]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's a summary of your BakedBot AI performance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Chatbot Interactions" value={formatNumber(stats.chatbotInteractions)} icon={MessageSquare} isLoading={isLoading} />
        <MetricCard title="Products Recommended" value={formatNumber(stats.productsRecommended)} icon={Sparkles} isLoading={isLoading} />
        <MetricCard title="Total Likes" value={formatNumber(stats.totalLikes)} icon={ThumbsUp} isLoading={isLoading} />
        <MetricCard title="Total Dislikes" value={formatNumber(stats.totalDislikes)} icon={ThumbsDown} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
            <CardHeader>
            <CardTitle>Unleash your content with AI</CardTitle>
            <CardDescription className="text-primary-foreground/80">
                Effortlessly create engaging product descriptions and marketing materials with our powerful AI content generator.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Link href="/dashboard/content">
                <Button variant="secondary" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                Start Creating <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </Link>
            </CardContent>
        </Card>
        
        <div className="space-y-8">
            <TopProductsCard products={topProducts} isLoading={isLoading} />
            <BottomProductsCard products={bottomProducts} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
