import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Phone, Clock, Mail } from 'lucide-react';

export default async function LocationsPage({ params }: { params: Promise<{ brand: string }> }) {
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
                            <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Locations</h1>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Find a {brand.name} location near you.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Location Card */}
                {brand.location && (
                    <section className="py-16">
                        <div className="container mx-auto px-4">
                            <div className="max-w-2xl mx-auto">
                                <Card>
                                    <CardContent className="p-8">
                                        <h2 className="text-2xl font-bold mb-6">{brand.name}</h2>

                                        <div className="space-y-4">
                                            {/* Address */}
                                            {brand.location.address && (
                                                <div className="flex items-start gap-4">
                                                    <MapPin className="w-5 h-5 mt-1 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium">Address</p>
                                                        <p className="text-muted-foreground">
                                                            {brand.location.address}<br />
                                                            {brand.location.city}, {brand.location.state} {brand.location.zip}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Phone */}
                                            {brand.location.phone && (
                                                <div className="flex items-start gap-4">
                                                    <Phone className="w-5 h-5 mt-1 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium">Phone</p>
                                                        <a
                                                            href={`tel:${brand.location.phone}`}
                                                            className="text-muted-foreground hover:underline"
                                                            style={{ color: brandColors.primary }}
                                                        >
                                                            {brand.location.phone}
                                                        </a>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Email */}
                                            {brand.location.email && (
                                                <div className="flex items-start gap-4">
                                                    <Mail className="w-5 h-5 mt-1 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium">Email</p>
                                                        <a
                                                            href={`mailto:${brand.location.email}`}
                                                            className="text-muted-foreground hover:underline"
                                                            style={{ color: brandColors.primary }}
                                                        >
                                                            {brand.location.email}
                                                        </a>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Hours */}
                                            {brand.location.hours && (
                                                <div className="flex items-start gap-4">
                                                    <Clock className="w-5 h-5 mt-1 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium">Hours</p>
                                                        <p className="text-muted-foreground whitespace-pre-line">
                                                            {brand.location.hours}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
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
            />
        </div>
    );
}
