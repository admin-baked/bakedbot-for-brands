// src/app/dashboard/settings/profile/org-profile-client.tsx
// Unified Brand & Agent Profile settings page

'use client';

import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Building2,
  Palette,
  Megaphone,
  Shield,
  TrendingUp,
  BarChart2,
  Brain,
  ShieldAlert,
  MessageSquare,
  Target,
  CheckCircle2,
  Save,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import type { OrgProfile } from '@/types/org-profile';
import { calculateOrgProfileCompletion, getOrgProfileCompletionBreakdown } from '@/types/org-profile';
import { updateOrgProfileAction } from '@/server/actions/org-profile';
import { ARCHETYPE_METADATA, SLIDER_METADATA } from '@/types/dispensary-intent-profile';
import type {
  BusinessArchetype,
  GrowthStage,
  CompetitivePosture,
  ValueHierarchies,
} from '@/types/dispensary-intent-profile';
import { useToast } from '@/hooks/use-toast';

interface OrgProfileClientProps {
  orgId: string;
  initialProfile: OrgProfile | null;
}

export function OrgProfileClient({ orgId, initialProfile }: OrgProfileClientProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<OrgProfile | null>(initialProfile);
  const [isSaving, setIsSaving] = useState(false);

  const completionPct = profile ? calculateOrgProfileCompletion(profile) : 0;
  const breakdown = profile ? getOrgProfileCompletionBreakdown(profile) : null;

  async function handleSave(updates: Partial<Pick<OrgProfile, 'brand' | 'intent'>>) {
    if (!orgId) return;
    setIsSaving(true);
    try {
      const result = await updateOrgProfileAction(orgId, updates);
      if (!result.success) throw new Error(result.error);
      setProfile((prev) => prev ? { ...prev, ...updates } : prev);
      toast({ title: 'Saved', description: 'Profile updated.' });
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  if (!orgId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No organization found. Please contact support.
      </div>
    );
  }

  const brand = profile?.brand;
  const intent = profile?.intent;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild className="p-0 h-auto">
              <Link href="/dashboard/settings">
                <ArrowLeft className="w-4 h-4 mr-1" /> Settings
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold">Brand &amp; Agent Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Single source of truth for your brand identity and AI agent behavior.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-baked-green">{completionPct}%</div>
          <div className="text-xs text-muted-foreground">complete</div>
        </div>
      </div>

      {/* Completion bar */}
      {breakdown && (
        <Card className="p-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="font-medium">Brand identity</span>
                <span className="text-muted-foreground">{breakdown.brand.score}/{breakdown.brand.max}</span>
              </div>
              <div className="w-full bg-secondary h-1.5 rounded-full">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(breakdown.brand.score / breakdown.brand.max) * 100}%` }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="font-medium">Agent behavior</span>
                <span className="text-muted-foreground">{breakdown.intent.score}/{breakdown.intent.max}</span>
              </div>
              <div className="w-full bg-secondary h-1.5 rounded-full">
                <div className="h-full bg-baked-green rounded-full" style={{ width: `${(breakdown.intent.score / breakdown.intent.max) * 100}%` }} />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Accordion sections */}
      <Accordion type="multiple" defaultValue={['basics']} className="space-y-2">

        {/* 1. Basics */}
        <AccordionSection
          value="basics"
          icon={Building2}
          title="Brand Basics"
          subtitle="Name, location, dispensary type"
          done={!!brand?.name}
        >
          <BrandBasicsForm brand={brand} onSave={(b) => handleSave({ brand: { ...brand!, ...b } })} isSaving={isSaving} />
        </AccordionSection>

        {/* 2. Visual Identity */}
        <AccordionSection
          value="visual"
          icon={Palette}
          title="Visual Identity"
          subtitle="Colors, logo"
          done={!!brand?.visualIdentity?.colors?.primary?.hex}
        >
          <VisualIdentityForm brand={brand} onSave={(b) => handleSave({ brand: { ...brand!, ...b } })} isSaving={isSaving} />
        </AccordionSection>

        {/* 3. Brand Voice */}
        <AccordionSection
          value="voice"
          icon={Megaphone}
          title="Brand Voice"
          subtitle="Tone, personality, writing guidelines"
          done={!!(brand?.voice?.tone?.length && brand?.voice?.personality?.length)}
        >
          <BrandVoiceForm brand={brand} onSave={(b) => handleSave({ brand: { ...brand!, ...b } })} isSaving={isSaving} />
        </AccordionSection>

        {/* 4. Messaging */}
        <AccordionSection
          value="messaging"
          icon={MessageSquare}
          title="Messaging"
          subtitle="Tagline, positioning, value props"
          done={!!brand?.messaging?.tagline}
        >
          <MessagingForm brand={brand} onSave={(b) => handleSave({ brand: { ...brand!, ...b } })} isSaving={isSaving} />
        </AccordionSection>

        {/* 5. Compliance */}
        <AccordionSection
          value="compliance"
          icon={Shield}
          title="Compliance"
          subtitle="State, disclaimers, restrictions"
          done={!!brand?.compliance?.state}
        >
          <ComplianceForm brand={brand} onSave={(b) => handleSave({ brand: { ...brand!, ...b } })} isSaving={isSaving} />
        </AccordionSection>

        {/* 6. Business Strategy */}
        <AccordionSection
          value="strategy"
          icon={TrendingUp}
          title="Business Strategy"
          subtitle="Archetype, growth stage, competitive posture"
          done={!!intent?.strategicFoundation?.archetype}
        >
          <StrategyForm intent={intent} onSave={(i) => handleSave({ intent: { ...intent!, ...i } })} isSaving={isSaving} />
        </AccordionSection>

        {/* 7. Value Hierarchies */}
        <AccordionSection
          value="hierarchies"
          icon={BarChart2}
          title="AI Trade-offs"
          subtitle="6 decision sliders"
          done={intent?.valueHierarchies !== undefined}
        >
          <ValueHierarchiesForm intent={intent} onSave={(i) => handleSave({ intent: { ...intent!, ...i } })} isSaving={isSaving} />
        </AccordionSection>

        {/* 8. Smokey Config */}
        <AccordionSection
          value="smokey"
          icon={Target}
          title="Smokey (Budtender)"
          subtitle="Recommendation style, new user protocol"
          done={!!intent?.agentConfigs?.smokey?.recommendationPhilosophy}
        >
          <SmokeyConfigForm intent={intent} onSave={(i) => handleSave({ intent: { ...intent!, ...i } })} isSaving={isSaving} />
        </AccordionSection>

        {/* 9. Craig Config */}
        <AccordionSection
          value="craig"
          icon={Brain}
          title="Craig (Marketer)"
          subtitle="Tone archetype, campaign strategy, channels"
          done={!!intent?.agentConfigs?.craig?.toneArchetype}
        >
          <CraigConfigForm intent={intent} onSave={(i) => handleSave({ intent: { ...intent!, ...i } })} isSaving={isSaving} />
        </AccordionSection>

        {/* 10. Hard Limits */}
        <AccordionSection
          value="limits"
          icon={ShieldAlert}
          title="Hard Limits"
          subtitle="Never-do list, escalation triggers"
          done={!!(intent?.hardBoundaries?.neverDoList?.length || intent?.hardBoundaries?.escalationTriggers?.length)}
        >
          <HardLimitsForm intent={intent} onSave={(i) => handleSave({ intent: { ...intent!, ...i } })} isSaving={isSaving} />
        </AccordionSection>

      </Accordion>
    </div>
  );
}

// ─── Shared accordion section wrapper ───────────────────────────────────────

function AccordionSection({
  value,
  icon: Icon,
  title,
  subtitle,
  done,
  children,
}: {
  value: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex items-center gap-3 text-left">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${done ? 'bg-green-100' : 'bg-gray-100'}`}>
            {done
              ? <CheckCircle2 className="w-4 h-4 text-baked-green" />
              : <Icon className="w-4 h-4 text-gray-400" />
            }
          </div>
          <div>
            <div className="font-semibold text-sm flex items-center gap-2">
              {title}
              {done && <Badge variant="outline" className="text-[10px] bg-green-50 text-baked-green border-green-200 py-0">DONE</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 pt-0">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Section form components ─────────────────────────────────────────────────

function SaveButton({ isSaving }: { isSaving: boolean }) {
  return (
    <Button size="sm" type="submit" disabled={isSaving} className="bg-baked-green hover:bg-baked-green/90">
      <Save className="w-4 h-4 mr-1" />
      {isSaving ? 'Saving...' : 'Save'}
    </Button>
  );
}

function BrandBasicsForm({ brand, onSave, isSaving }: { brand: OrgProfile['brand'] | undefined; onSave: (b: Partial<OrgProfile['brand']>) => void; isSaving: boolean }) {
  const [name, setName] = useState(brand?.name || '');
  const [tagline, setTagline] = useState(brand?.tagline || '');
  const [city, setCity] = useState(brand?.city || '');
  const [state, setState] = useState(brand?.state || '');
  const [dispensaryType, setDispensaryType] = useState<'recreational' | 'medical' | 'both' | ''>(brand?.dispensaryType || '');
  const [instagram, setInstagram] = useState(brand?.instagramHandle || '');
  const [facebook, setFacebook] = useState(brand?.facebookHandle || '');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ name, tagline: tagline || undefined, city: city || undefined, state: state || undefined, dispensaryType: dispensaryType || undefined, instagramHandle: instagram || undefined, facebookHandle: facebook || undefined }); }} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Brand Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
        </div>
        <div>
          <Label className="text-xs">Tagline</Label>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1" placeholder="Where Community Comes First" />
        </div>
        <div>
          <Label className="text-xs">City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">State</Label>
          <Input value={state} onChange={(e) => setState(e.target.value)} className="mt-1" placeholder="NY" maxLength={2} />
        </div>
        <div>
          <Label className="text-xs">Dispensary Type</Label>
          <select value={dispensaryType} onChange={(e) => setDispensaryType(e.target.value as 'recreational' | 'medical' | 'both' | '')} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background">
            <option value="">Select...</option>
            <option value="recreational">Recreational</option>
            <option value="medical">Medical</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Instagram Handle</Label>
          <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="mt-1" placeholder="@yourbrand" />
        </div>
        <div>
          <Label className="text-xs">Facebook Handle</Label>
          <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} className="mt-1" placeholder="yourbrand" />
        </div>
      </div>
      <SaveButton isSaving={isSaving} />
    </form>
  );
}

