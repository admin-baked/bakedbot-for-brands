/**
 * Marketing Validator (Glenda/Craig Domain)
 *
 * Validates brand consistency, copy quality, and marketing outputs.
 *
 * Used by: Glenda (CMO), Craig (Growth), Day Day (SEO)
 */

import {
    BaseValidator,
    ValidatorConfig,
    ValidationResult,
    hasPlaceholders
} from './base-validator';

export class MarketingValidator extends BaseValidator {
    config: ValidatorConfig = {
        name: 'marketing-validator',
        description: 'Brand consistency and copy quality validation',
        tools: [
            'generateContent',
            'generateSocialPost',
            'createCampaign',
            'getCampaignPerformance',
            'auditPage',
            'findSEOOpportunities'
        ],
        severity: 'warning',
        blocking: false, // Warnings don't block
        passThreshold: 60
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

        // === CHECK 1: Placeholder Text ===
        const placeholders = hasPlaceholders(content);
        if (placeholders.length > 0) {
            issues.push(`Placeholder text found: ${placeholders.join(', ')}`);
            score -= 25;
        }

        // === CHECK 2: Brand Voice Consistency ===
        const voiceIssues = this.checkBrandVoice(content);
        if (voiceIssues.length > 0) {
            issues.push(...voiceIssues);
            score -= 15;
        }

        // === CHECK 3: Engagement Quality ===
        const engagementIssues = this.checkEngagementQuality(content, toolName);
        if (engagementIssues.length > 0) {
            issues.push(...engagementIssues);
            score -= 10;
        }

        // === CHECK 4: Social Platform Optimization ===
        if (toolName === 'generateSocialPost') {
            const socialIssues = this.checkSocialOptimization(content, toolArgs?.platform);
            if (socialIssues.length > 0) {
                issues.push(...socialIssues);
                score -= 10;
            }
        }

        // === CHECK 5: SEO Quality ===
        if (toolName === 'auditPage' || toolName === 'findSEOOpportunities') {
            const seoIssues = this.checkSEOOutput(toolResult);
            if (seoIssues.length > 0) {
                issues.push(...seoIssues);
                score -= 15;
            }
        }

        // Clamp score
        score = Math.max(0, score);

        if (issues.length > 0 && score < this.config.passThreshold!) {
            return this.fail(
                issues,
                this.generateRemediation(issues),
                score,
                { toolName }
            );
        }

        if (issues.length > 0) {
            return this.warn(issues, score, { toolName });
        }

        return this.pass({ toolName });
    }

    private extractContent(args: any, result: any): string | null {
        const fields = [
            args?.content,
            args?.message,
            args?.topic,
            result?.content,
            result?.generatedContent,
            result?.copy,
            result?.post
        ];

        for (const field of fields) {
            if (typeof field === 'string' && field.length > 0) {
                return field;
            }
        }

        if (typeof result === 'string') {
            return result;
        }

        return null;
    }

    private checkBrandVoice(content: string): string[] {
        const issues: string[] = [];

        // Check for overly aggressive sales language
        const aggressivePatterns = [
            /buy\s+now\s*!+/gi,
            /act\s+fast\s*!+/gi,
            /limited\s+time\s+only\s*!+/gi,
            /don't\s+miss\s+out\s*!+/gi,
            /last\s+chance\s*!+/gi
        ];

        let aggressiveCount = 0;
        for (const pattern of aggressivePatterns) {
            if (pattern.test(content)) {
                aggressiveCount++;
            }
        }

        if (aggressiveCount > 1) {
            issues.push('Overly aggressive sales language - consider softer CTAs');
        }

        // Check for all caps abuse
        const capsWords = content.match(/\b[A-Z]{4,}\b/g);
        if (capsWords && capsWords.length > 2) {
            issues.push('Excessive use of ALL CAPS - can appear unprofessional');
        }

        // Check for excessive exclamation marks
        const exclamations = content.match(/!+/g);
        if (exclamations && exclamations.length > 3) {
            issues.push('Too many exclamation marks - consider toning down');
        }

        return issues;
    }

