'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Zap, MapPin, TrendingUp, Search, Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/use-user-role';
import { EzalSnapshotCard } from '@/components/dashboard/ezal-snapshot-card';
import { Input } from '@/components/ui/input';

export default function CompetitiveIntelPage() {
    const { role } = useUserRole();
    const [loading, setLoading] = useState(true);
    const [competitors, setCompetitors] = useState<any[]>([]);

    useEffect(() => {
        // Mock loading for smoothness
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Competitive Intel</h1>
                    <p className="text-muted-foreground">
                        {role === 'brand'
                            ? "Monitor competitor pricing and market positioning."
                            : "Track nearby dispensary menus and promotions."}
                    </p>
                </div>
                <Button variant="outline" size="sm">
                    <Search className="h-4 w-4 mr-2" />
                    Market Search
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Insights for Brands */}
                    {role === 'brand' && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Competitor Pricing Snapshots</CardTitle>
                                    <CardDescription>Live data from major marketplaces.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <EzalSnapshotCard allowAddCompetitor={true} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Local Price Distribution</CardTitle>
                                    <CardDescription>Average pricing for similar products in your target regions.</CardDescription>
                                </CardHeader>
                                <CardContent className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                                    <div className="text-center text-muted-foreground">
                                        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p>Dynamic pricing chart coming soon.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* Insights for Dispensaries */}
                    {role === 'dispensary' && (
                        <>
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Nearby Competitors</CardTitle>
                                            <CardDescription>Active menus within your region.</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                placeholder="Zip Code"
                                                className="w-24 h-8 text-xs"
                                                maxLength={5}
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter') {
                                                        const zip = (e.target as HTMLInputElement).value;
                                                        if (/^\d{5}$/.test(zip)) {
                                                            setLoading(true);
                                                            try {
                                                                const { geocodeZipCode } = await import('@/lib/cannmenus-api');
                                                                const coords = await geocodeZipCode(zip);
                                                                if (coords) {
                                                                    const { getNearbyCompetitors } = await import('./actions');
                                                                    const results = await getNearbyCompetitors(coords.lat, coords.lng);
                                                                    setCompetitors(results.map((r: any) => ({
                                                                        name: r.name,
                                                                        distance: r.distance ? `${r.distance.toFixed(1)} miles` : 'Nearby',
                                                                        status: r.menu_discovery_status || 'Active'
                                                                    })));
                                                                }
                                                            } catch (err) {
                                                                console.error(err);
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {competitors.length > 0 ? (
                                        competitors.map((comp, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/10 rounded-full">
                                                        <MapPin className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{comp.name}</div>
                                                        <div className="text-xs text-muted-foreground">{comp.distance}</div>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="capitalize">{comp.status}</Badge>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            Enter a zip code to find nearby competitors.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Promotion Intelligence</CardTitle>
                                    <CardDescription>Recent competitor promotions detected by AI.</CardDescription>
                                </CardHeader>
                                <CardContent className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg">
                                    <div className="text-center text-muted-foreground">
                                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p>Promotion feed loading...</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                {/* Sidebar area */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Market Pulse</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <div className="text-2xl font-bold">+12.5%</div>
                                <div className="text-xs text-muted-foreground">Avg. Category Price Trend</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold">24</div>
                                <div className="text-xs text-muted-foreground">New Promos in Region</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">BakedBot Advisor</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs leading-relaxed">
                            "Three competitors within 2 miles have lowered pricing on 3.5g Flower by an average of $5. Consider a 'Bundle & Save' promo to maintain volume."
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
