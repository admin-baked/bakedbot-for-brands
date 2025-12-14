'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    UserCheck,
    Repeat,
    ShoppingBag,
    Heart,
    Settings,
    Bell,
    Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CustomerRightRail() {
    const { toast } = useToast();

    const handleAction = (action: string) => {
        toast({
            title: "Action Triggered",
            description: `Started: ${action}`,
        });
    };

    return (
        <div className="space-y-6">
            {/* A) My Status */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                        My Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <span className="font-medium flex items-center gap-1 text-green-600">
                            Verified ✅
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Preference</span>
                        <span className="font-medium">Pickup</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Budget</span>
                        <span className="font-medium">Under $60</span>
                    </div>
                </CardContent>
            </Card>

            {/* B) Quick Actions */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Star className="h-4 w-4 text-primary" />
                        Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9" onClick={() => handleAction('Reorder Last Cart')}>
                        <Repeat className="h-3 w-3 mr-2" />
                        Reorder Last Cart
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9" onClick={() => handleAction('View Deals')}>
                        <ShoppingBag className="h-3 w-3 mr-2" />
                        View Today's Deals
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9" onClick={() => handleAction('Manage Favorites')}>
                        <Heart className="h-3 w-3 mr-2" />
                        Manage Favorites
                    </Button>
                </CardContent>
            </Card>

            {/* C) Smart Notifications (Toggles) */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        Smart Alerts
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Deal Alerts</span>
                        <Switch id="deals" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Back-in-Stock</span>
                        <Switch id="restock" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">New Drops</span>
                        <Switch id="drops" />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Price Drops</span>
                        <Switch id="prices" defaultChecked />
                    </div>
                </CardContent>
            </Card>

            {/* D) My Shortcuts */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Settings className="h-4 w-4 text-primary" />
                        My Shortcuts
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-auto py-2 bg-muted/30">
                        🌙 Nightly Routine
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-auto py-2 bg-muted/30">
                        🎉 Weekend Social Kit
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