    private checkEngagementQuality(content: string, toolName: string): string[] {
        const issues: string[] = [];

        // Check for CTA presence
        const ctaPatterns = [
            /click/i, /visit/i, /shop/i, /learn more/i, /sign up/i,
            /get started/i, /try/i, /discover/i, /explore/i
        ];

        const hasCTA = ctaPatterns.some(p => p.test(content));
        if (!hasCTA && toolName !== 'auditPage') {
            issues.push('Missing call-to-action (CTA) - consider adding one');
        }

        // Check content length
        if (content.length < 50) {
            issues.push('Content may be too short for meaningful engagement');
        }

        return issues;
    }

    private checkSocialOptimization(content: string, platform?: string): string[] {
        const issues: string[] = [];

        // Platform-specific checks
        switch (platform?.toLowerCase()) {
            case 'twitter':
            case 'x':
                if (content.length > 280) {
                    issues.push(`Tweet too long: ${content.length}/280 characters`);
                }
                break;

            case 'instagram':
                // Instagram captions can be long but engagement drops after 125 chars
                if (content.length > 2200) {
                    issues.push(`Instagram caption exceeds limit: ${content.length}/2200`);
                }
                // Check for hashtags
                const igHashtags = content.match(/#\w+/g);
                if (!igHashtags || igHashtags.length < 3) {
                    issues.push('Instagram posts perform better with 5-10 relevant hashtags');
                } else if (igHashtags.length > 30) {
                    issues.push('Too many hashtags (max 30 for Instagram)');
                }
                break;

            case 'linkedin':
                // LinkedIn optimal is 150-300 chars for posts
                if (content.length < 50) {
                    issues.push('LinkedIn post may be too short for engagement');
                }
                // Check for professional tone indicators
                if (/lol|lmao|omg|tbh/i.test(content)) {
                    issues.push('LinkedIn posts should maintain professional tone');
                }
                break;

            case 'tiktok':
                // TikTok captions should be short
                if (content.length > 150) {
                    issues.push('TikTok captions work best under 150 characters');
                }
                break;
        }

        // General hashtag check
        const hashtags = content.match(/#\w+/g);
        if (hashtags) {
            // Check for generic hashtags
            const genericHashtags = ['#love', '#instagood', '#photooftheday', '#beautiful', '#happy'];
            const usedGeneric = hashtags.filter(h =>
                genericHashtags.includes(h.toLowerCase())
            );
            if (usedGeneric.length > 0) {
                issues.push(`Generic hashtags may reduce reach: ${usedGeneric.join(', ')}`);
            }
        }

        return issues;
    }

    private checkSEOOutput(result: any): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // Check for missing title/description recommendations
        if (result.recommendations || result.suggestions) {
            const recs = result.recommendations || result.suggestions;
            if (!recs.title && !recs.metaTitle) {
                issues.push('SEO audit missing title tag recommendations');
            }
            if (!recs.description && !recs.metaDescription) {
                issues.push('SEO audit missing meta description recommendations');
            }
        }

        // Check score validity
        if (result.score !== undefined) {
            if (result.score < 0 || result.score > 100) {
                issues.push(`Invalid SEO score: ${result.score} (should be 0-100)`);
            }
        }

        return issues;
    }

    private generateRemediation(issues: string[]): string {
        const remediations: string[] = [
            'Please fix the following marketing issues:\n'
        ];

        for (const issue of issues) {
            if (issue.includes('Placeholder')) {
                remediations.push('- Replace all placeholder text with actual content');
            } else if (issue.includes('aggressive')) {
                remediations.push('- Use softer CTAs like "Learn more" or "Discover"');
            } else if (issue.includes('ALL CAPS')) {
                remediations.push('- Use sentence case for better readability');
            } else if (issue.includes('exclamation')) {
                remediations.push('- Limit to 1-2 exclamation marks maximum');
            } else if (issue.includes('CTA')) {
                remediations.push('- Add a clear call-to-action');
            } else if (issue.includes('hashtag')) {
                remediations.push('- Use relevant, niche hashtags specific to your audience');
            } else if (issue.includes('too long') || issue.includes('exceeds limit')) {
                remediations.push('- Shorten content to fit platform limits');
            } else if (issue.includes('professional tone')) {
                remediations.push('- Adjust language for professional audience');
            }
        }

        return remediations.join('\n');
    }
}

export default MarketingValidator;
