
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
    // signInWithRedirect doesn't return a promise that resolves on success in the same context,
    // it navigates the user away. Errors are typically caught on the redirect page.
    await signInWithRedirect(auth, provider);
  } catch (error: any) {
    // This catch block might only run for configuration errors, not post-redirect errors.
    const permissionError = new FirestorePermissionError({
        path: 'google_auth',
        operation: 'write', 
        requestResourceData: { error: error.message }
    });
    errorEmitter.emit('permission-error', permissionError);
    // Re-throwing or handling redirect on client-side might be needed depending on flow
    // For now, we just log it via our system.
  }
}

export async function sendMagicLink(auth: Auth, email: string) {
  try {
    await sendSignInLinkToEmail(auth, email, createActionCodeSettings());
    // This side-effect is for the client to know where to find the email
    // after the redirect. It's not directly related to the auth call itself.
    if (typeof window !== 'undefined') {
        window.localStorage.setItem('emailForSignIn', email);
    }
    return { success: true };
  } catch (error: any) {
    const permissionError = new FirestorePermissionError({
        path: 'magic_link_auth',
        operation: 'write',
        requestResourceData: { email: email, error: error.message }
    });
    errorEmitter.emit('permission-error', permissionError);
    return { error: error.message || 'An unknown error occurred.' };
  }
}