function VisualIdentityForm({ brand, onSave, isSaving }: { brand: OrgProfile['brand'] | undefined; onSave: (b: Partial<OrgProfile['brand']>) => void; isSaving: boolean }) {
  const [primaryHex, setPrimaryHex] = useState(brand?.visualIdentity?.colors?.primary?.hex || '#4ade80');
  const [secondaryHex, setSecondaryHex] = useState(brand?.visualIdentity?.colors?.secondary?.hex || '');
  const [logoUrl, setLogoUrl] = useState(brand?.visualIdentity?.logo?.primary || '');

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({
        visualIdentity: {
          colors: {
            primary: { hex: primaryHex, name: 'Primary', usage: 'Main brand color' },
            secondary: secondaryHex ? { hex: secondaryHex, name: 'Secondary', usage: 'Supporting color' } : undefined,
          },
          logo: logoUrl ? { primary: logoUrl } : undefined,
        },
      });
    }} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Primary Color</Label>
          <div className="flex items-center gap-2 mt-1">
            <input type="color" value={primaryHex} onChange={(e) => setPrimaryHex(e.target.value)} className="h-9 w-16 rounded border cursor-pointer" />
            <Input value={primaryHex} onChange={(e) => setPrimaryHex(e.target.value)} className="font-mono text-sm" placeholder="#4ade80" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Secondary Color</Label>
          <div className="flex items-center gap-2 mt-1">
            <input type="color" value={secondaryHex || '#ffffff'} onChange={(e) => setSecondaryHex(e.target.value)} className="h-9 w-16 rounded border cursor-pointer" />
            <Input value={secondaryHex} onChange={(e) => setSecondaryHex(e.target.value)} className="font-mono text-sm" placeholder="Optional" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Logo URL</Label>
          <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="mt-1" placeholder="https://..." />
        </div>
      </div>
      <SaveButton isSaving={isSaving} />
    </form>
  );
}

