export const dynamic = 'force-dynamic'; // blog data is live Firestore — never cache at build time

/**
 * Platform Blog Index
 *
 * Public-facing blog listing all published BakedBot platform posts.
 * SEO-optimized with category filters and pagination.
 */

import { getPublishedPlatformPosts } from '@/server/actions/blog';
import { BLOG_CATEGORY_META, type BlogCategory } from '@/types/blog';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { BlogSignupCta } from '@/components/blog/blog-signup-cta';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
    const posts = await getPublishedPlatformPosts({ limit: 5 });
    const shouldIndex = posts.length >= 3;

    return {
        title: 'Blog — Cannabis Industry Insights & Trends',
        description: 'Expert insights on cannabis technology, marketing, compliance, and industry trends from the BakedBot team.',
        robots: {
            index: shouldIndex,
            follow: true,
        },
        openGraph: {
            title: 'BakedBot Blog — Cannabis Industry Insights',
            description: 'Expert insights on cannabis technology, marketing, compliance, and industry trends.',
            type: 'website',
            url: 'https://bakedbot.ai/blog',
        },
    };
}

export default async function BlogIndexPage() {
    const posts = await getPublishedPlatformPosts({ limit: 50 });

    const categories = Object.entries(BLOG_CATEGORY_META) as [BlogCategory, typeof BLOG_CATEGORY_META[BlogCategory]][];

    return (
        <div className="bg-background">
            {/* Hero */}
            <section className="border-b bg-gradient-to-b from-green-50/50 to-background">
                <div className="container mx-auto px-4 py-16 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        The BakedBot Blog
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Expert insights on cannabis technology, marketing, compliance, and industry trends.
                    </p>
                </div>
            </section>

            {/* Category Navigation */}
            <section className="border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                        <Link href="/blog">
                            <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                                All
                            </Badge>
                        </Link>
                        {categories.map(([key, meta]) => (
                            <Link key={key} href={`/blog/category/${key}`}>
                                <Badge variant="outline" className="cursor-pointer hover:bg-secondary transition-colors">
                                    {meta.label}
                                </Badge>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Posts Grid */}
            <section className="container mx-auto px-4 py-12">
                {posts.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-muted-foreground text-lg">No posts published yet. Check back soon!</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {posts.map((post) => {
                            const wordCount = post.content.split(/\s+/).filter(Boolean).length;
                            const readTime = Math.ceil(wordCount / 200);

                            return (
                                <Link
                                    key={post.id}
                                    href={`/blog/${post.seo.slug}`}
                                    className="group"
                                >
                                    <article className="h-full border rounded-lg overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02]">
                                        {post.featuredImage && (
                                            <figure className="aspect-video overflow-hidden">
                                                <img
                                                    src={post.featuredImage.url}
                                                    alt={post.featuredImage.alt}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    width={600}
                                                    height={338}
                                                    loading="lazy"
                                                />
                                            </figure>
                                        )}
                                        <div className="p-5">
                                            <Link href={`/blog/category/${post.category}`} onClick={(e) => e.stopPropagation()}>
                                                <Badge variant="secondary" className="text-xs mb-3 hover:bg-primary hover:text-primary-foreground transition-colors">
                                                    {BLOG_CATEGORY_META[post.category]?.label || post.category}
                                                </Badge>
                                            </Link>
                                            <h2 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                                {post.title}
                                            </h2>
                                            {post.subtitle && (
                                                <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                                                    {post.subtitle}
                                                </p>
                                            )}
                                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                                {post.excerpt}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    {post.author.avatar && (
                                                        <img
                                                            src={post.author.avatar}
                                                            alt={post.author.name}
                                                            className="w-5 h-5 rounded-full"
                                                        />
                                                    )}
                                                    <User className="w-3 h-3" />
                                                    <span>{post.author.name}</span>
                                                </div>
                                                {post.publishedAt && (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>{format(post.publishedAt.toDate(), 'MMM d, yyyy')}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{readTime} min</span>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Signup CTA */}
            <BlogSignupCta variant="inline" />

            {/* Schema.org JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Blog',
                        name: 'BakedBot Blog',
                        description: 'Expert insights on cannabis technology, marketing, compliance, and industry trends.',
                        url: 'https://bakedbot.ai/blog',
                        publisher: {
                            '@type': 'Organization',
                            name: 'BakedBot AI',
                            url: 'https://bakedbot.ai',
                        },
                        blogPost: posts.slice(0, 10).map(post => ({
                            '@type': 'BlogPosting',
                            headline: post.title,
                            description: post.excerpt,
                            url: `https://bakedbot.ai/blog/${post.seo.slug}`,
                            datePublished: post.publishedAt?.toDate().toISOString(),
                            author: {
                                '@type': 'Person',
                                name: post.author.name,
                            },
                        })),
                    }),
                }}
            />
        </div>
    );
}
