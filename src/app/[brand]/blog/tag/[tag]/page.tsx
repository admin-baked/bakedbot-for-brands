/**
 * Blog Tag Page
 *
 * Filtered blog posts by tag
 */

import { fetchBrandPageData } from '@/lib/brand-data';
import { getPostsByTag } from '@/server/actions/blog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, ArrowLeft, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface TagPageProps {
    params: Promise<{
        brand: string;
        tag: string;
    }>;
}

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

export default async function TagPage({ params }: TagPageProps) {
    const { brand: brandSlug, tag } = await params;
    const { brand } = await fetchBrandPageData(brandSlug);

    if (!brand) {
        notFound();
    }

    // Convert URL slug back to tag (replace hyphens with spaces, capitalize)
    const tagName = tag.replace(/-/g, ' ');
    const posts = await getPostsByTag(brand.id, tagName);

    const brandColors = {
        primary: (brand as any).primaryColor || '#16a34a',
        secondary: (brand as any).secondaryColor || '#15803d',
    };

    const getReadTime = (content: string) => {
        const wordsPerMinute = 200;
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        return Math.ceil(wordCount / wordsPerMinute);
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
                {/* Back to Blog */}
                <div className="border-b">
                    <div className="container mx-auto px-4 py-4">
                        <Link
                            href={`/${brandSlug}/blog`}
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Blog
                        </Link>
                    </div>
                </div>

                {/* Hero Section */}
                <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
                    <div className="container mx-auto px-4">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex items-center gap-2 mb-4">
                                <Tag className="w-6 h-6" />
                                <Badge variant="secondary">
                                    {tagName}
                                </Badge>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold mb-6">
                                Posts Tagged "{tagName}"
                            </h1>
                            <p className="text-lg text-muted-foreground">
                                {posts.length} {posts.length === 1 ? 'article' : 'articles'} tagged with {tagName}.
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
                                    <h3 className="text-lg font-semibold mb-2">No posts with this tag yet</h3>
                                    <p className="text-muted-foreground">Check back soon for updates.</p>
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
