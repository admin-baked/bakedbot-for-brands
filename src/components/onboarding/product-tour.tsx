'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Laptop, Tablet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/use-user-role';
import { isDispensaryRole } from '@/types/roles';
import { completeOnboardingStep } from '@/server/actions/onboarding-progress';

const TOUR_COMPLETED_KEY = 'bakedbot:product-tour-v1';

interface TourStep {
  id: string;
  title: string;
  body: string;
  /** CSS selector to highlight — if null, show centered modal */
  selector: string | null;
  position: 'bottom' | 'right' | 'center';
}

const DISPENSARY_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to BakedBot',
    body: 'Let\u2019s take a 60-second tour so you know exactly where everything is. You can skip anytime.',
    selector: null,
    position: 'center',
  },
  {
    id: 'inbox',
    title: 'This is your Inbox',
    body: 'Agent work lands here \u2014 drafts, reports, approvals, and recommendations. Think of it as your command center.',
    selector: '[data-tour="inbox-area"]',
    position: 'right',
  },
  {
    id: 'checklist',
    title: 'Your Setup Checklist',
    body: 'Follow these steps to get up and running. Each one takes a few minutes and unlocks more of the platform.',
    selector: '[data-tour="setup-checklist"]',
    position: 'bottom',
  },
  {
    id: 'checkin',
    title: 'Check-In: Tablet or Laptop',
    body: 'Customers can self-check-in on a tablet at your door, or your staff can check them in from any laptop or computer at the register. Both modes take under 30 seconds.',
    selector: '[data-tour="setup-checklist"]',
    position: 'bottom',
  },
  {
    id: 'brand-guide-cta',
    title: 'Start with your Brand Guide',
    body: 'Everything builds on your Brand Guide \u2014 voice, colors, compliance rules. Complete it first and the agents start working for you.',
    selector: null,
    position: 'center',
  },
];

const BRAND_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to BakedBot',
    body: 'Let\u2019s take a 60-second tour so you know exactly where everything is. You can skip anytime.',
    selector: null,
    position: 'center',
  },
  {
    id: 'inbox',
    title: 'This is your Inbox',
    body: 'Agent work lands here \u2014 drafts, reports, approvals, and recommendations. Think of it as your command center.',
    selector: '[data-tour="inbox-area"]',
    position: 'right',
  },
  {
    id: 'checklist',
    title: 'Your Setup Checklist',
    body: 'Follow these steps to get up and running. Each one takes a few minutes and unlocks more of the platform.',
    selector: '[data-tour="setup-checklist"]',
    position: 'bottom',
  },
  {
    id: 'creative',
    title: 'Creative Center',
    body: 'Craig uses your Brand Guide to generate on-brand social posts, campaign angles, and calendar-ready content.',
    selector: '[data-tour="setup-checklist"]',
    position: 'bottom',
  },
  {
    id: 'brand-guide-cta',
    title: 'Start with your Brand Guide',
    body: 'Everything builds on your Brand Guide \u2014 voice, colors, compliance rules. Complete it first and the agents start working for you.',
    selector: null,
    position: 'center',
  },
];

function SpotlightOverlay({
  rect,
  onClickOutside,
}: {
  rect: DOMRect | null;
  onClickOutside: () => void;
}) {
  if (!rect) {
    return (
      <div
        className="fixed inset-0 z-[9998] bg-black/50 transition-opacity duration-300"
        onClick={onClickOutside}
      />
    );
  }

  const pad = 8;
  const clipPath = `polygon(
    0% 0%, 0% 100%, 100% 100%, 100% 0%,
    0% 0%,
    ${rect.left - pad}px ${rect.top - pad}px,
    ${rect.left - pad}px ${rect.bottom + pad}px,
    ${rect.right + pad}px ${rect.bottom + pad}px,
    ${rect.right + pad}px ${rect.top - pad}px,
    ${rect.left - pad}px ${rect.top - pad}px
  )`;

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/50 transition-all duration-300"
      style={{ clipPath }}
      onClick={onClickOutside}
    />
  );
}

interface TooltipCardProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onSkip: () => void;
  isLastStep: boolean;
  isDispensary: boolean;
}

function TooltipCard({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onSkip,
  isLastStep,
  isDispensary,
}: TooltipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (step.position === 'center' || !targetRect) {
      setStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const card = cardRef.current;
    const cardWidth = card?.offsetWidth || 360;
    const cardHeight = card?.offsetHeight || 200;

    if (step.position === 'bottom') {
      setStyle({
        position: 'fixed',
        top: Math.min(targetRect.bottom + 12, window.innerHeight - cardHeight - 16),
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - cardWidth - 16)),
      });
    } else if (step.position === 'right') {
      setStyle({
        position: 'fixed',
        top: Math.max(16, targetRect.top),
        left: Math.min(targetRect.right + 12, window.innerWidth - cardWidth - 16),
      });
    }
  }, [step, targetRect]);

  return (
    <div
      ref={cardRef}
      className="z-[9999] w-[360px] max-w-[calc(100vw-32px)] rounded-xl border border-border bg-card p-5 shadow-2xl"
      style={style}
    >
      <button
        onClick={onSkip}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <h3 className="text-base font-semibold pr-6">{step.title}</h3>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{step.body}</p>

      {step.id === 'checkin' && isDispensary && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <Tablet className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-medium">Self-Service</p>
              <p className="text-[10px] text-muted-foreground">Tablet at the door</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <Laptop className="h-4 w-4 text-blue-600 shrink-0" />
            <div>
              <p className="text-xs font-medium">Staff Check-In</p>
              <p className="text-[10px] text-muted-foreground">Any laptop or PC</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {stepIndex + 1} of {totalSteps}
        </span>
        <div className="flex items-center gap-2">
          {!isLastStep && (
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={onSkip}>
              Skip tour
            </Button>
          )}
          {isLastStep ? (
            <Button
              size="sm"
              className="text-xs h-8 gap-1"
              onClick={() => {
                window.location.href = '/dashboard/settings/brand-guide';
              }}
            >
              Open Brand Guide
              <ArrowRight className="h-3 w-3" />
            </Button>
          ) : (
            <Button size="sm" className="text-xs h-8 gap-1" onClick={onNext}>
              Next
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductTour() {
  const { role } = useUserRole();
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const isDispensary = isDispensaryRole(role);
  const steps = isDispensary ? DISPENSARY_STEPS : BRAND_STEPS;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (completed) return;

    const timer = setTimeout(() => setIsActive(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const step = steps[currentStep];
    if (!step?.selector) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(step.selector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isActive, steps]);

  const completeTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    void completeOnboardingStep('inbox-foundations');
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      completeTour();
      return;
    }
    setCurrentStep((s) => s + 1);
  }, [currentStep, steps.length, completeTour]);

  if (!isActive || !role) return null;

  const step = steps[currentStep];

  return createPortal(
    <>
      <SpotlightOverlay rect={targetRect} onClickOutside={completeTour} />
      <TooltipCard
        step={step}
        stepIndex={currentStep}
        totalSteps={steps.length}
        targetRect={targetRect}
        onNext={handleNext}
        onSkip={completeTour}
        isLastStep={currentStep === steps.length - 1}
        isDispensary={isDispensary}
      />
    </>,
    document.body,
  );
}
