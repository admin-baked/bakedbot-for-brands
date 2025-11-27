/**
 * AI Content Moderation
 * Filters AI-generated content for compliance
 */

'use server';

interface ModerationResult {
    approved: boolean;
    flagged: string[];
    sanitized: string;
}

// Prohibited terms and patterns for cannabis compliance
const PROHIBITED_TERMS = [
    // Medical claims
    'cure', 'treat', 'diagnose', 'prevent', 'medical condition',
    'disease', 'illness', 'therapy', 'therapeutic',

    // Minors
    'kids', 'children', 'minors', 'youth', 'teen',

    // Excessive claims
    'guaranteed', 'miracle', 'instant', 'immediate cure',

    // Driving/operating
    'drive', 'operate machinery', 'while driving',
];

const REQUIRED_DISCLAIMERS = [
    'users often report',
    'commonly associated with',
    'known for',
    'may help',
    'potentially',
];

/**
 * Moderate AI-generated content for compliance
 */
export async function moderateContent(content: string): Promise<ModerationResult> {
    const flagged: string[] = [];
    let sanitized = content;

    // Check for prohibited terms
    const lowerContent = content.toLowerCase();
    for (const term of PROHIBITED_TERMS) {
        if (lowerContent.includes(term.toLowerCase())) {
            flagged.push(`Prohibited term: "${term}"`);
        }
    }

    // Check for medical claims without disclaimers
    const hasMedicalLanguage = /\b(help|relieve|reduce|improve|enhance)\b/i.test(content);
    const hasDisclaimer = REQUIRED_DISCLAIMERS.some(disclaimer =>
        lowerContent.includes(disclaimer.toLowerCase())
    );

    if (hasMedicalLanguage && !hasDisclaimer) {
        flagged.push('Medical language without proper disclaimer');

        // Auto-sanitize by adding disclaimer
        sanitized = sanitized.replace(
            /\b(helps?|relieves?|reduces?|improves?|enhances?)\b/gi,
            'may $1'
        );
    }

    // Remove any absolute claims
    sanitized = sanitized.replace(/\b(will|guaranteed to|always|never)\b/gi, 'may');

    return {
        approved: flagged.length === 0,
        flagged,
        sanitized,
    };
}

/**
 * Validate product description for compliance
 */
export async function validateProductDescription(description: string): Promise<boolean> {
    const result = await moderateContent(description);
    return result.approved;
}

/**
 * Sanitize AI response for chatbot
 */
export async function sanitizeChatResponse(response: string): Promise<string> {
    const result = await moderateContent(response);

    // Log if content was flagged
    if (!result.approved) {
        console.warn('[Content Moderation] Flagged content:', result.flagged);
    }

    return result.sanitized;
}
