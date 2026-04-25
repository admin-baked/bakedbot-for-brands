'use client';

/**
 * Onboarding Coaching Card
 *
 * Drop-in empty-state card for onboarding step pages.
 * Shows contextual guidance when the user hasn't completed the step yet.
 * Auto-hides when the step is already done.
 *
 * Usage:
 *   <OnboardingCoachingCard stepId="brand-guide" />
 */

import { useState, useEffect, useRef } from 'react';
import { Sparkles, X, ArrowRight, CheckCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useOnboardingCelebration } from '@/hooks/use-onboarding-celebration';
import type { OnboardingStepId } from '@/types/onboarding';

interface StepGuidance {
  title: string;
  description: string;
  tips: string[];
  ctaLabel?: string;
  videoUrl?: string;
  posterUrl?: string; // screenshot shown before video plays
}

const STEP_GUIDANCE: Record<OnboardingStepId, StepGuidance> = {
  'brand-guide': {
    title: 'Build your Brand Guide',
    description: 'Your Brand Guide powers every agent in the system — voice, colors, compliance rules, and assets. Complete it to 80%+ to unlock automated content and outreach.',
    tips: [
      'Start with your brand archetype — it sets the tone for all AI-generated content.',
      'Upload a logo and hero image so social drafts look polished from day one.',
      'Set compliance keywords to auto-flag before anything goes live.',
    ],
    ctaLabel: 'Start building',
    videoUrl: 'https://storage.googleapis.com/bakedbot-global-assets/onboarding/videos/01-brand-guide.mp4',
    posterUrl: 'https://storage.googleapis.com/bakedbot-global-assets/onboarding/screenshots/brand-guide.png',
  },
  'link-dispensary': {
    title: 'Link your dispensary',
    description: 'Connecting your dispensary ensures check-in, menu, and reporting all stay tenant-safe.',
    tips: [
      'Search by name or enter manually if not found.',
      'This links your org to the right retail location.',
    ],
    ctaLabel: 'Search dispensaries',
    videoUrl: 'https://storage.googleapis.com/bakedbot-global-assets/onboarding/videos/02-link-dispensary.mp4',
  },
  'connect-pos': {
    title: 'Connect your menu data',
    description: 'Real products power tablet recommendations, lifecycle emails, and competitive analysis.',
    tips: [
      'Connect your POS system for live sync, or upload a CSV.',
      'Products appear in Smokey recommendations within minutes.',
    ],
    ctaLabel: 'Connect now',
  },
  'checkin-manager': {
    title: 'Launch Check-In with Tablet',
    description: 'Configure the live check-in experience your customers will see at the front door.',
    tips: [
      'Customize the welcome message and branding.',
      'Preview exactly what the tablet shows before going live.',
    ],
    ctaLabel: 'Configure check-in',
  },
  'qr-training': {
    title: 'Print QR & train staff',
    description: 'Get the QR code printed and walk your team through the tablet flow.',
    tips: [
      'Download and print the QR code for your entrance.',
      'Run through the flow with one staff member before launch day.',
    ],
    ctaLabel: 'Get your QR code',
  },
  'creative-center': {
    title: 'Create your first social draft',
    description: 'Creative Center uses your Brand Guide to generate on-brand social content in seconds.',
    tips: [
      'Pick a quick start template to get going fast.',
      'Your brand voice and colors are applied automatically.',
      'Edit, then schedule or publish from the editor.',
    ],
    ctaLabel: 'Create a draft',
  },
  'content-calendar': {
    title: 'Put your first post on the calendar',
    description: 'Plan what ships next after your first draft.',
    tips: [
      'Open the calendar view to see your content timeline.',
      'Drag drafts to schedule them for specific dates.',
    ],
    ctaLabel: 'Open calendar',
  },
  'welcome-playbook': {
    title: 'Launch your Welcome Playbook',
    description: 'The Welcome Playbook sends personalized follow-up to every new contact automatically.',
    tips: [
      'Connect email if you haven\'t already.',
      'Review the automation steps, then activate.',
      'New contacts start receiving messages within minutes.',
    ],
    ctaLabel: 'Review playbook',
  },
  'inbox-foundations': {
    title: 'Learn Inbox, Playbooks & Agents',
    description: 'Inbox is where all agent work and approvals land. Playbooks keep repeatable workflows running.',
    tips: [
      'Check the start-here briefing for a quick orientation.',
      'Approve or decline agent work directly from Inbox.',
    ],
    ctaLabel: 'Open Inbox',
  },
  'competitive-intel': {
    title: 'Launch Competitive Intelligence',
    description: 'Ezal monitors your competitors daily and delivers pricing, menu, and strategy reports.',
    tips: [
      'Pick 2-3 competitors to start tracking.',
      'Reports land in email and Slack (if connected).',
      'First report arrives within 24 hours.',
    ],
    ctaLabel: 'Choose competitors',
  },
};

interface OnboardingCoachingCardProps {
  stepId: OnboardingStepId;
  isComplete?: boolean;
  onMarkComplete?: () => void;
  className?: string;
}

export function OnboardingCoachingCard({
  stepId,
  isComplete = false,
  onMarkComplete,
  className,
}: OnboardingCoachingCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(isComplete);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { celebrate } = useOnboardingCelebration();

  useEffect(() => {
    setDone(isComplete);
  }, [isComplete]);

  if (done || dismissed) return null;

  const guidance = STEP_GUIDANCE[stepId];
  if (!guidance) return null;

  const handleMarkDone = async () => {
    setCompleting(true);
    const result = await celebrate(stepId);
    if (result.success) {
      setDone(true);
      onMarkComplete?.();
    }
    setCompleting(false);
  };

  return (
    <Card className={cn(
      'border-primary/20 bg-gradient-to-r from-primary/5 to-transparent mb-6 relative overflow-hidden',
      className,
    )}>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h3 className="font-semibold text-sm">{guidance.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {guidance.description}
              </p>
            </div>

            <div className="space-y-1.5">
              {guidance.tips.map((tip, i) => (
                <div key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <ArrowRight className="h-3 w-3 mt-0.5 text-primary/60 flex-shrink-0" />
                  {tip}
                </div>
              ))}
            </div>

            {guidance.videoUrl && (
              <div className="pt-1">
                {showVideo ? (
                  <div className="rounded-lg overflow-hidden border border-border/50 max-w-xs">
                    <video
                      ref={videoRef}
                      src={`${guidance.videoUrl}#t=0.001`}
                      poster={guidance.posterUrl}
                      controls
                      autoPlay
                      className="w-full aspect-video bg-zinc-900"
                      onEnded={() => setShowVideo(false)}
                    />
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => setShowVideo(true)}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Watch walkthrough
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7 text-muted-foreground"
                onClick={handleMarkDone}
                disabled={completing}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {completing ? 'Saving...' : 'Mark as done'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default OnboardingCoachingCard;
