'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Sparkles, ThumbsUp, ThumbsDown, ArrowRight, Loader2, Database } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCollectionGroup } from '@/hooks/use-collection-group';
import type { Product, Review, UserInteraction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import RecentReviews from './components/recent-reviews';


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
  const { data: interactions, isLoading: areInteractionsLoading } = useCollectionGroup<UserInteraction>('interactions');
  const { data: products, isLoading: areProductsLoading } = useCollectionGroup<Product>('products');
  const { data: reviews, isLoading: areReviewsLoading } = useCollectionGroup<Review>('reviews');

  const isLoading = areInteractionsLoading || areProductsLoading || areReviewsLoading;

  const stats = useMemo(() => {
    if (!interactions || !products) {
      return {
        chatbotInteractions: 0,
        productsRecommended: 0,
        totalLikes: 0,
        totalDislikes: 0,
      };
    }

    return {
      chatbotInteractions: interactions.length,
      productsRecommended: interactions.reduce((acc, interaction) => acc + (interaction.recommendedProductIds?.length || 0), 0),
      totalLikes: products.reduce((acc, product) => acc + (product.likes || 0), 0),
      totalDislikes: products.reduce((acc, product) => acc + (product.dislikes || 0), 0),
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
        <MetricCard title="Chatbot Interactions" value={stats.chatbotInteractions} icon={MessageSquare} isLoading={isLoading} />
        <MetricCard title="Products Recommended" value={stats.productsRecommended} icon={Sparkles} isLoading={isLoading} />
        <MetricCard title="Total Likes" value={stats.totalLikes} icon={ThumbsUp} isLoading={isLoading} />
        <MetricCard title="Total Dislikes" value={stats.totalDislikes} icon={ThumbsDown} isLoading={isLoading} />
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
        
        <RecentReviews reviews={reviews || []} products={products || []} isLoading={isLoading} />
      </div>
    </div>
  );
}
