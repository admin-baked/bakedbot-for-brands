'use server';

import { COMPLIANCE_RULES, type ComplianceRule } from '@/data/compliance-rules';

export interface AuditResult {
    passed: boolean;
    score: number; // 0-100
    violations: {
        ruleId: string;
        description: string;
        reason: string;
        severity: string;
        match?: string;
    }[];
}

export async function auditContent(text: string, jurisdiction: string): Promise<AuditResult> {
    // 1. Filter Rules for Jurisdiction & Federal
    const rules = COMPLIANCE_RULES.filter(r =>
        r.jurisdiction === jurisdiction || r.jurisdiction === 'Federal'
    );

    const violations: AuditResult['violations'] = [];
    const lowerText = text.toLowerCase();

    // 2. Check each rule
    rules.forEach(rule => {
        let isViolation = false;
        let matchText = '';

        // Keyword Check
        if (rule.keywords) {
            for (const keyword of rule.keywords) {
                if (lowerText.includes(keyword.toLowerCase())) {
                    isViolation = true;
                    matchText = keyword;
                    break;
                }
            }
        }

        // Regex Check (if implemented in future or if I add regexes to the data file)
        if (rule.regex && rule.regex.test(text)) {
            isViolation = true;
            matchText = 'pattern match';
        }

        if (isViolation) {
            violations.push({
                ruleId: rule.id,
                description: rule.description,
                reason: rule.reason,
                severity: rule.severity,
                match: matchText
            });
        }
    });

    // 3. Calculate Score
    // Base 100. High violation -20, Medium -10, Low -5.
    let score = 100;
    violations.forEach(v => {
        if (v.severity === 'High') score -= 20;
        else if (v.severity === 'Medium') score -= 10;
        else score -= 5;
    });

    return {
        passed: violations.length === 0,
        score: Math.max(0, score),
        violations
    };
}
