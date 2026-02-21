'use client';

/**
 * Message Support Dialog
 *
 * Allows brand/dispensary users to create support requests
 * that route to Super User inbox with bi-directional messaging.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MessageSquare, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createSupportRequest } from '@/server/actions/support';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface MessageSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RequestType = 'escalation' | 'feedback';

export function MessageSupportDialog({ open, onOpenChange }: MessageSupportDialogProps) {
  const [type, setType] = useState<RequestType>('escalation');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await createSupportRequest({
        type,
        message: message.trim(),
        priority: type === 'escalation' ? priority : 'medium',
      });

      if (!result.success) {
        setError(result.error || 'Failed to create support request');
        return;
      }

      setSuccess(true);
      setMessage('');

      // Redirect to inbox after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        if (result.threadId) {
          router.push(`/dashboard/inbox?thread=${result.threadId}`);
        }
      }, 2000);
    } catch (err) {
      logger.error('Failed to create support request', { error: err });
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message Support Team
          </DialogTitle>
          <DialogDescription>
            Send a message directly to our Super User support team. They'll respond to your inbox.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 py-6">
            <Alert className="border-green-200 bg-green-50 text-green-900">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ✅ Your support request has been sent! You'll be able to track it in your inbox.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              Redirecting to your inbox...
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Request Type */}
            <div>
              <Label className="text-base font-semibold mb-3 block">What do you need help with?</Label>
              <RadioGroup value={type} onValueChange={(value) => setType(value as RequestType)}>
                <div className="flex items-center space-x-3 mb-3 p-3 rounded-md border cursor-pointer hover:bg-muted transition-colors" onClick={() => setType('escalation')}>
                  <RadioGroupItem value="escalation" id="escalation" />
                  <Label htmlFor="escalation" className="cursor-pointer flex-1 font-medium text-sm mb-0">
                    <div>Technical Issue / Escalation</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Something isn't working or needs immediate attention
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-md border cursor-pointer hover:bg-muted transition-colors" onClick={() => setType('feedback')}>
                  <RadioGroupItem value="feedback" id="feedback" />
                  <Label htmlFor="feedback" className="cursor-pointer flex-1 font-medium text-sm mb-0">
                    <div>Feature Request / Feedback</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Suggest improvements or share feedback
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Priority (only for escalations) */}
            {type === 'escalation' && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">Priority</Label>
                <RadioGroup value={priority} onValueChange={(value) => setPriority(value as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="priority-low" />
                    <Label htmlFor="priority-low" className="cursor-pointer text-sm mb-0">
                      Low (Can wait)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="priority-medium" />
                    <Label htmlFor="priority-medium" className="cursor-pointer text-sm mb-0">
                      Medium (Moderate impact)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="priority-high" />
                    <Label htmlFor="priority-high" className="cursor-pointer text-sm mb-0">
                      High (Urgent/critical)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Message */}
            <div>
              <Label htmlFor="message" className="text-sm font-semibold mb-2 block">
                Your message
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === 'escalation'
                    ? "Describe the issue you're experiencing and what you've tried so far..."
                    : 'Share your feature request or feedback...'
                }
                rows={6}
                disabled={loading}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {message.length} characters
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send to Support Team
                </>
              )}
            </Button>

            {/* Help text */}
            <p className="text-xs text-muted-foreground text-center">
              Our Super Users typically respond within 24 hours.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default MessageSupportDialog;
