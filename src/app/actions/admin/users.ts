'use server';

import { getAdminAuth, getAdminFirestore } from '@/firebase/admin';
import { emailService } from '@/lib/notifications/email-service';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ROLES, isBrandRole, isDispensaryRole } from '@/types/roles';

const InviteUserSchema = z.object({
    email: z.string().email(),
    role: z.enum(ROLES),
    businessName: z.string().min(2, "Business name is required").or(z.literal('')).optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    sendEmail: z.boolean().default(true),
});

export type InviteUserData = z.infer<typeof InviteUserSchema>;

export async function inviteUser(data: InviteUserData): Promise<{ success: boolean; link?: string; error?: string }> {
    try {
        const validated = InviteUserSchema.parse(data);
        const { email, role, businessName, firstName, lastName, sendEmail } = validated;

        const auth = getAdminAuth();
        const db = getAdminFirestore();

        // 1. Check if user exists or create new
        let uid: string;
        let isExistingUser = false;
        try {
            const userRecord = await auth.getUserByEmail(email);
            uid = userRecord.uid;
            isExistingUser = true;
            // Check if they already have this role
            if (userRecord.customClaims?.role === role) {
                return { success: false, error: `User already exists with role: ${userRecord.customClaims.role}` };
            }
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // Create User
                const userRecord = await auth.createUser({
                    email,
                    emailVerified: true, // Auto-verify since admin invited
                    displayName: firstName || businessName || email.split('@')[0],
                    disabled: false,
                });
                uid = userRecord.uid;
            } else {
                throw error;
            }
        }

        const now = new Date();
        let orgId: string | undefined;

        // 2. Create Business Profile based on role
        if (isBrandRole(role) && businessName) {
            orgId = uuidv4();
            await db.collection('brands').doc(orgId).set({
                id: orgId,
                name: businessName,
                ownerId: uid,
                createdAt: now,
                updatedAt: now,
                status: 'pending_onboarding',
                verificationStatus: 'unverified',
                claimStatus: 'claimed',
            });
        } else if (isDispensaryRole(role) && businessName) {
            orgId = uuidv4();
            await db.collection('retailers').doc(orgId).set({
                id: orgId,
                name: businessName,
                ownerId: uid,
                createdAt: now,
                updatedAt: now,
                status: 'active',
                claimStatus: 'claimed',
            });
        }

        // 3. Create/Update User Profile
        const userProfileData: Record<string, any> = {
            uid,
            email,
            firstName: firstName || '',
            lastName: lastName || '',
            role,
            createdAt: now,
            updatedAt: now,
            invitedAt: now,
            isNewUser: true,
        };

        if (orgId) {
            if (isBrandRole(role)) {
                userProfileData.brandId = orgId;
            } else if (isDispensaryRole(role)) {
                userProfileData.dispensaryId = orgId;
                userProfileData.locationId = orgId;
            }
            userProfileData.orgId = orgId;
        }

        await db.collection('users').doc(uid).set(userProfileData, { merge: true });

        // 4. Set Custom Claims
        const claims: Record<string, any> = { role };
        if (orgId) {
            claims.orgId = orgId;
            if (isBrandRole(role)) {
                claims.brandId = orgId;
            } else if (isDispensaryRole(role)) {
                claims.dispensaryId = orgId;
                claims.locationId = orgId;
            }
        }
        await auth.setCustomUserClaims(uid, claims);

        // 5. Generate Password Reset Link (Invite Link)
        const link = await auth.generatePasswordResetLink(email);

        // 6. Send Email via Mailjet (if enabled)
        if (sendEmail) {
            await emailService.sendInvitationEmail(email, link, role, businessName || 'BakedBot');
        }

        revalidatePath('/dashboard/ceo/users');
        return { success: true, link };

    } catch (error: any) {
        console.error('Error inviting user:', error);
        return { success: false, error: error.message || 'Failed to invite user' };
    }
}

/**
 * Resend invitation email to an existing user
 */
export async function resendInvitation(email: string): Promise<{ success: boolean; error?: string }> {
    try {
        const auth = getAdminAuth();
        const db = getAdminFirestore();

        // Get user
        const userRecord = await auth.getUserByEmail(email);
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        const userData = userDoc.data();

        // Generate new reset link
        const link = await auth.generatePasswordResetLink(email);

        // Send email
        await emailService.sendInvitationEmail(
            email,
            link,
            userData?.role || 'user',
            userData?.businessName || 'BakedBot'
        );

        return { success: true };
    } catch (error: any) {
        console.error('Error resending invitation:', error);
        return { success: false, error: error.message || 'Failed to resend invitation' };
    }
}

/**
 * Get pending invitations
 */
export async function getPendingInvitations(): Promise<{ success: boolean; invitations?: any[]; error?: string }> {
    try {
        const db = getAdminFirestore();
        const snapshot = await db
            .collection('users')
            .where('isNewUser', '==', true)
            .where('invitedAt', '!=', null)
            .orderBy('invitedAt', 'desc')
            .limit(50)
            .get();

        const invitations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return { success: true, invitations };
    } catch (error: any) {
        console.error('Error fetching invitations:', error);
        return { success: false, error: error.message };
    }
}
