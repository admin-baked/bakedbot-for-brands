'use client';
// src/components/dashboard/intent-profile/archetype-selector.tsx

import { Gem, Tag, Users, HeartPulse, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BusinessArchetype } from '@/types/dispensary-intent-profile';
import { ARCHETYPE_METADATA } from '@/types/dispensary-intent-profile';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Gem,
  Tag,
  Users,
  HeartPulse,
  Sparkles,
};

interface ArchetypeSelectorProps {
  value: BusinessArchetype | null;
  onChange: (archetype: BusinessArchetype) => void;
  disabled?: boolean;
}

export function ArchetypeSelector({ value, onChange, disabled = false }: ArchetypeSelectorProps) {
  const archetypes = Object.values(ARCHETYPE_METADATA);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {archetypes.map((meta) => {
        const Icon = ICON_MAP[meta.icon] ?? Sparkles;
        const isSelected = value === meta.archetype;

        return (
          <button
            key={meta.archetype}
            type="button"
            disabled={disabled}
            onClick={() => onChange(meta.archetype)}
            className={cn(
              'relative flex flex-col gap-2 rounded-lg border p-4 text-left transition-all',
              'hover:border-primary/60 hover:bg-primary/5',
              isSelected
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-card',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {isSelected && (
              <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-primary" />
            )}

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold">{meta.label}</span>
            </div>

            <p className="text-xs text-muted-foreground">{meta.description}</p>

            <ul className="space-y-1">
              {meta.defaultHighlights.map((highlight) => (
                <li key={highlight} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-1 w-1 rounded-full bg-primary/60 shrink-0" />
                  {highlight}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
