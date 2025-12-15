
export class DeeboGuardrails {
    // Prohibited terms related to medical claims or illegal activity
    private static prohibitedTerms = [
        'cure',
        'heals cancer',
        'medical advice',
        'prescription',
        'buy weed online', // if strict
        'illegal',
        'shipping nationwide', // usually illegal for THC
        'no id required'
    ];

    /**
     * Scans text for compliance violations.
     * Returns generic "true" if safe, or throws error/returns false with reason.
     */
    static validateContent(text: string): { isValid: boolean; violations: string[] } {
        const lowerText = text.toLowerCase();
        const violations: string[] = [];

        this.prohibitedTerms.forEach(term => {
            if (lowerText.includes(term)) {
                violations.push(term);
            }
        });

        // Additional Logic: Regex for Phone Numbers or URLs if restricted?
        // keeping it simple for V1

        return {
            isValid: violations.length === 0,
            violations
        };
    }

    /**
     * Sanitizes input by redacting prohibited terms (optional mode).
     */
    static sanitize(text: string): string {
        let sanitized = text;
        this.prohibitedTerms.forEach(term => {
            const regex = new RegExp(term, 'gi');
            sanitized = sanitized.replace(regex, '[REDACTED]');
        });
        return sanitized;
    }
}
