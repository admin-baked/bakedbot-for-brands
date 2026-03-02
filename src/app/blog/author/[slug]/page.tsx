/**
 * Platform Blog Author Profile Page
 *
 * Public page displaying author bio, headshot, and their published posts.
 */

import { getAuthorBySlug } from '@/server/actions/blog-authors';
import { getPublishedPlatformPosts } from '@/server/actions/blog';
import { BLOG_CATEGORY_META } from '@/types/blog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowLeft, Twitter, Linkedin, Instagram } from 'lucide-react';
import { format } from 'date-fns';
import type { Metadata } from 'next';

interface AuthorPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
    const { slug } = await params;
    const author = await getAuthorBySlug(slug);

    if (!author) {
        return { title: 'Author Not Found' };
    }

    return {
        title: `${author.name} — ${author.title}`,
        description: author.bio.substring(0, 160),
        openGraph: {
            title: `${author.name} — BakedBot Blog`,
            description: author.bio.substring(0, 160),
            type: 'profile',
            ...(author.headshot && { images: [author.headshot] }),
        },
    };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
    const { slug } = await params;
    const author = await getAuthorBySlug(slug);

    if (!author) {
        notFound();
    }

    // Get posts by this author (filter client-side since we don't have authorSlug index)
    const allPosts = await getPublishedPlatformPosts({ limit: 100 });
    const authorPosts = allPosts.filter(
        (post) => post.authorSlug === slug || post.author.name === author.name
    );

    return (
        <div className="bg-background">
            {/* Back to Blog */}
            <div className="border-b">
                <div className="container mx-auto px-4 py-4">
                    <Link
                        href="/blog"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Blog
                    </Link>
                </div>
            </div>

            {/* Author Profile */}
            <section className="border-b bg-gradient-to-b from-green-50/50 to-background">
                <div className="container mx-auto px-4 py-16">
                    <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-8">
                        {author.headshot ? (
                            <img
                                src={author.headshot}
                                alt={author.name}
                                className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg"
                            />
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground border-4 border-background shadow-lg">
                                {author.name.substring(0, 2).toUpperCase()}
                            </div>
                        )}

                        <div className="text-center md:text-left">
                            <h1 className="text-3xl md:text-4xl font-bold mb-1">
                                {author.name}
                            </h1>
                            <p className="text-lg text-muted-foreground mb-4">
                                {author.title}
                            </p>
                            <p className="text-muted-foreground max-w-lg">
                                {author.bio}
                            </p>

                            {/* Social Links */}
                            {author.socialLinks && (
                                <div className="flex gap-3 mt-4 justify-center md:justify-start">
                                    {author.socialLinks.twitter && (
                                        <a
                                            href={author.socialLinks.twitter}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Twitter className="w-5 h-5" />
                                        </a>
                                    )}
                                    {author.socialLinks.linkedin && (
                                        <a
                                            href={author.socialLinks.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Linkedin className="w-5 h-5" />
                                        </a>
                                    )}
                                    {author.socialLinks.instagram && (
                                        <a
                                            href={author.socialLinks.instagram}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Instagram className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Author's Posts */}
            <section className="container mx-auto px-4 py-12">
                <h2 className="text-2xl font-bold mb-6">
                    {authorPosts.length > 0
                        ? `Posts by ${author.name}`
                        : 'No posts yet'}
                </h2>

                {authorPosts.length > 0 && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {authorPosts.map((post) => {
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
                                            <div className="aspect-video overflow-hidden">
                                                <img
                                                    src={post.featuredImage.url}
                                                    alt={post.featuredImage.alt}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>
                                        )}
                                        <div className="p-5">
                                            <Badge variant="secondary" className="text-xs mb-3">
                                                {BLOG_CATEGORY_META[post.category]?.label || post.category}
                                            </Badge>
                                            <h3 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                                {post.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                                {post.excerpt}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
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

            {/* JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Person',
                        name: author.name,
                        jobTitle: author.title,
                        description: author.bio,
                        ...(author.headshot && { image: author.headshot }),
                        url: `https://bakedbot.ai/blog/author/${slug}`,
                        ...(author.socialLinks?.twitter && {
                            sameAs: [
                                author.socialLinks.twitter,
                                author.socialLinks.linkedin,
                                author.socialLinks.instagram,
                            ].filter(Boolean),
                        }),
                    }),
                }}
            />
        </div>
    );
}
