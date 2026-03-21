// Types for safe-settings server actions.
// Kept in a separate file because 'use server' files cannot export non-async values.

export type SafeEmailProvider = 'sendgrid' | 'mailjet';
export type SafeVideoProvider = 'veo' | 'sora' | 'sora-pro' | 'kling' | 'wan' | 'remotion';

export interface SafeSystemSettings {
    emailProvider: SafeEmailProvider;
    videoProvider: SafeVideoProvider;
}
