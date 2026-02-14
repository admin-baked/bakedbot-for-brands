'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { createServerClient } from '@/firebase/server-client';
import { revalidatePath } from 'next/cache';
import { ActionResult } from './types';


export async function getAllUsers() {
    try {
        const { firestore: fs } = await createServerClient();
        await requireUser(['super_user']);

        const usersSnap = await fs.collection('users').orderBy('createdAt', 'desc').get();

        return usersSnap.docs.map((doc: any) => {

            const data = doc.data();
            return {
                id: doc.id,
                email: data.email || null,
                displayName: data.displayName || data.name || null,
                role: data.role || null,
                roles: data.roles || [],
                customClaims: data.customClaims || null,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
                lastLogin: data.lastLogin?.toDate?.()?.toISOString() || null,
                approvalStatus: data.approvalStatus || 'approved',
            };
        });
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
    }
}

export async function promoteToSuperUser(uid: string) {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['super_user']);
        const { getAdminAuth } = await import('@/firebase/admin');
        await getAdminAuth().setCustomUserClaims(uid, { role: 'super_user' });
        await firestore.collection('users').doc(uid).update({
            roles: ['super_user'],
            updatedAt: new Date()
        });
        return { success: true, message: 'User promoted to Super User' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function approveUser(uid: string) {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['super_user']);
        await firestore.collection('users').doc(uid).update({
            approvalStatus: 'approved',
            approvedAt: new Date().toISOString(),
            status: 'active'
        });
        const userDoc = await firestore.collection('users').doc(uid).get();
        const userData = userDoc.data();
        if (userData?.email) {
            const { emailService } = await import('@/lib/notifications/email-service');
            await emailService.sendAccountApprovedEmail({
                email: userData.email,
                name: userData.displayName || undefined
            });
        }
        return { success: true, message: 'User approved' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function rejectUser(uid: string) {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['super_user']);
        await firestore.collection('users').doc(uid).update({
            approvalStatus: 'rejected',
            status: 'disabled'
        });
        return { success: true, message: 'User rejected' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateUserRoleAction(uid: string, role: string): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        await firestore.collection('users').doc(uid).update({ role });
        return { message: 'User role updated successfully' };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function deleteUserAction(uid: string): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        await firestore.collection('users').doc(uid).delete();
        return { message: 'User deleted successfully' };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function getInvitationsAction() {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('invitations').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
    } catch (error) {
        console.error('Error fetching invitations:', error);
        return [];
    }
}

export async function createInvitationAction(email: string, role: string): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const invitation = {
            email,
            role,
            status: 'pending',
            createdAt: new Date(),
        };
        await firestore.collection('invitations').add(invitation);
        return { message: `Invitation sent to ${email}` };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function cancelInvitationAction(id: string): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        await firestore.collection('invitations').doc(id).delete();
        return { message: 'Invitation cancelled' };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function inviteToClaimAction(id: string, type: 'brand' | 'dispensary'): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const collection = type === 'brand' ? 'crm_brands' : 'crm_dispensaries';
        const docRef = firestore.collection(collection).doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { message: `${type} not found in CRM`, error: true };
        }

        const data = doc.data();
        if (!data?.website && !data?.email) {
            return { message: 'No contact information available (email or website needed)', error: true };
        }

        let recipientEmail = data.email;
        if (!recipientEmail && data.website) {
            try {
                const urlString = data.website.startsWith('http') ? data.website : `https://${data.website}`;
                const url = new URL(urlString);
                recipientEmail = `info@${url.hostname.replace('www.', '')}`;
            } catch (e) {
                return { message: 'Invalid website URL for contact lookup', error: true };
            }
        }

        if (!recipientEmail) {
            return { message: 'Could not determine recipient email address', error: true };
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot-for-brands.web.app';
        const claimUrl = `${appUrl}/claim?name=${encodeURIComponent(data.name)}&orgId=${data.seoPageId || ''}`;

        const { getClaimInviteEmailTemplate } = await import('@/lib/email/autoresponder-templates');
        const template = getClaimInviteEmailTemplate({
            recipientEmail,
            entityName: data.name,
            entityType: type,
            claimUrl
        });

        const { sendOrderConfirmationEmail } = await import('@/lib/email/dispatcher');
        const sent = await sendOrderConfirmationEmail({
            orderId: `INVITE-${id.substring(0, 8)}`,
            customerEmail: recipientEmail,
            customerName: data.name,
            total: 0,
            items: [{ name: `Claim Your ${type === 'brand' ? 'Brand' : 'Dispensary'} Page`, qty: 1, price: 0 }],
            retailerName: 'BakedBot AI',
            pickupAddress: template.htmlContent
        });

        if (!sent) {
            return { message: 'Email dispatch failed. Check provider settings.', error: true };
        }

        await docRef.update({
            claimStatus: 'invited',
            invitationSentAt: new Date()
        });

        revalidatePath('/dashboard/ceo');
        return { message: `Invitation successfully sent to ${recipientEmail}` };
    } catch (error: any) {
        console.error('[inviteToClaimAction] Error:', error);
        return { message: `Failed to send invitation: ${error.message}`, error: true };
    }
}

export async function bulkSeoPageStatusAction(
    pageIds: string[],
    pageType: 'zip' | 'dispensary',
    published: boolean
): Promise<ActionResult & { count?: number }> {
    try {
        await requireUser(['super_user']);
        if (!pageIds.length) {
            return { message: 'No pages selected.', error: true };
        }

        const firestore = getAdminFirestore();
        const collection = pageType === 'zip' ? 'zip_pages' : 'dispensary_pages';
        const batch = firestore.batch();

        for (const pageId of pageIds) {
            const ref = firestore.collection('foot_traffic').doc('config').collection(collection).doc(pageId);
            batch.update(ref, {
                published,
                status: published ? 'published' : 'draft',
                indexable: published,
                updatedAt: new Date()
            });
        }

        await batch.commit();

        return {
            message: `Successfully ${published ? 'published' : 'set to draft'} ${pageIds.length} pages.`,
            count: pageIds.length
        };
    } catch (error: any) {
        console.error('[bulkSeoPageStatusAction] Error:', error);
        return { message: `Failed to bulk update: ${error.message}`, error: true };
    }
}
