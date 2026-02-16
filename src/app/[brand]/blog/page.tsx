import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, User } from 'lucide-react';

export default async function BlogPage({ params }: { params: Promise<{ brand: string }> }) {
    const { brand: brandSlug } = await params;
    const { brand } = await fetchBrandPageData(brandSlug);

    if (!brand) {
        notFound();
    }

    const brandColors = {
        primary: brand.primaryColor || '#16a34a',
        secondary: brand.secondaryColor || '#15803d',
    };

    // Placeholder blog posts
    const posts = [
        {
            id: 1,
            title: 'Cannabis Industry Trends 2026',
            excerpt: 'Exploring the latest developments in the cannabis market.',
            date: 'Feb 15, 2026',
            author: brand.name,
        },
        {
            id: 2,
            title: 'Understanding Different Cannabis Strains',
            excerpt: 'A guide to Indica, Sativa, and Hybrid varieties.',
            date: 'Feb 10, 2026',
            author: brand.name,
        },
        {
            id: 3,
            title: 'Responsible Cannabis Consumption',
            excerpt: 'Tips for safe and enjoyable cannabis use.',
            date: 'Feb 5, 2026',
            author: brand.name,
        },
    ];

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
                            <h1 className="text-4xl md:text-5xl font-bold mb-6">Blog</h1>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                News, tips, and insights from {brand.name}.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Blog Posts */}
                <section className="py-16">
                    <div className="container mx-auto px-4">
                        <div className="max-w-4xl mx-auto space-y-6">
                            {posts.map((post) => (
                                <Card key={post.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardContent className="p-6">
                                        <h2 className="text-2xl font-bold mb-2">{post.title}</h2>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {post.date}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <User className="w-4 h-4" />
                                                {post.author}
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground">{post.excerpt}</p>
                                    </CardContent>
                                </Card>
                            ))}
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
