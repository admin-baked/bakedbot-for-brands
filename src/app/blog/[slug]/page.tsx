/**
 * Platform Blog Post Detail Page
 *
 * Public-facing blog post with SEO metadata, social sharing, related posts,
 * video embed support, and freemium signup CTA.
 */

import { getPlatformPostBySlug, getRelatedPlatformPosts, getPublishedPlatformPosts, incrementViewCount } from '@/server/actions/blog';
import { BLOG_CATEGORY_META } from '@/types/blog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { BlogSignupCta } from '@/components/blog/blog-signup-cta';
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
    incrementViewCount(post.id).catch(() => {});

    // Get related posts
    const relatedPosts = await getRelatedPlatformPosts(post.id, 3);

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
                        image: post.featuredImage?.url,
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