function BrandVoiceForm({ brand, onSave, isSaving }: { brand: OrgProfile['brand'] | undefined; onSave: (b: Partial<OrgProfile['brand']>) => void; isSaving: boolean }) {
  const [tone, setTone] = useState((brand?.voice?.tone || []).join(', '));
  const [personality, setPersonality] = useState((brand?.voice?.personality || []).join(', '));
  const [doWrite, setDoWrite] = useState((brand?.voice?.doWrite || []).join('\n'));
  const [dontWrite, setDontWrite] = useState((brand?.voice?.dontWrite || []).join('\n'));

  function toArr(s: string) { return s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean); }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({ voice: { tone: toArr(tone), personality: toArr(personality), doWrite: toArr(doWrite), dontWrite: toArr(dontWrite) } });
    }} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Tone (comma-separated, max 3)</Label>
          <Input value={tone} onChange={(e) => setTone(e.target.value)} className="mt-1" placeholder="Casual, Educational, Warm" />
        </div>
        <div>
          <Label className="text-xs">Personality (comma-separated, max 4)</Label>
          <Input value={personality} onChange={(e) => setPersonality(e.target.value)} className="mt-1" placeholder="Friendly, Trustworthy, Authentic" />
        </div>
        <div>
          <Label className="text-xs">Do Write (one per line)</Label>
          <Textarea value={doWrite} onChange={(e) => setDoWrite(e.target.value)} className="mt-1 min-h-[80px] text-sm" placeholder="Use first-person&#10;Be conversational" />
        </div>
        <div>
          <Label className="text-xs">Don&apos;t Write (one per line)</Label>
          <Textarea value={dontWrite} onChange={(e) => setDontWrite(e.target.value)} className="mt-1 min-h-[80px] text-sm" placeholder="Avoid jargon&#10;Never use slang" />
        </div>
      </div>
      <SaveButton isSaving={isSaving} />
    </form>
  );
}

