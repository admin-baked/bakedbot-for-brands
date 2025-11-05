
'use server';

import { createServerClient } from '@/firebase/server-client';
import { GoogleAuthProvider, sendSignInLinkToEmail, signInWithRedirect } from 'firebase/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

const actionCodeSettings = {
  // URL you want to redirect back to. The domain (www.example.com) for this
  // URL must be in the authorized domains list in the Firebase Console.
  url: 'http://localhost:9002/auth/callback',
  // This must be true.
  handleCodeInApp: true,
};

export async function signInWithGoogle() {
  try {
    const { auth } = await createServerClient();
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  } catch (e) {
    if (e instanceof Error) {
        return { error: e.message };
    }
    return { error: 'An unknown error occurred.' };
  }
  redirect('/dashboard');
}

export async function sendMagicLink(email: string) {
  try {
    const { auth } = await createServerClient();
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // The link was successfully sent. Inform the user.
    // Save the email locally so you don't need to ask the user for it again
    // if they open the link on the same device.
    // You can use localStorage for this.
  } catch (e) {
     if (e instanceof Error) {
        return { error: e.message };
    }
    return { error: 'An unknown error occurred.' };
  }
}
