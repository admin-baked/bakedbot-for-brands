'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { saveAnalyticsPrefs } from '@/server/actions/analytics-prefs';
import { OVERVIEW_WIDGETS, type WidgetId } from './overview-tab';

interface WidgetCustomizerProps {
  open: boolean;
  onClose: () => void;
  enabled: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function WidgetCustomizer({ open, onClose, enabled, onChange }: WidgetCustomizerProps) {
  function handleToggle(widgetId: WidgetId, checked: boolean) {
    const next = new Set(enabled);
    if (checked) {
      next.add(widgetId);
    } else {
      next.delete(widgetId);
    }
    // Optimistic update
    onChange(next);
    // Fire-and-forget save
    saveAnalyticsPrefs(Array.from(next)).catch(() => {
      // Silently revert isn't needed — prefs are re-fetched on next page load
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle>Customize Overview</SheetTitle>
          <SheetDescription>
            Choose which widgets appear on your Analytics Overview.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-4">
          {OVERVIEW_WIDGETS.map((widget) => (
            <div
              key={widget.id}
              className="flex items-start justify-between gap-4 rounded-lg border p-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{widget.label}</span>
                <span className="text-xs text-muted-foreground">{widget.description}</span>
              </div>
              <Switch
                checked={enabled.has(widget.id)}
                onCheckedChange={(checked) => handleToggle(widget.id as WidgetId, checked)}
                aria-label={`Toggle ${widget.label}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
