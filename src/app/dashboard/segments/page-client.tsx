'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Zap, Star, TrendingDown, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CustomerSegment, SegmentSuggestion } from '@/types/customers';
import { getCustomers, getSuggestedSegments } from '@/app/dashboard/customers/actions';

interface SegmentsPageClientProps {
    brandId: string;
}

// Segment display configuration
const SEGMENT_CONFIG: Record<CustomerSegment, {
    name: string;
    description: string;
    icon: typeof Star;
    color: string;
}> = {
    vip: {
        name: 'VIP High Spenders',
        description: 'Customers who have spent over $1,000 or placed 10+ orders.',
        icon: Star,
        color: 'text-green-600 bg-green-100'
    },
    loyal: {
        name: 'Loyal Customers',
        description: 'Regular customers with 3+ orders.',
        icon: Users,
        color: 'text-green-600 bg-green-100'
    },
    new: {
        name: 'New Customers',
        description: 'Customers who made their first purchase in the last 30 days.',
        icon: Users,
        color: 'text-blue-600 bg-blue-100'
    },
    at_risk: {
        name: 'At Risk',
        description: 'Customers who haven\'t ordered in 60-89 days.',
        icon: AlertTriangle,
        color: 'text-red-600 bg-red-100'
    },
    slipping: {
        name: 'Slipping Away',
        description: 'Customers who haven\'t ordered in 30-59 days.',
        icon: TrendingDown,
        color: 'text-orange-600 bg-orange-100'
    },
    churned: {
        name: 'Churned',
        description: 'Customers who haven\'t ordered in 90+ days.',
        icon: Zap,
        color: 'text-gray-600 bg-gray-100'
    },
    high_value: {
        name: 'High Value',
        description: 'Customers with high average order value but fewer orders.',
        icon: Star,
        color: 'text-green-600 bg-green-100'
    },
    frequent: {
        name: 'Frequent Buyers',
        description: 'Customers with 8+ orders and moderate spend.',
        icon: Users,
        color: 'text-blue-600 bg-blue-100'
    }
};

// Priority order for display
const SEGMENT_ORDER: CustomerSegment[] = ['vip', 'loyal', 'new', 'at_risk', 'slipping', 'churned', 'high_value', 'frequent'];

export default function SegmentsPageClient({ brandId }: SegmentsPageClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [segmentCounts, setSegmentCounts] = useState<Record<CustomerSegment, number>>({
        vip: 0, loyal: 0, new: 0, at_risk: 0, slipping: 0, churned: 0, high_value: 0, frequent: 0
    });
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [suggestions, setSuggestions] = useState<SegmentSuggestion[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getCustomers(brandId);
            setSegmentCounts(data.stats.segmentBreakdown);
            setTotalCustomers(data.stats.totalCustomers);

            const sugs = await getSuggestedSegments(brandId);
            setSuggestions(sugs);
        } catch (error) {
            console.error('Failed to load segments:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load customer segments'
            });
        } finally {
            setLoading(false);
        }
    }, [brandId, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleViewSegment = (segment: CustomerSegment) => {
        router.push(`/dashboard/customers?segment=${segment}`);
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Filter to only show segments with customers
    const activeSegments = SEGMENT_ORDER.filter(seg => segmentCounts[seg] > 0);
    const emptySegments = SEGMENT_ORDER.filter(seg => segmentCounts[seg] === 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Segments</h1>
                    <p className="text-muted-foreground">
                        Group your customers for targeted marketing campaigns.
                        {totalCustomers > 0 && ` ${totalCustomers} total customers.`}
                    </p>
                </div>
                <Button onClick={() => toast({
                    title: 'Coming Soon',
                    description: 'Custom segment creation will be available in a future update. Use the built-in segments below.',
                })}>
                    <Plus className="mr-2 h-4 w-4" /> Create Segment
                </Button>
            </div>

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            AI-Suggested Campaigns
                        </CardTitle>
                        <CardDescription>
                            Based on your customer data, we recommend targeting these segments.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 md:grid-cols-3">
                            {suggestions.map((s, i) => (
                                <div
                                    key={i}
                                    className="p-4 bg-background rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                                    onClick={() => {
                                        // Navigate based on suggestion filters
                                        const filter = s.filters[0];
                                        if (filter?.field === 'segment') {
                                            const segmentValue = Array.isArray(filter.value)
                                                ? filter.value[0]
                                                : filter.value;
                                            router.push(`/dashboard/customers?segment=${segmentValue}`);
                                        }
                                    }}
                                >
                                    <div className="font-medium">{s.name}</div>
                                    <div className="text-sm text-muted-foreground mt-1">{s.description}</div>
                                    <div className="flex items-center justify-between mt-3">
                                        <Badge variant="secondary">{s.estimatedCount} customers</Badge>
                                    </div>
                                    <div className="text-xs text-primary mt-2">{s.reasoning}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Active Segments */}
            {activeSegments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {activeSegments.map((segmentId) => {
                        const config = SEGMENT_CONFIG[segmentId];
                        const count = segmentCounts[segmentId];
                        const Icon = config.icon;

                        return (
                            <Card key={segmentId} className="flex flex-col hover:border-primary/50 transition-colors">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className={`p-2 rounded-lg ${config.color}`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div className="text-2xl font-bold">{count}</div>
                                    </div>
                                    <CardTitle className="mt-4">{config.name}</CardTitle>
                                    <CardDescription>{config.description}</CardDescription>
                                </CardHeader>
                                <CardFooter className="mt-auto pt-0">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => handleViewSegment(segmentId)}
                                    >
                                        View Customers
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Customer Data Yet</h3>
                    <p className="text-muted-foreground mb-4">
                        Import customers or wait for orders to start building segments automatically.
                    </p>
                    <Button onClick={() => router.push('/dashboard/customers')}>
                        Go to Customers
                    </Button>
                </Card>
            )}

            {/* Empty Segments (collapsed) */}
            {emptySegments.length > 0 && activeSegments.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Other Segments</CardTitle>
                        <CardDescription>
                            These segments currently have no customers. They'll populate automatically based on customer behavior.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {emptySegments.map(segmentId => {
                                const config = SEGMENT_CONFIG[segmentId];
                                return (
                                    <Badge key={segmentId} variant="outline" className="text-muted-foreground">
                                        {config.name}: 0
                                    </Badge>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