function MessagingForm({ brand, onSave, isSaving }: { brand: OrgProfile['brand'] | undefined; onSave: (b: Partial<OrgProfile['brand']>) => void; isSaving: boolean }) {
  const [tagline, setTagline] = useState(brand?.messaging?.tagline || '');
  const [positioning, setPositioning] = useState(brand?.messaging?.positioning || '');
  const [mission, setMission] = useState(brand?.messaging?.mission || '');
  const [valueProps, setValueProps] = useState((brand?.messaging?.valuePropositions || []).join('\n'));

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({ messaging: { tagline: tagline || undefined, positioning: positioning || undefined, mission: mission || undefined, valuePropositions: valueProps.split('\n').map((x) => x.trim()).filter(Boolean) } });
    }} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label className="text-xs">Tagline</Label>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1" placeholder="Where Community Comes First" />
        </div>
        <div>
          <Label className="text-xs">Positioning Statement</Label>
          <Textarea value={positioning} onChange={(e) => setPositioning(e.target.value)} className="mt-1 min-h-[80px] text-sm" placeholder="We are the premium cannabis destination for..." />
        </div>
        <div>
          <Label className="text-xs">Mission Statement</Label>
          <Textarea value={mission} onChange={(e) => setMission(e.target.value)} className="mt-1 min-h-[60px] text-sm" />
        </div>
        <div>
          <Label className="text-xs">Value Propositions (one per line)</Label>
          <Textarea value={valueProps} onChange={(e) => setValueProps(e.target.value)} className="mt-1 min-h-[80px] text-sm" placeholder="Expert budtender consultations&#10;Curated premium selection" />
        </div>
      </div>
      <SaveButton isSaving={isSaving} />
    </form>
  );
}

