'use server';

import { z } from 'zod';
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';

import { getAdminFirestore } from '@/firebase/admin';
import { createServerClient } from '@/firebase/server-client';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import type { Invitation, InvitationRole } from '@/types/invitation';
import { CreateInvitationSchema, AcceptInvitationSchema } from '@/types/invitation';
import { requireBrandAccess, requireDispensaryAccess, requirePermission, isBrandRole, isDispensaryRole, normalizeRole } from '@/server/auth/rbac';
import { logger } from '@/lib/logger';

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function getActorOrgId(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null;

    const token = user as {
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
        dispensaryId?: string;
        tenantId?: string;
        organizationId?: string;
    };

    return (
        token.currentOrgId ||
        token.orgId ||
        token.brandId ||
        token.dispensaryId ||
        token.tenantId ||
        token.organizationId ||
        null
    );
}

function isValidDocumentId(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        value.length >= 3 &&
        value.length <= 128 &&
        !/[\/\\?#\[\]]/.test(value)
    );
}

function getCanonicalAppUrl(): string {
    return process.env.NEXT_PUBLIC_CANONICAL_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://bakedbot.ai';
}

function getInvitationCopy(role: InvitationRole, organizationName?: string) {
    const targetName = organizationName || 'BakedBot';

    return {
        subject: `Invitation to join ${targetName}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #16a34a;">You've been invited!</h1>
                <p>You have been invited to join <strong>${targetName}</strong> as a <strong>${role}</strong>.</p>
                <p style="margin: 20px 0;">
                    <a href="__INVITE_LINK__" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Accept Invitation
                    </a>
                </p>
                <p>Or copy this link:</p>
                <p style="background-color: #f5f5f5; padding: 10px; font-family: monospace; word-break: break-all;">__INVITE_LINK__</p>
                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                    This link expires in 7 days. If you didn't expect this invitation, you can ignore this email.
                </p>
            </div>
        `,
        text: `You've been invited!\n\nYou have been invited to join ${targetName} as a ${role}.\n\nAccept Invitation:\n__INVITE_LINK__\n\nThis link expires in 7 days. If you didn't expect this invitation, you can ignore this email.`,
    };
}

async function resolveInvitationOrganization(
    firestore: FirebaseFirestore.Firestore,
    targetOrgId: string,
    role: InvitationRole
): Promise<{ organizationName?: string; organizationType?: 'brand' | 'dispensary' }> {
    const fallbackType: 'brand' | 'dispensary' | undefined = isBrandRole(role)
        ? 'brand'
        : isDispensaryRole(role)
            ? 'dispensary'
            : undefined;

    const orgDoc = await firestore.collection('organizations').doc(targetOrgId).get();
    if (orgDoc.exists) {
        const orgData = orgDoc.data();
        return {
            organizationName: typeof orgData?.name === 'string' ? orgData.name : undefined,
            organizationType: orgData?.type === 'brand' || orgData?.type === 'dispensary' ? orgData.type : fallbackType,
        };
    }

    if (isBrandRole(role)) {
        const brandDoc = await firestore.collection('brands').doc(targetOrgId).get();
        if (brandDoc.exists) {
            return {
                organizationName: brandDoc.data()?.name,
                organizationType: 'brand',
            };
        }

        const brandByOrgSnap = await firestore.collection('brands').where('orgId', '==', targetOrgId).limit(1).get();
        if (!brandByOrgSnap.empty) {
            return {
                organizationName: brandByOrgSnap.docs[0].data()?.name,
                organizationType: 'brand',
            };
        }
    }

    if (isDispensaryRole(role)) {
        const retailerDoc = await firestore.collection('retailers').doc(targetOrgId).get();
        if (retailerDoc.exists) {
            return {
                organizationName: retailerDoc.data()?.name,
                organizationType: 'dispensary',
            };
        }
    }

    return { organizationType: fallbackType };
}

