/**
 * Data Validator (Pops/Ezal Domain)
 *
 * Validates data freshness, accuracy, and statistical validity.
 *
 * Used by: Pops (Analytics), Ezal (Competitive Intel), Mrs. Parker (Churn)
 */

import {
    BaseValidator,
    ValidatorConfig,
    ValidationResult
} from './base-validator';

export class DataValidator extends BaseValidator {
    config: ValidatorConfig = {
        name: 'data-validator',
        description: 'Data freshness, accuracy, and statistical validation',
        tools: [
            'firecrawlScrapeMenu',
            'rtrvrScrape',
            'rtrvrAgent',
            'searchCompetitors',
            'getAnalytics',
            'getInsights',
            'predictChurn',
            'getMarketData'
        ],
        severity: 'warning',
        blocking: false,
        passThreshold: 70
    };

    // Data freshness threshold in days
    private FRESHNESS_THRESHOLD_DAYS = 7;

    async validate(
        toolName: string,
        toolArgs: any,
        toolResult: any
    ): Promise<ValidationResult> {
        const issues: string[] = [];
        let score = 100;

        // === CHECK 1: Data Freshness ===
        const freshnessIssues = this.checkFreshness(toolResult);
        if (freshnessIssues.length > 0) {
            issues.push(...freshnessIssues);
            score -= 20;
        }

        // === CHECK 2: Source Attribution ===
        const sourceIssues = this.checkSourceAttribution(toolResult);
        if (sourceIssues.length > 0) {
            issues.push(...sourceIssues);
            score -= 15;
        }

        // === CHECK 3: Statistical Validity ===
        const statIssues = this.checkStatisticalValidity(toolResult);
        if (statIssues.length > 0) {
            issues.push(...statIssues);
            score -= 20;
        }

        // === CHECK 4: Data Completeness ===
        const completenessIssues = this.checkCompleteness(toolResult, toolName);
        if (completenessIssues.length > 0) {
            issues.push(...completenessIssues);
            score -= 15;
        }

        // === CHECK 5: Competitive Data Specifics ===
        if (toolName.includes('Competitor') || toolName.includes('Market')) {
            const compIssues = this.checkCompetitorData(toolResult);
            if (compIssues.length > 0) {
                issues.push(...compIssues);
                score -= 10;
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

    private checkFreshness(result: any): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // Check for timestamp fields
        const timestampFields = ['timestamp', 'lastUpdated', 'scrapedAt', 'fetchedAt', 'date', 'updatedAt'];

        for (const field of timestampFields) {
            if (result[field]) {
                const dataDate = new Date(result[field]);
                const now = new Date();
                const daysSince = (now.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24);

                if (daysSince > this.FRESHNESS_THRESHOLD_DAYS) {
                    issues.push(
                        `Stale data: ${field} is ${Math.floor(daysSince)} days old ` +
                        `(threshold: ${this.FRESHNESS_THRESHOLD_DAYS} days)`
                    );
                }
            }
        }

        // Check for explicit staleness indicators
        if (result.isStale === true || result.stale === true) {
            issues.push('Data is flagged as stale and may be outdated');
        }

        return issues;
    }

    private checkSourceAttribution(result: any): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // Check for source field
        const sourceFields = ['source', 'sources', 'dataSource', 'url', 'origin'];
        const hasSource = sourceFields.some(field => result[field]);

        if (!hasSource && result.data) {
            issues.push('Missing source attribution - data should include source URL or reference');
        }

        // Check for empty/placeholder sources
        const source = result.source || result.dataSource;
        if (source && (source === 'unknown' || source === '' || source === 'N/A')) {
            issues.push('Source attribution is missing or invalid');
        }

        return issues;
    }

    private checkStatisticalValidity(result: any): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // Check confidence intervals
        if (result.confidence !== undefined) {
            const conf = typeof result.confidence === 'string'
                ? parseFloat(result.confidence.replace('%', '')) / 100
                : result.confidence;

            if (conf < 0 || conf > 1) {
                issues.push(`Invalid confidence value: ${result.confidence} (should be 0-1 or 0-100%)`);
            }

            if (conf < 0.6) {
                issues.push(`Low confidence: ${(conf * 100).toFixed(0)}% - results may be unreliable`);
            }
        }

        // Check sample sizes
        if (result.sampleSize !== undefined && result.sampleSize < 30) {
            issues.push(`Small sample size: ${result.sampleSize} (recommend at least 30 for statistical validity)`);
        }

        // Check for p-values
        if (result.pValue !== undefined && result.pValue > 0.05) {
            issues.push(`P-value ${result.pValue} > 0.05 - results may not be statistically significant`);
        }

        // Check percentage totals
        if (result.percentages || result.breakdown) {
            const percentages = result.percentages || result.breakdown;
            if (Array.isArray(percentages)) {
                const total = percentages.reduce((sum: number, item: any) => {
                    const pct = typeof item === 'number' ? item :
                        (item.percentage || item.percent || item.value || 0);
                    return sum + pct;
                }, 0);

                if (Math.abs(total - 100) > 1) {
                    issues.push(`Percentage breakdown totals ${total}%, not 100%`);
                }
            }
        }

        return issues;
    }

