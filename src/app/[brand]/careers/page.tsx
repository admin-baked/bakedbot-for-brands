import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';
import { getBrandPageBySlug } from '@/server/actions/brand-pages';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth-helpers';
import { PublicPageEditBar } from '@/components/brand-pages/public-page-edit-bar';

export default async function CareersPage({ params }: { params: Promise<{ brand: string }> }) {
    const { brand: brandSlug } = await params;
    const { brand } = await fetchBrandPageData(brandSlug);

    if (!brand) {
        notFound();
    }

    // Fetch careers page content from Firestore
    const pageContent = await getBrandPageBySlug(brandSlug, 'careers');
    const content = pageContent?.careersContent;

    const brandColors = {
        primary: (brand as any).primaryColor || '#16a34a',
        secondary: (brand as any).secondaryColor || '#15803d',
    };

    // Auth check — show edit bar for org admins
    const cookieStore = await cookies();
    const user = await getCurrentUser(cookieStore.get('session')?.value);
    const brandOrgId = pageContent?.orgId ?? (brand as any).originalBrandId ?? null;
    const isAdmin = !!user && !!brandOrgId && (user.orgId === brandOrgId || user.role === 'super_user');

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
                                {content?.heroTitle || 'Join Our Team'}
                            </h1>
                            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                                {content?.heroDescription || 'We\'re always looking for passionate people to help us grow the cannabis industry.'}
                            </p>
                            <Button size="lg" style={{ backgroundColor: brandColors.primary }}>
                                <a href={`mailto:${content?.applyEmail || (brand.location as any)?.email || 'careers@' + brandSlug + '.com'}`}>
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
                            {content?.benefits && content.benefits.length > 0 ? (
                                content.benefits.map((benefit) => {
                                    const IconComponent = (Icons as any)[benefit.icon] || Icons.Award;
                                    return (
                                        <Card key={benefit.id}>
                                            <CardContent className="p-6 text-center">
                                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                                    <IconComponent className="w-8 h-8" style={{ color: brandColors.primary }} />
                                                </div>
                                                <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {benefit.description}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            ) : (
                                // Default benefits
                                <>
                                    <Card>
                                        <CardContent className="p-6 text-center">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                                <Icons.TrendingUp className="w-8 h-8" style={{ color: brandColors.primary }} />
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
                                                <Icons.Users className="w-8 h-8" style={{ color: brandColors.primary }} />
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
                                                <Icons.Heart className="w-8 h-8" style={{ color: brandColors.primary }} />
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
                                                <Icons.Award className="w-8 h-8" style={{ color: brandColors.primary }} />
                                            </div>
                                            <h3 className="font-semibold text-lg mb-2">Impact</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Help shape the future of cannabis retail
                                            </p>
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* Open Positions Section */}
                <section className="py-16 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold text-center mb-12">Open Positions</h2>

                        {content?.openPositions && content.openPositions.filter(p => p.isActive).length > 0 ? (
                            <div className="max-w-3xl mx-auto space-y-6">
                                {content.openPositions.filter(p => p.isActive).map((position) => (
                                    <Card key={position.id}>
                                        <CardHeader>
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <CardTitle className="text-xl mb-2">{position.title}</CardTitle>
                                                    <CardDescription className="flex flex-wrap gap-2">
                                                        <Badge variant="outline">{position.department}</Badge>
                                                        <Badge variant="outline">{position.location}</Badge>
                                                        <Badge variant="outline">{position.type}</Badge>
                                                        {position.salary && (
                                                            <Badge variant="secondary">{position.salary}</Badge>
                                                        )}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground mb-4">{position.description}</p>

                                            {position.responsibilities && position.responsibilities.length > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="font-semibold mb-2">Responsibilities:</h4>
                                                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                                        {position.responsibilities.map((item, idx) => (
                                                            <li key={idx}>{item}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {position.requirements && position.requirements.length > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="font-semibold mb-2">Requirements:</h4>
                                                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                                        {position.requirements.map((item, idx) => (
                                                            <li key={idx}>{item}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <Button
                                                className="mt-4"
                                                style={{ backgroundColor: brandColors.primary }}
                                            >
                                                <a
                                                    href={
                                                        position.applyUrl ||
                                                        `mailto:${content?.applyEmail || (brand.location as any)?.email || 'careers@' + brandSlug + '.com'}?subject=Application for ${position.title}`
                                                    }
                                                    target={position.applyUrl ? '_blank' : undefined}
                                                    rel={position.applyUrl ? 'noopener noreferrer' : undefined}
                                                >
                                                    Apply Now
                                                </a>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="max-w-2xl mx-auto text-center">
                                <p className="text-muted-foreground mb-8">
                                    Check back soon for openings, or send us your resume for future opportunities.
                                </p>
                                <Button variant="outline" size="lg">
                                    <a href={`mailto:${content?.applyEmail || (brand.location as any)?.email || 'careers@' + brandSlug + '.com'}?subject=Career Opportunity`}>
                                        Send Resume
                                    </a>
                                </Button>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {isAdmin && brandOrgId && (
                <PublicPageEditBar
                    orgId={brandOrgId}
                    pageType="careers"
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
