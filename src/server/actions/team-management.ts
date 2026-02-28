'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { canAccessOrg, requirePermission } from '@/server/auth/rbac';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import type { OrgContext } from '@/types/org-membership';
import { ROLES } from '@/types/roles';

const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

function isValidDocumentId(value: unknown): value is string {
  return typeof value === 'string' && DOCUMENT_ID_REGEX.test(value);
}

function assertValidDocumentId(value: unknown, field: string): asserts value is string {
  if (!isValidDocumentId(value)) {
    throw new Error(`${field} is required`);
  }
}

function assertOrgAccess(user: unknown, orgId: string): void {
  if (!canAccessOrg(user as any, orgId)) {
    throw new Error('Unauthorized');
  }
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number.isFinite(Number(value)) ? Number(value) : fallback;
  const intValue = Math.floor(parsed);
  return Math.min(max, Math.max(min, intValue));
}

const orgLocationCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(250).optional(),
  state: z.string().trim().min(2).max(64),
  posProvider: z.string().trim().max(64).optional(),
  posApiKey: z.string().trim().max(256).optional(),
  posDispensaryId: z.string().trim().max(128).optional(),
});

const orgLocationUpdateSchema = orgLocationCreateSchema.partial();

const userRoleSchema = z.enum(ROLES);

/**
 * Get all users in an organization with their roles and invitation status
 */
