import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { VisitorCheckinCard } from '@/components/checkin/visitor-checkin-card';
import { LoyaltyCardSection } from '@/components/brand-pages/loyalty-card-section';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';
import { getBrandPageBySlug } from '@/server/actions/brand-pages';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth-helpers';
import { PublicPageEditBar } from '@/components/brand-pages/public-page-edit-bar';
import { getVisitorCheckinPilotOrgId } from '@/lib/checkin/visitor-checkin-pilot';

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

    // Auth check — show edit bar for org admins
    const cookieStore = await cookies();
    const user = await getCurrentUser(cookieStore.get('session')?.value);
    const brandOrgId = pageContent?.orgId ?? (brand as any).originalBrandId ?? null;
    const isAdmin = !!user && !!brandOrgId && (user.orgId === brandOrgId || user.role === 'super_user');
    const thriveCheckinOrgId = getVisitorCheckinPilotOrgId({
        brandSlug,
        brandOrgId,
        brandId: brand.id,
        originalBrandId: (brand as any).originalBrandId ?? null,
    });
    const showVisitorCheckin = !!thriveCheckinOrgId;

    if (showVisitorCheckin && thriveCheckinOrgId) {
        return (
            <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f3fbf6_0%,#ffffff_55%,#f6f8f7_100%)]">
                <header className="border-b border-border/60 bg-background/90 backdrop-blur">
                    <div className="container mx-auto flex items-center justify-between px-4 py-4">
                        <div className="flex items-center gap-3">
                            {brand.logoUrl ? (
                                <img src={brand.logoUrl} alt={brand.name} className="h-10 w-auto" />
                            ) : (
                                <div className="text-2xl font-bold" style={{ color: brandColors.primary }}>
                                    {brand.name}
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: brandColors.primary }}>
                                    Thrive Syracuse
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Front door check-in and VIP rewards
                                </p>
                            </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                            <p>Open with staff ID check</p>
                            <p>Built for faster budtender handoff</p>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-10 md:py-14">
                    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
                        <section className="space-y-6">
                            <div className="space-y-4">
                                <p className="text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: brandColors.primary }}>
                                    Thrive VIP Rewards
                                </p>
                                <h1 className="max-w-xl text-4xl font-black tracking-tight text-foreground md:text-5xl">
                                    Check in faster. Give your budtender a better head start.
                                </h1>
                                <p className="max-w-xl text-base leading-7 text-muted-foreground">
                                    This check-in flow is built to be useful right away. Returning customers can
                                    see their last purchase, leave a quick Google review, get mood-based
                                    recommendations, and chat with Smokey before they shop.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <Card className="border-border/60 bg-background/80 shadow-sm">
                                    <CardContent className="p-5">
                                        <Icons.BadgeCheck className="h-8 w-8" style={{ color: brandColors.primary }} />
                                        <p className="mt-3 font-semibold">Faster entry</p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Name, phone, and ID attestation up front so the front door moves quickly.
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="border-border/60 bg-background/80 shadow-sm">
                                    <CardContent className="p-5">
                                        <Icons.Sparkles className="h-8 w-8" style={{ color: brandColors.primary }} />
                                        <p className="mt-3 font-semibold">Better recommendations</p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Share how you want to feel so Smokey and your budtender can guide the visit.
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="border-border/60 bg-background/80 shadow-sm">
                                    <CardContent className="p-5">
                                        <Icons.MessageCircleMore className="h-8 w-8" style={{ color: brandColors.primary }} />
                                        <p className="mt-3 font-semibold">Weekly deals</p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            One text per week unless you ask for more, plus smarter follow-ups over time.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                                <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: brandColors.primary }}>
                                    What happens on step two
                                </p>
                                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <p className="font-semibold">Last purchase context</p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Returning customers can quickly revisit what they bought last time.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-semibold">Smokey by text or voice</p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Ask for product guidance in the page instead of hunting through menus.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-semibold">1c pre-roll exchange</p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Trade one more useful detail for a staff-honored in-store offer.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="lg:sticky lg:top-6">
                            <VisitorCheckinCard
                                orgId={thriveCheckinOrgId}
                                brandName={brand.name}
                                brandSlug={brandSlug}
                                primaryColor={brandColors.primary}
                            />
                        </div>
                    </div>
                </main>

                {isAdmin && brandOrgId && (
                    <PublicPageEditBar
                        orgId={brandOrgId}
                        pageType="loyalty"
                        initialContent={pageContent}
                        brandColors={brandColors}
                        brandName={brand.name}
                        brandSlug={brandSlug}
                    />
                )}
            </div>
        );
    }

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

                            {showVisitorCheckin ? (
                                <Button size="lg" asChild style={{ backgroundColor: brandColors.primary }}>
                                    <a href="#check-in">Check In Now</a>
                                </Button>
                            ) : (
                                <Button size="lg" style={{ backgroundColor: brandColors.primary }}>
                                    Sign Up Now
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                {showVisitorCheckin && thriveCheckinOrgId && (
                    <section className="py-12">
                        <div className="container mx-auto px-4">
                            <div className="mx-auto max-w-4xl">
                                <VisitorCheckinCard
                                    orgId={thriveCheckinOrgId}
                                    brandName={brand.name}
                                    brandSlug={brandSlug}
                                    primaryColor={brandColors.primary}
                                />
                            </div>
                        </div>
                    </section>
                )}

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
                                                {"Sign up in-store or online - it's completely free"}
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
                {/* PWA Loyalty Card — installable, QR code, Web Push */}
                <LoyaltyCardSection
                    orgId={brandOrgId || brandSlug}
                    brandName={brand.name}
                    brandSlug={brandSlug}
                    primaryColor={brandColors.primary}
                />
            </main>

            {isAdmin && brandOrgId && (
                <PublicPageEditBar
                    orgId={brandOrgId}
                    pageType="loyalty"
                    initialContent={pageContent}
                    brandColors={brandColors}
                    brandName={brand.name}
                    brandSlug={brandSlug}
                />
            )}

            <DemoFooter
                brandName={brand.name}
                brandLogo={brand.logoUrl}
                primaryColor={brandColors.primary}
                location={brand.location || undefined}
            />
        </div>
    );
}
