
'use server';

import { Auth, GoogleAuthProvider, sendSignInLinkToEmail, signInWithRedirect } from 'firebase/auth';

const actionCodeSettings = {
  url: process.env.NODE_ENV === 'production' 
    ? 'https://[YOUR_PRODUCTION_URL]/auth/callback-client' 
    : 'http://localhost:9002/auth/callback-client',
  handleCodeInApp: true,
};

export async function signInWithGoogle(auth: Auth) {
  try {
    const provider = new GoogleAuthProvider();
    // This function should be called on the client-side, so we pass the auth instance.
    // The actual redirection happens in the browser.
    await signInWithRedirect(auth, provider);
  } catch (e) {
    if (e instanceof Error) {
        return { error: e.message };
    }
    return { error: 'An unknown error occurred during Google sign-in.' };
  }
}

export async function sendMagicLink(email: string) {
  try {
    // This action can be called from a server component/action context initially,
    // but the `sendSignInLinkToEmail` function itself can be used on both server and client.
    // For this flow, we will call it from a client component that gets the auth instance from a hook.
    // We create a server client here only as a fallback for server-side invocations.
    const { createServerClient } = await import('@/firebase/server-client');
    const { auth } = await createServerClient();
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    return { error: null };
  } catch (e) {
     if (e instanceof Error) {
        return { error: e.message };
    }
    return { error: 'An unknown error occurred while sending the magic link.' };
  }
}
