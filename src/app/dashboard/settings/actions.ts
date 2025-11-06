
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

export async function saveBakedBotApiKey(prevState: any, formData: FormData) {
  const { auth, firestore } = await createServerClient();
  const user = auth.currentUser;

  if (!user) {
    return {
      message: 'You must be logged in to save an API key.',
      error: true,
    };
  }

  const validatedFields = FormSchema.safeParse({
    apiKey: formData.get('bakedbot-api-key'),
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
  
  setDoc(userPrivateRef, { bakedBotApiKey: apiKey }, { merge: true })
      .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
              path: userPrivateRef.path,
              operation: 'update',
              requestResourceData: { bakedBotApiKey: 'REDACTED' }
          });
          errorEmitter.emit('permission-error', permissionError);
      });

  revalidatePath('/dashboard/settings');

  return {
    message: 'API Key saved successfully!',
    error: false,
  };
}
