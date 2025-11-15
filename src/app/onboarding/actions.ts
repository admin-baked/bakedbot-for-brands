'use server';

import { createServerClient } from "@/firebase/server-client";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function completeOnboarding() {
  try {
    const { auth, firestore } = await createServerClient();
    const sessionCookie = cookies().get('__session')?.value;
    
    if (!sessionCookie) {
        throw new Error('User is not authenticated.');
    }
    
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    const uid = decodedToken.uid;

    // Set the custom claim on the user's auth token
    await auth.setCustomUserClaims(uid, { ...decodedToken, onboardingCompleted: true });

    // Also update the user's document in Firestore
    const userDocRef = firestore.collection('users').doc(uid);
    await userDocRef.set({
      onboardingCompleted: true,
    }, { merge: true });

    revalidatePath('/dashboard');
    revalidatePath('/account/dashboard');

    return { error: false, message: 'Onboarding completed successfully.' };

  } catch (e: any) {
    console.error("Failed to complete onboarding:", e);
    return { error: true, message: e.message || "An unknown error occurred." };
  }
}
