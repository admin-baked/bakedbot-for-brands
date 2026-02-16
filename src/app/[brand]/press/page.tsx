import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';

export default async function PressPage({ params }: { params: Promise<{ brand: string }> }) {
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
                            <h1 className="text-4xl md:text-5xl font-bold mb-6">Press & Media</h1>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Press resources, media kits, and company information.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Press Kit */}
                <section className="py-16">
                    <div className="container mx-auto px-4">
                        <div className="max-w-3xl mx-auto">
                            <Card>
                                <CardContent className="p-8">
                                    <div className="text-center mb-8">
                                        <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: brandColors.primary }} />
                                        <h2 className="text-2xl font-bold mb-2">Press Kit</h2>
                                        <p className="text-muted-foreground">
                                            Download our complete media kit including logos, brand guidelines, and company information.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="border rounded-lg p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">Brand Logo Package</p>
                                                <p className="text-sm text-muted-foreground">High-resolution logos in various formats</p>
                                            </div>
                                            <Button variant="outline" size="sm">
                                                <Download className="w-4 h-4 mr-2" />
                                                Download
                                            </Button>
                                        </div>

                                        <div className="border rounded-lg p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">Company Fact Sheet</p>
                                                <p className="text-sm text-muted-foreground">Key facts and statistics</p>
                                            </div>
                                            <Button variant="outline" size="sm">
                                                <Download className="w-4 h-4 mr-2" />
                                                Download
                                            </Button>
                                        </div>

                                        <div className="border rounded-lg p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">Brand Guidelines</p>
                                                <p className="text-sm text-muted-foreground">Logo usage and brand standards</p>
                                            </div>
                                            <Button variant="outline" size="sm">
                                                <Download className="w-4 h-4 mr-2" />
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Press Contact */}
                            <Card className="mt-8">
                                <CardContent className="p-8">
                                    <h3 className="text-xl font-bold mb-4">Press Contact</h3>
                                    <p className="text-muted-foreground mb-4">
                                        For media inquiries, please contact:
                                    </p>
                                    <p>
                                        <strong>Email:</strong>{' '}
                                        <a
                                            href={`mailto:press@${brandSlug}.com`}
                                            className="hover:underline"
                                            style={{ color: brandColors.primary }}
                                        >
                                            press@{brandSlug}.com
                                        </a>
                                    </p>
                                    {brand.location?.phone && (
                                        <p className="mt-2">
                                            <strong>Phone:</strong>{' '}
                                            <a href={`tel:${brand.location.phone}`} className="hover:underline">
                                                {brand.location.phone}
                                            </a>
                                        </p>
                                    )}
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
