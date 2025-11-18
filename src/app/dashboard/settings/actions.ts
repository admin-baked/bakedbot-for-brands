
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { makeBrandRepo } from '@/server/repos/brandRepo';
import type { Brand } from '@/types/domain';
import { revalidatePath } from 'next/cache';

const BrandSettingsSchema = z.object({
  name: z.string().min(2, 'Brand name must be at least 2 characters.'),
  logoUrl: z.string().url('Please enter a valid URL for the logo.').optional().or(z.literal('')),
});

const ChatbotSettingsSchema = z.object({
  basePrompt: z.string().min(10, 'The base prompt must be at least 10 characters.'),
  welcomeMessage: z.string().min(5, 'The welcome message must be at least 5 characters.'),
});

export type BrandSettingsFormState = {
  message: string;
  error: boolean;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function updateBrandSettings(
  prevState: BrandSettingsFormState,
  formData: FormData
): Promise<BrandSettingsFormState> {
  const { auth } = await createServerClient();
  const sessionCookie = cookies().get('__session')?.value;
  if (!sessionCookie) {
    return { error: true, message: 'You must be logged in to update settings.' };
  }

  try {
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    const brandId = decodedToken.brandId;
    if (!brandId) {
      return { error: true, message: 'You are not associated with a brand.' };
    }

    const validatedFields = BrandSettingsSchema.safeParse({
      name: formData.get('brandName'),
      logoUrl: formData.get('logoUrl'),
    });

    if (!validatedFields.success) {
      return {
        message: 'Invalid form data. Please check your inputs.',
        error: true,
        fieldErrors: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    const { name, logoUrl } = validatedFields.data;

    const { firestore } = await createServerClient();
    const brandRepo = makeBrandRepo(firestore);
    
    const updatePayload: Partial<Pick<Brand, 'name' | 'logoUrl'>> = { name };
    if (logoUrl) {
      updatePayload.logoUrl = logoUrl;
    }

    await brandRepo.update(brandId, updatePayload);

    revalidatePath('/dashboard/settings');
    revalidatePath(`/menu/${brandId}`);

    return { error: false, message: 'Brand settings updated successfully!' };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: true, message: `Failed to update settings: ${errorMessage}` };
  }
}


export async function updateChatbotSettings(
  prevState: BrandSettingsFormState,
  formData: FormData
): Promise<BrandSettingsFormState> {
    const { auth } = await createServerClient();
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) {
        return { error: true, message: 'You must be logged in to update settings.' };
    }

    try {
        const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
        const brandId = decodedToken.brandId;
        if (!brandId) {
            return { error: true, message: 'You are not associated with a brand.' };
        }

        const validatedFields = ChatbotSettingsSchema.safeParse({
            basePrompt: formData.get('basePrompt'),
            welcomeMessage: formData.get('welcomeMessage'),
        });

        if (!validatedFields.success) {
            return {
                message: 'Invalid form data.',
                error: true,
                fieldErrors: validatedFields.error.flatten().fieldErrors,
            };
        }

        const { firestore } = await createServerClient();
        const brandRepo = makeBrandRepo(firestore);
        
        await brandRepo.update(brandId, { chatbotConfig: validatedFields.data });

        revalidatePath('/dashboard/settings');

        return { error: false, message: 'Chatbot settings updated successfully!' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { error: true, message: `Failed to update settings: ${errorMessage}` };
    }
}
