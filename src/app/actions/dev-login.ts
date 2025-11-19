// src/app/actions/dev-login.ts
'use server';

import { createServerClient } from '@/firebase/server-client';
import { devPersonas } from '@/lib/dev-personas';
import type { UserProfile } from '@/types/domain';

type Persona = keyof typeof devPersonas;

/**
 * A DEVELOPMENT-ONLY server action to generate a custom Firebase auth token for a given persona.
 * This function will create/update the user in Firebase Auth and Firestore, set their
 * custom claims, and return a token for client-side login.
 * It will throw an error if run in a production environment.
 */
export async function createDevLoginToken(persona: Persona): Promise<{ token: string } | { error: string }> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('This function is for development use only and cannot be run in production.');
  }

  const personaData = devPersonas[persona];
  if (!personaData) {
    return { error: 'Invalid persona specified.' };
  }

  const { auth, firestore } = await createServerClient();
  const { uid, email, displayName, role, brandId, locationId } = personaData;

  try {
    // 1. Ensure user exists in Firebase Auth
    try {
      await auth.updateUser(uid, {
        email: email,
        displayName: displayName,
      });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        await auth.createUser({
          uid: uid,
          email: email,
          displayName: displayName,
        });
      } else {
        throw error; // Re-throw other auth errors
      }
    }

    // 2. Set custom claims for role-based access
    const claims = {
        role: role || null,
        brandId: brandId || null,
        locationId: locationId || null,
    };
    await auth.setCustomUserClaims(uid, claims);


    // 3. Ensure user profile exists in Firestore
    const userDocRef = firestore.collection('users').doc(uid);
    await userDocRef.set({
      email,
      displayName,
      role,
      brandId,
      locationId,
    }, { merge: true });

    // 4. Create the custom token
    const customToken = await auth.createCustomToken(uid, claims);

    return { token: customToken };

  } catch (error: any) {
    console.error(`Dev login failed for persona "${persona}":`, error);
    return { error: error.message || 'An unknown error occurred during dev login.' };
  }
}
