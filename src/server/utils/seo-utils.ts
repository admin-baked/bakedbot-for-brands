export interface SEOReviewCriteria {
    hasUniqueTitle: boolean;
    hasMetaDescription: boolean;
    hasH1Tag: boolean;
    hasStructuredData: boolean;
    hasInternalLinks: boolean;
    isCompliant: boolean; // No prohibited claims
    hasLocalKeywords: boolean;
    pageLoadFast: boolean;
}

/**
 * Calculate SEO score from 1-10 based on criteria
 */
export function calculateSEOScore(criteria: SEOReviewCriteria): number {
    let score = 0;

    // Core SEO factors (max 6 points)
    if (criteria.hasUniqueTitle) score += 1.5;
    if (criteria.hasMetaDescription) score += 1;
    if (criteria.hasH1Tag) score += 1;
    if (criteria.hasStructuredData) score += 1.5;
    if (criteria.hasInternalLinks) score += 1;

    // Ranking modifiers (max 4 points)
    if (criteria.isCompliant) score += 2;
    if (criteria.hasLocalKeywords) score += 1;
    if (criteria.pageLoadFast) score += 1;

    return Math.min(10, Math.round(score));
}
