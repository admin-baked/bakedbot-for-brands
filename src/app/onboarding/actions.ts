
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


const claims = { role: finalRole, brandId: finalBrandId, locationId: userProfileData.locationId };

const filteredClaims = Object.fromEntries(Object.entries(claims).filter(([_, v]) => v !== null && v !== undefined));
const filteredProfileData = Object.fromEntries(Object.entries(userProfileData).filter(([_, v]) => v !== null && v !== undefined));

await userDocRef.set(filteredProfileData, { merge: true });
await auth.setCustomUserClaims(uid, filteredClaims);

// --- SYNC PRODUCTS ---
// If user selected a CannMenus entity, sync products with limits
let syncCount = 0;
if (finalRole === 'brand' && finalBrandId && finalRole) {
  // Sync Logic imported dynamically or from shared
  const { syncCannMenusProducts } = await import('@/server/actions/cannmenus');
  // If it was a mock ID from search (cm_...), use that. If manual, skip.
  if (finalBrandId.startsWith('cm_')) {
    syncCount = await syncCannMenusProducts(finalBrandId, 'brand', finalBrandId);
  }
} else if (finalRole === 'dispensary' && userProfileData.locationId) {
  const { syncCannMenusProducts } = await import('@/server/actions/cannmenus');
  if (userProfileData.locationId.startsWith('cm_')) {
    syncCount = await syncCannMenusProducts(userProfileData.locationId, 'dispensary', 'dispensary-brand-placeholder');
    // Note: Dispensaries usually don't own products, they stock them. 
    // But for the "My Products" view, we might import them as "Retailer Inventory".
  }
}

// Revalidate paths that depend on user role
revalidatePath('/dashboard');
revalidatePath('/account');

const successMessage = syncCount > 0
  ? `Onboarding complete! Imported ${syncCount} products.`
  : 'Onboarding complete!';

return { message: successMessage, error: false };

  } catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
  logger.error('Onboarding server action failed:', { error: errorMessage });
  return { message: `Failed to save profile: ${errorMessage}`, error: true };
}
}
