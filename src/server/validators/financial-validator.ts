/**
 * Financial Validator (Mike/Money Mike Domain)
 *
 * Validates financial calculations, margin sanity, and currency formatting.
 *
 * Used by: Jack (CRO), Mike (CFO), Money Mike (Pricing)
 */

import {
    BaseValidator,
    ValidatorConfig,
    ValidationResult,
    isValidCurrency
} from './base-validator';

export class FinancialValidator extends BaseValidator {
    config: ValidatorConfig = {
        name: 'financial-validator',
        description: 'Financial math integrity and margin validation',
        tools: [
            'getRevenueMetrics',
            'forecastMRR',
            'createDeal',
            'updateDealStage',
            'crmGetStats',
            'calculateMargin',
            'generateFinancialReport'
        ],
        severity: 'error',
        blocking: true,
        passThreshold: 70
    };

    async validate(
        toolName: string,
        toolArgs: any,
        toolResult: any
    ): Promise<ValidationResult> {
        const issues: string[] = [];
        let score = 100;

        // === CHECK 1: Math Integrity ===
        const mathIssues = this.checkMathIntegrity(toolResult);
        if (mathIssues.length > 0) {
            issues.push(...mathIssues);
            score -= 30;
        }

        // === CHECK 2: Margin Sanity ===
        const marginIssues = this.checkMarginSanity(toolResult);
        if (marginIssues.length > 0) {
            issues.push(...marginIssues);
            score -= 20;
        }

        // === CHECK 3: Currency Formatting ===
        const formatIssues = this.checkCurrencyFormatting(toolResult);
        if (formatIssues.length > 0) {
            issues.push(...formatIssues);
            score -= 10;
        }

        // === CHECK 4: Negative Values ===
        const negativeIssues = this.checkNegativeValues(toolResult);
        if (negativeIssues.length > 0) {
            issues.push(...negativeIssues);
            score -= 15;
        }

        // === CHECK 5: Forecast Realism ===
        if (toolName === 'forecastMRR') {
            const forecastIssues = this.checkForecastRealism(toolResult);
            if (forecastIssues.length > 0) {
                issues.push(...forecastIssues);
                score -= 15;
            }
        }

        // Clamp score
        score = Math.max(0, score);

        if (issues.length > 0) {
            return this.fail(
                issues,
                this.generateRemediation(issues),
                score,
                { toolName }
            );
        }

        return this.pass({ toolName });
    }

    private checkMathIntegrity(result: any): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // Check revenue - cost = profit
        if (result.revenue !== undefined && result.cost !== undefined && result.profit !== undefined) {
            const expectedProfit = result.revenue - result.cost;
            const actualProfit = result.profit;

            // Allow small floating point tolerance
            if (Math.abs(expectedProfit - actualProfit) > 0.01) {
                issues.push(
                    `Math error: Revenue ($${result.revenue}) - Cost ($${result.cost}) should equal ` +
                    `$${expectedProfit.toFixed(2)}, but profit shows $${actualProfit}`
                );
            }
        }

        // Check percentage calculations
        if (result.total !== undefined && result.percentage !== undefined && result.value !== undefined) {
            const expectedValue = (result.total * result.percentage) / 100;
            if (Math.abs(expectedValue - result.value) > 0.01) {
                issues.push(
                    `Percentage calculation error: ${result.percentage}% of ${result.total} ` +
                    `should be ${expectedValue.toFixed(2)}, not ${result.value}`
                );
            }
        }

        return issues;
    }

    private checkMarginSanity(result: any): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // Check for unrealistic margins
        const marginFields = ['margin', 'grossMargin', 'profitMargin', 'netMargin'];

        for (const field of marginFields) {
            const margin = result[field];
            if (margin !== undefined) {
                const marginPercent = typeof margin === 'string'
                    ? parseFloat(margin.replace('%', ''))
                    : margin;

                if (marginPercent > 90) {
                    issues.push(
                        `Unrealistic margin: ${field} is ${marginPercent}% (>90% requires explanation)`
                    );
                }

                if (marginPercent < 0) {
                    issues.push(
                        `Negative margin: ${field} is ${marginPercent}% (potential loss)`
                    );
                }
            }
        }

        return issues;
    }

    private checkCurrencyFormatting(result: any): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // Check currency fields are properly formatted
        const currencyFields = ['mrr', 'arr', 'revenue', 'cost', 'profit', 'pipelineValue', 'dealValue'];

        for (const field of currencyFields) {
            const value = result[field];
            if (value !== undefined && typeof value === 'string') {
                // Should be formatted as $X,XXX.XX
                if (value.includes('$') && !isValidCurrency(value)) {
                    issues.push(
                        `Currency formatting: ${field} ("${value}") should be formatted as $X,XXX.XX`
                    );
                }
            }
        }

        return issues;
    }

    private checkNegativeValues(result: any): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // These fields should generally not be negative
        const positiveFields = ['mrr', 'arr', 'userCount', 'dealCount', 'customers'];

        for (const field of positiveFields) {
            const value = result[field];
            if (value !== undefined) {
                const numValue = typeof value === 'string'
                    ? parseFloat(value.replace(/[$,]/g, ''))
                    : value;

                if (numValue < 0) {
                    issues.push(
                        `Unexpected negative value: ${field} is ${value} (should typically be positive)`
                    );
                }
            }
        }

        return issues;
    }

    private checkForecastRealism(result: any): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // Check for unrealistic growth projections
        if (result.growthRate !== undefined) {
            const growthPercent = typeof result.growthRate === 'string'
                ? parseFloat(result.growthRate.replace('%', ''))
                : result.growthRate;

            if (growthPercent > 100) {
                issues.push(
                    `Unrealistic forecast: ${growthPercent}% monthly growth rate exceeds typical SaaS benchmarks (10-20%)`
                );
            }
        }

        // Check forecast has reasonable time horizon
        if (result.months !== undefined && result.months > 24) {
            issues.push(
                `Forecast horizon too long: ${result.months} months. Consider limiting to 12-24 months for accuracy.`
            );
        }

        return issues;
    }

    private generateRemediation(issues: string[]): string {
        const remediations: string[] = [
            'Please fix the following financial issues:\n'
        ];

        for (const issue of issues) {
            if (issue.includes('Math error')) {
                remediations.push('- Verify your calculations: Revenue - Cost = Profit');
            } else if (issue.includes('Unrealistic margin')) {
                remediations.push('- Justify margins >90% with supporting data or adjust to realistic levels (40-70% typical)');
            } else if (issue.includes('Currency formatting')) {
                remediations.push('- Format all currency values as $X,XXX.XX (e.g., $1,234.56)');
            } else if (issue.includes('Negative')) {
                remediations.push('- Review negative values - if intentional, add explanation');
            } else if (issue.includes('forecast')) {
                remediations.push('- Use conservative growth assumptions (10-20% monthly for SaaS)');
            }
        }

        return remediations.join('\n');
    }
}

export default FinancialValidator;
