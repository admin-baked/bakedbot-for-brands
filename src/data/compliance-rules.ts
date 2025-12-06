export type Severity = 'High' | 'Medium' | 'Low';

export interface ComplianceRule {
    id: string;
    jurisdiction: string;
    category: 'Marketing' | 'Packaging' | 'Product' | 'Retail';
    description: string;
    reason: string;
    keywords?: string[]; // Simple keyword blocking
    regex?: RegExp; // Pattern matching
    severity: Severity;
}

export const COMPLIANCE_RULES: ComplianceRule[] = [
    // FEDERAL / GENERAL
    {
        id: 'FED-001',
        jurisdiction: 'Federal',
        category: 'Marketing',
        description: 'No health claims',
        reason: 'FDA prohibits unproven health claims (cures cancer, heals pain, etc).',
        keywords: ['cures cancer', 'heals pain', 'medical miracle', 'prescription strength'],
        severity: 'High'
    },

    // CALIFORNIA (DCC)
    {
        id: 'CA-001',
        jurisdiction: 'CA',
        category: 'Marketing',
        description: 'No cartoons or youth-appealing imagery',
        reason: 'California Code of Regulations prohibits marketing attractive to minors.',
        keywords: ['cartoon', 'candy', 'kids', 'toy', 'gummy bear'],
        severity: 'High'
    },
    {
        id: 'CA-002',
        jurisdiction: 'CA',
        category: 'Marketing',
        description: 'No "Free" cannabis',
        reason: 'Giving away cannabis for free is prohibited by the DCC.',
        keywords: ['free weed', 'free joint', 'giveaway', 'bogo free'], // BOGO is sometimes restricted or must be $0.01
        severity: 'Medium'
    },

    // MICHIGAN (CRA)
    {
        id: 'MI-001',
        jurisdiction: 'MI',
        category: 'Marketing',
        description: 'No false or misleading statements',
        reason: 'CRA rules regarding truthful advertising.',
        keywords: ['organic', 'pesticide-free'], // Unless certified, which is rare/hard
        severity: 'Medium'
    },

    // ILLINOIS (IDFPR)
    {
        id: 'IL-001',
        jurisdiction: 'IL',
        category: 'Retail',
        description: '1000-ft School Zone',
        reason: 'Cannot advertise within 1000ft of schools.',
        keywords: ['school', 'playground', 'daycare'],
        severity: 'High'
    }
];

export const JURISDICTIONS = ['CA', 'MI', 'IL', 'MA', 'NY', 'NJ'];
