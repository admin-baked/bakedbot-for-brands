'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Zap, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SEGMENTS = [
    {
        id: 'vip',
        name: 'VIP High Spenders',
        description: 'Customers who have spent over $1,000 in the last 6 months.',
        count: 45,
        icon: Star,
        color: 'text-yellow-500 bg-yellow-100'
    },
    {
        id: 'churn-risk',
        name: 'Churn Risk',
        description: 'Customers who haven\'t visited in over 30 days.',
        count: 128,
        icon: Zap,
        color: 'text-red-500 bg-red-100'
    },
    {
        id: 'new',
        name: 'New Customers',
        description: 'Customers who made their first purchase in the last 14 days.',
        count: 32,
        icon: Users,
        color: 'text-blue-500 bg-blue-100'
    },
    {
        id: 'edible-lovers',
        name: 'Edible Lovers',
        description: 'Customers who primarily purchase edibles.',
        count: 89,
        icon: Users,
        color: 'text-green-500 bg-green-100'
    }
];

export default function SegmentsPage() {
    const { toast } = useToast();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Segments</h1>
                    <p className="text-muted-foreground">Group your customers for targeted marketing campaigns.</p>
                </div>
                <Button onClick={() => toast({
                    title: 'Coming Soon',
                    description: 'Custom segment creation will be available in a future update. Use the pre-built segments below.',
                })}>
                    <Plus className="mr-2 h-4 w-4" /> Create Segment
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SEGMENTS.map((segment) => {
                    const Icon = segment.icon;
                    return (
                        <Card key={segment.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className={`p-2 rounded-lg ${segment.color}`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div className="text-2xl font-bold">{segment.count}</div>
                                </div>
                                <CardTitle className="mt-4">{segment.name}</CardTitle>
                                <CardDescription>{segment.description}</CardDescription>
                            </CardHeader>
                            <CardFooter className="mt-auto pt-0">
                                <Button variant="outline" className="w-full" onClick={() => toast({
                                    title: 'Coming Soon',
                                    description: `Customer list for ${segment.name} will be available in a future update.`,
                                })}>View Customers</Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
