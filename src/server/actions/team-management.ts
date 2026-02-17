'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { canAccessOrg } from '@/server/auth/rbac';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import type { Invitation } from '@/types/invitation';
import type { OrgContext } from '@/types/org-membership';
import type { DomainUserProfile } from '@/types/users';

/**
 * Get all users in an organization with their roles and invitation status
 */
export async function getUsersByOrg(orgId: string) {
  try {
    const user = await requireUser();
    const { firestore, auth } = await createServerClient();

    // Security: ensure user can access this org
    canAccessOrg(user as any, orgId);

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
    const user = await requireUser();
    const { firestore, auth } = await createServerClient();

    // Security: ensure user can access this org
    canAccessOrg(user as any, orgId);

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
    const user = await requireUser();
    const { firestore, auth } = await createServerClient();

    // Security: ensure user can access this org
    canAccessOrg(user as any, orgId);

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
        role: newRole,
        joinedAt: userData.orgMemberships?.[orgId]?.joinedAt || new Date().toISOString(),
      },
    });

    // If this is their current org, also update users.role + custom claims
    if (userData.currentOrgId === orgId) {
      await firestore.collection('users').doc(userId).update({
        role: newRole,
      });

      // Update Firebase custom claims
      const claims: Record<string, any> = {
        role: newRole,
        orgId,
        currentOrgId: orgId,
      };
      await auth.setCustomUserClaims(userId, claims);
    }

    logger.info('[updateUserOrgRole] User role updated', { userId, orgId, newRole });
    return {
      success: true,
      message: `User role updated to ${newRole}`,
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
    const userId = uid || user.uid;
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
    const { firestore } = await createServerClient();

    // Verify super user
    if (user.role !== 'super_user' && user.role !== 'super_admin') {
      return { success: false, error: 'Unauthorized: Super user access required' };
    }

    const snapshot = await firestore
      .collection('organizations')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
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
    const user = await requireUser();
    const { firestore } = await createServerClient();

    // Security: ensure user can access this org
    canAccessOrg(user as any, orgId);

    // Verify org exists and is a dispensary
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists || (orgDoc.data() as any).type !== 'dispensary') {
      return { success: false, error: 'Organization not found or is not a dispensary' };
    }

    // Create location
    const locationRef = await firestore.collection('locations').add({
      orgId,
      name: locationData.name,
      address: locationData.address || null,
      state: locationData.state,
      isActive: true,
      posConfig: locationData.posProvider
        ? {
            provider: locationData.posProvider,
            apiKey: locationData.posApiKey || null,
            dispensaryId: locationData.posDispensaryId || null,
            status: 'active',
          }
        : { provider: 'none', status: 'inactive' },
      complianceConfig: {
        state: locationData.state,
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
    const user = await requireUser();
    const { firestore } = await createServerClient();

    // Security: ensure user can access this org
    canAccessOrg(user as any, orgId);

    // Verify location belongs to org
    const locDoc = await firestore.collection('locations').doc(locationId).get();
    if (!locDoc.exists || (locDoc.data() as any).orgId !== orgId) {
      return { success: false, error: 'Location not found' };
    }

    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (locationData.name) updateData.name = locationData.name;
    if (locationData.address) updateData.address = locationData.address;
    if (locationData.state) updateData.state = locationData.state;

    if (locationData.posProvider) {
      updateData.posConfig = {
        provider: locationData.posProvider,
        apiKey: locationData.posApiKey || null,
        dispensaryId: locationData.posDispensaryId || null,
        status: 'active',
      };
    }

    if (locationData.state) {
      updateData.complianceConfig = { state: locationData.state };
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
    const user = await requireUser();
    const { firestore } = await createServerClient();

    // Security: ensure user can access this org
    canAccessOrg(user as any, orgId);

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
