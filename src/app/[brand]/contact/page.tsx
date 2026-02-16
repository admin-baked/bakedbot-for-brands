import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export default async function ContactPage({ params }: { params: Promise<{ brand: string }> }) {
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
                            <h1 className="text-4xl md:text-5xl font-bold mb-6">Contact Us</h1>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Have questions? We'd love to hear from you.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Contact Form & Info */}
                <section className="py-16">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                            {/* Contact Form */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Send us a message</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form className="space-y-4">
                                        <div>
                                            <Input placeholder="Your Name" />
                                        </div>
                                        <div>
                                            <Input type="email" placeholder="Your Email" />
                                        </div>
                                        <div>
                                            <Input placeholder="Subject" />
                                        </div>
                                        <div>
                                            <Textarea placeholder="Your Message" rows={5} />
                                        </div>
                                        <Button className="w-full" style={{ backgroundColor: brandColors.primary }}>
                                            Send Message
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Contact Info */}
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold">Get in Touch</h3>

                                {brand.location?.address && (
                                    <div className="flex items-start gap-4">
                                        <MapPin className="w-5 h-5 mt-1" style={{ color: brandColors.primary }} />
                                        <div>
                                            <p className="font-medium mb-1">Visit Us</p>
                                            <p className="text-muted-foreground">
                                                {brand.location.address}<br />
                                                {brand.location.city}, {brand.location.state} {brand.location.zip}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {brand.location?.phone && (
                                    <div className="flex items-start gap-4">
                                        <Phone className="w-5 h-5 mt-1" style={{ color: brandColors.primary }} />
                                        <div>
                                            <p className="font-medium mb-1">Call Us</p>
                                            <a href={`tel:${brand.location.phone}`} className="text-muted-foreground hover:underline">
                                                {brand.location.phone}
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {brand.location?.email && (
                                    <div className="flex items-start gap-4">
                                        <Mail className="w-5 h-5 mt-1" style={{ color: brandColors.primary }} />
                                        <div>
                                            <p className="font-medium mb-1">Email Us</p>
                                            <a href={`mailto:${brand.location.email}`} className="text-muted-foreground hover:underline">
                                                {brand.location.email}
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {brand.location?.hours && (
                                    <div className="flex items-start gap-4">
                                        <Clock className="w-5 h-5 mt-1" style={{ color: brandColors.primary }} />
                                        <div>
                                            <p className="font-medium mb-1">Store Hours</p>
                                            <p className="text-muted-foreground whitespace-pre-line">
                                                {brand.location.hours}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
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
