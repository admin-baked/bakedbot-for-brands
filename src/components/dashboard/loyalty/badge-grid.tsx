'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Zap, Heart, MessageSquare, ShoppingBag, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const BADGES = [
    { id: 'first_chat', name: 'Conversation Starter', description: 'Started your first chat with Smokey.', icon: MessageSquare, color: 'text-blue-500' },
    { id: 'streak_3', name: 'Consistent', description: 'Maintained a 3-day engagement streak.', icon: Zap, color: 'text-orange-500' },
    { id: 'first_order', name: 'First Drop', description: 'Completed your first order through the platform.', icon: ShoppingBag, color: 'text-green-500' },
    { id: 'loyal_fan', name: 'Brand Ambassador', description: 'Reached Gold tier in the loyalty program.', icon: Heart, color: 'text-pink-500' },
    { id: 'researcher', name: 'Product Nerd', description: 'Searched for 10+ different products.', icon: Search, color: 'text-purple-500' },
    { id: 'super_user', name: 'Legendary', description: 'Unlocked all basic engagement badges.', icon: Award, color: 'text-yellow-500' },
];

export function BadgeGrid() {
    // In a real app, we would fetch the user's earned badges
    // For this dashboard, we'll show them all as "locked" or "unlocked" mockup
    const earnedBadges = ['first_chat', 'researcher'];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {BADGES.map((badge) => {
                const isEarned = earnedBadges.includes(badge.id);
                const Icon = badge.icon;

                return (
                    <Card key={badge.id} className={cn(
                        "transition-all duration-300",
                        isEarned ? "border-primary/50 bg-primary/5" : "opacity-60 grayscale"
                    )}>
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <div className={cn(
                                "p-2 rounded-full",
                                isEarned ? "bg-background" : "bg-muted"
                            )}>
                                <Icon className={cn("h-6 w-6", isEarned ? badge.color : "text-muted-foreground")} />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-semibold">{badge.name}</CardTitle>
                                {isEarned ? (
                                    <Badge variant="default" className="text-[10px] h-4">Unlocked</Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-[10px] h-4">Locked</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                {badge.description}
                            </p>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
