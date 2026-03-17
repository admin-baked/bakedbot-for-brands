'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { captureEmailLead } from './email-capture';
import { createFFFAuditLead } from '@/server/services/crm-service';
import type { FFFAuditReport, FFFScoreLabel, FFFClaimRecommendedType } from '@/types/fff-audit';

// ── Score + leak helpers (authoritative server-side) ──────────────────────

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function safeNum(value: string | undefined, fallback = 0) {
    if (!value) return fallback;
    const n = Number(String(value).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : fallback;
}

export interface AuditInputs {
    businessType: 'dispensary' | 'brand';
    state: string;
    websiteUrl: string;
    menuType: string;
    speed: string;
    organicShare: string;
    indexation: string;
    confusion: string;
    personalization: string;
    ageGate: string;
    smsConsent: string;
    auditTrail: string;
    complianceWorkflow: string;
    sessionsMonthly?: string;
    onlineOrdersMonthly?: string;
    aov?: string;
    grossMarginPct?: string;
    manualHoursPerWeek?: string;
    loadedHourlyCost?: string;
}

function computeServerScores(s: AuditInputs) {
    let f = 0;
    f += s.menuType === 'headless' ? 16 : s.menuType === 'embedded' ? 10 : s.menuType === 'iframe' ? 3 : 6;
    f += s.speed === 'fast' ? 8 : s.speed === 'average' ? 5 : s.speed === 'slow' ? 2 : 4;
    f += s.organicShare === '30plus' ? 6 : s.organicShare === '10to30' ? 4 : s.organicShare === 'lt10' ? 1 : 2;
    f += s.indexation === 'good' ? 5 : s.indexation === 'ok' ? 3 : s.indexation === 'poor' ? 1 : 2;
    f = clamp(f, 0, 35);

    let fit = 0;
    fit += s.personalization === 'advanced' ? 16 : s.personalization === 'basic' ? 10 : s.personalization === 'none' ? 3 : 7;
    fit += s.confusion === 'low' ? 19 : s.confusion === 'medium' ? 13 : 6;
    fit = clamp(fit, 0, 35);

    let fid = 0;
    fid += s.ageGate === 'strong' ? 10 : s.ageGate === 'basic' ? 6 : s.ageGate === 'none' ? 1 : 4;
    fid += s.smsConsent === 'strong' ? 7 : s.smsConsent === 'some' ? 4 : s.smsConsent === 'none' ? 1 : 3;
    fid += s.auditTrail === 'strong' ? 8 : s.auditTrail === 'partial' ? 5 : s.auditTrail === 'none' ? 1 : 3;
    fid += s.complianceWorkflow === 'policy_engine' ? 5 : s.complianceWorkflow === 'checklist' ? 3 : 1;
    fid = clamp(fid, 0, 30);

    const total = clamp(f + fit + fid, 0, 100);
    const label: FFFScoreLabel = total >= 80 ? 'Strong' : total >= 60 ? 'Decent' : 'Leaky';
    return { findability: f, fit, fidelity: fid, total, label };
}

function computeLeaks(s: AuditInputs, f: number, fit: number, fid: number) {
    const leaks: Array<{ title: string; bucket: string; why: string; fix: string }> = [];

    if (s.menuType === 'iframe') {
        leaks.push({
            title: 'Invisible menu (iframe drag)',
            bucket: 'outdated menus',
            why: 'Iframe menus often limit indexability and slow down the buying journey.',
            fix: 'Move to an indexable headless menu on your domain + schema + performance budgets.',
        });
    }
    if (s.confusion === 'high') {
        leaks.push({
            title: 'Customer confusion at the moment of choice',
            bucket: 'confusion',
            why: "When effects/intent aren't clarified, customers browse longer and buy less.",
            fix: 'Add guided discovery + effect-aware recommendations (web/chat/SMS).',
        });
    }
    if (s.smsConsent === 'none' || s.auditTrail === 'none' || s.complianceWorkflow === 'ad_hoc') {
        leaks.push({
            title: 'Compliance proof gap',
            bucket: 'compliance risk',
            why: 'In cannabis, marketing without provable consent + logs becomes license risk.',
            fix: 'Implement consent capture + STOP/HELP hygiene + policy checks + audit trails.',
        });
    }

    const weakness = [
        { k: 'Findability', v: f / 35 },
        { k: 'Fit', v: fit / 35 },
        { k: 'Fidelity', v: fid / 30 },
    ].sort((a, b) => a.v - b.v)[0]?.k;

    if (leaks.length < 3 && weakness === 'Findability') {
        leaks.push({
            title: 'Low discoverability',
            bucket: 'marketing inefficiency',
            why: 'Your discoverability signals suggest organic demand leakage.',
            fix: 'Ship indexable pages + speed improvements + internal linking.',
        });
    }
    if (leaks.length < 3 && weakness === 'Fit') {
        leaks.push({
            title: 'Weak personalization',
            bucket: 'confusion',
            why: 'Lack of personalization reduces conversion and repeat purchase.',
            fix: 'Start with basic segments → move to effect-aware policies.',
        });
    }
    if (leaks.length < 3 && weakness === 'Fidelity') {
        leaks.push({
            title: 'Process risk',
            bucket: 'compliance risk',
            why: 'Without a consistent check+log flow, compliance becomes a guess.',
            fix: 'Add a preflight compliance gate for all customer-facing content.',
        });
    }

    return leaks.slice(0, 3);
}

const AUDIT_PLAN = [
    {
        phase: 'Phase 0 — Readiness',
        weeks: 'Week 0–1',
        bullets: ['Baseline KPIs + consent audit', 'Menu/indexation check + speed snapshot', 'Pick 1 measurable outcome'],
    },
    {
        phase: 'Phase 1 — Deploy + Measure',
        weeks: 'Weeks 2–5',
        bullets: ['Fix menu architecture + indexability', 'Add guided discovery (Smokey)', 'Automate 1 lifecycle (Craig) with preflight checks'],
    },
    {
        phase: 'Phase 2 — Optimize',
        weeks: 'Weeks 6–9',
        bullets: ['A/B test conversion flow', 'Add competitive/assortment signals (Ezal)', 'Operational dashboards (Pops)'],
    },
    {
        phase: 'Phase 3 — Scale',
        weeks: 'Weeks 10–12',
        bullets: ['Expand segments + loyalty (Mrs. Parker)', 'Governance + audit trails', 'Quarterly compliance refresh (Deebo)'],
    },
];

function computeROI(s: AuditInputs, total: number) {
    const manualHoursPerWeek = safeNum(s.manualHoursPerWeek, 0);
    const loadedHourlyCost = safeNum(s.loadedHourlyCost, 0);
    const laborSavingsAnnual = manualHoursPerWeek * loadedHourlyCost * 52;

    const sessionsMonthly = safeNum(s.sessionsMonthly, 0);
    const ordersMonthly = safeNum(s.onlineOrdersMonthly, 0);
    const aov = safeNum(s.aov, 0);
    const gm = clamp(safeNum(s.grossMarginPct, 0) / 100, 0, 1);

    const baseConv = sessionsMonthly > 0 ? ordersMonthly / sessionsMonthly : 0;
    const convLift = total >= 80 ? 0.04 : total >= 60 ? 0.025 : 0.015;
    const organicLift = total >= 80 ? 0.12 : total >= 60 ? 0.08 : 0.04;

    const newSessions = sessionsMonthly * (1 + organicLift);
    const newOrders = newSessions * baseConv * (1 + convLift);
    const incrementalOrdersMonthly = Math.max(0, newOrders - ordersMonthly);
    const grossProfitUpsideAnnual = incrementalOrdersMonthly * aov * gm * 12;

    return {
        laborSavingsAnnual,
        grossProfitUpsideAnnual,
        totalImpactAnnual: laborSavingsAnnual + grossProfitUpsideAnnual,
    };
}

function getClaimRecommendation(
    s: AuditInputs,
    scores: { findability: number; total: number },
): { recommended: boolean; reason: string; recommendedType: FFFClaimRecommendedType } {
    if (s.businessType === 'brand') {
        return {
            recommended: true,
            reason: 'Your strongest next move is footprint expansion. Claim your brand presence in the markets that matter most.',
            recommendedType: 'brand_footprint_claim',
        };
    }

    const triggers = [
        scores.findability < 18 && 'low findability score',
        s.menuType === 'iframe' && 'iframe menu limits indexability',
        s.indexation === 'poor' && 'poor search indexation',
        s.organicShare === 'lt10' && 'less than 10% organic traffic share',
        scores.total < 60 && 'overall score below 60',
    ].filter(Boolean) as string[];

    const recommended = triggers.length > 0;
    return {
        recommended,
        reason: recommended
            ? `Your biggest leak is discoverability. Claiming your territory gives you a faster path to visibility while you improve your stack.`
            : 'Your foundation is strong. Claim more territory to grow visibility faster.',
        recommendedType: 'zip_claim',
    };
}

// ── Public server action ───────────────────────────────────────────────────

export interface SubmitFFFAuditLeadRequest {
    email: string;
    firstName?: string;
    phone?: string;
    reportConsent: boolean;
    marketingConsent: boolean;
    inputs: AuditInputs;
}

export interface SubmitFFFAuditLeadResponse {
    success: boolean;
    auditReportId?: string;
    emailLeadId?: string;
    crmLeadId?: string;
    claimRecommendation?: {
        recommended: boolean;
        reason: string;
        recommendedType: FFFClaimRecommendedType;
    };
    scores?: { findability: number; fit: number; fidelity: number; total: number; label: FFFScoreLabel };
    error?: string;
}

export async function submitFFFAuditLead(
    request: SubmitFFFAuditLeadRequest,
): Promise<SubmitFFFAuditLeadResponse> {
    try {
        const scores = computeServerScores(request.inputs);
        const leaks = computeLeaks(request.inputs, scores.findability, scores.fit, scores.fidelity);
        const roi = computeROI(request.inputs, scores.total);
        const claimRecommendation = getClaimRecommendation(request.inputs, scores);
        const lifecycleStage: FFFAuditReport['crm']['lifecycleStage'] = scores.total < 60 ? 'mql' : 'lead';

        // 1. Capture / upsert email lead
        const leadResult = await captureEmailLead({
            email: request.email,
            phone: request.phone || undefined,
            firstName: request.firstName,
            emailConsent: request.reportConsent,
            smsConsent: false,
            source: 'fff_audit',
            state: request.inputs.state,
        });

        if (!leadResult.success || !leadResult.leadId) {
            return { success: false, error: leadResult.error || 'Failed to capture lead' };
        }

        const emailLeadId = leadResult.leadId;

        // 2. Save audit report with full spec-aligned shape
        const db = getAdminFirestore();
        const now = Date.now();

        const reportData: Omit<FFFAuditReport, 'id'> = {
            source: 'fff_audit',
            leadMagnetType: 'growth_leak_audit',
            version: 'v1',
            emailLeadId,
            businessType: request.inputs.businessType,
            state: request.inputs.state,
            websiteUrl: request.inputs.websiteUrl || undefined,
            contact: {
                email: request.email,
                firstName: request.firstName,
                phone: request.phone || undefined,
                reportConsent: request.reportConsent,
                marketingConsent: request.marketingConsent,
            },
            responses: {
                menuType: request.inputs.menuType as FFFAuditReport['responses']['menuType'],
                speed: request.inputs.speed as FFFAuditReport['responses']['speed'],
                organicShare: request.inputs.organicShare as FFFAuditReport['responses']['organicShare'],
                indexation: request.inputs.indexation as FFFAuditReport['responses']['indexation'],
                confusion: request.inputs.confusion as FFFAuditReport['responses']['confusion'],
                personalization: request.inputs.personalization as FFFAuditReport['responses']['personalization'],
                ageGate: request.inputs.ageGate as FFFAuditReport['responses']['ageGate'],
                smsConsent: request.inputs.smsConsent as FFFAuditReport['responses']['smsConsent'],
                auditTrail: request.inputs.auditTrail as FFFAuditReport['responses']['auditTrail'],
                complianceWorkflow: request.inputs.complianceWorkflow as FFFAuditReport['responses']['complianceWorkflow'],
                sessionsMonthly: safeNum(request.inputs.sessionsMonthly) || undefined,
                onlineOrdersMonthly: safeNum(request.inputs.onlineOrdersMonthly) || undefined,
                aov: safeNum(request.inputs.aov) || undefined,
                grossMarginPct: safeNum(request.inputs.grossMarginPct) || undefined,
                manualHoursPerWeek: safeNum(request.inputs.manualHoursPerWeek) || undefined,
                loadedHourlyCost: safeNum(request.inputs.loadedHourlyCost) || undefined,
            },
            scores: {
                findability: scores.findability,
                fit: scores.fit,
                fidelity: scores.fidelity,
                total: scores.total,
                label: scores.label,
            },
            leaks,
            roi,
            plan: AUDIT_PLAN,
            claimRecommendation,
            claimIntent: { clicked: false },
            crm: {
                lifecycleStage,
                qualificationStatus: 'new',
                sourceDetail: 'free_audit_unlock',
            },
            createdAt: now,
            updatedAt: now,
        };

        const reportRef = await db.collection('fff_audit_reports').add(reportData);

        // 3. Sync to CRM leads collection
        let crmLeadId: string | undefined;
        try {
            crmLeadId = await createFFFAuditLead({
                email: request.email,
                firstName: request.firstName,
                businessType: request.inputs.businessType,
                state: request.inputs.state,
                websiteUrl: request.inputs.websiteUrl || undefined,
                fffScore: scores.total,
                fffScoreLabel: scores.label,
                fffLeadStatus: lifecycleStage,
                claimRecommended: claimRecommendation.recommended,
                auditReportId: reportRef.id,
                emailLeadId,
                topLeakBuckets: leaks.map((l) => l.bucket),
            });
            // Store crmLeadId on the audit report
            await reportRef.update({ crmLeadId });
        } catch (crmErr) {
            logger.warn('[FFFAudit] CRM lead sync failed (non-fatal)', {
                error: (crmErr as Error).message,
                auditReportId: reportRef.id,
            });
        }

        // 4. Merge spec-aligned tags onto email_lead (read-merge-write to avoid overwriting)
        const leadDoc = await db.collection('email_leads').doc(emailLeadId).get();
        const existingTags = (leadDoc.data()?.tags as string[]) || [];
        const newTags = [
            'fff-audit',
            'lead-magnet',
            `business-type:${request.inputs.businessType}`,
            `score-band:${scores.label.toLowerCase()}`,
            claimRecommendation.recommended ? 'claim-recommended' : null,
            request.marketingConsent ? 'marketing-opt-in' : null,
        ].filter(Boolean) as string[];
        const mergedTags = [...new Set([...existingTags, ...newTags])];

        await db.collection('email_leads').doc(emailLeadId).update({
            tags: mergedTags,
            fffAuditReportId: reportRef.id,
            fffScore: scores.total,
            fffScoreLabel: scores.label,
            fffLeadStatus: lifecycleStage,
            lastUpdated: now,
        });

        logger.info('[FFFAudit] Lead submitted', {
            emailLeadId,
            auditReportId: reportRef.id,
            total: scores.total,
            label: scores.label,
            claimRecommended: claimRecommendation.recommended,
            lifecycleStage,
        });

        return {
            success: true,
            auditReportId: reportRef.id,
            emailLeadId,
            crmLeadId,
            claimRecommendation,
            scores,
        };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[FFFAudit] Error submitting lead', { error: err.message });
        return { success: false, error: err.message || 'Failed to submit audit' };
    }
}
