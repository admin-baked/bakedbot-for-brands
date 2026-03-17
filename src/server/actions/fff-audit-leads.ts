'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { captureEmailLead } from './email-capture';
import type { FFFAuditReport } from '@/types/fff-audit';

// ── Score helpers (mirrors client-side computeScores) ──────────────────────

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

    return { findability: f, fit, fidelity: fid, total: clamp(f + fit + fid, 0, 100) };
}

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

function shouldRecommendClaim(s: AuditInputs, scores: { findability: number; total: number }): boolean {
    if (s.businessType === 'brand') return true;
    return (
        scores.findability < 18 ||
        s.menuType === 'iframe' ||
        s.indexation === 'poor' ||
        s.organicShare === 'lt10' ||
        scores.total < 60
    );
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
    claimRecommended?: boolean;
    scores?: { findability: number; fit: number; fidelity: number; total: number };
    error?: string;
}

export async function submitFFFAuditLead(
    request: SubmitFFFAuditLeadRequest,
): Promise<SubmitFFFAuditLeadResponse> {
    try {
        const scores = computeServerScores(request.inputs);
        const roi = computeROI(request.inputs, scores.total);
        const claimRecommended = shouldRecommendClaim(request.inputs, scores);
        const leadStatus: FFFAuditReport['leadStatus'] = scores.total < 60 ? 'mql' : 'lead';

        // 1. Capture / upsert email lead (public — no requireUser)
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

        // 2. Save audit report
        const db = getAdminFirestore();
        const reportData: Omit<FFFAuditReport, 'id'> = {
            emailLeadId,
            email: request.email,
            firstName: request.firstName,
            businessType: request.inputs.businessType,
            state: request.inputs.state,
            websiteUrl: request.inputs.websiteUrl,
            findability: scores.findability,
            fit: scores.fit,
            fidelity: scores.fidelity,
            total: scores.total,
            inputs: request.inputs as unknown as Record<string, string | boolean>,
            roi,
            claimRecommended,
            claimIntent: 'none',
            leadStatus,
            createdAt: Date.now(),
        };

        const reportRef = await db.collection('fff_audit_reports').add(reportData);

        // 3. Tag the email_lead with audit metadata (merge, don't overwrite)
        const extraTags = [
            'fff_audit',
            `score_${scores.total}`,
            claimRecommended ? 'claim_recommended' : null,
            `status_${leadStatus}`,
            request.marketingConsent ? 'marketing-opt-in' : null,
        ].filter(Boolean) as string[];

        await db.collection('email_leads').doc(emailLeadId).update({
            fffAuditReportId: reportRef.id,
            fffScore: scores.total,
            fffLeadStatus: leadStatus,
            lastUpdated: Date.now(),
            // Firestore arrayUnion would be ideal but admin SDK update accepts direct assignment for simple merge needs
            tags: extraTags,
        });

        logger.info('[FFFAudit] Lead submitted', {
            emailLeadId,
            auditReportId: reportRef.id,
            total: scores.total,
            claimRecommended,
            leadStatus,
        });

        return {
            success: true,
            auditReportId: reportRef.id,
            emailLeadId,
            claimRecommended,
            scores,
        };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[FFFAudit] Error submitting lead', { error: err.message });
        return { success: false, error: err.message || 'Failed to submit audit' };
    }
}
