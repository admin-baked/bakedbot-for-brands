import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Heart, TrendingUp, Award } from 'lucide-react';

export default async function CareersPage({ params }: { params: Promise<{ brand: string }> }) {
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
                            <h1 className="text-4xl md:text-5xl font-bold mb-6">Join Our Team</h1>
                            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                                We're always looking for passionate people to help us grow the cannabis industry.
                            </p>
                            <Button size="lg" style={{ backgroundColor: brandColors.primary }}>
                                <a href={`mailto:${brand.location?.email || 'careers@' + brandSlug + '.com'}`}>
                                    Apply Now
                                </a>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Benefits Section */}
                <section className="py-16">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold text-center mb-12">Why Work With Us</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <TrendingUp className="w-8 h-8" style={{ color: brandColors.primary }} />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">Growth</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Career development and advancement opportunities
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <Users className="w-8 h-8" style={{ color: brandColors.primary }} />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">Culture</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Inclusive and supportive team environment
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <Heart className="w-8 h-8" style={{ color: brandColors.primary }} />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">Benefits</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Competitive pay, health insurance, and employee discounts
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <Award className="w-8 h-8" style={{ color: brandColors.primary }} />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">Impact</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Help shape the future of cannabis retail
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Open Positions Section */}
                <section className="py-16 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <div className="max-w-2xl mx-auto text-center">
                            <h2 className="text-3xl font-bold mb-6">Open Positions</h2>
                            <p className="text-muted-foreground mb-8">
                                Check back soon for openings, or send us your resume for future opportunities.
                            </p>
                            <Button variant="outline" size="lg">
                                <a href={`mailto:${brand.location?.email || 'careers@' + brandSlug + '.com'}?subject=Career Opportunity`}>
                                    Send Resume
                                </a>
                            </Button>
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
