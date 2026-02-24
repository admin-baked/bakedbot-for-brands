/**
 * ArchetypeSelector — Brand Guide 2.0 Spec 01
 *
 * 6-card grid for choosing a primary (required) and optional secondary archetype.
 * Shows a "Scanner suggested" badge on the archetype the scanner recommended.
 * Saves via saveBrandArchetype() server action.
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Check } from 'lucide-react';
import { BRAND_ARCHETYPES, type ArchetypeId } from '@/constants/brand-archetypes';
import { saveBrandArchetype } from '@/server/actions/brand-guide';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ArchetypeSelectorProps {
  brandId: string;
  initialPrimary?: ArchetypeId | null;
  initialSecondary?: ArchetypeId | null;
  scannerSuggestion?: ArchetypeId | null;
  onSaved?: (primary: ArchetypeId, secondary: ArchetypeId | null) => void;
}

const ARCHETYPE_ORDER: ArchetypeId[] = [
  'wellness_caregiver',
  'explorer_adventure',
  'rebel_streetwear',
  'artisan_craft',
  'premium_luxury',
  'community_heritage',
];

export function ArchetypeSelector({
  brandId,
  initialPrimary,
  initialSecondary,
  scannerSuggestion,
  onSaved,
}: ArchetypeSelectorProps) {
  const [primary, setPrimary] = useState<ArchetypeId | null>(initialPrimary ?? null);
  const [secondary, setSecondary] = useState<ArchetypeId | null>(initialSecondary ?? null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  function handleCardClick(id: ArchetypeId) {
    if (id === primary) {
      // Clicking primary again → deselect primary (promote secondary if set)
      setPrimary(secondary);
      setSecondary(null);
    } else if (id === secondary) {
      // Clicking secondary again → deselect secondary
      setSecondary(null);
    } else if (!primary) {
      // No primary yet → set as primary
      setPrimary(id);
    } else {
      // Primary already set → set as secondary (replace if already had one)
      setSecondary(id);
    }
  }

  async function handleSave() {
    if (!primary) {
      toast({ title: 'Select a primary archetype first', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const result = await saveBrandArchetype(brandId, primary, secondary);
      if (!result.success) throw new Error((result as { success: false; error: string }).error);
      toast({ title: 'Brand archetype saved', description: `${BRAND_ARCHETYPES[primary].label} is now your primary archetype.` });
      onSaved?.(primary, secondary);
    } catch (err) {
      toast({ title: 'Save failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Click once</span> to set primary archetype.{' '}
        <span className="font-medium text-foreground">Click a second card</span> to add an optional secondary (blended 30%).
      </div>

      {/* Scanner suggestion banner */}
      {scannerSuggestion && !initialPrimary && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>
            Scanner suggests <strong>{BRAND_ARCHETYPES[scannerSuggestion].label}</strong> based on your website colors and content.
          </span>
        </div>
      )}

      {/* 2×3 card grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ARCHETYPE_ORDER.map((id) => {
          const archetype = BRAND_ARCHETYPES[id];
          const isPrimary = primary === id;
          const isSecondary = secondary === id;
          const isSuggested = scannerSuggestion === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => handleCardClick(id)}
              className={cn(
                'relative flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isPrimary
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : isSecondary
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border bg-card hover:border-primary/30'
              )}
            >
              {/* Selection indicator */}
              {(isPrimary || isSecondary) && (
                <span
                  className={cn(
                    'absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white',
                    isPrimary ? 'bg-primary' : 'bg-primary/50'
                  )}
                >
                  {isPrimary ? '1' : '2'}
                </span>
              )}

              {/* Scanner suggestion badge */}
              {isSuggested && (
                <Badge variant="outline" className="absolute left-2 top-2 gap-1 border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  <Sparkles className="h-2.5 w-2.5" />
                  Suggested
                </Badge>
              )}

              {/* Icon + label */}
              <div className="mt-4 text-2xl leading-none">{archetype.icon}</div>
              <div className="font-semibold text-sm leading-tight">{archetype.label}</div>
              <p className="text-xs text-muted-foreground leading-snug line-clamp-3">
                {archetype.description}
              </p>

              {/* Brand examples */}
              <div className="mt-1 flex flex-wrap gap-1">
                {archetype.brandExamples.slice(0, 2).map((ex) => (
                  <span key={ex} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {ex}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selection summary + save */}
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="text-sm">
          {primary ? (
            <span>
              <strong>{BRAND_ARCHETYPES[primary].icon} {BRAND_ARCHETYPES[primary].shortLabel}</strong>
              {secondary ? (
                <> + <span className="text-muted-foreground">{BRAND_ARCHETYPES[secondary].icon} {BRAND_ARCHETYPES[secondary].shortLabel} (30%)</span></>
              ) : null}
            </span>
          ) : (
            <span className="text-muted-foreground">No archetype selected</span>
          )}
        </div>
        <Button onClick={handleSave} disabled={!primary || saving} size="sm">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Save Archetype
        </Button>
      </div>
    </div>
  );
}
