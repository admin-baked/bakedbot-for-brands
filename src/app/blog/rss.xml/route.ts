/**
 * Platform Blog RSS Feed
 *
 * Generates RSS 2.0 feed for BakedBot platform blog posts.
 */

import { getPublishedPlatformPosts } from '@/server/actions/blog';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const posts = await getPublishedPlatformPosts({ limit: 50 });

        const siteUrl = 'https://bakedbot.ai';
        const feedUrl = `${siteUrl}/blog/rss.xml`;

        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>BakedBot Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Expert insights on cannabis technology, marketing, compliance, and industry trends from the BakedBot team.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    ${posts
            .map(
                (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/blog/${post.seo.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.seo.slug}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      ${post.publishedAt ? `<pubDate>${post.publishedAt.toDate().toUTCString()}</pubDate>` : ''}
      <author>${escapeXml(post.author.name)}</author>
      ${post.category ? `<category>${escapeXml(post.category.replace('_', ' '))}</category>` : ''}
      ${post.tags?.map((tag) => `<category>${escapeXml(tag)}</category>`).join('\n      ') || ''}
      ${post.featuredImage ? `<enclosure url="${escapeXml(post.featuredImage.url)}" type="${post.featuredImage.mimeType || 'image/jpeg'}" />` : ''}
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
    </item>`
            )
            .join('\n')}
  </channel>
</rss>`;

        return new NextResponse(rss, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            },
        });
    } catch (error) {
        console.error('[RSS] Error generating platform feed:', error);
        return new NextResponse('Error generating RSS feed', { status: 500 });
    }
}

function escapeXml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
