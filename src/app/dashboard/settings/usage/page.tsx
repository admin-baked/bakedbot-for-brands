import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { getAdminFirestore } from '@/firebase/admin';
import { TIERS, type TierId } from '@/config/tiers';
import { getUsageWithLimits } from '@/lib/metering/usage-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    MessageSquare,
    Mail,
    Zap,
    BarChart3,
    MapPin,
    Users,
    Sparkles,
    TrendingUp,
    AlertTriangle,
} from 'lucide-react';

interface MetricRowProps {
    label: string;
    icon: React.ReactNode;
    used: number;
    limit: number;
    pct: number;
    unlimited: boolean;
}

function MetricRow({ label, icon, used, limit, pct, unlimited }: MetricRowProps) {
    const color =
        unlimited ? 'text-emerald-600'
        : pct >= 90 ? 'text-red-600'
        : pct >= 80 ? 'text-yellow-600'
        : 'text-emerald-600';

    const progressColor =
        pct >= 90 ? '[&>div]:bg-red-500'
        : pct >= 80 ? '[&>div]:bg-yellow-500'
        : '[&>div]:bg-emerald-500';

    return (
        <div className="flex items-center gap-4 py-3">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{label}</span>
                    {unlimited ? (
                        <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-700">Unlimited</Badge>
                    ) : (
                        <span className={`text-sm font-semibold tabular-nums ${color}`}>
                            {used.toLocaleString()} / {limit.toLocaleString()}
                        </span>
                    )}
                </div>
                {!unlimited && (
                    <Progress value={pct} className={`h-1.5 ${progressColor}`} />
                )}
            </div>
            {!unlimited && pct >= 80 && (
                <AlertTriangle className={`w-4 h-4 shrink-0 ${pct >= 90 ? 'text-red-500' : 'text-yellow-500'}`} />
            )}
        </div>
    );
}

export default async function UsagePage() {
    const user = await requireUser();
    const orgId = user.currentOrgId;
    if (!orgId) redirect('/dashboard');

    const firestore = getAdminFirestore();

    // Get subscription → tier
    const subDoc = await firestore.collection('subscriptions').doc(orgId).get();
    const subData = subDoc.exists ? subDoc.data() : null;
    const tierId = (subData?.tierId ?? 'scout') as TierId;
    const tier = TIERS[tierId] ?? TIERS.scout;

    const usageData = await getUsageWithLimits(orgId, tierId);
    const { metrics, overageCharges, atRisk } = usageData;

    // Period display
    const now = new Date();
    const periodLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const periodPct = Math.round((dayOfMonth / daysInMonth) * 100);

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Usage</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {periodLabel} · {dayOfMonth} of {daysInMonth} days ({periodPct}% through billing period)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize border-primary/30 text-primary bg-primary/5">
                        {tier.name}
                    </Badge>
                    {atRisk.length > 0 && (
                        <Button size="sm" asChild className="rounded-xl">
                            <a href="/dashboard/settings/billing">Upgrade →</a>
                        </Button>
                    )}
                </div>
            </div>

            {/* At-risk banner */}
            {atRisk.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-5 py-4">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm">
                            Approaching limits
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-0.5">
                            {atRisk.length} metric{atRisk.length > 1 ? 's are' : ' is'} at 80%+ usage.
                            Overages apply at your tier rates. Upgrade to avoid extra charges.
                        </p>
                    </div>
                </div>
            )}

            {/* Usage metrics */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Monthly Allocation</CardTitle>
                    <CardDescription>Resets on the 1st of each month</CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border/50">
                    <MetricRow
                        label="Customer SMS"
                        icon={<MessageSquare className="w-4 h-4" />}
                        {...metrics.smsCustomer}
                    />
                    <MetricRow
                        label="Emails"
                        icon={<Mail className="w-4 h-4" />}
                        {...metrics.emails}
                    />
                    <MetricRow
                        label="AI Budtender Sessions"
                        icon={<Zap className="w-4 h-4" />}
                        {...metrics.aiSessions}
                    />
                    <MetricRow
                        label="Creative Assets"
                        icon={<Sparkles className="w-4 h-4" />}
                        {...metrics.creativeAssets}
                    />
                    <MetricRow
                        label="Competitors Tracked"
                        icon={<TrendingUp className="w-4 h-4" />}
                        {...metrics.competitors}
                    />
                    <MetricRow
                        label="ZIP Codes"
                        icon={<MapPin className="w-4 h-4" />}
                        {...metrics.zipCodes}
                    />
                    <MetricRow
                        label="Internal SMS (Alerts)"
                        icon={<Users className="w-4 h-4" />}
                        {...metrics.smsInternal}
                    />
                </CardContent>
            </Card>

            {/* Overage charges */}
            {overageCharges.total > 0 && (
                <Card className="border-orange-500/30">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-orange-500" />
                            Overage Charges This Period
                        </CardTitle>
                        <CardDescription>
                            These will be billed at the end of your billing cycle.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            {overageCharges.sms > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">SMS overages</span>
                                    <span className="font-medium">${overageCharges.sms.toFixed(2)}</span>
                                </div>
                            )}
                            {overageCharges.email > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Email overages</span>
                                    <span className="font-medium">${overageCharges.email.toFixed(2)}</span>
                                </div>
                            )}
                            {overageCharges.creativeAssets > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Creative asset overages</span>
                                    <span className="font-medium">${overageCharges.creativeAssets.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-border/50 font-semibold">
                                <span>Estimated total overage</span>
                                <span className="text-orange-600">${overageCharges.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Plan limits reference */}
            <Card className="bg-muted/20 border-border/50">
                <CardContent className="py-4">
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{tier.name} plan limits</span> — SMS: {tier.allocations.smsCustomer > 0 ? tier.allocations.smsCustomer.toLocaleString() : 'N/A'},
                        Emails: {tier.allocations.emails > 0 ? tier.allocations.emails.toLocaleString() : 'N/A'},
                        Competitors: {tier.allocations.competitors},
                        ZIPs: {tier.allocations.zipCodes},
                        Creative: {tier.allocations.creativeAssets > 0 ? tier.allocations.creativeAssets : 'N/A'}.
                        {' '}<a href="/dashboard/settings/billing" className="text-primary hover:underline">Upgrade your plan</a> to increase limits.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
