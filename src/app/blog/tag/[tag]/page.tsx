/**
 * Platform Blog Tag Page
 */

import { getPlatformPostsByTag } from '@/server/actions/blog';
import { BLOG_CATEGORY_META } from '@/types/blog';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import type { Metadata } from 'next';

interface TagPageProps {
    params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
    const { tag } = await params;
    const displayTag = decodeURIComponent(tag).replace(/-/g, ' ');

    return {
        title: `Posts tagged "${displayTag}" — BakedBot Blog`,
        description: `Browse all BakedBot blog posts tagged with "${displayTag}".`,
    };
}

export default async function BlogTagPage({ params }: TagPageProps) {
    const { tag } = await params;
    const displayTag = decodeURIComponent(tag).replace(/-/g, ' ');
    const posts = await getPlatformPostsByTag(displayTag, { limit: 50 });

    return (
        <div className="bg-background">
            {/* Header */}
            <section className="border-b">
                <div className="container mx-auto px-4 py-8">
                    <Link
                        href="/blog"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        All Posts
                    </Link>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold">Tag:</h1>
                        <Badge variant="secondary" className="text-lg px-3 py-1">{displayTag}</Badge>
                    </div>
                </div>
            </section>

            {/* Posts */}
            <section className="container mx-auto px-4 py-12">
                {posts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-20">No posts with this tag yet.</p>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {posts.map((post) => {
                            const wordCount = post.content.split(/\s+/).filter(Boolean).length;
                            const readTime = Math.ceil(wordCount / 200);

                            return (
                                <Link key={post.id} href={`/blog/${post.seo.slug}`} className="group">
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
                                            <h2 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                                {post.title}
                                            </h2>
                                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{post.excerpt}</p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
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
        </div>
    );
}
