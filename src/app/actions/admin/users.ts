'use server';

import { getAdminAuth, getAdminFirestore } from '@/firebase/admin';
import { emailService } from '@/lib/notifications/email-service';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const InviteUserSchema = z.object({
    email: z.string().email(),
    role: z.enum(['brand', 'dispensary', 'customer']),
    businessName: z.string().min(2, "Business name is required"),
    firstName: z.string().optional(),
});

export type InviteUserData = z.infer<typeof InviteUserSchema>;

export async function inviteUser(data: InviteUserData): Promise<{ success: boolean; link?: string; error?: string }> {
    try {
        const validated = InviteUserSchema.parse(data);
        const { email, role, businessName, firstName } = validated;

        const auth = getAdminAuth();
        const db = getAdminFirestore();

        // 1. Check if user exists or create new
        let uid: string;
        try {
            const userRecord = await auth.getUserByEmail(email);
            // User exists - we might want to just add role, but for now assuming new invite
            uid = userRecord.uid;
            // Optionally check if they already have a role
            if (userRecord.customClaims?.role) {
                return { success: false, error: `User already exists with role: ${userRecord.customClaims.role}` };
            }
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // Create User
                const userRecord = await auth.createUser({
                    email,
                    emailVerified: true, // Auto-verify since admin invited
                    displayName: firstName || businessName,
                    disabled: false,
                });
                uid = userRecord.uid;
            } else {
                throw error;
            }
        }

        // 2. Create Business Profile (Brand or Dispensary)
        const orgId = uuidv4();
        const now = new Date();

        if (role === 'brand') {
            await db.collection('brands').doc(orgId).set({
                id: orgId,
                name: businessName,
                ownerId: uid,
                createdAt: now,
                updatedAt: now,
                status: 'pending_onboarding' // Or active
            });
        } else if (role === 'dispensary') {
            await db.collection('dispensaries').doc(orgId).set({
                id: orgId,
                name: businessName,
                ownerId: uid,
                createdAt: now,
                updatedAt: now,
                status: 'active'
            });
        }

        // 3. Create User Profile
        await db.collection('users').doc(uid).set({
            uid,
            email,
            firstName: firstName || 'Admin',
            lastName: '',
            role,
            [role === 'brand' ? 'brandId' : 'dispensaryId']: orgId,
            createdAt: now,
            updatedAt: now,
        }, { merge: true });

        // 4. Set Custom Claims
        const claims = {
            role,
            [role === 'brand' ? 'brandId' : 'dispensaryId']: orgId,
            orgId // Generic access
        };
        await auth.setCustomUserClaims(uid, claims);

        // 5. Generate Password Reset Link (Invite Link)
        const link = await auth.generatePasswordResetLink(email);

        // 6. Send Email
        await emailService.sendInvitationEmail(email, link, role, businessName);

        // revalidatePath('/dashboard/ceo/users'); // If we had a list page
        return { success: true, link }; // Return link for live onboarding

    } catch (error: any) {
        console.error('Error inviting user:', error);
        return { success: false, error: error.message || 'Failed to invite user' };
    }
}
