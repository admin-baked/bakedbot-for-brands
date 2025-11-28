
// src/app/actions/dev-login.ts
'use server';

import { createServerClient } from '@/firebase/server-client';
import { devPersonas, type DevPersonaKey } from '@/lib/dev-personas';
import { DEMO_BRAND_ID } from '@/lib/config';

/**
 * A DEVELOPMENT-ONLY server action to generate a custom Firebase auth token for a given persona.
 * This function will create/update the user in Firebase Auth and Firestore, set their
 * custom claims, and return a token for client-side login.
 * It will throw an error if run in a production environment.
 */
export async function createDevLoginToken(persona: DevPersonaKey): Promise<{ token: string } | { error: string }> {
  if (process.env.NODE_ENV === 'production') {
    return { error: 'This function is for development use only.' };
  }

  const personaData = devPersonas[persona];
  if (!personaData) {
    return { error: 'Invalid persona specified.' };
  }

  const { auth, firestore } = await createServerClient();
  const { uid, email, displayName, role, brandId, locationId } = personaData;

  try {
    // 1. Ensure user exists in Firebase Auth
    let targetUid = uid;
    try {
      // Try to find user by email first to avoid collision
      const existingUser = await auth.getUserByEmail(email!);
      targetUid = existingUser.uid;

      // Update the user
      await auth.updateUser(targetUid, {
        displayName: displayName!,
      });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new user with the hardcoded UID
        try {
          await auth.createUser({
            uid: uid,
            email: email!,
            displayName: displayName!,
          });
          targetUid = uid;
        } catch (createError: any) {
          // If hardcoded UID is taken (unlikely if email check failed), let it fail
          throw createError;
        }
      } else {
        throw error;
      }
    }

    // 2. Set custom claims for role-based access
    const claims = {
      role: role || null,
      brandId: brandId || null,
      locationId: locationId || null,
    };
    // Filter out null values before setting claims
    const filteredClaims = Object.fromEntries(Object.entries(claims).filter(([_, v]) => v !== null));
    await auth.setCustomUserClaims(targetUid, filteredClaims);

    // 3. Ensure user profile exists in Firestore
    const userDocRef = firestore.collection('users').doc(targetUid);
    await userDocRef.set({
      email,
      displayName,
      role,
      brandId,
      locationId,
    }, { merge: true });

    // 4. Create the custom token
    const customToken = await auth.createCustomToken(targetUid, claims);

    return { token: customToken };

  } catch (error: any) {
    console.error(`Dev login failed for persona "${persona}":`, error);
    return { error: error.message || 'An unknown error occurred during dev login.' };
  }
}
