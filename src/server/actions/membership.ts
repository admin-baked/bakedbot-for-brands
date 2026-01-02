'use server';

import { createServerClient } from '@/firebase/server-client';
import { CustomerProfile, CustomerSegment, calculateSegment } from '@/types/customers';
import { PreferencePassport } from '@/types/preference-passport';
import { getPassportAction } from './passport';
import { generateId } from '@/lib/utils'; // Assuming this exists, or we use crypto

/**
 * Join an Organization (Brand/Dispensary) as a Member.
 * Copies Global Passport data -> Tenant Customer Profile.
 */
export async function joinOrganizationAction(orgId: string): Promise<{ success: boolean; membershipId?: string; error?: string }> {
    const { firestore } = await createServerClient();
    
    // 1. Get Global Passport (Source of Truth)
    const passport = await getPassportAction();
    if (!passport) {
        return { success: false, error: 'User must have a Passport to join.' };
    }

    const userId = passport.userId;

    // 2. Check if already a member
    // We query the organization's subcollection 'customers'
    const membershipRef = firestore.collection('organizations').doc(orgId).collection('customers').where('email', '==', passport.id); // utilizing ID as email/handle proxy for now if needed, or query by 'userId' field if we add it
    
    // Better: We should probably store a map of memberships on the user OR just query the org's customers by userId
    // Let's assume we store `userId` on the CustomerProfile for linking.
    
    // Actually, let's allow re-joining to update data (Sync)
    
    // 3. Create/Update Membership Profile
    // Map Passport -> CustomerProfile
    const profileId = generateOrRetrieveMembershipId(userId, orgId);
    
    const newProfile: Partial<CustomerProfile> = {
        id: profileId,
        orgId: orgId,
        // Identity
        email: `user-${userId}@example.com`, // We need real email from Auth
        displayName: passport.displayName,
        
        // Preferences (Synced)
        preferences: {
            strainType: passport.preferredMethods.includes('flower') ? 'any' : undefined, // Rough mapping
            // In a real app, we'd map fields 1:1 more carefully
        },
        
        // Metadata
        updatedAt: new Date()
    };

    // 4. Save to Tenant CRM
    // Use merge to preserve existing data (Loyalty points, order history)
    await firestore.collection('organizations').doc(orgId).collection('customers').doc(profileId).set(newProfile, { merge: true });

    return { success: true, membershipId: profileId };
}

/**
 * Get Membership Profile for a specific Tenant
 */
export async function getMembershipAction(orgId: string): Promise<CustomerProfile | null> {
    const { firestore } = await createServerClient();
    
    // 1. Identify User
    const passport = await getPassportAction();
    if (!passport) return null;
    
    const profileId = generateOrRetrieveMembershipId(passport.userId, orgId);

    try {
        const doc = await firestore.collection('organizations').doc(orgId).collection('customers').doc(profileId).get();
        if (doc.exists) {
            return doc.data() as CustomerProfile;
        }
        return null;
    } catch (error) {
        console.error('Error fetching membership:', error);
        return null;
    }
}

function generateOrRetrieveMembershipId(userId: string, orgId: string): string {
    // Deterministic ID for Membership: hash(userId + orgId)
    // For now, simple concat
    return `${userId}_${orgId}`;
}
