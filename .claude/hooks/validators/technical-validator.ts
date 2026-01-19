/**
 * Technical Validator (Linus Domain)
 *
 * Validates code outputs, security checks, and deployment decisions.
 *
 * Used by: Linus (CTO)
 */

import {
    BaseValidator,
    ValidatorConfig,
    ValidationResult,
    findSecrets
} from './base-validator';

export class TechnicalValidator extends BaseValidator {
    config: ValidatorConfig = {
        name: 'technical-validator',
        description: 'Code security and quality validation',
        tools: [
            'run_health_check',
            'evaluate_layer',
            'make_deployment_decision',
            'bashExecute',
            'execute_code',
            'write_file',
            'edit_file'
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

        // Extract code/content to validate
        const content = this.extractContent(toolArgs, toolResult);

        // === CHECK 1: Hardcoded Secrets ===
        if (content) {
            const secrets = findSecrets(content);
            if (secrets.length > 0) {
                issues.push(`CRITICAL: Hardcoded secrets detected: ${secrets.join(', ')}`);
                score -= 50;
            }
        }

        // === CHECK 2: Dangerous Patterns ===
        if (content) {
            const dangerousPatterns = this.checkDangerousPatterns(content);
            if (dangerousPatterns.length > 0) {
                issues.push(...dangerousPatterns);
                score -= 20;
            }
        }

        // === CHECK 3: Build Status (for health checks) ===
        if (toolName === 'run_health_check' || toolName === 'evaluate_layer') {
            const buildIssues = this.checkBuildStatus(toolResult);
            if (buildIssues.length > 0) {
                issues.push(...buildIssues);
                score -= 15;
            }
        }

        // === CHECK 4: Deployment Decision Validation ===
        if (toolName === 'make_deployment_decision') {
            const deployIssues = this.checkDeploymentDecision(toolResult);
            if (deployIssues.length > 0) {
                issues.push(...deployIssues);
                score -= 25;
            }
        }

        // === CHECK 5: Bash Command Safety ===
        if (toolName === 'bashExecute') {
            const bashIssues = this.checkBashSafety(toolArgs);
            if (bashIssues.length > 0) {
                issues.push(...bashIssues);
                score -= 30;
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

    private extractContent(args: any, result: any): string | null {
        // Check common code/content fields
        const fields = [
            args?.code,
            args?.content,
            args?.command,
            args?.script,
            result?.output,
            result?.code,
            result?.content
        ];

        for (const field of fields) {
            if (typeof field === 'string' && field.length > 0) {
                return field;
            }
        }

        // If result is a string, use it
        if (typeof result === 'string') {
            return result;
        }

        return null;
    }

    private checkDangerousPatterns(content: string): string[] {
        const issues: string[] = [];

        const dangerousPatterns = [
            { pattern: /eval\s*\(/gi, name: 'eval()' },
            { pattern: /exec\s*\(/gi, name: 'exec()' },
            { pattern: /\.innerHTML\s*=/gi, name: 'innerHTML assignment' },
            { pattern: /document\.write\s*\(/gi, name: 'document.write()' },
            { pattern: /SELECT\s+\*\s+FROM\s+\w+\s+WHERE\s+\w+\s*=\s*['"]?\s*\+/gi, name: 'SQL injection risk' },
            { pattern: /dangerouslySetInnerHTML/gi, name: 'dangerouslySetInnerHTML' },
            { pattern: /--no-verify/gi, name: 'git --no-verify flag' },
            { pattern: /--force\s+push|push\s+--force|-f\s+push|push\s+-f/gi, name: 'force push' },
            { pattern: /rm\s+-rf\s+\/(?!\w)/gi, name: 'dangerous rm -rf' },
            { pattern: /chmod\s+777/gi, name: 'chmod 777' },
        ];

        for (const { pattern, name } of dangerousPatterns) {
            if (pattern.test(content)) {
                issues.push(`Security: Dangerous pattern detected - ${name}`);
            }
        }

        return issues;
    }

    private checkBuildStatus(result: any): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // Check build status
        if (result.buildStatus === 'failed' || result.build === 'failed') {
            issues.push('Build is failing - must be fixed before deployment');
        }

        // Check test status
        if (result.testsFailed && result.testsFailed > 0) {
            issues.push(`${result.testsFailed} tests are failing`);
        }

        // Check lint errors
        if (result.lintErrors && result.lintErrors > 0) {
            issues.push(`${result.lintErrors} lint errors found`);
        }

        // Check for type errors
        if (result.typeErrors && result.typeErrors > 0) {
            issues.push(`${result.typeErrors} TypeScript type errors`);
        }

        return issues;
    }

    private checkDeploymentDecision(result: any): string[] {
        const issues: string[] = [];

        if (!result || typeof result !== 'object') {
            return issues;
        }

        // If deploying despite failures
        if (result.decision === 'MISSION_READY' || result.approved === true) {
            // Check if any layers failed
            if (result.layerResults) {
                for (const [layer, data] of Object.entries(result.layerResults)) {
                    const layerData = data as any;
                    if (layerData.status === 'failed' || layerData.passed === false) {
                        issues.push(`Deploying despite failed layer: ${layer}`);
                    }
                }
            }

            // Check confidence threshold
            if (result.confidence !== undefined && result.confidence < 0.7) {
                issues.push(`Low confidence deployment (${(result.confidence * 100).toFixed(0)}% < 70%)`);
            }
        }

        return issues;
    }

    private checkBashSafety(args: any): string[] {
        const issues: string[] = [];
        const command = args?.command || '';

        // Dangerous commands that should be blocked or warned
        const dangerousCommands = [
            { pattern: /rm\s+-rf\s+\//i, message: 'Dangerous: rm -rf on root directory' },
            { pattern: />\s*\/dev\/sd[a-z]/i, message: 'Dangerous: writing to disk device' },
            { pattern: /mkfs/i, message: 'Dangerous: filesystem format command' },
            { pattern: /dd\s+if=.*of=\/dev/i, message: 'Dangerous: dd to device' },
            { pattern: /:(){ :|:& };:/i, message: 'Dangerous: fork bomb detected' },
            { pattern: /curl.*\|\s*(ba)?sh/i, message: 'Security risk: piping curl to shell' },
            { pattern: /wget.*\|\s*(ba)?sh/i, message: 'Security risk: piping wget to shell' },
        ];

        for (const { pattern, message } of dangerousCommands) {
            if (pattern.test(command)) {
                issues.push(message);
            }
        }

        return issues;
    }

    private generateRemediation(issues: string[]): string {
        const remediations: string[] = [
            'Please fix the following technical issues:\n'
        ];

        for (const issue of issues) {
            if (issue.includes('Hardcoded secrets')) {
                remediations.push('- Move secrets to environment variables or a secrets manager');
            } else if (issue.includes('eval') || issue.includes('exec')) {
                remediations.push('- Replace eval/exec with safer alternatives');
            } else if (issue.includes('SQL injection')) {
                remediations.push('- Use parameterized queries instead of string concatenation');
            } else if (issue.includes('innerHTML')) {
                remediations.push('- Use textContent or proper sanitization for user content');
            } else if (issue.includes('Build is failing')) {
                remediations.push('- Fix build errors before proceeding with deployment');
            } else if (issue.includes('tests are failing')) {
                remediations.push('- Fix failing tests or update them if behavior change is intentional');
            } else if (issue.includes('force push')) {
                remediations.push('- Avoid force push to shared branches - use regular push or rebase');
            } else if (issue.includes('Dangerous')) {
                remediations.push('- Review and modify the dangerous command for safety');
            }
        }

        return remediations.join('\n');
    }
}

export default TechnicalValidator;
