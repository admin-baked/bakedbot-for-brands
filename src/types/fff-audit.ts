export type FFFScoreLabel = 'Leaky' | 'Decent' | 'Strong';

export type FFFClaimRecommendedType = 'zip_claim' | 'city_claim' | 'brand_footprint_claim';

export interface FFFAuditReport {
    id: string;
    source: 'fff_audit';
    leadMagnetType: 'growth_leak_audit';
    version: 'v1';

    emailLeadId?: string;
    crmLeadId?: string;

    businessType: 'dispensary' | 'brand';
    state: string;
    websiteUrl?: string;

    contact: {
        email: string;
        firstName?: string;
        phone?: string;
        reportConsent: boolean;
        marketingConsent: boolean;
    };

    responses: {
        menuType: 'iframe' | 'embedded' | 'headless' | 'not_sure';
        speed: 'fast' | 'average' | 'slow' | 'not_sure';
        organicShare: 'lt10' | '10to30' | '30plus' | 'not_sure';
        indexation: 'poor' | 'ok' | 'good' | 'not_sure';
        confusion: 'high' | 'medium' | 'low';
        personalization: 'none' | 'basic' | 'advanced' | 'not_sure';
        ageGate: 'none' | 'basic' | 'strong' | 'not_sure';
        smsConsent: 'none' | 'some' | 'strong' | 'not_sure';
        auditTrail: 'none' | 'partial' | 'strong' | 'not_sure';
        complianceWorkflow: 'ad_hoc' | 'checklist' | 'policy_engine';
        sessionsMonthly?: number;
        onlineOrdersMonthly?: number;
        aov?: number;
        grossMarginPct?: number;
        manualHoursPerWeek?: number;
        loadedHourlyCost?: number;
    };

    scores: {
        findability: number;
        fit: number;
        fidelity: number;
        total: number;
        label: FFFScoreLabel;
    };

    leaks: Array<{
        title: string;
        bucket: string;
        why: string;
        fix: string;
    }>;

    roi: {
        laborSavingsAnnual: number;
        grossProfitUpsideAnnual: number;
        totalImpactAnnual: number;
    };

    plan: Array<{
        phase: string;
        weeks: string;
        bullets: string[];
    }>;

    claimRecommendation?: {
        recommended: boolean;
        reason: string;
        recommendedType: FFFClaimRecommendedType;
    };

    claimIntent?: {
        clicked: boolean;
        clickedAt?: number;
        opportunityType?: FFFClaimRecommendedType;
        zip?: string;
        city?: string;
        state?: string;
    };

    crm: {
        lifecycleStage: 'lead' | 'mql' | 'sql';
        qualificationStatus: 'new' | 'reviewed' | 'qualified' | 'disqualified';
        ownerId?: string;
        sourceDetail: 'free_audit_unlock';
    };

    createdAt: number;
    updatedAt: number;
}

export interface ClaimOpportunity {
    id: string;
    source: 'fff_audit' | 'claim_page' | 'homepage';
    sourceDetail?: 'free_audit_unlock' | 'direct_claim' | 'hero_search';

    auditReportId?: string;
    emailLeadId?: string;
    crmLeadId?: string;

    claimant: {
        email: string;
        firstName?: string;
        phone?: string;
        businessType: 'dispensary' | 'brand';
        websiteUrl?: string;
        companyName?: string;
    };

    opportunityType: FFFClaimRecommendedType;

    market: {
        zip?: string;
        city?: string;
        state?: string;
        regionKey?: string;
    };

    status: 'initiated' | 'reserved' | 'submitted' | 'waitlist' | 'claimed' | 'expired';

    auditSnapshot?: {
        totalScore?: number;
        findability?: number;
        topLeakBuckets?: string[];
        roiAnnualImpact?: number;
    };

    notes?: string;
    createdAt: number;
    updatedAt: number;
}
