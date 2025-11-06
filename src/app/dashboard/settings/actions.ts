
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
  const { auth, firestore } = await createServerClient();
  const user = auth.currentUser;

  if (!user) {
    // This is an application-level error, not a rules error. Return it directly.
    return {
      message: 'You must be logged in to save an API key.',
      error: true,
    };
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
  
  // Using non-blocking setDoc with contextual error handling
  setDoc(userPrivateRef, { cannMenusApiKey: apiKey }, { merge: true })
      .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
              path: userPrivateRef.path,
              operation: 'update', // Using 'update' as merge:true behaves like an upsert
              requestResourceData: { cannMenusApiKey: 'REDACTED' } // Redact sensitive data
          });
          errorEmitter.emit('permission-error', permissionError);
      });

  revalidatePath('/dashboard/settings');

  return {
    message: 'API Key saved successfully!',
    error: false,
  };
}
