import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';
import { getBrandPageBySlug } from '@/server/actions/brand-pages';

export default async function RewardsPage({ params }: { params: Promise<{ brand: string }> }) {
    const { brand: brandSlug } = await params;
    const { brand } = await fetchBrandPageData(brandSlug);

    if (!brand) {
        notFound();
    }

    // Fetch loyalty page content from Firestore
    const pageContent = await getBrandPageBySlug(brandSlug, 'loyalty');
    const content = pageContent?.loyaltyContent;

    const brandColors = {
        primary: (brand as any).primaryColor || '#16a34a',
        secondary: (brand as any).secondaryColor || '#15803d',
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
                            <h1 className="text-4xl md:text-5xl font-bold mb-6">
                                {content?.heroTitle || 'Rewards Program'}
                            </h1>
                            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                                {content?.heroDescription || 'Earn points with every purchase and redeem for exclusive rewards.'}
                            </p>

                            {/* Program Info */}
                            {content?.program && (
                                <div className="bg-primary/10 rounded-lg p-6 mb-8">
                                    <h2 className="text-2xl font-bold mb-2" style={{ color: brandColors.primary }}>
                                        {content.program.name}
                                    </h2>
                                    <p className="text-muted-foreground mb-4">{content.program.description}</p>
                                    <div className="flex items-center justify-center gap-6 text-sm">
                                        <div>
                                            <p className="font-semibold">Points per Dollar</p>
                                            <p className="text-2xl font-bold" style={{ color: brandColors.primary }}>
                                                {content.program.pointsPerDollar}
                                            </p>
                                        </div>
                                        {content.program.signupBonus && content.program.signupBonus > 0 && (
                                            <div>
                                                <p className="font-semibold">Signup Bonus</p>
                                                <p className="text-2xl font-bold" style={{ color: brandColors.primary }}>
                                                    {content.program.signupBonus}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

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
                            {content?.howItWorks && content.howItWorks.length > 0 ? (
                                content.howItWorks.map((step) => {
                                    const IconComponent = (Icons as any)[step.icon] || Icons.Gift;
                                    return (
                                        <Card key={step.id}>
                                            <CardContent className="p-6 text-center">
                                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                                    <IconComponent className="w-8 h-8" style={{ color: brandColors.primary }} />
                                                </div>
                                                <h3 className="font-semibold text-lg mb-2">{step.step}. {step.title}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {step.description}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            ) : (
                                // Default steps
                                <>
                                    <Card>
                                        <CardContent className="p-6 text-center">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                                <Icons.Gift className="w-8 h-8" style={{ color: brandColors.primary }} />
                                            </div>
                                            <h3 className="font-semibold text-lg mb-2">1. Join Free</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Sign up in-store or online - it\'s completely free
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6 text-center">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                                <Icons.TrendingUp className="w-8 h-8" style={{ color: brandColors.primary }} />
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
                                                <Icons.Star className="w-8 h-8" style={{ color: brandColors.primary }} />
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
                                                <Icons.Award className="w-8 h-8" style={{ color: brandColors.primary }} />
                                            </div>
                                            <h3 className="font-semibold text-lg mb-2">4. Get VIP Perks</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Unlock exclusive benefits as you level up
                                            </p>
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* Membership Tiers */}
                <section className="py-16 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold text-center mb-12">Membership Tiers</h2>
                        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                            {content?.tiers && content.tiers.length > 0 ? (
                                content.tiers.map((tier, index) => (
                                    <Card
                                        key={tier.id}
                                        className={index === 1 ? 'border-2' : ''}
                                        style={index === 1 ? { borderColor: brandColors.primary } : undefined}
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-bold text-xl" style={{ color: tier.color || brandColors.primary }}>
                                                    {tier.name}
                                                </h3>
                                                {index === 1 && (
                                                    <Badge variant="default" style={{ backgroundColor: brandColors.primary }}>
                                                        Popular
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                {tier.pointsRequired === 0
                                                    ? `0-${(content.tiers[1]?.pointsRequired || 500) - 1} points`
                                                    : `${tier.pointsRequired}+ points`}
                                            </p>
                                            <div className="mb-4">
                                                <p className="text-sm font-semibold mb-1">Points Multiplier</p>
                                                <p className="text-2xl font-bold" style={{ color: brandColors.primary }}>
                                                    {tier.pointsMultiplier}x
                                                </p>
                                            </div>
                                            <ul className="space-y-2 text-sm">
                                                {tier.benefits.map((benefit, idx) => (
                                                    <li key={idx} className="flex items-start gap-2">
                                                        <Icons.Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: brandColors.primary }} />
                                                        <span>{benefit}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                // Default tiers
                                <>
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
                                </>
                            )}
                        </div>

                        {/* Terms Link */}
                        {content?.termsUrl && (
                            <div className="text-center mt-8">
                                <Button variant="link" asChild>
                                    <a
                                        href={content.termsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: brandColors.primary }}
                                    >
                                        View Program Terms & Conditions
                                    </a>
                                </Button>
                            </div>
                        )}
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
