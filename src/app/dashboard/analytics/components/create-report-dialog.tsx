'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { createAnalyticsReportPlaybook } from '@/server/actions/analytics-prefs';
import { OVERVIEW_WIDGETS, type WidgetId } from './overview-tab';
import { Loader2, ExternalLink } from 'lucide-react';

interface CreateReportDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  sourceWidget: WidgetId;
  sourceName: string;
}

type Schedule = 'daily' | 'weekly' | 'monthly';

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export function CreateReportDialog({
  open,
  onClose,
  orgId,
  sourceWidget,
  sourceName,
}: CreateReportDialogProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [name, setName] = useState(`${sourceName} Report`);
  const [selectedWidgets, setSelectedWidgets] = useState<Set<WidgetId>>(new Set([sourceWidget]));
  const [schedule, setSchedule] = useState<Schedule>('daily');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailText, setEmailText] = useState('');
  const [smsText, setSmsText] = useState('');
  const [includeAiSummary, setIncludeAiSummary] = useState(true);
  const [loading, setLoading] = useState(false);
  const [createdPlaybookId, setCreatedPlaybookId] = useState<string | null>(null);

  function toggleWidget(id: WidgetId) {
    const next = new Set(selectedWidgets);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedWidgets(next);
  }

  function validate(): string | null {
    if (!name.trim()) return 'Report name is required.';
    if (selectedWidgets.size === 0) return 'Select at least one widget to include.';
    if (!emailEnabled && !smsEnabled) return 'Select at least one delivery method.';
    if (emailEnabled && parseLines(emailText).length === 0)
      return 'Enter at least one email address.';
    if (smsEnabled && parseLines(smsText).length === 0)
      return 'Enter at least one phone number.';
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) {
      toast({ title: 'Validation error', description: err, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const result = await createAnalyticsReportPlaybook({
        orgId,
        name: name.trim(),
        widgets: Array.from(selectedWidgets),
        schedule,
        deliveryEmail: emailEnabled ? parseLines(emailText) : [],
        deliverySms: smsEnabled ? parseLines(smsText) : [],
        includeAiSummary,
      });

      if (!result.success) {
        toast({ title: 'Failed to create playbook', description: result.error, variant: 'destructive' });
        return;
      }

      setCreatedPlaybookId(result.playbookId ?? null);
      toast({
        title: 'Report playbook created!',
        description: 'Activate it in Playbooks to start receiving reports.',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setCreatedPlaybookId(null);
    setName(`${sourceName} Report`);
    setSelectedWidgets(new Set([sourceWidget]));
    setSchedule('daily');
    setEmailEnabled(true);
    setSmsEnabled(false);
    setEmailText('');
    setSmsText('');
    setIncludeAiSummary(true);
    onClose();
  }

  // Success state
  if (createdPlaybookId) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Playbook Created!</DialogTitle>
            <DialogDescription>
              Your analytics report playbook has been saved as a draft. Activate it in Playbooks to
              start receiving scheduled reports.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button
              onClick={() => {
                handleClose();
                router.push('/dashboard/playbooks');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to Playbooks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Scheduled Report</DialogTitle>
          <DialogDescription>
            Schedule an analytics report to be delivered via email or SMS — no login required.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Report name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-name">Report name</Label>
            <Input
              id="report-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Daily Revenue Report"
            />
          </div>

          {/* Widget selection */}
          <div className="flex flex-col gap-2">
            <Label>Widgets to include</Label>
            <div className="grid grid-cols-1 gap-2">
              {OVERVIEW_WIDGETS.map((w) => (
                <label
                  key={w.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedWidgets.has(w.id as WidgetId)}
                    onCheckedChange={() => toggleWidget(w.id as WidgetId)}
                  />
                  <div>
                    <p className="text-sm font-medium">{w.label}</p>
                    <p className="text-xs text-muted-foreground">{w.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="flex flex-col gap-2">
            <Label>Schedule</Label>
            <RadioGroup
              value={schedule}
              onValueChange={(v) => setSchedule(v as Schedule)}
              className="flex gap-4"
            >
              {(['daily', 'weekly', 'monthly'] as Schedule[]).map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value={s} />
                  <span className="text-sm capitalize">{s}</span>
                </label>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {schedule === 'daily' && 'Sends every day at 8:00 AM ET'}
              {schedule === 'weekly' && 'Sends every Monday at 8:00 AM ET'}
              {schedule === 'monthly' && 'Sends on the 1st of each month at 8:00 AM ET'}
            </p>
          </div>

          {/* Delivery */}
          <div className="flex flex-col gap-3">
            <Label>Delivery</Label>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={emailEnabled}
                  onCheckedChange={setEmailEnabled}
                  id="email-toggle"
                />
                <Label htmlFor="email-toggle" className="cursor-pointer">
                  Email
                </Label>
              </div>
              {emailEnabled && (
                <Textarea
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                  placeholder="owner@dispensary.com&#10;manager@dispensary.com"
                  rows={2}
                  className="text-sm"
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} id="sms-toggle" />
                <Label htmlFor="sms-toggle" className="cursor-pointer">
                  SMS
                </Label>
              </div>
              {smsEnabled && (
                <Textarea
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  placeholder="+15551234567&#10;+15559876543"
                  rows={2}
                  className="text-sm"
                />
              )}
            </div>
          </div>

          {/* AI Summary toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Include AI summary</p>
              <p className="text-xs text-muted-foreground">
                Pops will add key insights and recommended decisions to the report.
              </p>
            </div>
            <Switch
              checked={includeAiSummary}
              onCheckedChange={setIncludeAiSummary}
              id="ai-summary"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
