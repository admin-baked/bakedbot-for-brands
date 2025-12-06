'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity as ActivityIcon, MessageSquare, ShoppingCart, Settings, Terminal } from 'lucide-react';
import { getRecentActivity } from '@/server/actions/activity';
import { ActivityEvent } from '@/types/events';
import { ScrollArea } from '@/components/ui/scroll-area';

// Mock Data for Demo if fetch is empty/fails
const MOCK_ACTIVITY: ActivityEvent[] = [
    { id: '1', orgId: 'demo', userId: 'user_1', userName: 'Sarah (Manager)', type: 'settings_changed', description: 'Updated pricing tiers for Edibles', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: '2', orgId: 'demo', userId: 'user_2', userName: 'Smokey (AI)', type: 'recommendation_viewed', description: 'Recommended "Blue Dream" to Customer #882', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: '3', orgId: 'demo', userId: 'user_1', userName: 'John (Admin)', type: 'automation_triggered', description: 'Started "Weekend Sale" Campaign', createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
];

export function ActivityFeed() {
    const [activities, setActivities] = useState<ActivityEvent[]>(MOCK_ACTIVITY);

    useEffect(() => {
        // Fetch real data in production
        // getRecentActivity('current-org-id').then(setActivities).catch(console.error);
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'message_sent': return <MessageSquare className="h-4 w-4 text-blue-500" />;
            case 'recommendation_viewed': return <ShoppingCart className="h-4 w-4 text-green-500" />;
            case 'settings_changed': return <Settings className="h-4 w-4 text-gray-500" />;
            default: return <Terminal className="h-4 w-4 text-purple-500" />;
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ActivityIcon className="h-4 w-4" />
                    Live Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[200px] pr-4">
                    <div className="space-y-4">
                        {activities.map((activity) => (
                            <div key={activity.id} className="flex gap-3 items-start text-sm">
                                <div className="mt-0.5 bg-muted p-1.5 rounded-full">
                                    {getIcon(activity.type)}
                                </div>
                                <div className="space-y-0.5">
                                    <p className="font-medium leading-none">
                                        {activity.userName} <span className="font-normal text-muted-foreground transition-colors">{activity.description}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
