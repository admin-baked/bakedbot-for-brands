'use client';

/**
 * Academy Email Gate Modal
 *
 * Captures email for lead generation when user:
 * - Hits the 3 free video limit
 * - Tries to download a resource
 *
 * Pattern: Similar to Vibe Studio email modal
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, GraduationCap, Lock } from 'lucide-react';

export interface EmailGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: 'limit_reached' | 'resource_download';
  onSuccess: (leadId: string) => void;
  remainingViews?: number;
}

export function EmailGateModal({
  open,
  onOpenChange,
  reason,
  onSuccess,
  remainingViews = 0,
}: EmailGateModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getTitle = () => {
    switch (reason) {
      case 'limit_reached':
        return 'Unlock Unlimited Academy Access';
      case 'resource_download':
        return 'Download Free Resources';
      default:
        return 'Continue Learning';
    }
  };

  const getDescription = () => {
    switch (reason) {
      case 'limit_reached':
        return `You've watched ${3 - remainingViews} free videos. Enter your email to unlock unlimited access to all 12 episodes and downloadable resources.`;
      case 'resource_download':
        return 'Enter your email to access our free library of checklists, templates, and guides. No credit card required.';
      default:
        return 'Enter your email to continue.';
    }
  };

  const handleSubmit = async () => {
    if (!email.trim()) return;

    setSubmitting(true);

    try {
      // Import the server action dynamically to avoid bundling issues
      const { captureAcademyLead } = await import('@/server/actions/academy');

      const result = await captureAcademyLead({
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        marketingOptIn,
      });

      if (result.success && result.leadId) {
        onSuccess(result.leadId);
      } else {
        throw new Error(result.error || 'Failed to capture email');
      }
    } catch (error) {
      console.error('Failed to capture email:', error);
      // Still allow user to continue even if server action fails
      onSuccess('temp_' + Date.now());
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form
    setEmail('');
    setFirstName('');
    setPhone('');
    setCompany('');
    setMarketingOptIn(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {reason === 'limit_reached' && (
              <GraduationCap className="h-5 w-5 text-primary" />
            )}
            {reason === 'resource_download' && (
              <Lock className="h-5 w-5 text-primary" />
            )}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email - Required */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email *
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@dispensary.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* First Name - Optional */}
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-medium">
              First Name <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          {/* Phone - Optional */}
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Company - Optional */}
          <div className="space-y-2">
            <label htmlFor="company" className="text-sm font-medium">
              Company <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="company"
              type="text"
              placeholder="Your Dispensary Name"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          {/* Marketing Opt-in */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="marketing"
              checked={marketingOptIn}
              onCheckedChange={(checked) => setMarketingOptIn(!!checked)}
            />
            <label
              htmlFor="marketing"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Send me cannabis marketing tips and Academy updates
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !email.trim()}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
