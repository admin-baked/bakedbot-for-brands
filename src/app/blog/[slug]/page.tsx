/**
 * Platform Blog Post Detail Page
 *
 * Public-facing blog post with SEO metadata, social sharing, related posts,
 * video embed support, and freemium signup CTA.
 */

export const dynamic = 'force-dynamic';

import { getPlatformPostBySlug, getRelatedPlatformPosts, getPublishedPlatformPosts, incrementViewCount, getSpokePosts, getHubPost, getSiblingSpokes } from '@/server/actions/blog';
import { BLOG_CATEGORY_META } from '@/types/blog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, ChevronRight, BookOpen, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { BlogSignupCta } from '@/components/blog/blog-signup-cta';
import { BookingCta } from '@/components/cta/booking-cta';
import ReactMarkdown from 'react-markdown';
import type { Metadata } from 'next';

interface BlogPostPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPlatformPostBySlug(slug);

    if (!post) {
        return { title: 'Post Not Found' };
    }

    return {
        title: post.seo.title,
        description: post.seo.metaDescription,
        keywords: post.seo.keywords,
        openGraph: {
            title: post.seo.title,
            description: post.seo.metaDescription,
            images: post.seo.ogImage ? [post.seo.ogImage] : post.featuredImage ? [post.featuredImage.url] : [],
            type: 'article',
            publishedTime: post.publishedAt?.toDate().toISOString(),
            authors: [post.author.name],
            url: `https://bakedbot.ai/blog/${post.seo.slug}`,
        },
        twitter: {
            card: post.seo.twitterCard || 'summary_large_image',
            title: post.seo.title,
            description: post.seo.metaDescription,
            images: post.seo.ogImage ? [post.seo.ogImage] : post.featuredImage ? [post.featuredImage.url] : [],
        },
        alternates: {
            canonical: `https://bakedbot.ai/blog/${post.seo.slug}`,
        },
    };
}

