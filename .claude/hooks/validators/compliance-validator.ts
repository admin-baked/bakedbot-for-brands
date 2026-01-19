/**
 * Compliance Validator (Deebo Domain)
 *
 * Validates cannabis marketing content against state regulations.
 * Checks for appeals to minors, medical claims, and required disclaimers.
 *
 * Used by: Craig (marketing), Glenda (CMO), Smokey (budtender)
 */

import {
    BaseValidator,
    ValidatorConfig,
    ValidationResult,
    COMPLIANCE_RED_FLAGS,
    hasPlaceholders
} from './base-validator';

export class ComplianceValidator extends BaseValidator {
    config: ValidatorConfig = {
        name: 'compliance-validator',
        description: 'Cannabis compliance validator for marketing content',
        tools: [
            'sendSms',
            'sendEmail',
            'generateContent',
            'generateSocialPost',
            'createCampaign',
            'broadcast'
        ],
        severity: 'error',
        blocking: true,
        passThreshold: 80
    };

    async validate(
        toolName: string,
        toolArgs: any,
        toolResult: any
    ): Promise<ValidationResult> {
        const issues: string[] = [];
        let score = 100;

        // Extract content to validate
        const content = this.extractContent(toolArgs, toolResult);
        if (!content) {
            return this.pass({ reason: 'No content to validate' });
        }

        const contentLower = content.toLowerCase();

        // === CHECK 1: Appeals to Minors ===
        const minorAppeals = this.checkMinorAppeals(contentLower);
        if (minorAppeals.length > 0) {
            issues.push(`CRITICAL: Content may appeal to minors: ${minorAppeals.join(', ')}`);
            score -= 40;
        }

        // === CHECK 2: Unverified Medical Claims ===
        const medicalClaims = this.checkMedicalClaims(contentLower);
        if (medicalClaims.length > 0) {
            issues.push(`CRITICAL: Unverified medical claims detected: ${medicalClaims.join(', ')}`);
            score -= 30;
        }

        // === CHECK 3: Required Disclaimers ===
        const missingDisclaimers = this.checkDisclaimers(contentLower, toolName);
        if (missingDisclaimers.length > 0) {
            issues.push(`Missing required disclaimers: ${missingDisclaimers.join(', ')}`);
            score -= 20;
        }

        // === CHECK 4: Placeholders ===
        const placeholders = hasPlaceholders(content);
        if (placeholders.length > 0) {
            issues.push(`Placeholder text found: ${placeholders.join(', ')}`);
            score -= 10;
        }

        // === CHECK 5: SMS-specific (TCPA) ===
        if (toolName === 'sendSms') {
            const tcpaIssues = this.checkTCPACompliance(contentLower);
            if (tcpaIssues.length > 0) {
                issues.push(...tcpaIssues);
                score -= 15;
            }
        }

        // Clamp score
        score = Math.max(0, score);

        if (issues.length > 0) {
            return this.fail(
                issues,
                this.generateRemediation(issues, toolName),
                score,
                { toolName, contentLength: content.length }
            );
        }

        return this.pass({ toolName, contentLength: content.length });
    }

    private extractContent(args: any, result: any): string | null {
        // Check common content fields
        const contentFields = [
            args?.content,
            args?.message,
            args?.body,
            args?.text,
            result?.content,
            result?.message,
            result?.generatedContent,
            result?.copy
        ];

        for (const field of contentFields) {
            if (typeof field === 'string' && field.length > 0) {
                return field;
            }
        }

        // If result is a string, use it directly
        if (typeof result === 'string') {
            return result;
        }

        return null;
    }

    private checkMinorAppeals(content: string): string[] {
        const found: string[] = [];

        for (const term of COMPLIANCE_RED_FLAGS.minorAppeal) {
            if (content.includes(term.toLowerCase())) {
                found.push(term);
            }
        }

        // Check for emoji patterns that may appeal to minors
        const childishEmojis = /[\u{1F476}\u{1F47C}\u{1F3AE}\u{1F3B2}\u{1F9F8}\u{1F36D}\u{1F36C}]/gu;
        if (childishEmojis.test(content)) {
            found.push('childish emojis');
        }

        return found;
    }

    private checkMedicalClaims(content: string): string[] {
        const found: string[] = [];

        for (const claim of COMPLIANCE_RED_FLAGS.medicalClaims) {
            if (content.includes(claim.toLowerCase())) {
                found.push(claim);
            }
        }

        // Additional pattern checks
        const medicalPatterns = [
            /\bcures?\b/i,
            /\btreats?\b/i,
            /\bheals?\b/i,
            /\bprescription\b/i,
            /\bfda\s*approved\b/i,
            /\bclinically\s*proven\b/i
        ];

        for (const pattern of medicalPatterns) {
            if (pattern.test(content)) {
                const match = content.match(pattern);
                if (match && !found.includes(match[0])) {
                    found.push(match[0]);
                }
            }
        }

        return found;
    }

    private checkDisclaimers(content: string, toolName: string): string[] {
        const missing: string[] = [];

        // Always require age verification mention for marketing
        const hasAgeDisclaimer = /21\+|twenty-?one|adults?\s*only|legal\s*age/i.test(content);
        if (!hasAgeDisclaimer) {
            missing.push('Age verification (21+)');
        }

        // SMS requires opt-out
        if (toolName === 'sendSms') {
            const hasOptOut = /stop|unsubscribe|opt.?out/i.test(content);
            if (!hasOptOut) {
                missing.push('SMS opt-out (Reply STOP)');
            }
        }

        // Email requires physical address (CAN-SPAM)
        if (toolName === 'sendEmail') {
            // Simplified check - just looking for address-like pattern
            const hasAddress = /\d+\s+[\w\s]+,\s*[\w\s]+,?\s*[A-Z]{2}\s*\d{5}/i.test(content);
            if (!hasAddress) {
                missing.push('Physical address (CAN-SPAM)');
            }
        }

        return missing;
    }

    private checkTCPACompliance(content: string): string[] {
        const issues: string[] = [];

        // Check for reply STOP
        if (!/reply\s*stop/i.test(content)) {
            issues.push('TCPA: Missing "Reply STOP to unsubscribe"');
        }

        // Check message length (SMS should be under 160 chars ideally)
        if (content.length > 320) {
            issues.push(`TCPA: SMS too long (${content.length} chars). Consider splitting.`);
        }

        return issues;
    }

    private generateRemediation(issues: string[], toolName: string): string {
        const remediations: string[] = [
            'Please fix the following compliance issues:\n'
        ];

        for (const issue of issues) {
            if (issue.includes('appeal to minors')) {
                remediations.push('- Remove any cartoon references, candy terms, or content that could appeal to children');
            } else if (issue.includes('medical claims')) {
                remediations.push('- Remove unverified medical claims. Use phrases like "may help with" instead of "cures"');
            } else if (issue.includes('Age verification')) {
                remediations.push('- Add "21+" or "For adults 21 and over only" to the content');
            } else if (issue.includes('opt-out') || issue.includes('STOP')) {
                remediations.push('- Add "Reply STOP to unsubscribe" at the end of the message');
            } else if (issue.includes('CAN-SPAM')) {
                remediations.push('- Include a physical mailing address in the email');
            } else if (issue.includes('Placeholder')) {
                remediations.push('- Replace all placeholder text with actual content');
            }
        }

        return remediations.join('\n');
    }
}

export default ComplianceValidator;
