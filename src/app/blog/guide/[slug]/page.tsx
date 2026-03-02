/**
 * Hub/Pillar Content Guide Landing Page
 *
 * Dedicated landing page for hub articles with table of contents,
 * spoke article summaries, and reading progress.
 */

import { getPlatformPostBySlug, getPublishedPlatformPosts, getSpokePosts } from '@/server/actions/blog';
import { BLOG_CATEGORY_META } from '@/types/blog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, ChevronRight, Clock, ArrowRight, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { Metadata } from 'next';

interface GuidePageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPlatformPostBySlug(slug);

    if (!post || post.contentType !== 'hub') {
        return { title: 'Guide Not Found' };
    }

    return {
        title: `${post.seo.title} — Complete Guide`,
        description: post.seo.metaDescription,
        keywords: post.seo.keywords,
        openGraph: {
            title: `${post.seo.title} — Complete Guide`,
            description: post.seo.metaDescription,
            images: post.featuredImage ? [post.featuredImage.url] : [],
            type: 'article',
            url: `https://bakedbot.ai/blog/guide/${post.seo.slug}`,
        },
    };
}

export default async function GuideLandingPage({ params }: GuidePageProps) {
    const { slug } = await params;
    const post = await getPlatformPostBySlug(slug);

    if (!post || post.contentType !== 'hub') {
        notFound();
    }

    const spokePosts = await getSpokePosts(post.id);

    // Calculate total reading time
    const hubWordCount = post.content.split(/\s+/).filter(Boolean).length;
    const totalWordCount = spokePosts.reduce((sum, spoke) => {
        return sum + spoke.content.split(/\s+/).filter(Boolean).length;
    }, hubWordCount);
    const totalReadTime = Math.ceil(totalWordCount / 200);

    const categoryMeta = BLOG_CATEGORY_META[post.category];

    return (
        <div className="bg-background">
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="border-b">
                <div className="container mx-auto px-4 py-3">
                    <ol className="flex items-center gap-1.5 text-sm text-muted-foreground" itemScope itemType="https://schema.org/BreadcrumbList">
                        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                            <Link href="/" itemProp="item" className="hover:text-foreground transition-colors">
                                <span itemProp="name">Home</span>
                            </Link>
                            <meta itemProp="position" content="1" />
                        </li>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                            <Link href="/blog" itemProp="item" className="hover:text-foreground transition-colors">
                                <span itemProp="name">Blog</span>
                            </Link>
                            <meta itemProp="position" content="2" />
                        </li>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                            <Link href={`/blog/category/${post.category}`} itemProp="item" className="hover:text-foreground transition-colors">
                                <span itemProp="name">{categoryMeta?.label || post.category}</span>
                            </Link>
                            <meta itemProp="position" content="3" />
                        </li>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="text-foreground font-medium">
                            <span itemProp="name">Guide</span>
                            <meta itemProp="position" content="4" />
                        </li>
                    </ol>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="py-16 bg-primary/5 border-b">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto text-center">
                        <Badge variant="secondary" className="mb-4">
                            <BookOpen className="w-3 h-3 mr-1" />
                            Complete Guide
                        </Badge>

                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            {post.title}
                        </h1>

                        {post.subtitle && (
                            <p className="text-xl text-muted-foreground mb-6">
                                {post.subtitle}
                            </p>
                        )}

                        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                            {post.excerpt}
                        </p>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground mb-8">
                            <div className="flex items-center gap-1.5">
                                <User className="w-4 h-4" />
                                <span>{post.author.name}</span>
                            </div>
                            {post.publishedAt && (
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" />
                                    <span>{format(post.publishedAt.toDate(), 'MMMM d, yyyy')}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                <span>{totalReadTime} min total read</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4" />
                                <span>{spokePosts.length + 1} articles</span>
                            </div>
                        </div>

                        {/* CTA */}
                        {spokePosts.length > 0 && (
                            <Link
                                href={`/blog/${spokePosts[0].seo.slug}`}
                                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                            >
                                Start Reading
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            {/* Table of Contents */}
            <section className="py-12">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold mb-6">Table of Contents</h2>

                        {/* Overview (hub post itself) */}
                        <Link href={`/blog/${post.seo.slug}`} className="group block mb-4">
                            <Card className="hover:shadow-md transition-all hover:border-primary/30">
                                <CardContent className="p-5 flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs text-primary font-semibold uppercase tracking-wider">Overview</span>
                                        <h3 className="font-semibold mt-1 group-hover:text-primary transition-colors">
                                            {post.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>
                                        <span className="text-xs text-muted-foreground mt-2 block">
                                            {Math.ceil(hubWordCount / 200)} min read
                                        </span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-4" />
                                </CardContent>
                            </Card>
                        </Link>

                        {/* Spoke articles */}
                        <div className="space-y-4">
                            {spokePosts.map((spoke, i) => {
                                const spokeWordCount = spoke.content.split(/\s+/).filter(Boolean).length;
                                const spokeReadTime = Math.ceil(spokeWordCount / 200);

                                return (
                                    <Link key={spoke.id} href={`/blog/${spoke.seo.slug}`} className="group block">
                                        <Card className="hover:shadow-md transition-all hover:border-primary/30">
                                            <CardContent className="p-5 flex items-start gap-4">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-xs text-primary font-semibold uppercase tracking-wider">Part {i + 1}</span>
                                                    <h3 className="font-semibold mt-1 group-hover:text-primary transition-colors">
                                                        {spoke.title}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{spoke.excerpt}</p>
                                                    <span className="text-xs text-muted-foreground mt-2 block">
                                                        {spokeReadTime} min read
                                                    </span>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-4" />
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* JSON-LD with hasPart */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Article',
                        headline: post.title,
                        description: post.excerpt,
                        image: post.featuredImage?.url,
                        datePublished: post.publishedAt?.toDate().toISOString(),
                        author: {
                            '@type': 'Person',
                            name: post.author.name,
                        },
                        publisher: {
                            '@type': 'Organization',
                            name: 'BakedBot AI',
                            url: 'https://bakedbot.ai',
                        },
                        mainEntityOfPage: {
                            '@type': 'WebPage',
                            '@id': `https://bakedbot.ai/blog/guide/${post.seo.slug}`,
                        },
                        hasPart: spokePosts.map((spoke, i) => ({
                            '@type': 'Article',
                            position: i + 1,
                            headline: spoke.title,
                            url: `https://bakedbot.ai/blog/${spoke.seo.slug}`,
                        })),
                    }),
                }}
            />
        </div>
    );
}
