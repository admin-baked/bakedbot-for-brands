/**
 * Blog Compliance Checker
 *
 * Validates blog post content against cannabis compliance rules using Deebo agent.
 * Checks for medical claims, youth targeting, state-specific restrictions, and prohibited content.
 */

'use server';

import { BlogPost, BlogCompliance } from '@/types/blog';
import { BrandCompliance } from '@/types/brand-guide';
import { createServerClient } from '@/firebase/server-client';
import { Timestamp } from '@google-cloud/firestore';
import { logger } from '@/lib/logger';
import { callClaude } from '@/ai/claude';

// Medical claim keywords (prohibited in cannabis marketing)
const MEDICAL_CLAIM_KEYWORDS = [
    'cure', 'cures', 'curing', 'cured',
    'treat', 'treats', 'treating', 'treated', 'treatment',
    'heal', 'heals', 'healing', 'healed',
    'diagnose', 'diagnosis', 'diagnostic',
    'therapy', 'therapeutic',
    'medicine', 'medication', 'medicinal',
    'prevent', 'prevents', 'prevention',
    'disease',
    'remedy', 'remedies',
];

// Youth-targeting keywords (prohibited)
const YOUTH_TARGETING_KEYWORDS = [
    'kid', 'kids', 'children', 'child',
    'teen', 'teens', 'teenager',
    'cartoon', 'comic',
    'candy', 'cereal',
    'toy', 'game',
];

// Image analysis patterns (would require actual image processing)
const PROHIBITED_IMAGE_PATTERNS = [
    'cartoon character',
    'youth appeal',
    'explicit content',
    'violence',
    'celebrity endorsement (non-approved)',
];

/**
 * Check blog post compliance using Deebo agent
 */
export async function checkBlogCompliance(
    post: BlogPost,
    brandCompliance?: BrandCompliance
): Promise<BlogCompliance> {
    try {
        logger.info('[checkBlogCompliance] Starting compliance check', {
            postId: post.id,
            orgId: post.orgId,
        });

        const issues: BlogCompliance['issues'] = [];
        const content = `${post.title}\n\n${post.subtitle || ''}\n\n${post.excerpt}\n\n${post.content}`;

        // 1. Medical Claims Check
        const medicalClaims = checkMedicalClaims(content);
        issues.push(...medicalClaims);

        // 2. Youth Targeting Check
        const youthTargeting = checkYouthTargeting(content);
        issues.push(...youthTargeting);

        // 3. State-Specific Rules (if brand compliance data available)
        if (brandCompliance?.stateSpecificRules) {
            const stateIssues = checkStateRules(content, brandCompliance.stateSpecificRules);
            issues.push(...stateIssues);
        }

        // 4. AI-Powered Deep Compliance Check (Deebo)
        const aiIssues = await runDeepoCompliance(content, post.category, brandCompliance);
        issues.push(...aiIssues);

        // Determine overall status
        const hasErrors = issues.some(issue => issue.severity === 'error');
        const hasWarnings = issues.some(issue => issue.severity === 'warning');

        const status: BlogCompliance['status'] = hasErrors
            ? 'failed'
            : hasWarnings
            ? 'warning'
            : 'passed';

        // Determine approved states (all states if passed, specific states if warnings, none if failed)
        const approvedStates: string[] = status === 'passed'
            ? ['ALL']
            : status === 'warning'
            ? getApprovedStatesFromIssues(issues, brandCompliance)
            : [];

        const compliance: BlogCompliance = {
            status,
            checkedAt: Timestamp.now(),
            checkedBy: 'agent:deebo',
            issues,
            approvedStates,
        };

        logger.info('[checkBlogCompliance] Compliance check complete', {
            postId: post.id,
            status,
            issueCount: issues.length,
        });

        return compliance;
    } catch (error) {
        logger.error('[checkBlogCompliance] Error during compliance check', {
            error,
            postId: post.id,
        });

        // Return failed status with error
        return {
            status: 'failed',
            checkedAt: Timestamp.now(),
            checkedBy: 'agent:deebo',
            issues: [
                {
                    type: 'state_restriction',
                    severity: 'error',
                    message: 'Compliance check failed due to system error. Please try again.',
                    suggestion: 'Contact support if this error persists.',
                },
            ],
            approvedStates: [],
        };
    }
}

/**
 * Check for medical claims in content
 */
function checkMedicalClaims(content: string): BlogCompliance['issues'] {
    const issues: BlogCompliance['issues'] = [];
    const lowerContent = content.toLowerCase();

    for (const keyword of MEDICAL_CLAIM_KEYWORDS) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = content.match(regex);

        if (matches) {
            // Find approximate line number
            const lines = content.split('\n');
            let lineNumber = 0;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(keyword)) {
                    lineNumber = i + 1;
                    break;
                }
            }

            issues.push({
                type: 'medical_claim',
                severity: 'error',
                message: `Prohibited medical claim detected: "${keyword}"`,
                suggestion: `Remove or rephrase medical claims. Focus on experience and quality instead. E.g., "may help you relax" instead of "treats anxiety"`,
                line: lineNumber,
            });
        }
    }

    return issues;
}

