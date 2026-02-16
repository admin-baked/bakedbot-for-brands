import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { getBrandPageBySlug } from '@/server/actions/brand-pages';

export default async function PressPage({ params }: { params: Promise<{ brand: string }> }) {
    const { brand: brandSlug } = await params;
    const { brand } = await fetchBrandPageData(brandSlug);

    if (!brand) {
        notFound();
    }

    // Fetch press page content from Firestore
    const pageContent = await getBrandPageBySlug(brandSlug, 'press');
    const content = pageContent?.pressContent;

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
                                {content?.heroTitle || 'Press & Media'}
                            </h1>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {content?.heroDescription || 'Press resources, media kits, and company information.'}
                            </p>
                        </div>
                    </div>
                </section>

                <div className="container mx-auto px-4 py-16">
                    <div className="max-w-3xl mx-auto space-y-8">
                        {/* Press Kit */}
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
                                    {content?.pressKit && content.pressKit.length > 0 ? (
                                        content.pressKit.map((item) => (
                                            <div key={item.id} className="border rounded-lg p-4 flex items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-medium">{item.title}</p>
                                                        <Badge variant="outline" className="text-xs">
                                                            {item.type.replace(/-/g, ' ')}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                                    {item.fileSize && (
                                                        <p className="text-xs text-muted-foreground mt-1">{item.fileSize}</p>
                                                    )}
                                                </div>
                                                {item.fileUrl ? (
                                                    <Button variant="outline" size="sm" asChild>
                                                        <a href={item.fileUrl} download={item.fileName} target="_blank" rel="noopener noreferrer">
                                                            <Download className="w-4 h-4 mr-2" />
                                                            Download
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <Button variant="outline" size="sm" disabled>
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Coming Soon
                                                    </Button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <>
                                            <div className="border rounded-lg p-4 flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">Brand Logo Package</p>
                                                    <p className="text-sm text-muted-foreground">High-resolution logos in various formats</p>
                                                </div>
                                                <Button variant="outline" size="sm" disabled>
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Coming Soon
                                                </Button>
                                            </div>
                                            <div className="border rounded-lg p-4 flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">Company Fact Sheet</p>
                                                    <p className="text-sm text-muted-foreground">Key facts and statistics</p>
                                                </div>
                                                <Button variant="outline" size="sm" disabled>
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Coming Soon
                                                </Button>
                                            </div>
                                            <div className="border rounded-lg p-4 flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">Brand Guidelines</p>
                                                    <p className="text-sm text-muted-foreground">Logo usage and brand standards</p>
                                                </div>
                                                <Button variant="outline" size="sm" disabled>
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Coming Soon
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent News */}
                        {content?.recentNews && content.recentNews.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent News</CardTitle>
                                    <CardDescription>Latest press releases and media coverage</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {content.recentNews.map((news) => (
                                            <div key={news.id} className="border-b last:border-0 pb-4 last:pb-0">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold mb-1">{news.title}</h3>
                                                        <p className="text-sm text-muted-foreground mb-2">{news.summary}</p>
                                                        <p className="text-xs text-muted-foreground">{news.date}</p>
                                                    </div>
                                                    {news.url && (
                                                        <Button variant="ghost" size="sm" asChild>
                                                            <a
                                                                href={news.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="shrink-0"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Press Contact */}
                        <Card>
                            <CardContent className="p-8">
                                <h3 className="text-xl font-bold mb-4">Press Contact</h3>
                                <p className="text-muted-foreground mb-4">
                                    For media inquiries, please contact:
                                </p>
                                <div className="space-y-2">
                                    {content?.pressContact.name && (
                                        <p>
                                            <strong>Name:</strong> {content.pressContact.name}
                                        </p>
                                    )}
                                    <p>
                                        <strong>Email:</strong>{' '}
                                        <a
                                            href={`mailto:${content?.pressContact.email || 'press@' + brandSlug + '.com'}`}
                                            className="hover:underline"
                                            style={{ color: brandColors.primary }}
                                        >
                                            {content?.pressContact.email || `press@${brandSlug}.com`}
                                        </a>
                                    </p>
                                    {content?.pressContact.phone && (
                                        <p>
                                            <strong>Phone:</strong>{' '}
                                            <a
                                                href={`tel:${content.pressContact.phone}`}
                                                className="hover:underline"
                                                style={{ color: brandColors.primary }}
                                            >
                                                {content.pressContact.phone}
                                            </a>
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
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
