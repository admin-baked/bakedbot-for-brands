'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from '@google-cloud/firestore';
import { getServerSessionUser } from '@/server/auth/session';
import { logger } from '@/lib/logger';
import type { OnboardingStepId } from '@/types/onboarding';

const VALID_STEP_IDS: OnboardingStepId[] = [
  'brand-guide',
  'link-dispensary',
  'connect-pos',
  'checkin-manager',
  'qr-training',
  'creative-center',
  'content-calendar',
  'welcome-playbook',
  'inbox-foundations',
  'competitive-intel',
];

/**
 * Mark an onboarding step as completed (server-persisted).
 * Uses arrayUnion so duplicate calls are idempotent.
 */
export async function completeOnboardingStep(stepId: OnboardingStepId): Promise<{ success: boolean }> {
  if (!VALID_STEP_IDS.includes(stepId)) {
    return { success: false };
  }

  try {
    const user = await getServerSessionUser();
    if (!user?.uid) {
      return { success: false };
    }

    const db = getAdminFirestore();
    await db.collection('users').doc(user.uid).set(
      {
        onboarding: {
          completedSteps: FieldValue.arrayUnion(stepId),
          lastStepCompletedAt: new Date().toISOString(),
        },
      },
      { merge: true },
    );

    logger.info('Onboarding step completed', { uid: user.uid, stepId });
    return { success: true };
  } catch (error) {
    logger.error('Failed to complete onboarding step', { error, stepId });
    return { success: false };
  }
}

/**
 * Get the user's completed onboarding steps from Firestore.
 */
export async function getCompletedOnboardingSteps(): Promise<OnboardingStepId[]> {
  try {
    const user = await getServerSessionUser();
    if (!user?.uid) {
      return [];
    }

    const db = getAdminFirestore();
    const doc = await db.collection('users').doc(user.uid).get();
    const data = doc.data();
    return (data?.onboarding?.completedSteps as OnboardingStepId[]) || [];
  } catch (error) {
    logger.error('Failed to get onboarding steps', { error });
    return [];
  }
}
