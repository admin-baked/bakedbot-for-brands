import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent } from '@/components/ui/card';
import { getBrandPageBySlug } from '@/server/actions/brand-pages';
import * as Icons from 'lucide-react';

export default async function AboutPage({ params }: { params: Promise<{ brand: string }> }) {
    const { brand: brandSlug } = await params;
    const { brand } = await fetchBrandPageData(brandSlug);

    if (!brand) {
        notFound();
    }

    // Fetch dynamic content from Firestore
    const pageContent = await getBrandPageBySlug(brandSlug, 'about');
    const content = pageContent?.aboutContent;

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
                                {content?.heroTitle || `About ${brand.name}`}
                            </h1>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {content?.heroDescription || brand.description || `Welcome to ${brand.name}. We're committed to providing the highest quality cannabis products and exceptional customer service to our community.`}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Story Section (if provided) */}
                {content?.story && (
                    <section className="py-16 bg-muted/30">
                        <div className="container mx-auto px-4">
                            <div className="max-w-3xl mx-auto prose prose-lg">
                                <p className="whitespace-pre-wrap">{content.story}</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Values Section */}
                <section className="py-16">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {content?.values && content.values.length > 0 ? (
                                content.values.map((value) => {
                                    const IconComponent = (Icons as any)[value.icon] || Icons.Award;
                                    return (
                                        <Card key={value.id}>
                                            <CardContent className="p-6 text-center">
                                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                                    <IconComponent className="w-8 h-8" style={{ color: brandColors.primary }} />
                                                </div>
                                                <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {value.description}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            ) : (
                                // Default values if none configured
                                <>
                                    <Card>
                                        <CardContent className="p-6 text-center">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                                <Icons.Award className="w-8 h-8" style={{ color: brandColors.primary }} />
                                            </div>
                                            <h3 className="font-semibold text-lg mb-2">Quality</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Premium products tested for purity and potency
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6 text-center">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                                <Icons.Users className="w-8 h-8" style={{ color: brandColors.primary }} />
                                            </div>
                                            <h3 className="font-semibold text-lg mb-2">Community</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Supporting local communities and customers
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6 text-center">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                                <Icons.ShieldCheck className="w-8 h-8" style={{ color: brandColors.primary }} />
                                            </div>
                                            <h3 className="font-semibold text-lg mb-2">Compliance</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Fully licensed and compliant with state regulations
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6 text-center">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                                <Icons.Heart className="w-8 h-8" style={{ color: brandColors.primary }} />
                                            </div>
                                            <h3 className="font-semibold text-lg mb-2">Care</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Dedicated to customer education and wellness
                                            </p>
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* Location Section */}
                {brand.location && (
                    <section className="py-16 bg-muted/30">
                        <div className="container mx-auto px-4">
                            <div className="max-w-2xl mx-auto text-center">
                                <h2 className="text-3xl font-bold mb-6">Visit Us</h2>
                                <div className="space-y-2">
                                    {brand.location.address && <p className="text-lg">{brand.location.address}</p>}
                                    <p className="text-lg">
                                        {brand.location.city}, {brand.location.state} {brand.location.zip}
                                    </p>
                                    {brand.location.phone && (
                                        <p className="text-lg">
                                            <a href={`tel:${brand.location.phone}`} className="hover:underline" style={{ color: brandColors.primary }}>
                                                {brand.location.phone}
                                            </a>
                                        </p>
                                    )}
                                    {(brand.location as any)?.hours && <p className="text-muted-foreground mt-4">{(brand.location as any)?.hours}</p>}
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <DemoFooter
                brandName={brand.name}
                brandLogo={brand.logoUrl}
                primaryColor={brandColors.primary}
                location={brand.location || undefined}
                customCompanyLinks={[
                    { label: 'About Us', href: `/${brandSlug}/about` },
                    { label: 'Careers', href: `/${brandSlug}/careers` },
                    { label: 'Locations', href: `/${brandSlug}/locations` },
                    { label: 'Contact', href: `/${brandSlug}/contact` },
                    { label: 'Blog', href: `/${brandSlug}/blog` },
                    { label: 'Press', href: `/${brandSlug}/press` },
                ]}
            />
        </div>
    );
}
