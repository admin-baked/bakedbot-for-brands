import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Star, TrendingUp, Award } from 'lucide-react';

export default async function RewardsPage({ params }: { params: Promise<{ brand: string }> }) {
    const { brand: brandSlug } = await params;
    const { brand } = await fetchBrandPageData(brandSlug);

    if (!brand) {
        notFound();
    }

    const brandColors = {
        primary: brand.primaryColor || '#16a34a',
        secondary: brand.secondaryColor || '#15803d',
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <DemoHeader
                brandName={brand.name}
                brandLogo={brand.logoUrl}
                brandSlug={brandSlug}
                useLogoInHeader={brand.useLogoInHeader}
                brandColors={brandColors}
                location={brand.location ? `${brand.location.city}, ${brand.location.state}` : `${brand.city || ''}, ${brand.state || ''}`}
            />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
                    <div className="container mx-auto px-4">
                        <div className="max-w-4xl mx-auto text-center">
                            <h1 className="text-4xl md:text-5xl font-bold mb-6">Rewards Program</h1>
                            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                                Earn points with every purchase and redeem for exclusive rewards.
                            </p>
                            <Button size="lg" style={{ backgroundColor: brandColors.primary }}>
                                Sign Up Now
                            </Button>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="py-16">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <Gift className="w-8 h-8" style={{ color: brandColors.primary }} />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">1. Join Free</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Sign up in-store or online - it's completely free
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <TrendingUp className="w-8 h-8" style={{ color: brandColors.primary }} />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">2. Earn Points</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Earn 1 point for every $1 spent
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <Star className="w-8 h-8" style={{ color: brandColors.primary }} />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">3. Redeem Rewards</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Exchange points for discounts and exclusive offers
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <Award className="w-8 h-8" style={{ color: brandColors.primary }} />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">4. Get VIP Perks</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Unlock exclusive benefits as you level up
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Reward Tiers */}
                <section className="py-16 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold text-center mb-12">Membership Tiers</h2>
                        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="font-bold text-xl mb-2" style={{ color: brandColors.primary }}>Silver</h3>
                                    <p className="text-sm text-muted-foreground mb-4">0-499 points</p>
                                    <ul className="space-y-2 text-sm">
                                        <li>✓ Earn 1 point per $1</li>
                                        <li>✓ Birthday reward</li>
                                        <li>✓ Early access to sales</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card className="border-2" style={{ borderColor: brandColors.primary }}>
                                <CardContent className="p-6">
                                    <h3 className="font-bold text-xl mb-2" style={{ color: brandColors.primary }}>Gold</h3>
                                    <p className="text-sm text-muted-foreground mb-4">500-999 points</p>
                                    <ul className="space-y-2 text-sm">
                                        <li>✓ Earn 1.25 points per $1</li>
                                        <li>✓ All Silver benefits</li>
                                        <li>✓ Exclusive monthly deals</li>
                                        <li>✓ Free delivery</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="font-bold text-xl mb-2" style={{ color: brandColors.primary }}>Platinum</h3>
                                    <p className="text-sm text-muted-foreground mb-4">1000+ points</p>
                                    <ul className="space-y-2 text-sm">
                                        <li>✓ Earn 1.5 points per $1</li>
                                        <li>✓ All Gold benefits</li>
                                        <li>✓ Priority support</li>
                                        <li>✓ VIP events</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>
            </main>

            <DemoFooter
                brandName={brand.name}
                brandLogo={brand.logoUrl}
                primaryColor={brandColors.primary}
                location={brand.location || undefined}
            />
        </div>
    );
}
