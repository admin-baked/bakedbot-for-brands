/**
 * ArchetypePreview — Brand Guide 2.0 Spec 01
 *
 * Shows live sample copy for the selected archetype blend.
 * Smokey sample = how the budtender chatbot will greet customers.
 * Craig email subject = how campaign subjects will read.
 *
 * Props:
 * - brandName: replaces {dispensary} token with the actual brand name
 * - smokeyGreeting / craigSubjectTemplate: custom overrides saved in the brand guide
 * - onSaveGreeting / onSaveCraigSubject: save callbacks (enables inline editing)
 */

'use client';

import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BRAND_ARCHETYPES, getVoiceDefaults, type ArchetypeId } from '@/constants/brand-archetypes';

interface ArchetypePreviewProps {
  primary: ArchetypeId;
  secondary?: ArchetypeId | null;
  /** Actual brand name, e.g. "Thrive Syracuse" — replaces {dispensary} token */
  brandName?: string;
  /** Custom Smokey greeting override (saved in brand guide messaging) */
  smokeyGreeting?: string;
  /** Custom Craig subject override (saved in brand guide messaging) */
  craigSubjectTemplate?: string;
  /** If provided, greeting becomes editable and saves on confirm */
  onSaveGreeting?: (greeting: string) => Promise<void>;
  /** If provided, Craig subject becomes editable and saves on confirm */
  onSaveCraigSubject?: (subject: string) => Promise<void>;
}

const VOICE_LABELS = ['Formality', 'Education', 'Energy', 'Boldness', 'Community'];
const VOICE_ENDPOINTS: [string, string][] = [
  ['Casual', 'Professional'],
  ['Entertaining', 'Clinical'],
  ['Calm', 'High Energy'],
  ['Conservative', 'Provocative'],
  ['Product-First', 'Community-First'],
];

const SMOKEY_AVATAR = 'https://storage.googleapis.com/bakedbot-global-assets/avatars/smokey-mascot.png';

export function ArchetypePreview({
  primary,
  secondary,
  brandName,
  smokeyGreeting,
  craigSubjectTemplate,
  onSaveGreeting,
  onSaveCraigSubject,
}: ArchetypePreviewProps) {
  const archetype = BRAND_ARCHETYPES[primary] ?? null;
  const secondaryArchetype = secondary ? (BRAND_ARCHETYPES[secondary] ?? null) : null;
  const voiceValues = getVoiceDefaults(primary, secondary ?? undefined);

  if (!archetype) return null;
  const displayName = brandName || 'your dispensary';

  // Default texts from archetype constants with real brand name substituted
  const defaultGreeting = archetype.smokeySample.replace(/\{dispensary\}/g, displayName);
  const defaultCraigSubject = archetype.craigSubjectSample
    .replace(/\{dispensary\}/g, displayName)
    .replace(/\{first_name\}/g, 'Alex');

  // Active display values: custom override > archetype default
  const activeGreeting = smokeyGreeting
    ? smokeyGreeting.replace(/\{dispensary\}/g, displayName)
    : defaultGreeting;
  const activeCraigSubject = craigSubjectTemplate
    ? craigSubjectTemplate.replace(/\{dispensary\}/g, displayName).replace(/\{first_name\}/g, 'Alex')
    : defaultCraigSubject;

  // Edit state
  const [editingGreeting, setEditingGreeting] = useState(false);
  const [greetingDraft, setGreetingDraft] = useState('');
  const [savingGreeting, setSavingGreeting] = useState(false);

  const [editingCraig, setEditingCraig] = useState(false);
  const [craigDraft, setCraigDraft] = useState('');
  const [savingCraig, setSavingCraig] = useState(false);

  async function saveGreeting() {
    if (!onSaveGreeting) return;
    setSavingGreeting(true);
    try {
      await onSaveGreeting(greetingDraft);
      setEditingGreeting(false);
    } finally {
      setSavingGreeting(false);
    }
  }

  async function saveCraig() {
    if (!onSaveCraigSubject) return;
    setSavingCraig(true);
    try {
      await onSaveCraigSubject(craigDraft);
      setEditingCraig(false);
    } finally {
      setSavingCraig(false);
    }
  }

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <img
              src={SMOKEY_AVATAR}
              alt="Smokey"
              className="h-4 w-4 rounded-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            Smokey will greet customers like:
          </div>
          {onSaveGreeting && !editingGreeting && (
            <button
              type="button"
              onClick={() => { setGreetingDraft(smokeyGreeting || defaultGreeting); setEditingGreeting(true); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Edit greeting"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>

        {editingGreeting ? (
          <div className="space-y-2">
            <Textarea
              value={greetingDraft}
              onChange={(e) => setGreetingDraft(e.target.value)}
              className="text-sm min-h-[80px] resize-none"
              placeholder={defaultGreeting}
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm" variant="ghost"
                onClick={() => setEditingGreeting(false)}
                disabled={savingGreeting}
              >
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveGreeting}
                disabled={savingGreeting}
              >
                <Check className="h-3 w-3 mr-1" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm italic text-foreground leading-relaxed">
            &ldquo;{activeGreeting}&rdquo;
          </p>
        )}
      </div>

      {/* Craig subject sample */}
      <div className="rounded-lg border p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            ✉️ Craig campaign subjects will read like:
          </div>
          {onSaveCraigSubject && !editingCraig && (
            <button
              type="button"
              onClick={() => { setCraigDraft(craigSubjectTemplate || defaultCraigSubject); setEditingCraig(true); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Edit subject line"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>

        {editingCraig ? (
          <div className="space-y-2">
            <Input
              value={craigDraft}
              onChange={(e) => setCraigDraft(e.target.value)}
              className="text-sm"
              placeholder={defaultCraigSubject}
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm" variant="ghost"
                onClick={() => setEditingCraig(false)}
                disabled={savingCraig}
              >
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveCraig}
                disabled={savingCraig}
              >
                <Check className="h-3 w-3 mr-1" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm font-medium text-foreground">
            {activeCraigSubject}
          </p>
        )}
      </div>
    </div>
  );
}
