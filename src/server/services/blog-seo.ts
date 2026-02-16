/**
 * Blog SEO Service
 *
 * Auto-generate SEO metadata, slugs, and schema markup
 */

import type { BlogPost, BlogSEO } from '@/types/blog';

// Simple brand interface for schema markup
interface Brand {
    name: string;
    logoUrl: string;
}

/**
 * Generate URL-friendly slug from title
 */
export function generateSlugFromTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        .substring(0, 100); // Limit length
}

/**
 * Generate complete SEO metadata for a blog post
 */
export function generateSEOMetadata(
    post: Partial<BlogPost>,
    existingSEO?: BlogSEO
): BlogSEO {
    const title = post.title || 'Untitled Post';
    const excerpt = post.excerpt || '';
    const keywords = post.tags || [];

    return {
        title: existingSEO?.title || optimizeTitle(title, keywords),
        metaDescription: existingSEO?.metaDescription || generateMetaDescriptionFromExcerpt(excerpt, keywords),
        slug: existingSEO?.slug || generateSlugFromTitle(title),
        keywords: existingSEO?.keywords || keywords.slice(0, 10),
        ogImage: existingSEO?.ogImage,
        twitterCard: existingSEO?.twitterCard || 'summary_large_image',
        canonicalUrl: existingSEO?.canonicalUrl,
    };
}

/**
 * Optimize title for SEO (50-60 characters, keyword-rich)
 */
export function optimizeTitle(title: string, keywords: string[]): string {
    // If title is already optimal length, return it
    if (title.length >= 50 && title.length <= 60) {
        return title;
    }

    // If too long, truncate intelligently
    if (title.length > 60) {
        // Try to cut at last word boundary before 60 chars
        const truncated = title.substring(0, 57);
        const lastSpace = truncated.lastIndexOf(' ');
        return lastSpace > 40 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
    }

    // If too short and we have keywords, try to append primary keyword
    if (title.length < 50 && keywords.length > 0) {
        const primaryKeyword = keywords[0];
        const withKeyword = `${title} | ${primaryKeyword}`;
        if (withKeyword.length <= 60) {
            return withKeyword;
        }
    }

    return title;
}

/**
 * Generate meta description from excerpt (150-160 characters)
 */
export function generateMetaDescriptionFromExcerpt(
    excerpt: string,
    keywords: string[]
): string {
    if (!excerpt) {
        return `Learn about ${keywords[0] || 'cannabis'} and discover more insights.`;
    }

    // If excerpt is already optimal length, return it
    if (excerpt.length >= 150 && excerpt.length <= 160) {
        return excerpt;
    }

    // If too long, truncate at last sentence before 160 chars
    if (excerpt.length > 160) {
        const truncated = excerpt.substring(0, 157);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastSpace = truncated.lastIndexOf(' ');

        if (lastPeriod > 120) {
            return excerpt.substring(0, lastPeriod + 1);
        } else if (lastSpace > 140) {
            return truncated.substring(0, lastSpace) + '...';
        }
        return truncated + '...';
    }

    // If too short, add CTA
    const withCTA = `${excerpt} Read more to learn.`;
    return withCTA.substring(0, 160);
}

/**
 * Generate JSON-LD schema markup for blog post
 */
export function generateSchemaMarkup(post: BlogPost, brand: Brand): object {
    const schemaOrg = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        image: post.featuredImage?.url || brand.logoUrl,
        datePublished: post.publishedAt?.toDate().toISOString(),
        dateModified: post.updatedAt?.toDate().toISOString(),
        author: {
            '@type': 'Person',
            name: post.author.name,
            ...(post.author.avatar && { image: post.author.avatar }),
        },
        publisher: {
            '@type': 'Organization',
            name: brand.name,
            logo: {
                '@type': 'ImageObject',
                url: brand.logoUrl,
            },
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': post.seo.canonicalUrl || `https://bakedbot.ai/blog/${post.seo.slug}`,
        },
        keywords: post.seo.keywords.join(', '),
        articleSection: post.category.replace('_', ' '),
        wordCount: post.content.split(/\s+/).filter(Boolean).length,
    };

    return schemaOrg;
}

/**
 * Calculate reading time in minutes
 */
export function calculateReadingTime(content: string): number {
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const wordsPerMinute = 200; // Average reading speed
    return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Extract keywords from content using simple frequency analysis
 */
export function extractKeywordsFromContent(content: string, limit = 10): string[] {
    // Remove markdown syntax
    const plainText = content
        .replace(/[#*_`\[\]()]/g, '')
        .toLowerCase();

    // Common stop words to ignore
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
        'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    ]);

    // Extract words
    const words = plainText.match(/\b[a-z]{3,}\b/g) || [];

    // Count frequency
    const frequency: Record<string, number> = {};
    for (const word of words) {
        if (!stopWords.has(word)) {
            frequency[word] = (frequency[word] || 0) + 1;
        }
    }

    // Sort by frequency and return top N
    return Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([word]) => word);
}

/**
 * Validate SEO metadata completeness
 */
export function validateSEO(seo: BlogSEO): {
    valid: boolean;
    issues: string[];
    warnings: string[];
} {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Title validation
    if (!seo.title) {
        issues.push('SEO title is required');
    } else if (seo.title.length < 30) {
        warnings.push('SEO title is too short (recommend 50-60 characters)');
    } else if (seo.title.length > 60) {
        warnings.push('SEO title is too long (recommend 50-60 characters)');
    }

    // Meta description validation
    if (!seo.metaDescription) {
        issues.push('Meta description is required');
    } else if (seo.metaDescription.length < 120) {
        warnings.push('Meta description is too short (recommend 150-160 characters)');
    } else if (seo.metaDescription.length > 160) {
        warnings.push('Meta description is too long (recommend 150-160 characters)');
    }

    // Slug validation
    if (!seo.slug) {
        issues.push('URL slug is required');
    } else if (seo.slug.length > 100) {
        warnings.push('URL slug is too long (recommend < 100 characters)');
    } else if (!/^[a-z0-9-]+$/.test(seo.slug)) {
        issues.push('URL slug can only contain lowercase letters, numbers, and hyphens');
    }

    // Keywords validation
    if (!seo.keywords || seo.keywords.length === 0) {
        warnings.push('No SEO keywords specified');
    } else if (seo.keywords.length > 10) {
        warnings.push('Too many keywords (recommend 5-10)');
    }

    return {
        valid: issues.length === 0,
        issues,
        warnings,
    };
}
