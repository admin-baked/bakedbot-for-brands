
'use server';

import { createServerClient } from '@/firebase/server-client';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/server/auth/auth';
import { makeBrandRepo } from '@/server/repos/brandRepo';

// Define the schema for the form data
const OnboardingSchema = z.object({
  role: z.enum(['brand', 'dispensary', 'customer']),
  locationId: z.string().optional(),
  brandId: z.string().optional(), // CannMenus Brand ID
  brandName: z.string().optional(), // Brand Name from CannMenus
});

// Define the state for the form
export type OnboardingState = {
  message: string;
  error: boolean;
};

export async function completeOnboarding(prevState: OnboardingState, formData: FormData): Promise<OnboardingState> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: true, message: errorMessage };
  }
  
  const validatedFields = OnboardingSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      message: 'Invalid selection. Please make a valid choice.',
      error: true,
    };
  }

  const { role, locationId, brandId, brandName } = validatedFields.data;
  const { uid, email, name: displayName } = user;

  // If role is 'brand', the brandId from CannMenus is now the primary ID.
  const effectiveBrandId = role === 'brand' ? brandId : null;

  const userProfileData: Record<string, any> = {
    email,
    displayName,
    role,
    brandId: effectiveBrandId,
    locationId: role === 'dispensary' ? locationId : null,
  };

  const claims = {
    role,
    brandId: userProfileData.brandId,
    locationId: userProfileData.locationId,
  };
  
  const filteredClaims = Object.fromEntries(Object.entries(claims).filter(([_, v]) => v !== null));
  const filteredProfileData = Object.fromEntries(Object.entries(userProfileData).filter(([_, v]) => v !== null));

  try {
    const { auth, firestore } = await createServerClient();
    const userDocRef = firestore.collection('users').doc(uid);
    const brandRepo = makeBrandRepo(firestore);
    
    await firestore.runTransaction(async (transaction) => {
      // 1. Set the user document in Firestore
      transaction.set(userDocRef, filteredProfileData, { merge: true });
      
      // 2. If the user claimed a brand, create their brand document using the CannMenus ID.
      if (role === 'brand' && brandId && brandName) {
        const newBrandDocRef = firestore.collection('brands').doc(brandId);
        const existingBrand = await transaction.get(newBrandDocRef);

        // Only create the brand doc if it doesn't already exist to prevent overwriting.
        if (!existingBrand.exists) {
            transaction.set(newBrandDocRef, brandRepo.createPayload(brandName));
        }
      }
    });

    // This must happen after the transaction for consistency
    await auth.setCustomUserClaims(uid, filteredClaims);

    // Revalidate paths that depend on user role
    revalidatePath('/dashboard');
    revalidatePath('/account');

    return { message: 'Onboarding complete!', error: false };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('Onboarding server action failed:', errorMessage);
    return { message: `Failed to save profile: ${errorMessage}`, error: true };
  }
}
