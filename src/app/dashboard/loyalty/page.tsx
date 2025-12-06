import { getLoyaltySettings, getLoyaltyCampaigns } from './actions';
import { LoyaltySettingsCard } from './components/settings-card';
import { LoyaltyCampaignCard } from './components/campaign-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Crown, Gift, Users, Heart } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LoyaltyPage() {
    const settings = await getLoyaltySettings();
    const campaigns = await getLoyaltyCampaigns();

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Mrs. Parker's Loyalty Club</h1>
                <p className="text-muted-foreground">Configure your points, tiers, and automated rewards.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gold Members</CardTitle>
                        <Crown className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">124</div>
                        <p className="text-xs text-muted-foreground">Top 10% of customers</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Points Issued</CardTitle>
                        <Gift className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">45.2k</div>
                        <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Redemption Rate</CardTitle>
                        <Heart className="h-4 w-4 text-pink-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">18%</div>
                        <p className="text-xs text-muted-foreground">Of points used</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Equity Program</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Active</div>
                        <p className="text-xs text-muted-foreground">Multiplier: {settings.equityMultiplier}x</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Left Col: Settings */}
                <div className="md:col-span-1 space-y-6">
                    <LoyaltySettingsCard initialSettings={settings} />
                </div>

                {/* Right Col: Campaigns & Tiers */}
                <div className="md:col-span-2 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Active Campaigns</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {campaigns.map(camp => (
                                <LoyaltyCampaignCard key={camp.id} campaign={camp} />
                            ))}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-4">Tier Structure</h2>
                        <Card>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {settings.tiers.map((tier) => (
                                        <div key={tier.id} className="flex items-center justify-between p-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tier.color}`}>
                                                    <Crown className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-lg">{tier.name}</h3>
                                                    <p className="text-sm text-muted-foreground">Spend &gt; ${tier.threshold}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <ul className="text-sm text-muted-foreground">
                                                    {tier.benefits.map((b, i) => <li key={i}>• {b}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
