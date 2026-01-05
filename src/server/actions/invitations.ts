'use server';

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import type { Invitation, InvitationRole, InvitationStatus } from '@/types/invitation';
import { CreateInvitationSchema, AcceptInvitationSchema } from '@/types/invitation';
import { FieldValue } from 'firebase-admin/firestore';

// --- ACTIONS ---

/**
 * Create a new Invitation
 */
export async function createInvitationAction(input: z.infer<typeof CreateInvitationSchema>) {
    try {
        const user = await requireUser();
        const firestore = getAdminFirestore();

        // Security Checks
        if (input.role === 'super_admin') {
            const isSuper = await isSuperUser();
            if (!isSuper) {
                throw new Error('Unauthorized: Only Super Admins can invite other Super Admins.');
            }
        } else if (input.role === 'brand' || input.role === 'dispensary') {
            // Must be admin/owner of that org OR super admin
            if (!input.targetOrgId) {
                throw new Error('Target Organization ID is required for this role.');
            }
            // TODO: Add stricter check if user is admin of targetOrgId
        }
        
        // Generate Secure Token
        const token = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
        
        const newInvitation: Invitation = {
            id: uuidv4(),
            email: input.email.toLowerCase(),
            role: input.role,
            targetOrgId: input.targetOrgId,
            invitedBy: user.uid,
            status: 'pending',
            token: token,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Days
        };

        await firestore.collection('invitations').doc(newInvitation.id).set(newInvitation);

        // Send Invitation Email via Mailjet/SendGrid
        const inviteLink = `https://bakedbot.ai/join/${token}`;
        const roleName = input.role.replace('_', ' ').toUpperCase();
        
        try {
            const { sendGenericEmail } = await import('@/lib/email/dispatcher');
            await sendGenericEmail({
                to: input.email,
                name: input.email.split('@')[0],
                subject: `You're invited to join BakedBot as ${roleName}`,
                htmlBody: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #16a34a;">You've Been Invited! 🎉</h2>
                        <p>You've been invited to join <strong>BakedBot</strong> as a <strong>${roleName}</strong>.</p>
                        <p style="margin: 24px 0;">
                            <a href="${inviteLink}" 
                               style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Accept Invitation
                            </a>
                        </p>
                        <p style="color: #666; font-size: 14px;">
                            This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
                        </p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                        <p style="color: #999; font-size: 12px;">
                            BakedBot • AI-Powered Commerce for Cannabis
                        </p>
                    </div>
                `,
                textBody: `You've been invited to join BakedBot as ${roleName}. Accept here: ${inviteLink}`
            });
            console.log(`[createInvitationAction] Email sent to ${input.email}`);
        } catch (emailError) {
            console.warn('[createInvitationAction] Email sending failed, but invitation was created:', emailError);
            // Don't fail the whole operation if email fails
        }

        return { 
            success: true, 
            message: 'Invitation created and email sent.', 
            invitation: newInvitation,
            link: `/join/${token}` // Frontend can prepend domain
        };

    } catch (error: any) {
        console.error('[createInvitationAction] Error:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Get Invitations (Filtered by Org or Role)
 */
export async function getInvitationsAction(orgId?: string) {
    try {
        const user = await requireUser();
        const firestore = getAdminFirestore();
        let query = firestore.collection('invitations').where('status', '==', 'pending');

        if (orgId) {
            query = query.where('targetOrgId', '==', orgId);
        } else {
            // If no orgId, assume Super Admin looking for system invites
             const isSuper = await isSuperUser();
             if (isSuper) {
                 query = query.where('role', '==', 'super_admin');
             } else {
                 return []; // Adding safety
             }
        }

        const snapshot = await query.orderBy('createdAt', 'desc').get();
        
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            createdAt: (doc.data().createdAt as any).toDate(),
            expiresAt: (doc.data().expiresAt as any).toDate(),
        } as Invitation));

    } catch (error: any) {
        console.error('[getInvitationsAction] Error:', error);
        return [];
    }
}

/**
 * Revoke Invitation
 */
export async function revokeInvitationAction(invitationId: string) {
    try {
        await requireUser();
        const firestore = getAdminFirestore();
        
        await firestore.collection('invitations').doc(invitationId).update({
            status: 'revoked'
        });

        return { success: true, message: 'Invitation revoked.' };
    } catch (error: any) {
         return { success: false, message: error.message };
    }
}

/**
 * Validate Invitation Token (Public)
 */
export async function validateInvitationAction(token: string) {
    try {
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('invitations')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { valid: false, message: 'Invalid token.' };
        }

        const data = snapshot.docs[0].data() as Invitation;

        if (data.status !== 'pending') {
            return { valid: false, message: 'Invitation is no longer valid.' };
        }

        if (new Date() > ((data.expiresAt as any).toDate())) {
             return { valid: false, message: 'Invitation has expired.' };
        }

        return { valid: true, invitation: data };

    } catch (error: any) {
        return { valid: false, message: error.message };
    }
}

/**
 * Accept Invitation (Authenticated)
 */
export async function acceptInvitationAction(token: string) {
    try {
        const user = await requireUser();
        const firestore = getAdminFirestore();
        
        const validRes = await validateInvitationAction(token);
        if (!validRes.valid || !validRes.invitation) {
            throw new Error(validRes.message);
        }

        const invite = validRes.invitation;
        
        // Update User Profile based on Role
        const userRef = firestore.collection('users').doc(user.uid);
        
        await firestore.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) throw new Error('User profile not found.');

            // Update Invite Status
            t.update(firestore.collection('invitations').doc(invite.id), {
                status: 'accepted',
                acceptedAt: new Date(),
                acceptedBy: user.uid
            });

            // Update User Roles
            const updates: any = {};
            
            if (invite.role === 'super_admin') {
                // TODO: Update custom claims or role field
                // For now, assume this logic is handled via claims or a specific 'roles' field
                // This might need adjustment specific to your auth setup
                updates.role = 'owner'; // Or a specific flag?
            } else if (invite.role === 'brand' || invite.role === 'dispensary') {
                 // Add to organizationIds
                 updates.organizationIds = FieldValue.arrayUnion(invite.targetOrgId);
                 updates.role = invite.role; // Set primary role?
                 updates.currentOrgId = invite.targetOrgId;
            }
            
            t.update(userRef, updates);
        });

        return { success: true, message: 'Invitation accepted!' };

    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
