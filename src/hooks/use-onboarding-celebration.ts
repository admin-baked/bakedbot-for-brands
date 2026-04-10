'use client';

/**
 * Hook: useOnboardingCelebration
 *
 * Fires a toast + dispatches a custom event when an onboarding step completes.
 * The floating panel listens for the event to refresh its checklist.
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { completeOnboardingStep } from '@/server/actions/onboarding-progress';
import type { OnboardingStepId } from '@/types/onboarding';

const STEP_LABELS: Record<OnboardingStepId, string> = {
  'brand-guide': 'Brand Guide',
  'link-dispensary': 'Dispensary Link',
  'connect-pos': 'Menu Data',
  'checkin-manager': 'Check-In',
  'qr-training': 'QR & Training',
  'creative-center': 'First Draft',
  'content-calendar': 'Content Calendar',
  'welcome-playbook': 'Welcome Playbook',
  'inbox-foundations': 'Inbox Tour',
  'competitive-intel': 'Competitive Intel',
};

export function useOnboardingCelebration() {
  const { toast } = useToast();

  const celebrate = useCallback(async (stepId: OnboardingStepId) => {
    const result = await completeOnboardingStep(stepId);

    if (result.success) {
      const label = STEP_LABELS[stepId] || stepId;
      toast({
        title: `${label} complete!`,
        description: 'Nice work — check your setup guide for the next step.',
      });

      // Notify the floating panel to refresh its checklist
      window.dispatchEvent(new CustomEvent('onboarding-step-complete', { detail: { stepId } }));
    }

    return result;
  }, [toast]);

  return { celebrate };
}
