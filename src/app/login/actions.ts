
'use server';

import { createServerClient } from '@/firebase/server-client';
import { GoogleAuthProvider, sendSignInLinkToEmail, signInWithRedirect } from 'firebase/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

const actionCodeSettings = {
  // URL you want to redirect back to. The domain (www.example.com) for this
  // URL must be in the authorized domains list in the Firebase Console.
  // This now points directly to the client-side handler.
  url: 'http://localhost:9002/auth/callback-client',
  // This must be true.
  handleCodeInApp: true,
};

export async function signInWithGoogle() {
  try {
    const { auth } = await createServerClient();
    const provider = new GoogleAuthProvider();
    // signInWithRedirect should be called on the client side to work correctly with Next.js App Router
    // This will be handled on the client page. For now, this action is not used from the fixed login page.
    // To be fully correct, the button on the login page should trigger a client-side function.
    await signInWithRedirect(auth, provider);
  } catch (e) {
    if (e instanceof Error) {
        return { error: e.message };
    }
    return { error: 'An unknown error occurred.' };
  }
  // The redirect will happen by Firebase, no need for Next.js redirect
}

export async function sendMagicLink(email: string) {
  try {
    const { auth } = await createServerClient();
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // The link was successfully sent. Inform the user.
    // Save the email locally so you don't need to ask the user for it again
    // if they open the link on the same device.
    // This is handled on the client side.
  } catch (e) {
     if (e instanceof Error) {
        return { error: e.message };
    }
    return { error: 'An unknown error occurred.' };
  }
}