function ComplianceForm({ brand, onSave, isSaving }: { brand: OrgProfile['brand'] | undefined; onSave: (b: Partial<OrgProfile['brand']>) => void; isSaving: boolean }) {
  const [state, setState] = useState(brand?.compliance?.state || '');
  const [ageDisclaimer, setAgeDisclaimer] = useState(brand?.compliance?.ageDisclaimer || '');
  const [restrictions, setRestrictions] = useState((brand?.compliance?.restrictions || []).join('\n'));

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({ compliance: { state: state || undefined, ageDisclaimer: ageDisclaimer || undefined, restrictions: restrictions.split('\n').map((x) => x.trim()).filter(Boolean) } });
    }} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">State (2-letter code)</Label>
          <Input value={state} onChange={(e) => setState(e.target.value.toUpperCase())} className="mt-1" placeholder="NY" maxLength={2} />
        </div>
        <div>
          <Label className="text-xs">Age Disclaimer</Label>
          <Input value={ageDisclaimer} onChange={(e) => setAgeDisclaimer(e.target.value)} className="mt-1" placeholder="Must be 21+ to purchase" />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Content Restrictions (one per line)</Label>
          <Textarea value={restrictions} onChange={(e) => setRestrictions(e.target.value)} className="mt-1 min-h-[80px] text-sm" placeholder="No health claims&#10;No comparative advertising" />
        </div>
      </div>
      <SaveButton isSaving={isSaving} />
    </form>
  );
}

function StrategyForm({ intent, onSave, isSaving }: { intent: OrgProfile['intent'] | undefined; onSave: (i: Partial<OrgProfile['intent']>) => void; isSaving: boolean }) {
  const sf = intent?.strategicFoundation;
  const [archetype, setArchetype] = useState<BusinessArchetype>(sf?.archetype || 'community_hub');
  const [growthStage, setGrowthStage] = useState<GrowthStage>(sf?.growthStage || 'growth');
  const [competitivePosture, setCompetitivePosture] = useState<CompetitivePosture>(sf?.competitivePosture || 'differentiator');

  const archetypes = Object.values(ARCHETYPE_METADATA);

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({ strategicFoundation: { ...sf, archetype, growthStage, competitivePosture, geographicStrategy: sf?.geographicStrategy || 'regional', weightedObjectives: sf?.weightedObjectives || [] } });
    }} className="space-y-5">
      <div>
        <Label className="text-xs font-semibold mb-2 block">Business Archetype</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {archetypes.map((meta) => (
            <button key={meta.archetype} type="button" onClick={() => setArchetype(meta.archetype)}
              className={`text-left p-3 rounded-lg border-2 transition-all ${archetype === meta.archetype ? 'border-baked-green bg-green-50' : 'border-gray-200 hover:border-green-200'}`}>
              <div className="font-semibold text-sm">{meta.label}</div>
              <div className="text-xs text-muted-foreground leading-snug">{meta.description}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-semibold mb-2 block">Growth Stage</Label>
          <select value={growthStage} onChange={(e) => setGrowthStage(e.target.value as GrowthStage)} className="w-full text-sm border rounded-md px-3 py-2 bg-background">
            <option value="startup">Startup (&lt;12 months)</option>
            <option value="growth">Growth (12-36 months)</option>
            <option value="established">Established (36+ months)</option>
            <option value="expansion">Expansion (multi-location)</option>
          </select>
        </div>
        <div>
          <Label className="text-xs font-semibold mb-2 block">Competitive Posture</Label>
          <select value={competitivePosture} onChange={(e) => setCompetitivePosture(e.target.value as CompetitivePosture)} className="w-full text-sm border rounded-md px-3 py-2 bg-background">
            <option value="aggressive">Aggressive (compete on price)</option>
            <option value="defensive">Defensive (protect loyal base)</option>
            <option value="differentiator">Differentiator (compete on experience)</option>
          </select>
        </div>
      </div>
      <SaveButton isSaving={isSaving} />
    </form>
  );
}

function ValueHierarchiesForm({ intent, onSave, isSaving }: { intent: OrgProfile['intent'] | undefined; onSave: (i: Partial<OrgProfile['intent']>) => void; isSaving: boolean }) {
  const vh = intent?.valueHierarchies;
  const defaults: ValueHierarchies = {
    speedVsEducation: 0.5, volumeVsMargin: 0.5, acquisitionVsRetention: 0.5,
    complianceConservatism: 0.5, automationVsHumanTouch: 0.5, brandVoiceFormality: 0.5,
  };
  const [sliders, setSliders] = useState<ValueHierarchies>(vh || defaults);

  const sliderKeys = Object.keys(SLIDER_METADATA) as (keyof ValueHierarchies)[];

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ valueHierarchies: sliders }); }} className="space-y-5">
      {sliderKeys.map((key) => {
        const meta = SLIDER_METADATA[key];
        const value = sliders[key];
        return (
          <div key={key}>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium">{meta.leftLabel}</span>
              <span className="font-medium">{meta.rightLabel}</span>
            </div>
            <input type="range" min={0} max={1} step={0.1} value={value}
              onChange={(e) => setSliders((prev) => ({ ...prev, [key]: parseFloat(e.target.value) }))}
              className="w-full accent-baked-green h-2 cursor-pointer" />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {value < 0.4 ? meta.leftDescription : value > 0.6 ? meta.rightDescription : 'Balanced'}
            </p>
          </div>
        );
      })}
      <SaveButton isSaving={isSaving} />
    </form>
  );
}

