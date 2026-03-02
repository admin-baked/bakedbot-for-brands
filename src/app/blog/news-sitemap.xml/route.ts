/**
 * Google News XML Sitemap
 *
 * Generates a Google News-compliant sitemap for the platform blog.
 * Includes <news:news> extension with publication info, title, language,
 * and <image:image> tags with captions for Google News image indexing.
 *
 * Only includes posts published within the last 2 days (Google News requirement).
 * @see https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 */

import { getPublishedPlatformPosts } from '@/server/actions/blog';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const posts = await getPublishedPlatformPosts({ limit: 100 });

        // Google News sitemaps should only include articles published in the last 2 days
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const recentPosts = posts.filter((post) => {
            if (!post.publishedAt) return false;
            const pubDate = post.publishedAt.toDate();
            return pubDate >= twoDaysAgo;
        });

        const siteUrl = 'https://bakedbot.ai';

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${recentPosts
    .map((post) => {
        const pubDate = post.publishedAt!.toDate().toISOString();
        const postUrl = `${siteUrl}/blog/${post.seo.slug}`;

        // Build image tag if featured image exists
        let imageTag = '';
        if (post.featuredImage?.url) {
            imageTag = `
    <image:image>
      <image:loc>${escapeXml(post.featuredImage.url)}</image:loc>
      <image:caption>${escapeXml(post.featuredImage.caption || post.featuredImage.alt || post.title)}</image:caption>
      <image:title>${escapeXml(post.title)}</image:title>
    </image:image>`;
        }

        return `  <url>
    <loc>${postUrl}</loc>
    <news:news>
      <news:publication>
        <news:name>BakedBot Blog</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(post.title)}</news:title>
      ${post.seo.keywords.length > 0 ? `<news:keywords>${escapeXml(post.seo.keywords.slice(0, 10).join(', '))}</news:keywords>` : ''}
    </news:news>${imageTag}
  </url>`;
    })
    .join('\n')}
</urlset>`;

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=900, s-maxage=900',
            },
        });
    } catch (error) {
        console.error('[News Sitemap] Error generating Google News sitemap:', error);
        return new NextResponse(
            '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
            {
                status: 200,
                headers: { 'Content-Type': 'application/xml; charset=utf-8' },
            }
        );
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
