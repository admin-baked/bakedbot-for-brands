
'use server';

import { createServerClient } from '@/firebase/server-client';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/server/auth/auth';
import { makeBrandRepo } from '@/server/repos/brandRepo';
import { makeProductRepo } from '@/server/repos/productRepo';
import { FieldValue } from 'firebase-admin/firestore';

import { logger } from '@/lib/logger';
// Define the schema for the form data
const OnboardingSchema = z.object({
  role: z.enum(['brand', 'dispensary', 'customer', 'skip']),
  // CannMenus selection
  locationId: z.string().optional(),
  brandId: z.string().optional(),
  brandName: z.string().optional(),
  // Manual entry fields
  manualBrandName: z.string().optional(),
  manualProductName: z.string().optional(),
  manualDispensaryName: z.string().optional(),
  // Chatbot config
  chatbotPersonality: z.string().optional(),
  chatbotTone: z.string().optional(),
  chatbotSellingPoints: z.string().optional(),
  // POS Integration
  posProvider: z.enum(['dutchie', 'jane', 'none']).optional(),
  posApiKey: z.string().optional(),
  posDispensaryId: z.string().optional(), // For Jane or Dutchie ID
});

// ... (existing code) ...

const {
  role, locationId, brandId, brandName,
  manualBrandName, manualProductName, manualDispensaryName,
  chatbotPersonality, chatbotTone, chatbotSellingPoints,
  posProvider, posApiKey, posDispensaryId
} = validatedFields.data;

// ... (existing code) ...

// Handle Dispensary POS Config
if (finalRole === 'dispensary' && posProvider && posProvider !== 'none') {
  // Save POS config to the dispensary record (users collection or dispensaries collection)
  // Ensure we have a dispensary ID. If manual, it was created. If CannMenus, use locationId.

  let targetDispensaryId = locationId; // from CannMenus selection

  // If manual, we created a doc in 'dispensaries' collection? 
  // Not cleanly handled in current code structure (manual creates it inside 'action', but ID isn't easily returned to saving logic).
  // Let's assume for now we save it to the USER profile or the dispensary if identified.

  // Update User Profile with POS Config
  userProfileData.posConfig = {
    provider: posProvider,
    apiKey: posApiKey || null, // Encrypt in production!
    dispensaryId: posDispensaryId || null,
    sourceOfTruth: 'pos',
    backupSource: 'cannmenus',
    connectedAt: new Date().toISOString(),
    status: 'active'
  };
}

// ... (existing setting userDocRef) ...

// Update synced claims if needed
if (userProfileData.posConfig) {
  // We might not put secrets in claims, but provider is fine.
  // claims.posProvider = posProvider; 
}


// --- ENTERPRISE MIGRATION LOGIC ---
let orgId = '';

// 1. Create Organization
if (finalRole === 'brand' || finalRole === 'dispensary') {
  const orgType = finalRole;
  // Use brandId for Brand Orgs to keep IDs consistent if possible, else generate new
  orgId = finalBrandId || (finalRole === 'brand' ? `brand-${uid.substring(0, 8)}` : `org-${uid.substring(0, 8)}`);

  const orgRef = firestore.collection('organizations').doc(orgId);
  const orgSnap = await orgRef.get();

  if (!orgSnap.exists) {
    await orgRef.set({
      id: orgId,
      name: finalBrandName || manualDispensaryName || 'My Organization',
      type: orgType,
      ownerId: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      settings: {
        policyPack: 'balanced',
        allowOverrides: true,
        hipaaMode: false
      },
      billing: {
        subscriptionStatus: 'trial'
      }
    });
  }
}

// 2. Create Location (For Dispensaries)
let newLocationId = null;
if (finalRole === 'dispensary') {
  // If they selected a specific location from CannMenus, use that ID
  const locId = locationId || `loc-${uid.substring(0, 8)}`;
  newLocationId = locId;

  const locRef = firestore.collection('locations').doc(locId);
  await locRef.set({
    id: locId,
    orgId: orgId,
    name: manualDispensaryName || 'Main Location',
    posConfig: userProfileData.posConfig || { provider: 'none', status: 'inactive' },
    cannMenusId: userProfileData.locationId, // Save the mapping
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  // Also ensure a 'dispensary' doc exists for legacy logic (optional, but good for safety)
  // We can skip this if we fully migrate, but let's keep it minimal.
}

// 3. Update User Profile with Enterprise Context
const organizationIds = orgId ? [orgId] : [];

// Update User Profile
const updatedUserProfile: Record<string, any> = {
  ...userProfileData,
  organizationIds,
  currentOrgId: orgId || null,
  // Legacy mapping
  brandId: finalRole === 'brand' ? orgId : null,
  locationId: newLocationId || null
};

const updatedClaims = {
  role: finalRole,
  orgId: orgId,
  brandId: finalRole === 'brand' ? orgId : null
};

const finalClaims = Object.fromEntries(Object.entries(updatedClaims).filter(([_, v]) => v !== null && v !== undefined));
const finalProfile = Object.fromEntries(Object.entries(updatedUserProfile).filter(([_, v]) => v !== null && v !== undefined));

await userDocRef.set(finalProfile, { merge: true });
await auth.setCustomUserClaims(uid, finalClaims);

// --- SYNC PRODUCTS (Updated to use Org Context if needed) ---
// ... existing sync logic ...
let syncCount = 0;
// (Keep existing sync logic, it uses brandId/locationId which we mapped to Org/Location IDs)
if (finalRole === 'brand' && finalBrandId) {
  // ...
  const { syncCannMenusProducts } = await import('@/server/actions/cannmenus');
  if (finalBrandId.startsWith('cm_')) {
    syncCount = await syncCannMenusProducts(finalBrandId, 'brand', orgId); // Use OrgId as BrandId
  }
} else if (finalRole === 'dispensary' && userProfileData.locationId) {
  const { syncCannMenusProducts } = await import('@/server/actions/cannmenus');
  if (userProfileData.locationId.startsWith('cm_')) {
    // For dispensaries, likely need to store inventory under the Location or Org.
    // For now, pass null or placeholder for brandId as they are retail.
    syncCount = await syncCannMenusProducts(userProfileData.locationId, 'dispensary', 'retail-inventory');
  }
}

revalidatePath('/dashboard');
revalidatePath('/account');

const successMessage = syncCount > 0
  ? `Welcome! Organization created & ${syncCount} products imported.`
  : 'Welcome! Organization created.';

return { message: successMessage, error: false };

  } catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
  logger.error('Onboarding server action failed:', { error: errorMessage });
  return { message: `Failed to save profile: ${errorMessage}`, error: true };
}
}
