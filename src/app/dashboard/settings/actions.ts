
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { createServerClient } from '@/firebase/server-client';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const FormSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required.'),
});

export async function saveCannMenusApiKey(prevState: any, formData: FormData) {
  try {
    const { auth, firestore } = await createServerClient();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be logged in to save an API key.');
    }

    const validatedFields = FormSchema.safeParse({
      apiKey: formData.get('cannmenus-api-key'),
    });

    if (!validatedFields.success) {
      return {
        message: 'Invalid form data. Please check your inputs.',
        error: true,
        fieldErrors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { apiKey } = validatedFields.data;

    const userPrivateRef = doc(firestore, 'user-private', user.uid);
    
    // Using non-blocking setDoc
    setDoc(userPrivateRef, { cannMenusApiKey: apiKey }, { merge: true })
        .catch(error => {
            const permissionError = new FirestorePermissionError({
                path: userPrivateRef.path,
                operation: 'write',
                requestResourceData: { cannMenusApiKey: 'REDACTED' }
            });
            errorEmitter.emit('permission-error', permissionError);
        });


    revalidatePath('/dashboard/settings');

    return {
      message: 'API Key saved successfully!',
      error: false,
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      message: `Failed to save API Key: ${errorMessage}`,
      error: true,
    };
  }
}