export async function createInvitationAction(input: z.infer<typeof CreateInvitationSchema>) {
    try {
        const parsed = CreateInvitationSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                message: parsed.error.issues[0]?.message || 'Invalid invitation payload',
            };
        }

        const validatedInput = parsed.data;
        const user = await requireUser();
        const firestore = getAdminFirestore();
        const actorRole = (user as { role?: string }).role;

        if (validatedInput.role === 'super_user' || validatedInput.role === 'super_admin' || validatedInput.role === 'intern') {
            const isSuper = isSuperRole(actorRole) || await isSuperUser();
            if (!isSuper) {
                throw new Error('Unauthorized: Only Super Users can invite platform-level roles.');
            }
        } else if (isBrandRole(validatedInput.role)) {
            if (!validatedInput.targetOrgId) {
                throw new Error('Target Organization ID is required for this role.');
            }

            requireBrandAccess(user as any, validatedInput.targetOrgId);
            requirePermission(user as any, 'manage:team');
        } else if (isDispensaryRole(validatedInput.role)) {
            if (!validatedInput.targetOrgId) {
                throw new Error('Target Organization ID is required for this role.');
            }

            requireDispensaryAccess(user as any, validatedInput.targetOrgId);
            requirePermission(user as any, 'manage:team');
        }

        let organizationName: string | undefined;
        let organizationType: 'brand' | 'dispensary' | undefined;

        if (validatedInput.targetOrgId) {
            const resolvedOrg = await resolveInvitationOrganization(firestore, validatedInput.targetOrgId, validatedInput.role);
            organizationName = resolvedOrg.organizationName;
            organizationType = resolvedOrg.organizationType;
        }

        const token = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
        const inviteLink = `${getCanonicalAppUrl()}/invite/${token}`;

        const newInvitation: Invitation = {
            id: uuidv4(),
            email: validatedInput.email.toLowerCase(),
            role: validatedInput.role,
            targetOrgId: validatedInput.targetOrgId,
            organizationName,
            organizationType,
            invitedBy: user.uid,
            status: 'pending',
            token,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };

        await firestore.collection('invitations').doc(newInvitation.id).set(newInvitation);

        let emailSent = false;
        let emailError: string | null = null;

        if (validatedInput.sendEmail) {
            const inviteCopy = getInvitationCopy(validatedInput.role, organizationName);

            try {
                const { sendGenericEmail } = await import('@/lib/email/dispatcher');
                const result = await sendGenericEmail({
                    to: validatedInput.email,
                    name: validatedInput.email.split('@')[0],
                    subject: inviteCopy.subject,
                    htmlBody: inviteCopy.html.replaceAll('__INVITE_LINK__', inviteLink),
                    textBody: inviteCopy.text.replaceAll('__INVITE_LINK__', inviteLink),
                    fromEmail: 'hello@bakedbot.ai',
                    fromName: 'BakedBot Team',
                });

                if (result.success) {
                    emailSent = true;
                    logger.info('[createInvitationAction] Invitation email sent', {
                        email: validatedInput.email,
                        role: validatedInput.role,
                        targetOrgId: validatedInput.targetOrgId,
                    });
                } else {
                    emailError = result.error || 'Unknown error';
                    logger.warn('[createInvitationAction] Invitation email failed', {
                        email: validatedInput.email,
                        error: emailError,
                    });
                }
            } catch (emailException) {
                emailError = emailException instanceof Error ? emailException.message : String(emailException);
                logger.error('[createInvitationAction] Invitation email exception', {
                    email: validatedInput.email,
                    error: emailError,
                });
            }
        }

        return {
            success: true,
            message: validatedInput.sendEmail
                ? emailSent
                    ? 'Invitation created and emailed successfully.'
                    : `Invitation created, but email delivery failed: ${emailError || 'Unknown error'}.`
                : 'Invitation created. Share the link below.',
            invitation: newInvitation,
            link: inviteLink,
            emailSent,
            emailError: emailError || undefined,
        };
    } catch (error: any) {
        console.error('[createInvitationAction] Error:', error);
        return { success: false, message: error.message };
    }
}

export async function getInvitationsAction(orgId?: string) {
    try {
        const user = await requireUser();
        const firestore = getAdminFirestore();
        const userRole: string | null = (user as { role?: string }).role ?? null;
        const isSuper = isSuperRole(userRole) || await isSuperUser();
        const actorOrgId = getActorOrgId(user);

        if (orgId) {
            if (!isSuper && (!actorOrgId || actorOrgId !== orgId)) {
                return [];
            }

            if (isBrandRole(userRole)) {
                requireBrandAccess(user as any, orgId);
            } else if (isDispensaryRole(userRole)) {
                requireDispensaryAccess(user as any, orgId);
            }

            const snapshot = await firestore
                .collection('invitations')
                .where('status', '==', 'pending')
                .where('targetOrgId', '==', orgId)
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: (firestoreTimestampToDate(data.createdAt) ?? new Date()),
                    expiresAt: (firestoreTimestampToDate(data.expiresAt) ?? new Date()),
                } as Invitation;
            });
        }

        if (!isSuper) return [];

        const snapshot = await firestore
            .collection('invitations')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .get();

        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                ...data,
                createdAt: (firestoreTimestampToDate(data.createdAt) ?? new Date()),
                expiresAt: (firestoreTimestampToDate(data.expiresAt) ?? new Date()),
            } as Invitation;
        });
    } catch (error: any) {
        console.error('[getInvitationsAction] Error:', error);
        return [];
    }
}

