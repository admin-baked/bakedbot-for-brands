
'use server';

import { 
  Auth,
  GoogleAuthProvider,
  sendSignInLinkToEmail, 
  signInWithRedirect
} from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const createActionCodeSettings = () => ({
    handleCodeInApp: true,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback-client`
});

export async function signInWithGoogle(auth: Auth) {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithRedirect(auth, provider);
  } catch (error: any) {
    // This catch block might only run for configuration errors, not post-redirect auth failures.
    // It's kept here for robustness, but most auth errors are caught on the redirect callback page.
    console.error("Google Sign-In configuration error:", error);
  }
}

export async function sendMagicLink(auth: Auth, email: string) {
  try {
    await sendSignInLinkToEmail(auth, email, createActionCodeSettings());
    // Side-effect for client-side to remember the email for the sign-in flow.
    if (typeof window !== 'undefined') {
        window.localStorage.setItem('emailForSignIn', email);
    }
    return { success: true };
  } catch (error: any) {
    console.error("Magic Link sending error:", error);
    return { error: error.message || 'An unknown error occurred.' };
  }
}
