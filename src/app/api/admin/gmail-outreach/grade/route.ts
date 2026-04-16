/**
 * Gmail Outreach Grade API
 *
 * Saves human feedback on an outreach email to:
 *   1. ny_outreach_drafts/{draftId} — persists the grade
 *   2. agent_learning_log — feeds Marty's learning loop
 *
 * Protected: super_user only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
// requireSuperUser throws on unauthorized — no request arg needed
import { getAdminFirestore } from '@/firebase/admin';
import { logAgentLearning } from '@/server/services/agent-learning-loop';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface GradePayload {
    draftId: string;
    leadId: string | null;
    dispensaryName: string;
    templateId: string;
    subject: string;
    grade: 'great' | 'good' | 'ok' | 'poor' | 'fail';
    subjectScore: number;       // 1-5
    personalizationScore: number; // 1-5
    ctaScore: number;            // 1-5
    feedback: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        await requireSuperUser();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: GradePayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { draftId, dispensaryName, templateId, subject, grade, subjectScore, personalizationScore, ctaScore, feedback } = body;

    if (!draftId || !grade) {
        return NextResponse.json({ error: 'draftId and grade are required' }, { status: 400 });
    }

    try {
        const db = getAdminFirestore();

        // 1. Persist grade to the draft document
        await db.collection('ny_outreach_drafts').doc(draftId).update({
            humanGrade: grade,
            subjectScore,
            personalizationScore,
            ctaScore,
            humanFeedback: feedback || null,
            gradedAt: Date.now(),
            gradedBy: 'human',
        });

        // 2. Log to Marty's learning loop so it surfaces in dream/training cycles
        const overallScore = Math.round(((subjectScore + personalizationScore + ctaScore) / 15) * 10);
        const isPositive = grade === 'great' || grade === 'good';

        await logAgentLearning({
            agentId: 'marty',
            action: `outreach_graded: ${templateId} → ${dispensaryName} — human grade: ${grade}`,
            result: isPositive ? 'success' : 'failure',
            category: 'outreach',
            reason: feedback || `Human graded this outreach as "${grade}". Subject: ${subjectScore}/5, Personalization: ${personalizationScore}/5, CTA: ${ctaScore}/5.`,
            nextStep: isPositive
                ? `This template/angle worked well for ${dispensaryName}. Consider prioritizing "${templateId}" for similar dispensaries.`
                : `Improve before re-using "${templateId}" for similar profiles. Focus: ${[
                    subjectScore < 3 && 'subject line',
                    personalizationScore < 3 && 'personalization',
                    ctaScore < 3 && 'call to action',
                ].filter(Boolean).join(', ') || 'overall tone'}.`,
            metadata: {
                draftId,
                templateId,
                subject,
                dispensaryName,
                grade,
                subjectScore,
                personalizationScore,
                ctaScore,
                overallScore,
                feedback: feedback || null,
                gradedBy: 'human',
            },
        });

        logger.info('[GmailOutreach] Grade saved', { draftId, dispensaryName, grade });
        return NextResponse.json({ success: true });

    } catch (error) {
        logger.error('[GmailOutreach] Grade save failed', { error: String(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