export async function revokeInvitationAction(invitationId: string) {
    try {
        if (!isValidDocumentId(invitationId)) {
            return { success: false, message: 'Invalid invitation ID' };
        }

        const user = await requireUser();
        const firestore = getAdminFirestore();
        const userRole: string | null = (user as { role?: string }).role ?? null;
        const isSuper = isSuperRole(userRole) || await isSuperUser();

        const inviteRef = firestore.collection('invitations').doc(invitationId);
        const inviteDoc = await inviteRef.get();
        if (!inviteDoc.exists) {
            throw new Error('Invitation not found.');
        }

        const invite = inviteDoc.data() as Invitation;
        const isInviter = invite.invitedBy === user.uid;
        let isAdminOfTarget = false;

        if (invite.targetOrgId) {
            const actorRole: string | null = (user as { role?: string }).role ?? null;

            if (isBrandRole(actorRole)) {
                try {
                    requireBrandAccess(user as any, invite.targetOrgId);
                    requirePermission(user as any, 'manage:team');
                    isAdminOfTarget = true;
                } catch {}
            } else if (isDispensaryRole(actorRole)) {
                try {
                    requireDispensaryAccess(user as any, invite.targetOrgId);
                    requirePermission(user as any, 'manage:team');
                    isAdminOfTarget = true;
                } catch {}
            }
        }

        if (!isInviter && !isAdminOfTarget && !isSuper) {
            throw new Error('Unauthorized to revoke this invitation.');
        }

        await inviteRef.update({ status: 'revoked' });

        return { success: true, message: 'Invitation revoked.' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function validateInvitationAction(token: string) {
    try {
        const parsed = AcceptInvitationSchema.safeParse({ token });
        if (!parsed.success) {
            return { valid: false, message: 'Invalid token.' };
        }

        const firestore = getAdminFirestore();
        const snapshot = await firestore
            .collection('invitations')
            .where('token', '==', parsed.data.token)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { valid: false, message: 'Invalid token.' };
        }

        const data = snapshot.docs[0].data() as Invitation;
        if (data.status !== 'pending') {
            return { valid: false, message: 'Invitation is no longer valid.' };
        }

        if (new Date() > (firestoreTimestampToDate(data.expiresAt) ?? new Date())) {
            return { valid: false, message: 'Invitation has expired.' };
        }

        return {
            valid: true,
            invitation: {
                ...data,
                createdAt: (firestoreTimestampToDate(data.createdAt) ?? new Date()),
                expiresAt: (firestoreTimestampToDate(data.expiresAt) ?? new Date()),
            } as Invitation,
        };
    } catch (error: any) {
        return { valid: false, message: error.message };
    }
}

export async function acceptInvitationAction(token: string) {
    try {
        const parsed = AcceptInvitationSchema.safeParse({ token });
        if (!parsed.success) {
            return { success: false, message: 'Invalid token.' };
        }

        const user = await requireUser();
        const { auth } = await createServerClient();
        const firestore = getAdminFirestore();

        const validRes = await validateInvitationAction(parsed.data.token);
        if (!validRes.valid || !validRes.invitation) {
            throw new Error(validRes.message);
        }

        const invite = validRes.invitation;
        const normalizedInviteRole = invite.role === 'super_admin' ? 'super_user' : normalizeRole(invite.role);

        let orgName = invite.organizationName || 'Unknown Org';
        let orgType: 'brand' | 'dispensary' = invite.organizationType || (isBrandRole(invite.role) ? 'brand' : 'dispensary');

        if (invite.targetOrgId) {
            const resolvedOrg = await resolveInvitationOrganization(firestore, invite.targetOrgId, invite.role);
            orgName = resolvedOrg.organizationName || orgName;
            orgType = resolvedOrg.organizationType || orgType;
        }

        const userRef = firestore.collection('users').doc(user.uid);
        let userName: string | undefined;

        await firestore.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const existingData = userDoc.exists ? userDoc.data() : undefined;

            userName =
                existingData?.name ||
                existingData?.displayName ||
                ((user as { email?: string }).email ? String((user as { email?: string }).email).split('@')[0] : undefined);

            transaction.update(firestore.collection('invitations').doc(invite.id), {
                status: 'accepted',
                acceptedAt: new Date(),
                acceptedBy: user.uid,
            });

            const updates: Record<string, unknown> = {
                updatedAt: new Date(),
            };

            if (!userDoc.exists) {
                updates.uid = user.uid;
                updates.email = (user as { email?: string }).email || invite.email;
                updates.createdAt = new Date();
            }

            if (normalizedInviteRole === 'super_user') {
                updates.role = 'super_user';
            } else if (invite.targetOrgId && (isBrandRole(normalizedInviteRole) || isDispensaryRole(normalizedInviteRole))) {
                updates.organizationIds = FieldValue.arrayUnion(invite.targetOrgId);
                updates.role = normalizedInviteRole;
                updates.orgId = invite.targetOrgId;
                updates.currentOrgId = invite.targetOrgId;

                if (isBrandRole(normalizedInviteRole)) {
                    updates.brandId = invite.targetOrgId;
                } else {
                    updates.dispensaryId = invite.targetOrgId;
                    updates.locationId = invite.targetOrgId;
                }

                updates[`orgMemberships.${invite.targetOrgId}`] = {
                    orgId: invite.targetOrgId,
                    orgName,
                    orgType,
                    role: normalizedInviteRole,
                    joinedAt: new Date().toISOString(),
                };
            } else {
                updates.role = normalizedInviteRole;
            }

            if (userDoc.exists) {
                transaction.update(userRef, updates);
            } else {
                transaction.set(userRef, updates, { merge: true });
            }
        });

        if (invite.targetOrgId && (isBrandRole(normalizedInviteRole) || isDispensaryRole(normalizedInviteRole))) {
            try {
                const claims: Record<string, unknown> = {
                    role: normalizedInviteRole,
                    orgId: invite.targetOrgId,
                    currentOrgId: invite.targetOrgId,
                };

                if (isBrandRole(normalizedInviteRole)) {
                    claims.brandId = invite.targetOrgId;
                } else {
                    claims.dispensaryId = invite.targetOrgId;
                    claims.locationId = invite.targetOrgId;
                }

                await auth.setCustomUserClaims(user.uid, claims);
                // NOTE: We intentionally do NOT call revokeRefreshTokens here.
                // Revoking tokens invalidates the server session cookie (verifySessionCookie checkRevoked=true),
                // forcing the user back through sign-in where a race condition (5s token timeout) routes
                // them to /onboarding. Instead, the invite client force-refreshes the token client-side
                // after acceptance to pick up the new claims.
                logger.info('[acceptInvitationAction] Custom claims updated', {
                    userId: user.uid,
                    role: normalizedInviteRole,
                    orgId: invite.targetOrgId,
                });
            } catch (claimsError) {
                logger.error('[acceptInvitationAction] Failed to update custom claims', {
                    userId: user.uid,
                    error: claimsError instanceof Error ? claimsError.message : String(claimsError),
                });
            }
        }

        try {
            const { handlePlatformSignup } = await import('./platform-signup');
            await handlePlatformSignup({
                userId: user.uid,
                email: invite.email,
                firstName: userName?.split(' ')[0],
                lastName: userName?.split(' ').slice(1).join(' '),
                role: normalizedInviteRole as any,
                orgId: invite.targetOrgId,
                brandId: invite.targetOrgId && isBrandRole(normalizedInviteRole) ? invite.targetOrgId : undefined,
                dispensaryId: invite.targetOrgId && isDispensaryRole(normalizedInviteRole) ? invite.targetOrgId : undefined,
            });
            logger.info('[Invitations] Welcome email triggered for invited user', {
                userId: user.uid,
                email: invite.email,
                role: normalizedInviteRole,
            });
        } catch (welcomeError) {
            logger.error('[Invitations] Failed to trigger welcome email', {
                userId: user.uid,
                error: welcomeError instanceof Error ? welcomeError.message : String(welcomeError),
            });
        }

        return { success: true, message: 'Invitation accepted!' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