function SmokeyConfigForm({ intent, onSave, isSaving }: { intent: OrgProfile['intent'] | undefined; onSave: (i: Partial<OrgProfile['intent']>) => void; isSaving: boolean }) {
  const sc = intent?.agentConfigs?.smokey;
  const [philosophy, setPhilosophy] = useState(sc?.recommendationPhilosophy || 'effect_first');
  const [protocol, setProtocol] = useState(sc?.newUserProtocol || 'guided');
  const [depth, setDepth] = useState(sc?.productEducationDepth || 'moderate');
  const [upsell, setUpsell] = useState(sc?.upsellAggressiveness ?? 0.5);

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({ agentConfigs: { ...intent?.agentConfigs, smokey: { recommendationPhilosophy: philosophy as any, newUserProtocol: protocol as any, productEducationDepth: depth as any, upsellAggressiveness: upsell }, craig: intent?.agentConfigs?.craig || { campaignFrequencyCap: 2, preferredChannels: ['sms', 'email'], toneArchetype: 'sage', promotionStrategy: 'value_led' } } });
    }} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Recommendation Philosophy</Label>
          <select value={philosophy} onChange={(e) => setPhilosophy(e.target.value as any)} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background">
            <option value="effect_first">Effect-first</option>
            <option value="chemistry_first">Chemistry-first</option>
            <option value="price_first">Price-first</option>
            <option value="popularity_first">Popularity-first</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">New User Protocol</Label>
          <select value={protocol} onChange={(e) => setProtocol(e.target.value as any)} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background">
            <option value="guided">Guided (intake questions)</option>
            <option value="express">Express (top picks)</option>
            <option value="discover">Discover (conversational)</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Product Education Depth</Label>
          <select value={depth} onChange={(e) => setDepth(e.target.value as any)} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background">
            <option value="minimal">Minimal</option>
            <option value="moderate">Moderate</option>
            <option value="comprehensive">Comprehensive</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Upsell Aggressiveness: {Math.round(upsell * 100)}%</Label>
          <input type="range" min={0} max={1} step={0.1} value={upsell} onChange={(e) => setUpsell(parseFloat(e.target.value))} className="w-full mt-2 accent-baked-green h-2 cursor-pointer" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>Never upsell</span><span>Active upsell</span>
          </div>
        </div>
      </div>
      <SaveButton isSaving={isSaving} />
    </form>
  );
}

