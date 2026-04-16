/**
 * Shared Firebase Auth ActionCodeSettings
 *
 * Routes all auth email action links (password reset, email verification)
 * to bakedbot.ai/auth/action instead of the Firebase project domain
 * (studio-567050101-bc6e8.firebaseapp.com).
 */
export const ACTION_CODE_SETTINGS = {
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://bakedbot.ai'}/auth/action`,
    handleCodeInApp: true,
} as const;
