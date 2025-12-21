'use client';

import { usePlanInfo } from '@/hooks/use-plan-info';
import { useUser } from '@/hooks/use-user';
import { BillingForm } from '@/app/dashboard/settings/components/billing-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';

export function SubscriptionView() {
    const {
        planName,
        price,
        isPaid,
        features,
        isLoading: isPlanLoading
    } = usePlanInfo();

    const { userData, isLoading: isUserLoading } = useUser();

    if (isPlanLoading || isUserLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!userData?.currentOrgId) {
        return (
            <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                    You are not part of an organization. Please contact support.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Current Plan Summary */}
            <Card className="bg-muted/30">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Current Subscription</CardTitle>
                            <CardDescription>You are currently on the <span className="font-semibold text-foreground">{planName}</span> plan.</CardDescription>
                        </div>
                        <Badge variant={isPaid ? "default" : "secondary"} className="text-sm px-3 py-1">
                            {isPaid ? "Active" : "Free Tier"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                            <div className="text-2xl font-bold">
                                {price === 0 ? "Free" : `$${price}/mo`}
                            </div>
                            <p className="text-xs text-muted-foreground">Next billing date: Calculated by Authorize.Net</p>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="font-medium mb-2">Included Features:</div>
                            <ul className="space-y-1">
                                {features.maxZips > 0 && (
                                    <li className="flex items-center gap-2">
                                        <Check className="h-3 w-3 text-green-600" />
                                        <span>Up to {features.maxZips === -1 ? "Unlimited" : features.maxZips} ZIP codes</span>
                                    </li>
                                )}
                                {features.advancedReporting && (
                                    <li className="flex items-center gap-2">
                                        <Check className="h-3 w-3 text-green-600" />
                                        <span>Advanced Reporting</span>
                                    </li>
                                )}
                                {features.maxPlaybooks > 0 && (
                                    <li className="flex items-center gap-2">
                                        <Check className="h-3 w-3 text-green-600" />
                                        <span>{features.maxPlaybooks} Active Playbooks</span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Upgrade / Billing Form */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold tracking-tight">Manage Plan</h3>
                </div>

                <BillingForm
                    organizationId={userData.currentOrgId as string}
                    locationCount={1} // TODO: Fetch real location count
                    customerEmail={userData.email || undefined}
                    customerName={userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : (userData.displayName || undefined)}
                />
            </div>
        </div>
    );
}
