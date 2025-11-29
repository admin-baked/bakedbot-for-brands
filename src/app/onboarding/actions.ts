
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

  const {
    role, locationId, brandId, brandName,
    manualBrandName, manualProductName, manualDispensaryName,
    chatbotPersonality, chatbotTone, chatbotSellingPoints
  } = validatedFields.data;
  const { uid, email, displayName } = user;

  const { auth, firestore } = await createServerClient();
  const userDocRef = firestore.collection('users').doc(uid);
  const brandRepo = makeBrandRepo(firestore);

  let finalBrandId: string | null = null;
  let finalBrandName: string | null = null;
  let finalRole: 'brand' | 'dispensary' | 'customer' | null = role === 'skip' ? 'customer' : role; // Default skipped users to customer

  try {
    // Handle brand creation/linking
    if (role === 'brand') {
      const chatbotConfig = {
        personality: chatbotPersonality || 'budtender',
        tone: chatbotTone || 'friendly',
        sellingPoints: chatbotSellingPoints || '',
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (brandId && brandName) { // Claimed from CannMenus
        finalBrandId = brandId;
        finalBrandName = brandName;
        const brandRef = firestore.collection('brands').doc(finalBrandId);
        const brandSnap = await brandRef.get();

        if (!brandSnap.exists) {
          await brandRepo.create(finalBrandId, {
            name: finalBrandName,
            chatbotConfig: chatbotConfig
          });
        } else {
          // Update existing brand with new chatbot config
          await brandRef.set({ chatbotConfig: chatbotConfig }, { merge: true });
        }
      } else if (manualBrandName) { // Manual entry
        finalBrandId = `brand-${uid.substring(0, 8)}`; // Generate a unique-ish ID
        finalBrandName = manualBrandName;
        await brandRepo.create(finalBrandId, {
          name: finalBrandName,
          chatbotConfig: chatbotConfig
        });

        // If they added a product/dispensary, create those too
        if (manualProductName) {
          const productRepo = makeProductRepo(firestore);
          await productRepo.create({
            name: manualProductName,
            brandId: finalBrandId,
            category: 'Sample',
            price: 0,
            description: 'This is a sample product added during onboarding.',
            imageUrl: 'https://picsum.photos/seed/sample/400/400',
            imageHint: 'product sample',
          });
        }
        if (manualDispensaryName) {
          await firestore.collection('dispensaries').add({
            name: manualDispensaryName,
            // Add default fields for the dispensary
            brandIds: [finalBrandId],
            city: 'Your City',
            state: 'NY',
          });
        }
      }
    }

    // Set user profile and claims
    const userProfileData: Record<string, any> = {
      email,
      displayName,
      role: finalRole,
      brandId: finalBrandId,
      locationId: role === 'dispensary' ? locationId : null,
    };

    const claims = { role: finalRole, brandId: finalBrandId, locationId: userProfileData.locationId };

    const filteredClaims = Object.fromEntries(Object.entries(claims).filter(([_, v]) => v !== null));
    const filteredProfileData = Object.fromEntries(Object.entries(userProfileData).filter(([_, v]) => v !== null));

    await userDocRef.set(filteredProfileData, { merge: true });
    await auth.setCustomUserClaims(uid, filteredClaims);

    // Revalidate paths that depend on user role
    revalidatePath('/dashboard');
    revalidatePath('/account');

    return { message: 'Onboarding complete!', error: false };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    logger.error('Onboarding server action failed:', errorMessage);
    return { message: `Failed to save profile: ${errorMessage}`, error: true };
  }
}
