'use server';

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import type { Invitation, InvitationRole, InvitationStatus } from '@/types/invitation';
import { CreateInvitationSchema, AcceptInvitationSchema } from '@/types/invitation';
import { FieldValue } from 'firebase-admin/firestore';
import { requireBrandAccess, requireDispensaryAccess, requirePermission, isBrandRole, isDispensaryRole, isBrandAdmin, isDispensaryAdmin } from '@/server/auth/rbac';

// --- ACTIONS ---

/**
 * Create a new Invitation
 */
export async function createInvitationAction(input: z.infer<typeof CreateInvitationSchema>) {
    try {
        const user = await requireUser();
        const firestore = getAdminFirestore();

        // Security Checks
        if (input.role === 'super_user' || input.role === 'super_admin' || input.role === 'intern') {
            const isSuper = await isSuperUser();
            if (!isSuper) {
                throw new Error('Unauthorized: Only Super Users can invite platform-level roles.');
            }
        } else if (isBrandRole(input.role)) {
            // Must be admin of that brand
            if (!input.targetOrgId) {
                throw new Error('Target Organization ID is required for this role.');
            }
            // Enforce Access & Permission
            requireBrandAccess(user as any, input.targetOrgId);
            requirePermission(user as any, 'manage:team');
            
        } else if (isDispensaryRole(input.role)) {
            // Must be admin of that dispensary
            if (!input.targetOrgId) {
                throw new Error('Target Organization ID is required for this role.');
            }
            // Enforce Access & Permission
            requireDispensaryAccess(user as any, input.targetOrgId);
            requirePermission(user as any, 'manage:team');
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
            // Security: Ensure user has access to this org
            // We assume orgId matches user's context, but explicit check is safer
            const userRole = (user as any).role;
            
            if (isBrandRole(userRole)) {
                requireBrandAccess(user as any, orgId);
            } else if (isDispensaryRole(userRole)) {
                requireDispensaryAccess(user as any, orgId);
            }
            
            query = query.where('targetOrgId', '==', orgId);
        } else {
            // If no orgId, only Super Admin can query all (or filtered by system role)
             const isSuper = await isSuperUser();
             if (!isSuper) return []; // Unauthorized
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
        const user = await requireUser();
        const firestore = getAdminFirestore();
        
        const inviteRef = firestore.collection('invitations').doc(invitationId);
        const inviteDoc = await inviteRef.get();
        if (!inviteDoc.exists) throw new Error('Invitation not found.');
        
        const invite = inviteDoc.data() as Invitation;
        
        // Ownership Check: 
        // 1. Inviter can revoke
        // 2. Admin of the target org can revoke
        const isInviter = invite.invitedBy === user.uid;
        let isAdminOfTarget = false;
        
        if (invite.targetOrgId) {
             const userRole = (user as any).role;
             if (isBrandRole(userRole)) {
                  // Check if user is admin of target brand
                  // requireBrandAccess checks if user is LINKED to brand.
                  // requirePermission checks if user is ADMIN.
                  try {
                      requireBrandAccess(user as any, invite.targetOrgId);
                      requirePermission(user as any, 'manage:team');
                      isAdminOfTarget = true;
                  } catch {}
             } else if (isDispensaryRole(userRole)) {
                  try {
                      requireDispensaryAccess(user as any, invite.targetOrgId);
                      requirePermission(user as any, 'manage:team');
                      isAdminOfTarget = true;
                  } catch {}
             }
        }
        
        const isSuper = await isSuperUser();

        if (!isInviter && !isAdminOfTarget && !isSuper) {
             throw new Error('Unauthorized to revoke this invitation.');
        }
        
        await inviteRef.update({
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
                updates.role = 'super_user'; // Or a specific flag?
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