export async function getUsersByOrg(orgId: string) {
  try {
    assertValidDocumentId(orgId, 'orgId');
    const user = await requireUser();
    assertOrgAccess(user, orgId);
    requirePermission(user as any, 'manage:team');

    const { firestore } = await createServerClient();

    // Fetch all users belonging to this org
    const usersSnap = await firestore
      .collection('users')
      .where('organizationIds', 'array-contains', orgId)
      .orderBy('createdAt', 'desc')
      .get();

    const users = usersSnap.docs.map((doc) => {
      const data = doc.data() as any;
      const membership = data.orgMemberships?.[orgId];
      return {
        id: doc.id,
        uid: doc.id,
        email: data.email,
        displayName: data.displayName || data.name,
        role: membership?.role || data.role, // Use org-specific role if available
        orgMemberships: data.orgMemberships,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        joinedAt: membership?.joinedAt || data.createdAt?.toDate?.()?.toISOString(),
        approvalStatus: data.approvalStatus || 'approved',
      };
    });

    // Fetch pending invitations for this org
    const invitationsSnap = await firestore
      .collection('invitations')
      .where('targetOrgId', '==', orgId)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();

    const invitations = invitationsSnap.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        email: data.email,
        role: data.role,
        status: 'pending' as const,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        expiresAt: data.expiresAt?.toDate?.() || new Date(),
      };
    });

    return {
      success: true,
      data: {
        members: users,
        invitations,
        memberCount: users.length,
        invitationCount: invitations.length,
      },
    };
  } catch (error: any) {
    logger.error('[getUsersByOrg] Error:', { error: error.message, orgId });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Remove a user from an organization
 */
export async function removeUserFromOrg(userId: string, orgId: string) {
  try {
    assertValidDocumentId(userId, 'userId');
    assertValidDocumentId(orgId, 'orgId');
    const user = await requireUser();

    assertOrgAccess(user, orgId);
    requirePermission(user as any, 'manage:team');
    const { firestore, auth } = await createServerClient();

    // Fetch target user
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data() as any;
    const organizationIds = userData.organizationIds || [];

    // Remove org from user's organization list
    await firestore.collection('users').doc(userId).update({
      organizationIds: FieldValue.arrayRemove(orgId),
      [`orgMemberships.${orgId}`]: FieldValue.delete(),
    });

    // If this was their current org, switch to another org in their list
    if (userData.currentOrgId === orgId) {
      const remainingOrgs = organizationIds.filter((id: string) => id !== orgId);
      if (remainingOrgs.length > 0) {
        const newCurrentOrgId = remainingOrgs[0];
        const membership = userData.orgMemberships?.[newCurrentOrgId];
        await firestore.collection('users').doc(userId).update({
          currentOrgId: newCurrentOrgId,
          role: membership?.role || 'customer',
        });

        // Update Firebase custom claims
        if (membership?.role) {
          const claims: Record<string, any> = {
            role: membership.role,
            orgId: newCurrentOrgId,
            currentOrgId: newCurrentOrgId,
          };
          await auth.setCustomUserClaims(userId, claims);
        }
      } else {
        // No other orgs, clear context
        await firestore.collection('users').doc(userId).update({
          currentOrgId: null,
          role: 'customer',
        });
        await auth.setCustomUserClaims(userId, { role: 'customer' });
      }
    }

    logger.info('[removeUserFromOrg] User removed from org', { userId, orgId });
    return {
      success: true,
      message: `User removed from organization`,
    };
  } catch (error: any) {
    logger.error('[removeUserFromOrg] Error:', { error: error.message, userId, orgId });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update a user's role within an organization
 */
export async function updateUserOrgRole(
  userId: string,
  orgId: string,
  newRole: string
) {
  try {
    assertValidDocumentId(userId, 'userId');
    assertValidDocumentId(orgId, 'orgId');
    const user = await requireUser();
    const validatedRole = userRoleSchema.parse(newRole);

    assertOrgAccess(user, orgId);
    requirePermission(user as any, 'manage:team');

    if (validatedRole === 'super_user' || validatedRole === 'super_admin') {
      if ((user as any).role !== 'super_user' && (user as any).role !== 'super_admin') {
        throw new Error('Unauthorized');
      }
    }
    const { firestore, auth } = await createServerClient();

    // Fetch user and org
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists) {
      return { success: false, error: 'Organization not found' };
    }

    const userData = userDoc.data() as any;
    const orgData = orgDoc.data() as any;

    // Update org membership
    await firestore.collection('users').doc(userId).update({
      [`orgMemberships.${orgId}`]: {
        orgId,
        orgName: orgData.name || 'Unknown Org',
        orgType: orgData.type || 'brand',
        role: validatedRole,
        joinedAt: userData.orgMemberships?.[orgId]?.joinedAt || new Date().toISOString(),
      },
    });

    // If this is their current org, also update users.role + custom claims
    if (userData.currentOrgId === orgId) {
      await firestore.collection('users').doc(userId).update({
        role: validatedRole,
      });

      // Update Firebase custom claims
      const claims: Record<string, any> = {
        role: validatedRole,
        orgId,
        currentOrgId: orgId,
      };
      await auth.setCustomUserClaims(userId, claims);
    }

    logger.info('[updateUserOrgRole] User role updated', { userId, orgId, newRole: validatedRole });
    return {
      success: true,
      message: `User role updated to ${validatedRole}`,
    };
  } catch (error: any) {
    logger.error('[updateUserOrgRole] Error:', { error: error.message, userId, orgId });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Switch the current user's organization context (for multi-org users)
 */
export async function switchOrgContext(orgId: string) {
  try {
    assertValidDocumentId(orgId, 'orgId');
    const user = await requireUser();
    const { firestore, auth } = await createServerClient();

    // Verify user is member of this org
    if (!user.organizationIds || !user.organizationIds.includes(orgId)) {
      return { success: false, error: 'You are not a member of this organization' };
    }

    const userDoc = await firestore.collection('users').doc(user.uid).get();
    const userData = userDoc.data() as any;
    const membership = userData?.orgMemberships?.[orgId];

    if (!membership) {
      return { success: false, error: 'No role found for this organization' };
    }

    // Update Firestore
    await firestore.collection('users').doc(user.uid).update({
      currentOrgId: orgId,
      role: membership.role,
    });

    // Update Firebase custom claims
    const claims: Record<string, any> = {
      role: membership.role,
      orgId,
      currentOrgId: orgId,
    };

    // Add org-specific claim (brandId for brands, orgId for dispensaries)
    if (membership.orgType === 'brand') {
      claims.brandId = orgId;
    } else {
      // For dispensaries, get the first location
      const locSnap = await firestore
        .collection('locations')
        .where('orgId', '==', orgId)
        .limit(1)
        .get();
      if (!locSnap.empty) {
        claims.locationId = locSnap.docs[0].id;
      }
    }

    await auth.setCustomUserClaims(user.uid, claims);

    logger.info('[switchOrgContext] Organization context switched', { userId: user.uid, orgId });
    return {
      success: true,
      message: `Switched to ${membership.orgName}`,
      orgContext: membership,
    };
  } catch (error: any) {
    logger.error('[switchOrgContext] Error:', { error: error.message, orgId });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get list of organizations for a user (for org switcher)
 */
export async function getOrgsForUser(uid?: string) {
  try {
    const user = await requireUser();
    if (uid !== undefined) {
      assertValidDocumentId(uid, 'uid');
    }
    const userId = uid || user.uid;
    const isSuperUser = user.role === 'super_user' || user.role === 'super_admin';

    if (!isSuperUser && userId !== user.uid) {
      throw new Error('Unauthorized');
    }

    const { firestore } = await createServerClient();

    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data() as any;
    const orgMemberships = userData.orgMemberships || {};
    const orgs: OrgContext[] = [];

    for (const [orgId, membership] of Object.entries(orgMemberships)) {
      const m = membership as any;
      orgs.push({
        id: orgId,
        name: m.orgName || 'Unknown',
        type: m.orgType || 'brand',
        role: m.role,
        joinedAt: m.joinedAt || new Date().toISOString(),
      });
    }

    return {
      success: true,
      data: {
        orgs,
        currentOrgId: userData.currentOrgId,
      },
    };
  } catch (error: any) {
    logger.error('[getOrgsForUser] Error:', { error: error.message, uid });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get list of all organizations (super-user only, for org impersonation)
 */
export async function getOrgsForSuperUser(limit = 50, offset = 0) {
  try {
    const user = await requireUser();
    const safeLimit = clampInt(limit, 1, 100, 50);
    const safeOffset = clampInt(offset, 0, 10000, 0);

    // Verify super user
    if (user.role !== 'super_user' && user.role !== 'super_admin') {
      return { success: false, error: 'Unauthorized: Super user access required' };
    }
    const { firestore } = await createServerClient();

    const snapshot = await firestore
      .collection('organizations')
      .orderBy('createdAt', 'desc')
      .limit(safeLimit)
      .offset(safeOffset)
      .get();

    const orgs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      };
    });

    return {
      success: true,
      data: orgs,
    };
  } catch (error: any) {
    logger.error('[getOrgsForSuperUser] Error:', { error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Add a new location to a dispensary organization
 */
export async function addOrgLocation(
  orgId: string,
  locationData: {
    name: string;
    address?: string;
    state: string;
    posProvider?: string;
    posApiKey?: string;
    posDispensaryId?: string;
  }
) {
  try {
    assertValidDocumentId(orgId, 'orgId');
    const user = await requireUser();
    const validatedLocation = orgLocationCreateSchema.parse(locationData);

    assertOrgAccess(user, orgId);
    requirePermission(user as any, 'manage:dispensary');
    const { firestore } = await createServerClient();

    // Verify org exists and is a dispensary
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists || (orgDoc.data() as any).type !== 'dispensary') {
      return { success: false, error: 'Organization not found or is not a dispensary' };
    }

    // Create location
    const locationRef = await firestore.collection('locations').add({
      orgId,
      name: validatedLocation.name,
      address: validatedLocation.address || null,
      state: validatedLocation.state,
      isActive: true,
      posConfig: validatedLocation.posProvider
        ? {
            provider: validatedLocation.posProvider,
            apiKey: validatedLocation.posApiKey || null,
            dispensaryId: validatedLocation.posDispensaryId || null,
            status: 'active',
          }
        : { provider: 'none', status: 'inactive' },
      complianceConfig: {
        state: validatedLocation.state,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('[addOrgLocation] Location added', { orgId, locationId: locationRef.id });
    return {
      success: true,
      data: { locationId: locationRef.id },
    };
  } catch (error: any) {
    logger.error('[addOrgLocation] Error:', { error: error.message, orgId });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update an existing location
 */
export async function updateOrgLocation(
  orgId: string,
  locationId: string,
  locationData: Partial<{
    name: string;
    address: string;
    state: string;
    posProvider: string;
    posApiKey: string;
    posDispensaryId: string;
  }>
) {
  try {
    assertValidDocumentId(orgId, 'orgId');
    assertValidDocumentId(locationId, 'locationId');
    const user = await requireUser();
    const validatedLocation = orgLocationUpdateSchema.parse(locationData);

    assertOrgAccess(user, orgId);
    requirePermission(user as any, 'manage:dispensary');
    const { firestore } = await createServerClient();

    // Verify location belongs to org
    const locDoc = await firestore.collection('locations').doc(locationId).get();
    if (!locDoc.exists || (locDoc.data() as any).orgId !== orgId) {
      return { success: false, error: 'Location not found' };
    }

    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (validatedLocation.name) updateData.name = validatedLocation.name;
    if (validatedLocation.address) updateData.address = validatedLocation.address;
    if (validatedLocation.state) updateData.state = validatedLocation.state;

    if (validatedLocation.posProvider) {
      updateData.posConfig = {
        provider: validatedLocation.posProvider,
        apiKey: validatedLocation.posApiKey || null,
        dispensaryId: validatedLocation.posDispensaryId || null,
        status: 'active',
      };
    }

    if (validatedLocation.state) {
      updateData.complianceConfig = { state: validatedLocation.state };
    }

    await firestore.collection('locations').doc(locationId).update(updateData);

    logger.info('[updateOrgLocation] Location updated', { orgId, locationId });
    return {
      success: true,
      message: 'Location updated',
    };
  } catch (error: any) {
    logger.error('[updateOrgLocation] Error:', { error: error.message, orgId, locationId });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Remove a location (soft delete)
 */
export async function removeOrgLocation(orgId: string, locationId: string) {
  try {
    assertValidDocumentId(orgId, 'orgId');
    assertValidDocumentId(locationId, 'locationId');
    const user = await requireUser();

    assertOrgAccess(user, orgId);
    requirePermission(user as any, 'manage:dispensary');
    const { firestore } = await createServerClient();

    // Verify location belongs to org
    const locDoc = await firestore.collection('locations').doc(locationId).get();
    if (!locDoc.exists || (locDoc.data() as any).orgId !== orgId) {
      return { success: false, error: 'Location not found' };
    }

    // Soft delete
    await firestore.collection('locations').doc(locationId).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('[removeOrgLocation] Location removed', { orgId, locationId });
    return {
      success: true,
      message: 'Location removed',
    };
  } catch (error: any) {
    logger.error('[removeOrgLocation] Error:', { error: error.message, orgId, locationId });
    return {
      success: false,
      error: error.message,
    };
  }
}