function CraigConfigForm({ intent, onSave, isSaving }: { intent: OrgProfile['intent'] | undefined; onSave: (i: Partial<OrgProfile['intent']>) => void; isSaving: boolean }) {
  const cc = intent?.agentConfigs?.craig;
  const [toneArchetype, setToneArchetype] = useState(cc?.toneArchetype || 'sage');
  const [promotionStrategy, setPromotionStrategy] = useState(cc?.promotionStrategy || 'value_led');
  const [frequencyCap, setFrequencyCap] = useState(cc?.campaignFrequencyCap ?? 2);
  const [channels, setChannels] = useState<string[]>(cc?.preferredChannels || ['sms', 'email']);

  function toggleChannel(ch: string) {
    setChannels((prev) => prev.includes(ch) ? (prev.length > 1 ? prev.filter((c) => c !== ch) : prev) : [...prev, ch]);
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({ agentConfigs: { smokey: intent?.agentConfigs?.smokey || { recommendationPhilosophy: 'effect_first', upsellAggressiveness: 0.5, newUserProtocol: 'guided', productEducationDepth: 'moderate' }, craig: { toneArchetype: toneArchetype as any, promotionStrategy: promotionStrategy as any, campaignFrequencyCap: frequencyCap, preferredChannels: channels as any } } });
    }} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Tone Archetype</Label>
          <select value={toneArchetype} onChange={(e) => setToneArchetype(e.target.value as any)} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background">
            <option value="sage">Sage (wise, educational)</option>
            <option value="hero">Hero (empowering, community)</option>
            <option value="rebel">Rebel (bold, disruptive)</option>
            <option value="creator">Creator (innovative)</option>
            <option value="jester">Jester (playful, fun)</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Campaign Strategy</Label>
          <select value={promotionStrategy} onChange={(e) => setPromotionStrategy(e.target.value as any)} className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background">
            <option value="education_led">Education-led</option>
            <option value="value_led">Value/Community-led</option>
            <option value="discount_led">Discount-led</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Max Campaigns/Week per Customer</Label>
          <Input type="number" min={1} max={7} value={frequencyCap} onChange={(e) => setFrequencyCap(Math.max(1, Math.min(7, parseInt(e.target.value) || 2)))} className="mt-1 text-sm" />
        </div>
        <div>
          <Label className="text-xs mb-2 block">Preferred Channels</Label>
          <div className="flex gap-2">
            {['sms', 'email', 'push'].map((ch) => (
              <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                className={`px-3 py-1.5 text-xs rounded-md border-2 font-medium transition-all ${channels.includes(ch) ? 'border-baked-green bg-green-50 text-baked-green' : 'border-gray-200 text-muted-foreground'}`}>
                {ch.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
      <SaveButton isSaving={isSaving} />
    </form>
  );
}

function HardLimitsForm({ intent, onSave, isSaving }: { intent: OrgProfile['intent'] | undefined; onSave: (i: Partial<OrgProfile['intent']>) => void; isSaving: boolean }) {
  const hb = intent?.hardBoundaries;
  const [neverDo, setNeverDo] = useState((hb?.neverDoList || []).join('\n'));
  const [escalation, setEscalation] = useState((hb?.escalationTriggers || []).join('\n'));

  function toLines(s: string) { return s.split('\n').map((x) => x.trim()).filter(Boolean); }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({ hardBoundaries: { neverDoList: toLines(neverDo), escalationTriggers: toLines(escalation) } });
    }} className="space-y-4">
      <div>
        <Label className="text-xs font-semibold">Never-Do List</Label>
        <p className="text-xs text-muted-foreground mb-1">One rule per line. Enforced at every agent interaction.</p>
        <Textarea value={neverDo} onChange={(e) => setNeverDo(e.target.value)} className="min-h-[120px] text-sm font-mono" placeholder="Never compare prices to competitors by name&#10;Never make medical claims..." />
        <p className="text-xs text-muted-foreground mt-0.5">{toLines(neverDo).length} rules</p>
      </div>
      <div>
        <Label className="text-xs font-semibold">Escalation Triggers</Label>
        <p className="text-xs text-muted-foreground mb-1">One trigger per line. Forces immediate human handoff.</p>
        <Textarea value={escalation} onChange={(e) => setEscalation(e.target.value)} className="min-h-[100px] text-sm font-mono" placeholder="Customer mentions a medical emergency&#10;Customer asks about driving after consumption..." />
        <p className="text-xs text-muted-foreground mt-0.5">{toLines(escalation).length} triggers</p>
      </div>
      <SaveButton isSaving={isSaving} />
    </form>
  );
}
