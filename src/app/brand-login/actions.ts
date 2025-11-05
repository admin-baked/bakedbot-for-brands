'use server';

import { 
  Auth,
  GoogleAuthProvider,
  sendSignInLinkToEmail, 
  signInWithRedirect
} from 'firebase/auth';

const createActionCodeSettings = () => ({
    handleCodeInApp: true,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback-client`
});

export async function signInWithGoogle(auth: Auth) {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error('Error during Google sign-in redirect:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    const encodedError = encodeURIComponent(errorMessage);
    // As signInWithRedirect can't return, we may need to handle redirect to an error page on the client if possible
    // For now, this might not effectively redirect user with an error.
  }
}

export async function sendMagicLink(auth: Auth, email: string) {
  try {
    await sendSignInLinkToEmail(auth, email, createActionCodeSettings());
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: errorMessage };
  }
}
