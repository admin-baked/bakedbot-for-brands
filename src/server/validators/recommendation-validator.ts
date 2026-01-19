/**
 * Recommendation Validator (Smokey Domain)
 *
 * Validates product recommendations for accuracy, inventory, and compliance.
 *
 * Used by: Smokey (Budtender)
 */

import {
    BaseValidator,
    ValidatorConfig,
    ValidationResult
} from './base-validator';

export class RecommendationValidator extends BaseValidator {
    config: ValidatorConfig = {
        name: 'recommendation-validator',
        description: 'Product recommendation accuracy and inventory validation',
        tools: [
            'searchProducts',
            'searchMenus',
            'getRecommendations',
            'matchProduct',
            'findSimilar',
            'runExperiment',
            'validatePolicy'
        ],
        severity: 'warning',
        blocking: false,
        passThreshold: 70
    };

    // Minimum confidence threshold for recommendations
    private MIN_CONFIDENCE = 0.6;

    async validate(
        toolName: string,
        toolArgs: any,
        toolResult: any
    ): Promise<ValidationResult> {
        const issues: string[] = [];
        let score = 100;

        // === CHECK 1: Confidence Thresholds ===
        const confidenceIssues = this.checkConfidence(toolResult);
        if (confidenceIssues.length > 0) {
            issues.push(...confidenceIssues);
            score -= 20;
        }

        // === CHECK 2: Inventory Sync ===
        const inventoryIssues = this.checkInventory(toolResult);
        if (inventoryIssues.length > 0) {
            issues.push(...inventoryIssues);
            score -= 25;
        }

        // === CHECK 3: Recommendation Format ===
        const formatIssues = this.checkRecommendationFormat(toolResult);
        if (formatIssues.length > 0) {
            issues.push(...formatIssues);
            score -= 10;
        }

        // === CHECK 4: Effect/Terpene Match ===
        const matchIssues = this.checkEffectMatch(toolArgs, toolResult);
        if (matchIssues.length > 0) {
            issues.push(...matchIssues);
            score -= 15;
        }

        // === CHECK 5: Experiment Validity ===
        if (toolName === 'runExperiment') {
            const experimentIssues = this.checkExperimentValidity(toolResult);
            if (experimentIssues.length > 0) {
                issues.push(...experimentIssues);
                score -= 20;
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

    private checkConfidence(result: any): string[] {
        const issues: string[] = [];

        if (!result) {
            return issues;
        }

        // Check individual recommendation confidence
        const recommendations = result.recommendations || result.products || result.matches || [];
        if (Array.isArray(recommendations)) {
            for (const rec of recommendations) {
                const confidence = rec.confidence || rec.matchScore || rec.score;
                if (confidence !== undefined) {
                    const confValue = typeof confidence === 'string'
                        ? parseFloat(confidence.replace('%', '')) / 100
                        : (confidence > 1 ? confidence / 100 : confidence);

                    if (confValue < this.MIN_CONFIDENCE) {
                        issues.push(
                            `Low confidence recommendation: "${rec.name || rec.product}" ` +
                            `(${(confValue * 100).toFixed(0)}% < ${this.MIN_CONFIDENCE * 100}% threshold)`
                        );
                    }
                }
            }
        }

        // Check overall confidence
        if (result.overallConfidence !== undefined) {
            const overallConf = result.overallConfidence > 1
                ? result.overallConfidence / 100
                : result.overallConfidence;

            if (overallConf < this.MIN_CONFIDENCE) {
                issues.push(
                    `Overall recommendation confidence too low: ${(overallConf * 100).toFixed(0)}%`
                );
            }
        }

        return issues;
    }

    private checkInventory(result: any): string[] {
        const issues: string[] = [];

        if (!result) {
            return issues;
        }

        const recommendations = result.recommendations || result.products || result.matches || [];
        if (Array.isArray(recommendations)) {
            for (const rec of recommendations) {
                // Check stock status
                const inStock = rec.inStock ?? rec.available ?? rec.stockStatus;
                if (inStock === false || inStock === 'out_of_stock' || inStock === 0) {
                    issues.push(
                        `Out of stock recommendation: "${rec.name || rec.product}" ` +
                        `- should not recommend unavailable products`
                    );
                }

                // Check for low stock warnings
                const quantity = rec.quantity || rec.stock || rec.inventory;
                if (quantity !== undefined && quantity < 5 && quantity > 0) {
                    issues.push(
                        `Low stock warning: "${rec.name || rec.product}" has only ${quantity} units`
                    );
                }
            }
        }

        return issues;
    }

    private checkRecommendationFormat(result: any): string[] {
        const issues: string[] = [];

        if (!result) {
            return issues;
        }

        const recommendations = result.recommendations || result.products || result.matches || [];
        if (Array.isArray(recommendations)) {
            for (const rec of recommendations) {
                // Check required fields
                if (!rec.name && !rec.product && !rec.productName) {
                    issues.push('Recommendation missing product name');
                }

                // Check for type/category
                if (!rec.type && !rec.category && !rec.productType) {
                    issues.push(`Recommendation "${rec.name || 'unknown'}" missing product type`);
                }

                // Check for price (important for recommendations)
                if (!rec.price && !rec.pricing) {
                    issues.push(`Recommendation "${rec.name || 'unknown'}" missing price info`);
                }
            }
        }

        // Check that we have recommendations at all
        if (recommendations.length === 0) {
            issues.push('No recommendations returned - consider broadening search criteria');
        }

        return issues;
    }

    private checkEffectMatch(args: any, result: any): string[] {
        const issues: string[] = [];

        if (!args || !result) {
            return issues;
        }

        // Get requested effects/preferences
        const requestedEffects = args.effects || args.preferredEffects || args.vibe || [];
        const requestedTerpenes = args.terpenes || args.preferredTerpenes || [];

        if (requestedEffects.length === 0 && requestedTerpenes.length === 0) {
            return issues; // No preferences to match against
        }

        const recommendations = result.recommendations || result.products || result.matches || [];
        if (Array.isArray(recommendations)) {
            for (const rec of recommendations) {
                const productEffects = rec.effects || rec.reportedEffects || [];
                const productTerpenes = rec.terpenes || rec.terpeneProfile || [];

                // Check effect match
                if (requestedEffects.length > 0) {
                    const hasMatchingEffect = requestedEffects.some((e: string) =>
                        productEffects.some((pe: any) =>
                            (typeof pe === 'string' ? pe : pe.name || pe.effect)
                                .toLowerCase()
                                .includes(e.toLowerCase())
                        )
                    );

                    if (!hasMatchingEffect && productEffects.length > 0) {
                        issues.push(
                            `"${rec.name || 'Product'}" effects may not match request: ` +
                            `wanted [${requestedEffects.join(', ')}], ` +
                            `product has [${productEffects.map((e: any) => typeof e === 'string' ? e : e.name).join(', ')}]`
                        );
                    }
                }
            }
        }

        return issues;
    }

    private checkExperimentValidity(result: any): string[] {
        const issues: string[] = [];

        if (!result) {
            return issues;
        }

        // Check for control/variant setup
        if (!result.control || !result.variant) {
            issues.push('Experiment missing control or variant group');
        }

        // Check sample size
        const sampleSize = result.sampleSize || (result.control?.n || 0) + (result.variant?.n || 0);
        if (sampleSize < 100) {
            issues.push(`Small experiment sample size: ${sampleSize} (recommend at least 100)`);
        }

        // Check statistical significance
        if (result.significant === false || (result.pValue && result.pValue > 0.05)) {
            issues.push(
                `Experiment not statistically significant - ` +
                `results may be due to chance (p=${result.pValue || 'unknown'})`
            );
        }

        // Check for winner declaration without significance
        if (result.winner && (result.significant === false || !result.pValue)) {
            issues.push('Winner declared without statistical significance - use caution');
        }

        return issues;
    }

    private generateRemediation(issues: string[]): string {
        const remediations: string[] = [
            'Please fix the following recommendation issues:\n'
        ];

        for (const issue of issues) {
            if (issue.includes('confidence')) {
                remediations.push('- Consider excluding low-confidence matches or expand search criteria');
            } else if (issue.includes('Out of stock')) {
                remediations.push('- Filter recommendations to only include in-stock products');
            } else if (issue.includes('Low stock')) {
                remediations.push('- Note low stock status in recommendation or suggest alternatives');
            } else if (issue.includes('missing')) {
                remediations.push('- Ensure all recommendations include required fields (name, type, price)');
            } else if (issue.includes('effects may not match')) {
                remediations.push('- Prioritize products with matching effects or explain why alternatives were chosen');
            } else if (issue.includes('statistical')) {
                remediations.push('- Wait for more data before declaring experiment winner');
            } else if (issue.includes('No recommendations')) {
                remediations.push('- Try broader search criteria or check if inventory is available');
            }
        }

        return remediations.join('\n');
    }
}

export default RecommendationValidator;
