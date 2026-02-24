/**
 * ArchetypePreview — Brand Guide 2.0 Spec 01
 *
 * Shows live sample copy for the selected archetype blend.
 * Smokey sample = how the budtender chatbot will greet customers.
 * Craig email subject = how campaign subjects will read.
 */

'use client';

import { BRAND_ARCHETYPES, getVoiceDefaults, type ArchetypeId } from '@/constants/brand-archetypes';

interface ArchetypePreviewProps {
  primary: ArchetypeId;
  secondary?: ArchetypeId | null;
}

const VOICE_LABELS = ['Formality', 'Education', 'Energy', 'Boldness', 'Community'];
const VOICE_ENDPOINTS: [string, string][] = [
  ['Casual', 'Professional'],
  ['Entertaining', 'Clinical'],
  ['Calm', 'High Energy'],
  ['Conservative', 'Provocative'],
  ['Product-First', 'Community-First'],
];

export function ArchetypePreview({ primary, secondary }: ArchetypePreviewProps) {
  const archetype = BRAND_ARCHETYPES[primary];
  const secondaryArchetype = secondary ? BRAND_ARCHETYPES[secondary] : null;
  const voiceValues = getVoiceDefaults(primary, secondary ?? undefined);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{archetype.icon}</span>
        <div>
          <div className="font-semibold">{archetype.label}</div>
          {secondaryArchetype && (
            <div className="text-xs text-muted-foreground">
              + {secondaryArchetype.icon} {secondaryArchetype.label} (30% blend)
            </div>
          )}
        </div>
      </div>

      {/* Voice sliders preview */}
      <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Voice Spectrum</div>
        {VOICE_LABELS.map((label, i) => {
          const val = voiceValues[i]; // 1-5
          const pct = ((val - 1) / 4) * 100;
          return (
            <div key={label} className="space-y-0.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{VOICE_ENDPOINTS[i][0]}</span>
                <span className="font-medium text-foreground">{label} · {val}/5</span>
                <span>{VOICE_ENDPOINTS[i][1]}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-border">
                <div
                  className="h-1.5 rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Smokey sample */}
      <div className="rounded-lg border p-3 space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          🤖 Smokey will greet customers like:
        </div>
        <p className="text-sm italic text-foreground leading-relaxed">
          &ldquo;{archetype.smokeySample.replace('{dispensary}', 'your dispensary')}&rdquo;
        </p>
      </div>

      {/* Craig subject sample */}
      <div className="rounded-lg border p-3 space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          ✉️ Craig campaign subjects will read like:
        </div>
        <p className="text-sm font-medium text-foreground">
          {archetype.craigSubjectSample
            .replace('{first_name}', 'Alex')
            .replace('{dispensary}', 'your dispensary')}
        </p>
      </div>
    </div>
  );
}
