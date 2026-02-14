'use server';

import { requireUser, isSuperUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { PLANS, PlanId, COVERAGE_PACKS, CoveragePackId } from '@/lib/plans';
import { calculateMrrLadder } from '@/lib/mrr-ladder';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { EzalInsight, Competitor } from '@/types/ezal-discovery';
import { ActionResult, SystemPlaybook } from './types';

export async function toggleBetaFeature(featureId: string, enabled: boolean): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        await firestore.collection('system_config').doc('beta_features').set({
            [featureId]: enabled
        }, { merge: true });
        return { message: `Feature ${featureId} ${enabled ? 'enabled' : 'disabled'}` };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function createCoupon(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();

        const code = formData.get('code')?.toString().toUpperCase().trim();
        const brandId = formData.get('brandId')?.toString();
        const type = formData.get('type')?.toString() || 'percentage';
        const value = parseFloat(formData.get('value')?.toString() || '0');

        if (!code || code.length < 3) return { message: 'Coupon code must be at least 3 characters.', error: true };
        if (!brandId) return { message: 'Please select a brand.', error: true };
        if (value <= 0) return { message: 'Value must be greater than 0.', error: true };

        const newCoupon = {
            code, brandId, type, value, uses: 0, active: true,
            createdAt: new Date(), updatedAt: new Date(),
        };

        await firestore.collection('coupons').add(newCoupon);
        return { message: `Coupon ${code} created successfully.` };
    } catch (error: any) {
        return { message: `Failed to create coupon: ${error.message}`, error: true };
    }
}

export async function getCoupons(): Promise<any[]> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('coupons').get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        }));
    } catch (error) { return []; }
}

export async function getMrrLadder(currentMrr: number) {
    return calculateMrrLadder(currentMrr);
}

export async function getEzalInsights(tenantId: string, limitVal: number = 20): Promise<EzalInsight[]> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('ezal_insights').where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').limit(limitVal).get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as EzalInsight[];
    } catch (error) { return []; }
}

export async function getEzalCompetitors(tenantId: string): Promise<Competitor[]> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('competitors').where('tenantId', '==', tenantId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Competitor[];
    } catch (error) { return []; }
}

export async function createEzalCompetitor(tenantId: string, data: any): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        await firestore.collection('competitors').add({
            tenantId, ...data, createdAt: new Date(), updatedAt: new Date()
        });
        return { message: 'Competitor created successfully' };
    } catch (error: any) { return { message: error.message, error: true }; }
}


export async function getSystemPlaybooks(): Promise<SystemPlaybook[]> {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['super_user']);
        const snapshot = await firestore.collection('system_playbooks').get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                lastRun: data.lastRun?.toDate?.()?.toISOString() || null,
                nextRun: data.nextRun?.toDate?.()?.toISOString() || null,
            } as SystemPlaybook;
        });
    } catch (error) {
        console.error('Failed to fetch system playbooks:', error);
        return [];
    }
}

export async function toggleSystemPlaybook(id: string, active: boolean) {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['super_user']);
        await firestore.collection('system_playbooks').doc(id).update({
            active,
            updatedAt: FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (error: any) {
        console.error('Failed to toggle playbook:', error);
        return { success: false, message: error.message };
    }
}

export async function syncSystemPlaybooks(initialSet: any[]) {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['super_user']);
        const batch = firestore.batch();
        for (const pb of initialSet) {
            const ref = firestore.collection('system_playbooks').doc(pb.id);
            batch.set(ref, { ...pb, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function getCoverageStatusAction() {
    try {
        const user = await requireUser(['super_user']);
        const superAccess = await isSuperUser();
        if (superAccess) return { planName: 'Super Admin', limit: 999999, currentUsage: 0, canGenerateMore: true };

        const firestore = getAdminFirestore();
        const orgId = user.uid;
        const subDoc = await firestore.collection('organizations').doc(orgId).collection('subscription').doc('current').get();

        let limit = 0;
        let planName = 'Free';
        if (subDoc.exists) {
            const data = subDoc.data() as any;
            const plan = PLANS[data.planId as PlanId];
            if (plan) {

                limit = plan.includedZips || 0;
                planName = plan.name;
            }
        }

        const countSnap = await firestore.collection('foot_traffic').doc('config').collection('zip_pages').where('brandId', '==', orgId).count().get();
        const currentUsage = countSnap.data().count;

        return { planName, limit, currentUsage, canGenerateMore: currentUsage < limit };
    } catch (error) {
        console.error('Error fetching coverage:', error);
        return { planName: 'Unknown', limit: 0, currentUsage: 0, canGenerateMore: false };
    }
}

export async function testEmailDispatch(data: { to: string, subject: string, body: string }): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const htmlBody = data.body || '<p>Test email</p>';
        const result = await sendGenericEmail({
            to: data.to,
            subject: data.subject,
            htmlBody: htmlBody,
            textBody: htmlBody.replace(/<[^>]*>?/gm, '')
        });
        return result.success ? { message: `Email sent to ${data.to}` } : { message: 'Dispatch failed', error: true };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}
