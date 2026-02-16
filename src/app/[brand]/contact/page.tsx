import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Twitter, Linkedin, Youtube } from 'lucide-react';
import { getBrandPageBySlug } from '@/server/actions/brand-pages';

export default async function ContactPage({ params }: { params: Promise<{ brand: string }> }) {
    const { brand: brandSlug } = await params;
    const { brand } = await fetchBrandPageData(brandSlug);

    if (!brand) {
        notFound();
    }

    // Fetch contact page content from Firestore
    const pageContent = await getBrandPageBySlug(brandSlug, 'contact');
    const content = pageContent?.contactContent;

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
                                {content?.heroTitle || 'Contact Us'}
                            </h1>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {content?.heroDescription || 'Have questions? We\'d love to hear from you.'}
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

                                {/* Address */}
                                {(content?.address || brand.location?.address) && (
                                    <div className="flex items-start gap-4">
                                        <MapPin className="w-5 h-5 mt-1" style={{ color: brandColors.primary }} />
                                        <div>
                                            <p className="font-medium mb-1">Visit Us</p>
                                            <p className="text-muted-foreground whitespace-pre-line">
                                                {content?.address || (brand.location ? `${brand.location.address}\n${brand.location.city}, ${brand.location.state} ${brand.location.zip}` : '')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Phone */}
                                {(content?.phone || brand.location?.phone) && (
                                    <div className="flex items-start gap-4">
                                        <Phone className="w-5 h-5 mt-1" style={{ color: brandColors.primary }} />
                                        <div>
                                            <p className="font-medium mb-1">Call Us</p>
                                            <a
                                                href={`tel:${content?.phone || brand.location?.phone || ''}`}
                                                className="text-muted-foreground hover:underline"
                                            >
                                                {content?.phone || brand.location?.phone}
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {/* General Email */}
                                {content?.generalEmail && (
                                    <div className="flex items-start gap-4">
                                        <Mail className="w-5 h-5 mt-1" style={{ color: brandColors.primary }} />
                                        <div>
                                            <p className="font-medium mb-1">General Inquiries</p>
                                            <a href={`mailto:${content.generalEmail}`} className="text-muted-foreground hover:underline">
                                                {content.generalEmail}
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {/* Support Email */}
                                {content?.supportEmail && (
                                    <div className="flex items-start gap-4">
                                        <Mail className="w-5 h-5 mt-1" style={{ color: brandColors.primary }} />
                                        <div>
                                            <p className="font-medium mb-1">Customer Support</p>
                                            <a href={`mailto:${content.supportEmail}`} className="text-muted-foreground hover:underline">
                                                {content.supportEmail}
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {/* Sales Email */}
                                {content?.salesEmail && (
                                    <div className="flex items-start gap-4">
                                        <Mail className="w-5 h-5 mt-1" style={{ color: brandColors.primary }} />
                                        <div>
                                            <p className="font-medium mb-1">Sales & Partnerships</p>
                                            <a href={`mailto:${content.salesEmail}`} className="text-muted-foreground hover:underline">
                                                {content.salesEmail}
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {/* Social Links */}
                                {content?.socialLinks && Object.keys(content.socialLinks).length > 0 && (
                                    <div className="pt-4 border-t">
                                        <p className="font-medium mb-3">Follow Us</p>
                                        <div className="flex gap-3">
                                            {content.socialLinks.instagram && (
                                                <a
                                                    href={content.socialLinks.instagram}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                                                >
                                                    <Instagram className="w-5 h-5" style={{ color: brandColors.primary }} />
                                                </a>
                                            )}
                                            {content.socialLinks.facebook && (
                                                <a
                                                    href={content.socialLinks.facebook}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                                                >
                                                    <Facebook className="w-5 h-5" style={{ color: brandColors.primary }} />
                                                </a>
                                            )}
                                            {content.socialLinks.twitter && (
                                                <a
                                                    href={content.socialLinks.twitter}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                                                >
                                                    <Twitter className="w-5 h-5" style={{ color: brandColors.primary }} />
                                                </a>
                                            )}
                                            {content.socialLinks.linkedin && (
                                                <a
                                                    href={content.socialLinks.linkedin}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                                                >
                                                    <Linkedin className="w-5 h-5" style={{ color: brandColors.primary }} />
                                                </a>
                                            )}
                                            {content.socialLinks.youtube && (
                                                <a
                                                    href={content.socialLinks.youtube}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                                                >
                                                    <Youtube className="w-5 h-5" style={{ color: brandColors.primary }} />
                                                </a>
                                            )}
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
