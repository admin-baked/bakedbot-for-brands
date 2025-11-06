
'use server';

import { 
  sendSignInLinkToEmail, 
} from 'firebase/auth';
import { createServerClient } from '@/firebase/server-client';

const createActionCodeSettings = () => ({
    handleCodeInApp: true,
    // Ensure this URL is correctly pointing to where you handle the sign-in completion
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback-client` 
});

export async function sendMagicLink(email: string) {
  try {
    const { auth } = await createServerClient();
    await sendSignInLinkToEmail(auth, email, createActionCodeSettings());
    return { success: true };
  } catch (error: any) {
    console.error("Magic Link sending error:", error);
    return { error: error.message || 'An unknown error occurred.' };
  }
}

    