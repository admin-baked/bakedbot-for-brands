'use client';

/**
 * Inbox CTA Banner
 *
 * Encourages users to create content in the inbox instead of legacy pages.
 * Shows migration banner during transition period.
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Inbox, Sparkles, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface InboxCTABannerProps {
  variant?: 'creative' | 'playbooks' | 'projects';
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_CONFIG = {
  creative: {
    title: 'Create Content with AI Agents',
    description: 'Work with Craig, Nano Banana, and Deebo in the inbox for faster content creation.',
    inboxType: 'creative' as const,
    ctaText: 'Open Inbox',
    icon: Sparkles,
  },
  playbooks: {
    title: 'Build Playbooks in the Inbox',
    description: 'Collaborate with your agent squad to create, review, and deploy playbooks.',
    inboxType: 'general' as const,
    ctaText: 'Open Inbox',
    icon: Inbox,
  },
  projects: {
    title: 'Manage Projects in the Inbox',
    description: 'Chat with agents to plan, execute, and track project workflows.',
    inboxType: 'general' as const,
    ctaText: 'Open Inbox',
    icon: Inbox,
  },
};

export function InboxCTABanner({
  variant = 'creative',
  onDismiss,
  className,
}: InboxCTABannerProps) {
  const router = useRouter();
  const [isDismissed, setIsDismissed] = React.useState(false);

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  const handleOpenInbox = () => {
    router.push(`/dashboard/inbox?type=${config.inboxType}`);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'relative overflow-hidden rounded-xl border',
            'bg-gradient-to-r from-primary/10 via-primary/5 to-background',
            'border-primary/20',
            className
          )}
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-pulse" />

          <div className="relative p-4 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                {/* Icon */}
                <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base">
                      {config.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/30 text-[10px] px-1.5 py-0"
                    >
                      NEW
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {config.description}
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleOpenInbox}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                      size="sm"
                    >
                      {config.ctaText}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // TODO: Open help docs
                        window.open('https://docs.bakedbot.ai/inbox', '_blank');
                      }}
                      className="text-muted-foreground"
                    >
                      Learn More
                    </Button>
                  </div>
                </div>
              </div>

              {/* Dismiss Button */}
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact inline CTA for empty states
 */
export function InboxCTAInline({
  text = 'Create in Inbox',
  inboxType = 'general',
  className,
}: {
  text?: string;
  inboxType?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => router.push(`/dashboard/inbox?type=${inboxType}`)}
      className={cn(
        'gap-2 border-primary/30 text-primary hover:bg-primary/10',
        className
      )}
    >
      <Inbox className="w-4 h-4" />
      {text}
    </Button>
  );
}

export default InboxCTABanner;
