
'use server';

import { createServerClient } from '@/firebase/server-client';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/server/auth/auth';

// Define the schema for the form data
const OnboardingSchema = z.object({
  role: z.enum(['brand', 'dispensary', 'customer']),
  locationId: z.string().optional(),
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
  
  const validatedFields = OnboardingSchema.safeParse({
    role: formData.get('role'),
    locationId: formData.get('locationId'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid selection. Please make a valid choice.',
      error: true,
    };
  }

  const { role, locationId } = validatedFields.data;
  const { uid, email, name: displayName } = user;

  const userProfileData: Record<string, any> = {
    email,
    displayName,
    role,
    brandId: role === 'brand' ? uid : null,
    locationId: role === 'dispensary' ? locationId : null,
  };

  const claims = {
    role,
    brandId: userProfileData.brandId,
    locationId: userProfileData.locationId,
  };
  
  // Filter out null values before setting claims/doc
  const filteredClaims = Object.fromEntries(Object.entries(claims).filter(([_, v]) => v !== null));
  const filteredProfileData = Object.fromEntries(Object.entries(userProfileData).filter(([_, v]) => v !== null));

  try {
    const { auth, firestore } = await createServerClient();
    const userDocRef = firestore.collection('users').doc(uid);
    
    // Use a transaction or batch to ensure atomicity
    await firestore.runTransaction(async (transaction) => {
      // 1. Set the user document in Firestore
      transaction.set(userDocRef, filteredProfileData, { merge: true });
      
      // 2. Set custom claims on the Auth user
      // Note: setCustomUserClaims is not part of a transaction, but should be done
      // after we're confident the Firestore write will succeed.
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
