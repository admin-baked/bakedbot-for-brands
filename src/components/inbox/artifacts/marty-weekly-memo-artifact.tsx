'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { InboxArtifact } from '@/types/inbox';
import type { MartyWeeklyMemoData } from '@/types/marty';

function formatCurrency(value: number | null): string {
  return value === null ? 'Not instrumented yet' : `$${value.toLocaleString()}`;
}

export function MartyWeeklyMemoArtifact({ artifact }: { artifact: InboxArtifact }) {
  const memo = artifact.data as MartyWeeklyMemoData;

  return (
    <Card className="border-border/60 bg-muted/10">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Marty Weekly CEO Memo</CardTitle>
            <CardDescription>{memo.date}</CardDescription>
          </div>
          <Badge variant="outline">Weekly cadence</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/60 bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Current MRR</p>
            <p className="mt-1 text-sm font-semibold">{formatCurrency(memo.currentMrr)}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Target Pace</p>
            <p className="mt-1 text-sm font-semibold">${memo.targetMrr.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Pace vs Target</p>
            <p className="mt-1 text-sm font-semibold">
              {memo.paceVsTargetPct === null ? 'Not instrumented yet' : `${memo.paceVsTargetPct}%`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {memo.sections.map((section) => (
            <div key={section.id} className="space-y-2">
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <p className="text-sm text-muted-foreground">{section.summary}</p>
              {section.bullets.length > 0 && (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>- {bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
