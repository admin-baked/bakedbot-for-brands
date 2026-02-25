'use client';
// src/app/dashboard/settings/intent-profile/intent-profile-client.tsx

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target, ChevronDown, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ArchetypeSelector } from '@/components/dashboard/intent-profile/archetype-selector';
import { TradeOffSlider } from '@/components/dashboard/intent-profile/trade-off-slider';
import {
  updateOrgIntentProfile,
  createOrgIntentProfileFromArchetype,
} from '@/server/actions/intent-profile';
import { calculateCompletionPct } from '@/server/services/intent-profile';
import type {
  DispensaryIntentProfile,
  BusinessArchetype,
  ValueHierarchies,
  SmokeyIntentConfig,
  CraigIntentConfig,
  StrategicFoundation,
  HardBoundaries,
} from '@/types/dispensary-intent-profile';
import { SLIDER_METADATA } from '@/types/dispensary-intent-profile';

interface Props {
  orgId: string;
  initialProfile: DispensaryIntentProfile | null;
}

export function IntentProfileClient({ orgId, initialProfile }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<DispensaryIntentProfile>>(initialProfile ?? {});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const completion = calculateCompletionPct(profile);

  // ── Archetype bootstrap ──────────────────────────────────────────────────

  async function handleArchetypeSelect(archetype: BusinessArchetype) {
    if (profile.strategicFoundation?.archetype === archetype) return;
    setIsSaving(true);
    const result = await createOrgIntentProfileFromArchetype(orgId, archetype);
    if (result.success && result.profile) {
      setProfile(result.profile);
      setHasUnsaved(false);
      toast.success(`Intent profile seeded from ${archetype.replace('_', ' ')} archetype`);
      router.refresh();
    } else {
      toast.error(result.error ?? 'Failed to create profile');
    }
    setIsSaving(false);
  }

  // ── Partial field updaters ───────────────────────────────────────────────

  function updateStrategicFoundation(updates: Partial<StrategicFoundation>) {
    setProfile(prev => ({
      ...prev,
      strategicFoundation: { ...(prev.strategicFoundation as StrategicFoundation), ...updates },
    }));
    setHasUnsaved(true);
  }

  function updateValueHierarchies(field: keyof ValueHierarchies, value: number) {
    setProfile(prev => ({
      ...prev,
      valueHierarchies: { ...(prev.valueHierarchies as ValueHierarchies), [field]: value },
    }));
    setHasUnsaved(true);
  }

  function updateSmokey(updates: Partial<SmokeyIntentConfig>) {
    setProfile(prev => ({
      ...prev,
      agentConfigs: {
        ...(prev.agentConfigs ?? {}),
        smokey: { ...(prev.agentConfigs?.smokey as SmokeyIntentConfig), ...updates },
        craig: (prev.agentConfigs?.craig as CraigIntentConfig) ?? ({} as CraigIntentConfig),
      },
    }));
    setHasUnsaved(true);
  }

  function updateCraig(updates: Partial<CraigIntentConfig>) {
    setProfile(prev => ({
      ...prev,
      agentConfigs: {
        ...(prev.agentConfigs ?? {}),
        smokey: (prev.agentConfigs?.smokey as SmokeyIntentConfig) ?? ({} as SmokeyIntentConfig),
        craig: { ...(prev.agentConfigs?.craig as CraigIntentConfig), ...updates },
      },
    }));
    setHasUnsaved(true);
  }

  function updateHardBoundaries(updates: Partial<HardBoundaries>) {
    setProfile(prev => ({
      ...prev,
      hardBoundaries: { ...(prev.hardBoundaries as HardBoundaries), ...updates },
    }));
    setHasUnsaved(true);
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    setIsSaving(true);
    const result = await updateOrgIntentProfile(orgId, {
      strategicFoundation: profile.strategicFoundation,
      valueHierarchies: profile.valueHierarchies,
      agentConfigs: profile.agentConfigs,
      hardBoundaries: profile.hardBoundaries,
      feedbackConfig: profile.feedbackConfig,
    });
    if (result.success) {
      setHasUnsaved(false);
      toast.success('Intent profile saved');
      router.refresh();
    } else {
      toast.error(result.error ?? 'Save failed');
    }
    setIsSaving(false);
  }

  const vh = profile.valueHierarchies;
  const smokey = profile.agentConfigs?.smokey;
  const craig = profile.agentConfigs?.craig;
  const hb = profile.hardBoundaries;
  const sf = profile.strategicFoundation;

  const sliderFields = Object.keys(SLIDER_METADATA) as (keyof ValueHierarchies)[];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Dispensary Intent Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Encode your operational strategy into every AI agent — Smokey, Craig, and beyond.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasUnsaved && (
            <Badge variant="outline" className="border-amber-500 text-amber-600">Unsaved</Badge>
          )}
          <Button onClick={handleSave} disabled={isSaving || !hasUnsaved} size="sm">
            <Save className="mr-1.5 h-4 w-4" />
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Completion bar */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className="text-sm font-bold text-primary">{completion}%</span>
          </div>
          <Progress value={completion} className="h-2" />
          {completion < 100 && (
            <p className="text-xs text-muted-foreground mt-2">
              {completion === 0
                ? 'Start by selecting a business archetype below.'
                : 'Complete all sections for fully aligned agents.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Default profile notice */}
      {profile.isDefault && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This profile was auto-generated from the <strong>{sf?.archetype?.replace(/_/g, ' ')}</strong> archetype. Review and adjust the settings below to match your dispensary exactly.
          </AlertDescription>
        </Alert>
      )}

      <Accordion type="multiple" defaultValue={['archetype', 'values']} className="space-y-3">

        {/* Section 1: Archetype */}
        <AccordionItem value="archetype" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-2 text-left">
              <span className="font-semibold">Business Archetype</span>
              {sf?.archetype && (
                <Badge variant="secondary" className="ml-2 capitalize">
                  {sf.archetype.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <p className="text-sm text-muted-foreground mb-4">
              Choose the archetype that best describes your dispensary. This seeds default settings across all sections below.
            </p>
            <ArchetypeSelector
              value={sf?.archetype ?? null}
              onChange={handleArchetypeSelect}
              disabled={isSaving}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Value Hierarchies */}
        <AccordionItem value="values" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <span className="font-semibold">Value Trade-offs</span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-6">
            <p className="text-sm text-muted-foreground">
              These sliders tell agents how to resolve conflicts. When speed and education compete, which wins? When price and margin conflict, what takes priority?
            </p>
            {sliderFields.map((field) => {
              const meta = SLIDER_METADATA[field];
              return (
                <TradeOffSlider
                  key={field}
                  label={field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                  leftPoleLabel={meta.leftLabel}
                  rightPoleLabel={meta.rightLabel}
                  leftPoleDescription={meta.leftDescription}
                  rightPoleDescription={meta.rightDescription}
                  value={vh?.[field] ?? 0.5}
                  onChange={(v) => updateValueHierarchies(field, v)}
                  disabled={isSaving}
                />
              );
            })}
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Smokey Config */}
        <AccordionItem value="smokey" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <span className="font-semibold">Smokey (Budtender) Settings</span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-5">
            {/* Recommendation Philosophy */}
            <div>
              <label className="text-sm font-medium block mb-2">Recommendation Philosophy</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['chemistry_first', 'effect_first', 'price_first', 'popularity_first'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => updateSmokey({ recommendationPhilosophy: v })}
                    className={`rounded-md border p-2 text-xs text-center transition-colors ${smokey?.recommendationPhilosophy === v ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:border-primary/50'}`}
                  >
                    {v.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Upsell Aggressiveness */}
            <TradeOffSlider
              label="Upsell Aggressiveness"
              leftPoleLabel="Never Upsell"
              rightPoleLabel="Active Upsell"
              leftPoleDescription="Answer the question and stop. Respect the customer's intent."
              rightPoleDescription="Suggest add-ons and bundles proactively. Use urgency framing."
              value={smokey?.upsellAggressiveness ?? 0.5}
              onChange={(v) => updateSmokey({ upsellAggressiveness: v })}
              disabled={isSaving}
            />

            {/* New User Protocol */}
            <div>
              <label className="text-sm font-medium block mb-2">New Customer Protocol</label>
              <div className="grid grid-cols-3 gap-2">
                {(['guided', 'express', 'discover'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => updateSmokey({ newUserProtocol: v })}
                    className={`rounded-md border p-2 text-xs text-center capitalize transition-colors ${smokey?.newUserProtocol === v ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:border-primary/50'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Education Depth */}
            <div>
              <label className="text-sm font-medium block mb-2">Product Education Depth</label>
              <div className="grid grid-cols-3 gap-2">
                {(['minimal', 'moderate', 'comprehensive'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => updateSmokey({ productEducationDepth: v })}
                    className={`rounded-md border p-2 text-xs text-center capitalize transition-colors ${smokey?.productEducationDepth === v ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:border-primary/50'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: Craig Config */}
        <AccordionItem value="craig" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <span className="font-semibold">Craig (Marketer) Settings</span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-5">
            {/* Tone Archetype */}
            <div>
              <label className="text-sm font-medium block mb-2">Campaign Tone Archetype</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {(['sage', 'hero', 'rebel', 'creator', 'jester'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => updateCraig({ toneArchetype: v })}
                    className={`rounded-md border p-2 text-xs text-center capitalize transition-colors ${craig?.toneArchetype === v ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:border-primary/50'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Promotion Strategy */}
            <div>
              <label className="text-sm font-medium block mb-2">Default Promotion Strategy</label>
              <div className="grid grid-cols-3 gap-2">
                {(['education_led', 'value_led', 'discount_led'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => updateCraig({ promotionStrategy: v })}
                    className={`rounded-md border p-2 text-xs text-center transition-colors ${craig?.promotionStrategy === v ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:border-primary/50'}`}
                  >
                    {v.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 5: Hard Boundaries */}
        <AccordionItem value="boundaries" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <span className="font-semibold">Hard Boundaries</span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Things your agents must never do. Add one rule per line.
            </p>

            <div>
              <label className="text-sm font-medium block mb-1">Never Do List</label>
              <textarea
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={'Never compare prices to competitors by name\nNever make health claims about specific conditions'}
                value={(hb?.neverDoList ?? []).join('\n')}
                onChange={(e) =>
                  updateHardBoundaries({
                    neverDoList: e.target.value.split('\n').filter(Boolean),
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Escalation Triggers</label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={'Customer mentions a medical emergency\nRequest involves legal advice'}
                value={(hb?.escalationTriggers ?? []).join('\n')}
                onChange={(e) =>
                  updateHardBoundaries({
                    escalationTriggers: e.target.value.split('\n').filter(Boolean),
                  })
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      {/* Bottom save bar */}
      {hasUnsaved && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="shadow-lg">
            <Save className="mr-1.5 h-4 w-4" />
            {isSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
}
