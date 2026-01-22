/**
 * Grounding Instruction Builder
 *
 * Converts Ground Truth QA sets into system prompt sections for Smokey.
 * Generates dispensary-specific grounding rules that prevent hallucination.
 */

import {
    GroundTruthQASet,
    GroundTruthQAPair,
    getAllQAPairs,
    getCriticalQAPairs,
} from '@/types/ground-truth';

export interface GroundingSection {
    dispensaryInfo: string;
    criticalCompliance: string;
    quickReference: string;
    full: string;
}

/**
 * Build the dispensary info section for system prompt
 */
function buildDispensaryInfo(groundTruth: GroundTruthQASet): string {
    const { metadata } = groundTruth;
    const storeInfo = groundTruth.categories.store_information?.qa_pairs || [];

    // Extract location from QA
    const locationQA = storeInfo.find(qa => qa.id === 'SI-001');
    const areasQA = storeInfo.find(qa => qa.id === 'SI-002');
    const differentiatorQA = storeInfo.find(qa => qa.id === 'SI-004');

    return `
=== DISPENSARY INFORMATION ===
Name: ${metadata.dispensary}
Address: ${metadata.address}
${locationQA ? `Directions: ${locationQA.ideal_answer}` : ''}
${areasQA ? `Service Areas: ${areasQA.keywords.join(', ')}` : ''}
${differentiatorQA ? `\nBrand Identity: ${differentiatorQA.ideal_answer}` : ''}
`.trim();
}

/**
 * Build the critical compliance section (MUST be accurate)
 */
function buildCriticalCompliance(groundTruth: GroundTruthQASet): string {
    const criticalQAs = getCriticalQAPairs(groundTruth);

    if (criticalQAs.length === 0) {
        return '';
    }

    const complianceRules = criticalQAs.map((qa, i) => {
        return `${i + 1}. **${qa.context}**
   Q: "${qa.question}"
   A: "${qa.ideal_answer}"
   Keywords: ${qa.keywords.join(', ')}`;
    });

    return `
=== CRITICAL COMPLIANCE (100% Accuracy Required) ===
These answers MUST be factually accurate with ZERO tolerance for errors:

${complianceRules.join('\n\n')}
`.trim();
}

/**
 * Build quick reference for common questions by category
 */
function buildQuickReference(groundTruth: GroundTruthQASet): string {
    const sections: string[] = [];

    for (const [categoryKey, category] of Object.entries(groundTruth.categories)) {
        // Skip store_information (covered in dispensary info)
        if (categoryKey === 'store_information') continue;

        const categoryName = categoryKey
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        const qaEntries = category.qa_pairs
            .filter(qa => qa.priority !== 'critical') // Critical handled separately
            .map(qa => `- "${qa.question}" → ${qa.keywords.slice(0, 3).join(', ')}`);

        if (qaEntries.length > 0) {
            sections.push(`**${categoryName}:**\n${qaEntries.join('\n')}`);
        }
    }

    return `
=== QUICK REFERENCE ===
Use these key points when answering common questions:

${sections.join('\n\n')}
`.trim();
}

/**
 * Build full grounding instructions for Smokey's system prompt
 */
export function buildGroundingInstructions(groundTruth: GroundTruthQASet): GroundingSection {
    const dispensaryInfo = buildDispensaryInfo(groundTruth);
    const criticalCompliance = buildCriticalCompliance(groundTruth);
    const quickReference = buildQuickReference(groundTruth);

    const full = `
${dispensaryInfo}

${criticalCompliance}

${quickReference}

=== GROUNDING RULES FOR ${groundTruth.metadata.dispensary.toUpperCase()} ===
1. Use the DISPENSARY INFORMATION above for location, hours, and identity questions.
2. For CRITICAL COMPLIANCE questions, use EXACT answers provided — no paraphrasing on legal/safety info.
3. For product questions, ALWAYS verify with searchMenu before recommending.
4. If asked about something not in your grounding data, say "Let me check on that" and use tools.
5. Never fabricate store policies, hours, or compliance information.
`.trim();

    return {
        dispensaryInfo,
        criticalCompliance,
        quickReference,
        full,
    };
}

/**
 * Build a condensed grounding block for context-limited scenarios
 */
export function buildCondensedGrounding(groundTruth: GroundTruthQASet): string {
    const { metadata } = groundTruth;
    const criticalQAs = getCriticalQAPairs(groundTruth);

    const criticalFacts = criticalQAs.map(qa =>
        `- ${qa.context}: ${qa.ideal_answer.substring(0, 100)}${qa.ideal_answer.length > 100 ? '...' : ''}`
    );

    return `
=== ${metadata.dispensary.toUpperCase()} GROUNDING ===
Location: ${metadata.address}
Critical Facts:
${criticalFacts.join('\n')}

RULES: Verify products with searchMenu. Use exact answers for compliance questions.
`.trim();
}

/**
 * Find the best matching QA pair for a given question
 */
export function findMatchingQA(
    groundTruth: GroundTruthQASet,
    question: string
): GroundTruthQAPair | null {
    const allQAs = getAllQAPairs(groundTruth);
    const questionLower = question.toLowerCase();

    // First try exact match
    const exactMatch = allQAs.find(
        qa => qa.question.toLowerCase() === questionLower
    );
    if (exactMatch) return exactMatch;

    // Then try keyword matching
    let bestMatch: GroundTruthQAPair | null = null;
    let bestScore = 0;

    for (const qa of allQAs) {
        let score = 0;

        // Check question similarity
        const qaWords = qa.question.toLowerCase().split(/\s+/);
        const inputWords = questionLower.split(/\s+/);

        for (const word of inputWords) {
            if (qaWords.includes(word)) score += 1;
        }

        // Check keyword matches
        for (const keyword of qa.keywords) {
            if (questionLower.includes(keyword.toLowerCase())) {
                score += 2; // Keywords are more important
            }
        }

        // Check intent match
        if (questionLower.includes(qa.intent.toLowerCase().split(' ')[0])) {
            score += 1;
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = qa;
        }
    }

    // Return match if score is reasonable (at least 2 points)
    return bestScore >= 2 ? bestMatch : null;
}

/**
 * Get grounding context for a specific question
 */
export function getGroundingContext(
    groundTruth: GroundTruthQASet,
    question: string
): { qa: GroundTruthQAPair | null; instruction: string } {
    const matchedQA = findMatchingQA(groundTruth, question);

    if (!matchedQA) {
        return {
            qa: null,
            instruction: 'No exact grounding found. Use searchMenu to verify product info, or provide general guidance.',
        };
    }

    const isCritical = matchedQA.priority === 'critical';

    return {
        qa: matchedQA,
        instruction: isCritical
            ? `CRITICAL: Use this EXACT answer: "${matchedQA.ideal_answer}"`
            : `Reference answer (can paraphrase): "${matchedQA.ideal_answer}"`,
    };
}
