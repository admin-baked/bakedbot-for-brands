'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Plus, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const APPS = [
    {
        id: 'dutchie',
        name: 'Dutchie',
        description: 'Sync your menu and inventory directly from Dutchie.',
        icon: '🌿',
        status: 'available',
        category: 'Menu Sync'
    },
    {
        id: 'jane',
        name: 'Jane',
        description: 'Connect your Jane menu for real-time updates.',
        icon: '🍃',
        status: 'available',
        category: 'Menu Sync'
    },
    {
        id: 'smokey-pay',
        name: 'Smokey Pay',
        description: 'Enable seamless payments for your customers.',
        icon: '💳',
        status: 'beta',
        category: 'Payments'
    },
    {
        id: 'alpine',
        name: 'Alpine IQ',
        description: 'Loyalty and marketing automation.',
        icon: '🏔️',
        status: 'coming_soon',
        category: 'Loyalty'
    }
];

export default function AppStorePage() {
    const { toast } = useToast();

    const handleConnect = (appName: string) => {
        toast({
            title: `Connecting to ${appName}`,
            description: 'This feature is currently in simulation mode.',
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">App Store</h1>
                <p className="text-muted-foreground">Connect your favorite tools and services to BakedBot.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {APPS.map((app) => (
                    <Card key={app.id} className="flex flex-col">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="text-4xl mb-2">{app.icon}</div>
                                {app.status === 'beta' && <Badge variant="secondary">Beta</Badge>}
                                {app.status === 'coming_soon' && <Badge variant="outline">Coming Soon</Badge>}
                            </div>
                            <CardTitle>{app.name}</CardTitle>
                            <CardDescription>{app.category}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <p className="text-sm text-muted-foreground">{app.description}</p>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                variant={app.status === 'coming_soon' ? 'ghost' : 'default'}
                                disabled={app.status === 'coming_soon'}
                                onClick={() => handleConnect(app.name)}
                            >
                                {app.status === 'coming_soon' ? (
                                    'Notify Me'
                                ) : (
                                    <>
                                        <Plus className="mr-2 h-4 w-4" /> Connect
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
