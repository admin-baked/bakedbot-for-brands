
'use server';

import { 
  Auth,
  sendSignInLinkToEmail, 
} from 'firebase/auth';

const createActionCodeSettings = () => ({
    handleCodeInApp: true,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback-client`
});

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