    private checkCompleteness(result: any, toolName: string): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // Check for null/undefined in important fields
        const importantFields = ['data', 'results', 'insights', 'metrics', 'values'];

        for (const field of importantFields) {
            if (result[field] === null || result[field] === undefined) {
                issues.push(`Missing required field: ${field}`);
            } else if (Array.isArray(result[field]) && result[field].length === 0) {
                issues.push(`Empty result set: ${field} array is empty`);
            }
        }

        // Check for scraping failures
        if (result.error || result.failed) {
            issues.push(`Data fetch failed: ${result.error || result.message || 'Unknown error'}`);
        }

        // Check for partial data
        if (result.partial === true || result.incomplete === true) {
            issues.push('Data is incomplete - some records may be missing');
        }

        return issues;
    }

    private checkCompetitorData(result: any): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // Check for placeholder competitor names
        const competitors = result.competitors || result.data;
        if (Array.isArray(competitors)) {
            for (const comp of competitors) {
                const name = comp.name || comp.competitor || '';
                if (name.includes('[') || name.includes('Competitor') || name === '') {
                    issues.push('Competitor data contains placeholder names - use real competitor info');
                    break;
                }
            }
        }

        // Check for price data validity
        if (result.prices || result.pricing) {
            const prices = result.prices || result.pricing;
            for (const item of (Array.isArray(prices) ? prices : [prices])) {
                const price = item.price || item.value;
                if (price === 0 || price === null || price === 'N/A') {
                    issues.push('Some price data is missing or invalid');
                    break;
                }
            }
        }

        return issues;
    }

    private generateRemediation(issues: string[]): string {
        const remediations: string[] = [
            'Please fix the following data issues:\n'
        ];

        for (const issue of issues) {
            if (issue.includes('Stale')) {
                remediations.push('- Refresh the data by re-scraping or fetching updated information');
            } else if (issue.includes('source attribution')) {
                remediations.push('- Include the source URL or reference for all data points');
            } else if (issue.includes('confidence') || issue.includes('statistical')) {
                remediations.push('- Increase sample size or note limitations in the analysis');
            } else if (issue.includes('placeholder')) {
                remediations.push('- Replace placeholder text with actual competitor names');
            } else if (issue.includes('Empty') || issue.includes('incomplete')) {
                remediations.push('- Re-run the data fetch or check for API/scraping errors');
            } else if (issue.includes('Percentage')) {
                remediations.push('- Verify percentage calculations sum to 100%');
            }
        }

        return remediations.join('\n');
    }
}

export default DataValidator;
