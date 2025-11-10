
'use server';

import { 
  sendSignInLinkToEmail, 
} from 'firebase/auth';
import { createServerClient } from '@/firebase/server-client';

export async function sendMagicLink(email: string) {
  try {
    const { auth } = await createServerClient();
    
    // The URL must point to the page that will handle the sign-in.
    // It must also be whitelisted in the Firebase console.
    const host = process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000';
    const actionCodeSettings = {
        handleCodeInApp: true,
        url: `${host}/auth/callback-client`,
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);

    return { success: true };
  } catch (error: any) {
    console.error("Magic Link sending error:", error);
    // Return a generic error message to avoid leaking implementation details.
    return { error: error.message || 'Could not send magic link. Please try again.' };
  }
}
