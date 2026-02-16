import { fetchBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock } from 'lucide-react';
import { getPublishedPosts } from '@/server/actions/blog';
import { format } from 'date-fns';

export default async function BlogPage({ params }: { params: Promise<{ brand: string }> }) {
    const { brand: brandSlug } = await params;
    const { brand } = await fetchBrandPageData(brandSlug);

    if (!brand) {
        notFound();
    }

    const brandColors = {
        primary: (brand as any).primaryColor || '#16a34a',
        secondary: (brand as any).secondaryColor || '#15803d',
    };

    // Fetch published blog posts
    const posts = await getPublishedPosts(brand.id, { limit: 12, orderBy: 'publishedAt', order: 'desc' });

    // Calculate read time
    const getReadTime = (content: string) => {
        const wordsPerMinute = 200;
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        return Math.ceil(wordCount / wordsPerMinute);
    };

    const CATEGORY_LABELS: Record<string, string> = {
        education: 'Education',
        product_spotlight: 'Product Spotlight',
        industry_news: 'Industry News',
        company_update: 'Company Update',
        strain_profile: 'Strain Profile',
        compliance: 'Compliance',
        cannabis_culture: 'Cannabis Culture',
        wellness: 'Wellness',
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
                        <div className="max-w-4xl mx-auto">
                            {posts.length === 0 ? (
                                <div className="text-center py-12">
                                    <h3 className="text-lg font-semibold mb-2">No blog posts yet</h3>
                                    <p className="text-muted-foreground">Check back soon for updates from {brand.name}.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {posts.map((post) => (
                                        <Link key={post.id} href={`/${brandSlug}/blog/${post.seo.slug}`}>
                                            <Card className="hover:shadow-lg transition-all hover:scale-[1.01] cursor-pointer">
                                                <CardContent className="p-6">
                                                    <div className="flex items-start justify-between gap-4 mb-3">
                                                        <Badge variant="secondary" className="text-xs">
                                                            {CATEGORY_LABELS[post.category] || post.category}
                                                        </Badge>
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <Clock className="w-3 h-3" />
                                                            {getReadTime(post.content)} min read
                                                        </div>
                                                    </div>

                                                    <h2 className="text-2xl font-bold mb-2 hover:text-primary transition-colors">
                                                        {post.title}
                                                    </h2>

                                                    {post.subtitle && (
                                                        <h3 className="text-lg text-muted-foreground mb-3">
                                                            {post.subtitle}
                                                        </h3>
                                                    )}

                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="w-4 h-4" />
                                                            {post.publishedAt ? format(post.publishedAt.toDate(), 'MMM d, yyyy') : 'Draft'}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <User className="w-4 h-4" />
                                                            {post.author.name}
                                                        </div>
                                                    </div>

                                                    <p className="text-muted-foreground line-clamp-3">
                                                        {post.excerpt}
                                                    </p>

                                                    {post.tags && post.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-4">
                                                            {post.tags.slice(0, 3).map((tag) => (
                                                                <Badge key={tag} variant="outline" className="text-xs">
                                                                    {tag}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            )}
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