/**
 * Check for youth-targeting content
 */
function checkYouthTargeting(content: string): BlogCompliance['issues'] {
    const issues: BlogCompliance['issues'] = [];
    const lowerContent = content.toLowerCase();

    for (const keyword of YOUTH_TARGETING_KEYWORDS) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = content.match(regex);

        if (matches) {
            const lines = content.split('\n');
            let lineNumber = 0;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(keyword)) {
                    lineNumber = i + 1;
                    break;
                }
            }

            issues.push({
                type: 'youth_targeting',
                severity: 'error',
                message: `Youth-targeting language detected: "${keyword}"`,
                suggestion: `Remove any language that could appeal to minors. All cannabis content must be clearly 21+.`,
                line: lineNumber,
            });
        }
    }

    // Check for lack of age gating language
    const hasAgeLanguage = /21\+|twenty-one|adult|mature|of age/gi.test(content);
    if (!hasAgeLanguage && content.length > 500) {
        issues.push({
            type: 'youth_targeting',
            severity: 'warning',
            message: 'No 21+ or adult audience language detected',
            suggestion: 'Consider adding language that implies a 21+ audience, such as "for adult consumers" or "21+ only".',
        });
    }

    return issues;
}

/**
 * Check state-specific rules
 */
function checkStateRules(
    content: string,
    stateRules: BrandCompliance['stateSpecificRules']
): BlogCompliance['issues'] {
    const issues: BlogCompliance['issues'] = [];

    for (const [state, rules] of Object.entries(stateRules)) {
        for (const [key, value] of Object.entries(rules)) {
            // Example rule checks (extend based on actual state rules)
            if (key === 'prohibitedTerms' && Array.isArray(value)) {
                const lowerContent = content.toLowerCase();
                for (const term of value) {
                    if (lowerContent.includes(term.toLowerCase())) {
                        issues.push({
                            type: 'state_restriction',
                            severity: 'warning',
                            message: `Term "${term}" may violate ${state} regulations`,
                            suggestion: `Review ${state}-specific compliance requirements for this term.`,
                        });
                    }
                }
            }
        }
    }

    return issues;
}

/**
 * AI-powered deep compliance analysis using Deebo
 */
async function runDeepoCompliance(
    content: string,
    category: string,
    brandCompliance?: BrandCompliance
): Promise<BlogCompliance['issues']> {
    try {
        const prompt = `You are Deebo, a cannabis compliance expert. Review this blog post content for compliance issues.

Category: ${category}

Content:
${content}

Check for:
1. Medical claims (cure, treat, heal, diagnose) - STRICTLY PROHIBITED
2. Youth targeting (kid-friendly language, cartoon references)
3. False or misleading claims
4. Unsubstantiated health benefits
5. Inappropriate tone or language
6. Missing disclaimers for regulated states

${brandCompliance ? `State-specific rules: ${JSON.stringify(brandCompliance.stateSpecificRules, null, 2)}` : ''}

Respond in JSON format:
{
  "issues": [
    {
      "type": "medical_claim" | "youth_targeting" | "state_restriction" | "prohibited_imagery",
      "severity": "error" | "warning",
      "message": "Brief description of the issue",
      "suggestion": "How to fix it"
    }
  ]
}

If no issues found, return { "issues": [] }`;

        const response = await callClaude({
            userMessage: prompt,
            temperature: 0.1, // Low temperature for consistent compliance checking
            maxTokens: 2000,
        });

        // Parse AI response
        const parsed = JSON.parse(response);
        return parsed.issues || [];
    } catch (error) {
        logger.error('[runDeepoCompliance] Error in AI compliance check', { error });
        // Return empty array if AI check fails (don't block on AI errors)
        return [];
    }
}

/**
 * Determine which states approve this content based on issues
 */
function getApprovedStatesFromIssues(
    issues: BlogCompliance['issues'],
    brandCompliance?: BrandCompliance
): string[] {
    if (!brandCompliance?.operatingStates) {
        return [];
    }

    const approvedStates: string[] = [];
    const stateSpecificIssues = issues.filter(issue => issue.type === 'state_restriction');

    // If no state-specific issues, all operating states approve
    if (stateSpecificIssues.length === 0) {
        return brandCompliance.operatingStates;
    }

    // Otherwise, filter out states mentioned in issues
    for (const state of brandCompliance.operatingStates) {
        const hasIssueInState = stateSpecificIssues.some(issue =>
            issue.message.toLowerCase().includes(state.toLowerCase())
        );
        if (!hasIssueInState) {
            approvedStates.push(state);
        }
    }

    return approvedStates;
}

/**
 * Quick compliance validation (lightweight, no AI)
 */
export async function quickComplianceCheck(content: string): Promise<{
    hasMedicalClaims: boolean;
    hasYouthTargeting: boolean;
    issueCount: number;
}> {
    const medicalClaims = checkMedicalClaims(content);
    const youthTargeting = checkYouthTargeting(content);

    return {
        hasMedicalClaims: medicalClaims.length > 0,
        hasYouthTargeting: youthTargeting.length > 0,
        issueCount: medicalClaims.length + youthTargeting.length,
    };
}
