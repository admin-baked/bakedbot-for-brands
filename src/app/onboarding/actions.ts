'use server';

import { createServerClient } from '@/firebase/server-client';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/server/auth/auth';
import { makeBrandRepo } from '@/server/repos/brandRepo';
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
  features: z.string().optional() // JSON string
});

export async function completeOnboarding(prevState: any, formData: FormData) {
  const { firestore, auth } = await createServerClient();
  const user = await requireUser();
  const uid = user.uid;

  const rawData = Object.fromEntries(formData.entries());

  // Parse features JSON if present
  let features = {};
  if (rawData.features && typeof rawData.features === 'string') {
    try {
      features = JSON.parse(rawData.features);
    } catch (e) { }
  }

  const validatedFields = OnboardingSchema.safeParse(rawData);

  if (!validatedFields.success) {
    logger.warn('Onboarding validation failed', validatedFields.error.flatten());
    return {
      message: 'Please fill out all required fields.',
      error: true,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const {
    role, locationId, brandId, brandName,
    manualBrandName, manualProductName, manualDispensaryName,
    chatbotPersonality, chatbotTone, chatbotSellingPoints,
    posProvider, posApiKey, posDispensaryId
  } = validatedFields.data;

  try {
    const userDocRef = firestore.collection('users').doc(uid);
    const userProfileData: Record<string, any> = {
      isNewUser: false, // Mark as onboarded
      onboardingCompletedAt: new Date().toISOString(),
      role: role === 'skip' ? 'customer' : role, // Default to customer if skipped
      // Store raw preferences
      preferences: {
        chatbotPersonality,
        chatbotTone,
        chatbotSellingPoints
      },
      features
    };

    // Determine Final Names and IDs
    let finalBrandId = brandId;
    let finalBrandName = brandName;
    let finalRole = role;

    // Handle Manual Entry for Brand
    if (role === 'brand' && !brandId && manualBrandName) {
      // Create a new Brand Document
      const brandRepo = makeBrandRepo(firestore);
      const newBrandId = `brand_${uid.substring(0, 8)}`; // Generate ID
      await brandRepo.create(newBrandId, {
        name: manualBrandName,
        // ... defaults
      });
      finalBrandId = newBrandId;
      finalBrandName = manualBrandName;
    }

    // Handle Dispensary POS Config
    if (finalRole === 'dispensary' && posProvider && posProvider !== 'none') {
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
        cannMenusId: locationId, // Save the mapping
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
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

    // --- SYNC PRODUCTS ---
    let syncCount = 0;
    if (finalRole === 'brand' && finalBrandId) {
      const { syncCannMenusProducts } = await import('@/server/actions/cannmenus');
      if (finalBrandId.startsWith('cm_')) {
        syncCount = await syncCannMenusProducts(finalBrandId, 'brand', orgId);
      }
    } else if (finalRole === 'dispensary' && locationId) {
      const { syncCannMenusProducts } = await import('@/server/actions/cannmenus');
      if (locationId.startsWith('cm_')) {
        syncCount = await syncCannMenusProducts(locationId, 'dispensary', 'retail-inventory');
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
