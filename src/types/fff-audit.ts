export interface FFFAuditReport {
    id: string;
    emailLeadId: string;
    email: string;
    firstName?: string;
    businessType: 'dispensary' | 'brand';
    state: string;
    websiteUrl: string;
    // Scores
    findability: number;
    fit: number;
    fidelity: number;
    total: number;
    // Raw inputs snapshot
    inputs: Record<string, string | boolean>;
    // ROI
    roi: {
        laborSavingsAnnual: number;
        grossProfitUpsideAnnual: number;
        totalImpactAnnual: number;
    };
    // Claim
    claimRecommended: boolean;
    claimIntent: 'none' | 'interested' | 'claimed';
    claimOpportunityId?: string;
    // Lead lifecycle
    leadStatus: 'lead' | 'mql' | 'sql';
    createdAt: number;
}

export interface ClaimOpportunity {
    id: string;
    emailLeadId: string;
    auditReportId: string;
    email: string;
    firstName?: string;
    businessType: 'dispensary' | 'brand';
    state: string;
    websiteUrl: string;
    zipCode: string;
    status: 'open' | 'reserved' | 'claimed' | 'waitlist';
    score: number;
    createdAt: number;
    updatedAt: number;
}
