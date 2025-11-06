
'use server';

import { 
  sendSignInLinkToEmail, 
} from 'firebase/auth';
import { createServerClient } from '@/firebase/server-client';

export async function sendMagicLink(email: string) {
  try {
    const { auth } = await createServerClient();
    // Action code settings are configured here, inside the server action
    await sendSignInLinkToEmail(auth, email, {
        handleCodeInApp: true,
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback-client`,
    });
    return { success: true };
  } catch (error: any) {
    console.error("Magic Link sending error:", error);
    return { error: error.message || 'An unknown error occurred.' };
  }
}
