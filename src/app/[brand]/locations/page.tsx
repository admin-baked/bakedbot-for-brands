import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Clock, Mail, ExternalLink } from 'lucide-react';
import { getBrandPageBySlug } from '@/server/actions/brand-pages';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth-helpers';
import { PublicPageEditBar } from '@/components/brand-pages/public-page-edit-bar';

export default async function LocationsPage({ params }: { params: Promise<{ brand: string }> }) {
    const { brand: brandSlug } = await params;
    const { brand } = await fetchBrandPageData(brandSlug);

    if (!brand) {
        notFound();
    }

    // Fetch locations page content from Firestore
    const pageContent = await getBrandPageBySlug(brandSlug, 'locations');
    const content = pageContent?.locationsContent;

    const brandColors = {
        primary: (brand as any).primaryColor || '#16a34a',
        secondary: (brand as any).secondaryColor || '#15803d',
    };

    // Auth check — show edit bar for org admins
    const cookieStore = await cookies();
    const user = await getCurrentUser(cookieStore.get('session')?.value);
    const brandOrgId = pageContent?.orgId ?? (brand as any).originalBrandId ?? null;
    const isAdmin = !!user && !!brandOrgId && (user.orgId === brandOrgId || user.role === 'super_user');

    // Use dynamic locations or fallback to brand.location
    const locations = content?.locations && content.locations.length > 0
        ? content.locations
        : brand.location
            ? [{
                id: 'default',
                name: brand.name,
                address: brand.location.address,
                city: brand.location.city,
                state: brand.location.state,
                zip: brand.location.zip,
                phone: brand.location.phone,
                email: (brand.location as any)?.email,
                hours: (brand.location as any)?.hours,
                mapUrl: undefined,
                features: undefined,
                isPrimary: true,
            }]
            : [];

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
                                {content?.heroTitle || 'Our Locations'}
                            </h1>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {content?.heroDescription || `Find a ${brand.name} location near you.`}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Locations */}
                <section className="py-16">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                            {locations.map((location) => (
                                <Card key={location.id} className={location.isPrimary ? 'border-primary' : ''}>
                                    <CardContent className="p-8">
                                        <div className="flex items-start justify-between mb-6">
                                            <h2 className="text-2xl font-bold">{location.name}</h2>
                                            {location.isPrimary && (
                                                <Badge variant="default" style={{ backgroundColor: brandColors.primary }}>
                                                    Primary
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {/* Address */}
                                            <div className="flex items-start gap-4">
                                                <MapPin className="w-5 h-5 mt-1 text-muted-foreground" />
                                                <div className="flex-1">
                                                    <p className="font-medium">Address</p>
                                                    <p className="text-muted-foreground">
                                                        {location.address}<br />
                                                        {location.city}, {location.state} {location.zip}
                                                    </p>
                                                    {location.mapUrl && (
                                                        <Button
                                                            variant="link"
                                                            className="p-0 h-auto mt-2"
                                                            asChild
                                                        >
                                                            <a
                                                                href={location.mapUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1"
                                                                style={{ color: brandColors.primary }}
                                                            >
                                                                View on Map
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Phone */}
                                            {location.phone && (
                                                <div className="flex items-start gap-4">
                                                    <Phone className="w-5 h-5 mt-1 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium">Phone</p>
                                                        <a
                                                            href={`tel:${location.phone}`}
                                                            className="text-muted-foreground hover:underline"
                                                            style={{ color: brandColors.primary }}
                                                        >
                                                            {location.phone}
                                                        </a>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Email */}
                                            {location.email && (
                                                <div className="flex items-start gap-4">
                                                    <Mail className="w-5 h-5 mt-1 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium">Email</p>
                                                        <a
                                                            href={`mailto:${location.email}`}
                                                            className="text-muted-foreground hover:underline"
                                                            style={{ color: brandColors.primary }}
                                                        >
                                                            {location.email}
                                                        </a>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Hours */}
                                            {location.hours && (
                                                <div className="flex items-start gap-4">
                                                    <Clock className="w-5 h-5 mt-1 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium">Hours</p>
                                                        <p className="text-muted-foreground whitespace-pre-line">
                                                            {location.hours}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Features */}
                                            {location.features && location.features.length > 0 && (
                                                <div className="pt-4 border-t">
                                                    <p className="font-medium mb-2">Available Services</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {location.features.map((feature, idx) => (
                                                            <Badge key={idx} variant="secondary">
                                                                {feature}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {isAdmin && brandOrgId && (
                <PublicPageEditBar
                    orgId={brandOrgId}
                    pageType="locations"
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
