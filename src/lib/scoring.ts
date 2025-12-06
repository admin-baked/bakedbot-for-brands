import type { Product } from '@/types/domain';

export interface ProductScore {
    total: number;
    breakdown: {
        content: number;
        seo: number;
        media: number;
    };
    tips: string[];
}

export function calculateProductScore(product: Product): ProductScore {
    let contentScore = 0;
    let seoScore = 0;
    let mediaScore = 0;
    const tips: string[] = [];

    // 1. Content (40 points)
    if (product.name && product.name.length > 5) contentScore += 10;
    else tips.push("Short name");

    if (product.description && product.description.length > 100) contentScore += 20;
    else if (product.description) contentScore += 10;
    else tips.push("Add a detailed description");

    if (product.category) contentScore += 10;
    else tips.push("Missing category");

    // 2. Media (30 points)
    if (product.imageUrl) mediaScore += 30;
    else tips.push("Missing product image");

    // 3. SEO / Metadata (30 points)
    // Checking for rich metadata fields
    const p = product as any; // Cast for extended fields

    if (p.terpenes && p.terpenes.length > 0) seoScore += 10;
    else tips.push("Add Terpenes for SEO");

    if (p.effects && p.effects.length > 0) seoScore += 10;
    else tips.push("Add Effects for SEO");

    // Simulate SEO title check (using name as proxy)
    if (product.name.length < 60) seoScore += 10;

    return {
        total: contentScore + mediaScore + seoScore,
        breakdown: {
            content: contentScore,
            seo: seoScore,
            media: mediaScore
        },
        tips
    };
}

export function getScoreColor(score: number): string {
    if (score >= 90) return 'text-green-600 bg-green-100 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
}