export default async function PlatformBlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const post = await getPlatformPostBySlug(slug);

    if (!post) {
        notFound();
    }

    // Track view (async, don't await)
    incrementViewCount(post.id, post.orgId).catch(() => {});

    // Get related posts
    const relatedPosts = await getRelatedPlatformPosts(post.id, 3);

    // Hub & Spoke data
    const isHub = post.contentType === 'hub';
    const isSpoke = post.contentType === 'spoke' && !!post.parentPostId;
    const spokePosts = isHub ? await getSpokePosts(post.id) : [];
    const hubPost = isSpoke ? await getHubPost(post.parentPostId!) : null;
    const siblingSpokes = isSpoke && post.parentPostId ? await getSiblingSpokes(post.parentPostId, post.id) : [];

    // Calculate read time
    const wordCount = post.content.split(/\s+/).filter(Boolean).length;
    const readTime = Math.ceil(wordCount / 200);

    // Fetch more posts from same category for "More in [Category]" section
    const categoryMeta = BLOG_CATEGORY_META[post.category];
    const categoryPosts = await getPublishedPlatformPosts({ limit: 4 }).then(
        posts => posts.filter(p => p.category === post.category && p.id !== post.id).slice(0, 3)
    );

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
                        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="text-foreground font-medium truncate max-w-[200px] md:max-w-none">
                            <span itemProp="name">{post.title}</span>
                            <meta itemProp="position" content="4" />
                        </li>
                    </ol>
                </div>
            </nav>

            {/* Spoke: Part of Hub Banner */}
            {isSpoke && hubPost && (
                <div className="bg-primary/5 border-b">
                    <div className="container mx-auto px-4 py-3">
                        <Link href={`/blog/${hubPost.seo.slug}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                            <ArrowLeft className="w-4 h-4" />
                            <BookOpen className="w-4 h-4" />
                            <span>Part of: <strong>{hubPost.title}</strong></span>
                        </Link>
                    </div>
                </div>
            )}

            {/* Article */}
            <article className="py-12">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto">
                        {/* Header */}
                        <header className="mb-8">
                            <Link href={`/blog/category/${post.category}`}>
                                <Badge variant="secondary" className="mb-4 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                                    {BLOG_CATEGORY_META[post.category]?.label || post.category}
                                </Badge>
                            </Link>

                            <h1 className="text-4xl md:text-5xl font-bold mb-4">
                                {post.title}
                            </h1>

                            {post.subtitle && (
                                <p className="text-xl text-muted-foreground mb-6">
                                    {post.subtitle}
                                </p>
                            )}

                            {/* Meta info */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-6 border-b">
                                <div className="flex items-center gap-2">
                                    {post.author.avatar && (
                                        <img
                                            src={post.author.avatar}
                                            alt={post.author.name}
                                            className="w-10 h-10 rounded-full"
                                        />
                                    )}
                                    <div>
                                        <div className="flex items-center gap-1">
                                            <User className="w-4 h-4" />
                                            {post.authorSlug ? (
                                                <Link href={`/blog/author/${post.authorSlug}`} className="font-medium hover:text-primary transition-colors">
                                                    {post.author.name}
                                                </Link>
                                            ) : (
                                                <span className="font-medium">{post.author.name}</span>
                                            )}
                                        </div>
                                        {post.author.role && (
                                            <span className="text-xs">{post.author.role}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {post.publishedAt ? format(post.publishedAt.toDate(), 'MMMM d, yyyy') : 'Draft'}
                                </div>

                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {readTime} min read
                                </div>
                            </div>
                        </header>

                        {/* Hub: In This Guide TOC */}
                        {isHub && spokePosts.length > 0 && (
                            <nav className="mb-8 p-6 bg-muted/50 rounded-lg border">
                                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                    In This Guide
                                </h2>
                                <ol className="space-y-2">
                                    {spokePosts.map((spoke, i) => (
                                        <li key={spoke.id} className="flex items-start gap-2">
                                            <span className="text-primary font-semibold text-sm mt-0.5">{i + 1}.</span>
                                            <Link
                                                href={`/blog/${spoke.seo.slug}`}
                                                className="text-sm hover:text-primary transition-colors hover:underline"
                                            >
                                                {spoke.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ol>
                            </nav>
                        )}

                        {/* Featured Image */}
                        {post.featuredImage && (
                            <figure className="mb-8 rounded-lg overflow-hidden">
                                <img
                                    src={post.featuredImage.url}
                                    alt={post.featuredImage.alt}
                                    className="w-full h-auto"
                                    width={post.featuredImage.width || 1200}
                                    height={post.featuredImage.height || 630}
                                    loading="eager"
                                />
                                {post.featuredImage.caption && (
                                    <figcaption className="text-sm text-muted-foreground text-center mt-2 px-2">
                                        {post.featuredImage.caption}
                                    </figcaption>
                                )}
                            </figure>
                        )}

                        {/* Video Embed */}
                        {post.videoEmbed && (
                            <div className="mb-8 rounded-lg overflow-hidden aspect-video">
                                {post.videoEmbed.platform === 'youtube' && (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${post.videoEmbed.videoId}`}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title="Video"
                                    />
                                )}
                                {post.videoEmbed.platform === 'vimeo' && (
                                    <iframe
                                        src={`https://player.vimeo.com/video/${post.videoEmbed.videoId}`}
                                        className="w-full h-full"
                                        allow="autoplay; fullscreen; picture-in-picture"
                                        allowFullScreen
                                        title="Video"
                                    />
                                )}
                            </div>
                        )}

                        {/* Content */}
                        <div className="prose prose-lg max-w-none mb-8">
                            <ReactMarkdown>{post.content}</ReactMarkdown>
                        </div>

                        {/* Mid-article CTA */}
                        <BlogSignupCta variant="inline" slug={post.seo.slug} />

                        {/* Booking CTA — inbound conversion after article content */}
                        <BookingCta
                            variant="inline"
                            headline="Want to See This Working for Your Dispensary?"
                            subtext="Book a free 30-min strategy call and we'll walk through your specific store, market, and goals."
                        />

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 py-6 border-t mt-8">
                                {post.tags.map((tag) => (
                                    <Link key={tag} href={`/blog/tag/${tag.toLowerCase().replace(/\s+/g, '-')}`}>
                                        <Badge variant="outline" className="hover:bg-secondary transition-colors cursor-pointer">
                                            {tag}
                                        </Badge>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </article>

            {/* Hub: Spoke Articles Grid */}
            {isHub && spokePosts.length > 0 && (
                <section className="py-12 bg-primary/5">
                    <div className="container mx-auto px-4">
                        <div className="max-w-5xl mx-auto">
                            <h2 className="text-2xl font-bold mb-2">Articles in This Guide</h2>
                            <p className="text-muted-foreground mb-6">Deep dives into each topic covered in this guide.</p>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {spokePosts.map((spoke, i) => {
                                    const spokeWordCount = spoke.content.split(/\s+/).filter(Boolean).length;
                                    const spokeReadTime = Math.ceil(spokeWordCount / 200);
                                    return (
                                        <Link key={spoke.id} href={`/blog/${spoke.seo.slug}`} className="group">
                                            <Card className="h-full hover:shadow-lg transition-all hover:scale-[1.02]">
                                                <CardContent className="p-5">
                                                    <span className="text-xs text-primary font-semibold mb-2 block">Part {i + 1}</span>
                                                    <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                                        {spoke.title}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{spoke.excerpt}</p>
                                                    <span className="text-xs text-muted-foreground">{spokeReadTime} min read</span>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Spoke: Sibling Articles */}
            {isSpoke && siblingSpokes.length > 0 && (
                <section className="py-12 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <div className="max-w-5xl mx-auto">
                            <h2 className="text-2xl font-bold mb-6">More in This Guide</h2>
                            <div className="grid md:grid-cols-3 gap-6">
                                {siblingSpokes.map((sibling) => (
                                    <Link key={sibling.id} href={`/blog/${sibling.seo.slug}`}>
                                        <Card className="h-full hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer">
                                            <CardContent className="p-4">
                                                <h3 className="font-semibold mb-2 line-clamp-2">
                                                    {sibling.title}
                                                </h3>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {sibling.excerpt}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
                <section className="py-12 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <div className="max-w-5xl mx-auto">
                            <h2 className="text-2xl font-bold mb-6">Related Posts</h2>
                            <div className="grid md:grid-cols-3 gap-6">
                                {relatedPosts.map((relatedPost) => (
                                    <Link key={relatedPost.id} href={`/blog/${relatedPost.seo.slug}`}>
                                        <Card className="h-full hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer">
                                            <CardContent className="p-4">
                                                {relatedPost.featuredImage && (
                                                    <figure className="mb-3">
                                                        <img
                                                            src={relatedPost.featuredImage.url}
                                                            alt={relatedPost.featuredImage.alt}
                                                            className="w-full h-40 object-cover rounded"
                                                            width={400}
                                                            height={160}
                                                            loading="lazy"
                                                        />
                                                        {relatedPost.featuredImage.caption && (
                                                            <figcaption className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                                                {relatedPost.featuredImage.caption}
                                                            </figcaption>
                                                        )}
                                                    </figure>
                                                )}
                                                <Link href={`/blog/category/${relatedPost.category}`}>
                                                    <Badge variant="secondary" className="text-xs mb-2 hover:bg-primary hover:text-primary-foreground transition-colors">
                                                        {BLOG_CATEGORY_META[relatedPost.category]?.label || relatedPost.category}
                                                    </Badge>
                                                </Link>
                                                <h3 className="font-semibold mb-2 line-clamp-2">
                                                    {relatedPost.title}
                                                </h3>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {relatedPost.excerpt}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* More in [Category] */}
            {categoryPosts.length > 0 && (
                <section className="py-12 border-t">
                    <div className="container mx-auto px-4">
                        <div className="max-w-5xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">
                                    More in {categoryMeta?.label || post.category}
                                </h2>
                                <Link
                                    href={`/blog/category/${post.category}`}
                                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                                >
                                    View all <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                            <div className="grid md:grid-cols-3 gap-6">
                                {categoryPosts.map((catPost) => (
                                    <Link key={catPost.id} href={`/blog/${catPost.seo.slug}`}>
                                        <Card className="h-full hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer">
                                            <CardContent className="p-4">
                                                {catPost.featuredImage && (
                                                    <figure className="mb-3">
                                                        <img
                                                            src={catPost.featuredImage.url}
                                                            alt={catPost.featuredImage.alt}
                                                            className="w-full h-40 object-cover rounded"
                                                            width={400}
                                                            height={160}
                                                            loading="lazy"
                                                        />
                                                    </figure>
                                                )}
                                                <h3 className="font-semibold mb-2 line-clamp-2">
                                                    {catPost.title}
                                                </h3>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {catPost.excerpt}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Sticky CTA */}
            <BlogSignupCta variant="sticky" slug={post.seo.slug} />

            {/* Schema.org JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'BlogPosting',
                        headline: post.title,
                        description: post.excerpt,
                        url: `https://bakedbot.ai/blog/${post.seo.slug}`,
                        image: post.featuredImage?.url ?? `https://bakedbot.ai/og-default.png`,
                        datePublished: post.publishedAt?.toDate().toISOString(),
                        dateModified: post.updatedAt?.toDate().toISOString(),
                        author: {
                            '@type': 'Person',
                            name: post.author.name,
                            ...(post.author.avatar && { image: post.author.avatar }),
                        },
                        publisher: {
                            '@type': 'Organization',
                            name: 'BakedBot AI',
                            url: 'https://bakedbot.ai',
                            logo: {
                                '@type': 'ImageObject',
                                url: 'https://bakedbot.ai/logo.png',
                            },
                        },
                        mainEntityOfPage: {
                            '@type': 'WebPage',
                            '@id': `https://bakedbot.ai/blog/${post.seo.slug}`,
                        },
                        keywords: post.seo.keywords.join(', '),
                        articleSection: post.category.replace('_', ' '),
                        wordCount,
                    }),
                }}
            />
        </div>
    );
}
