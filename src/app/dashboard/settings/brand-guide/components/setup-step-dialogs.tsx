/**
 * Setup Step Dialogs
 *
 * Individual dialogs for each brand guide setup step
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Instagram, Facebook, MapPin, Building2, Gem, Tag, Users, HeartPulse, Sparkles, ShieldAlert } from 'lucide-react';
import type { ArchetypeId } from '@/constants/brand-archetypes';
import { ArchetypeSelector } from './archetype-selector';
import { ArchetypePreview } from './archetype-preview';
import type {
  BusinessArchetype,
  GrowthStage,
  CompetitivePosture,
  ValueHierarchies,
  SmokeyIntentConfig,
  CraigIntentConfig,
} from '@/types/dispensary-intent-profile';
import { ARCHETYPE_METADATA, SLIDER_METADATA } from '@/types/dispensary-intent-profile';

// ============================================================================
// STEP 1: Brand Name & Description + Location + Dispensary Type
// ============================================================================

interface Step1DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    brandName: string;
    description: string;
    tagline?: string;
    city?: string;
    state?: string;
    dispensaryType?: 'recreational' | 'medical' | 'both';
  }) => void;
  initialData?: {
    brandName?: string;
    description?: string;
    tagline?: string;
    city?: string;
    state?: string;
    dispensaryType?: 'recreational' | 'medical' | 'both';
  };
}

export function Step1Dialog({ open, onOpenChange, onComplete, initialData }: Step1DialogProps) {
  const [brandName, setBrandName] = useState(initialData?.brandName || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [tagline, setTagline] = useState(initialData?.tagline || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [state, setState] = useState(initialData?.state || '');
  const [dispensaryType, setDispensaryType] = useState<'recreational' | 'medical' | 'both' | ''>(
    initialData?.dispensaryType || ''
  );

  // When the dialog opens with pre-filled data (e.g. after a website scan),
  // populate the fields so the user can review and edit before saving.
  useEffect(() => {
    if (open && initialData) {
      // Update any field that exists in initialData (including empty strings)
      if ('brandName' in initialData) setBrandName(initialData.brandName || '');
      if ('description' in initialData) setDescription(initialData.description || '');
      if ('tagline' in initialData) setTagline(initialData.tagline || '');
      if ('city' in initialData) setCity(initialData.city || '');
      if ('state' in initialData) setState(initialData.state || '');
      if ('dispensaryType' in initialData) setDispensaryType(initialData.dispensaryType || '');
    }
  }, [open, initialData]);

  const handleSubmit = () => {
    onComplete({
      brandName,
      description,
      tagline,
      city: city || undefined,
      state: state || undefined,
      dispensaryType: dispensaryType || undefined,
    });
    onOpenChange(false);
  };

  const typeOptions: { value: 'recreational' | 'medical' | 'both'; label: string; desc: string }[] = [
    { value: 'recreational', label: 'Recreational', desc: 'Adult-use cannabis' },
    { value: 'medical', label: 'Medical', desc: 'Patient-focused care' },
    { value: 'both', label: 'Both', desc: 'Rec + Medical' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Brand Name & Description</DialogTitle>
          <DialogDescription>
            Tell us about your brand. This helps our AI generate better content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="brandName">Brand Name *</Label>
            <Input
              id="brandName"
              placeholder="e.g., Green Valley Dispensary"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="tagline">Tagline (Optional)</Label>
            <Input
              id="tagline"
              placeholder="e.g., Premium Cannabis, Locally Grown"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="description">Brand Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your brand, mission, and what makes you unique..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              This will be used across your marketing materials and customer communications.
            </p>
          </div>

          {/* Location */}
          <div>
            <Label className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Location
            </Label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <Input
                placeholder="City (e.g., Syracuse)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                placeholder="State (e.g., New York)"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Used for local marketing, compliance, and geo-targeted content.
            </p>
          </div>

          {/* Dispensary Type */}
          <div>
            <Label className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Dispensary Type
            </Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDispensaryType(opt.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    dispensaryType === opt.value
                      ? 'border-baked-green bg-green-50 ring-1 ring-baked-green'
                      : 'border-gray-200 hover:border-green-200 hover:bg-green-50/50'
                  }`}
                >
                  <div className="font-semibold text-sm text-gray-800">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Determines compliance rules and default voice settings.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!brandName || !description}
            className="bg-baked-green hover:bg-baked-green/90"
          >
            Save & Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// STEP 2: Colors & Logo — with initialData pre-fill + logo preview
// ============================================================================

interface Step2DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    primaryColor: string;
    secondaryColor?: string;
    logoUrl?: string;
  }) => void;
  initialData?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    logoPreviewUrl?: string;
  };
}

export function Step2Dialog({ open, onOpenChange, onComplete, initialData }: Step2DialogProps) {
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor || '#4ade80');
  const [secondaryColor, setSecondaryColor] = useState(initialData?.secondaryColor || '#1f3324');
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');

  // Pre-fill when dialog opens with extracted data
  useEffect(() => {
    if (open && initialData) {
      if ('primaryColor' in initialData && initialData.primaryColor) setPrimaryColor(initialData.primaryColor);
      if ('secondaryColor' in initialData && initialData.secondaryColor) setSecondaryColor(initialData.secondaryColor);
      if ('logoUrl' in initialData && initialData.logoUrl) setLogoUrl(initialData.logoUrl);
    }
  }, [open, initialData]);

  const handleSubmit = () => {
    onComplete({
      primaryColor,
      secondaryColor: secondaryColor || undefined,
      logoUrl: logoUrl || undefined,
    });
    onOpenChange(false);
  };

  const logoPreview = initialData?.logoPreviewUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Brand Colors & Logo</DialogTitle>
          <DialogDescription>
            Define your visual identity with colors and logo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryColor">Primary Color *</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#4ade80"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#1f3324"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Logo Preview from scan */}
          {logoPreview && (
            <div className="p-4 rounded-lg border border-green-100 bg-green-50/50">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Detected from your website:
              </p>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreview}
                    alt="Detected logo"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2 break-all">{logoPreview}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLogoUrl(logoPreview)}
                    className="border-baked-green text-baked-green hover:bg-green-50"
                  >
                    Use This Logo
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="logoUrl">Logo URL {logoPreview ? '(or enter a different URL)' : '(Optional)'}</Label>
            <Input
              id="logoUrl"
              type="url"
              placeholder="https://yoursite.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              You can upload your logo later in the Assets tab.
            </p>
          </div>

          {/* Preview */}
          <div className="p-6 rounded-lg border" style={{ backgroundColor: primaryColor + '10' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg"
                style={{ backgroundColor: primaryColor }}
              />
              <div
                className="w-12 h-12 rounded-lg"
                style={{ backgroundColor: secondaryColor }}
              />
              <span className="text-sm text-muted-foreground ml-2">Color Preview</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-baked-green hover:bg-baked-green/90"
          >
            Save & Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// STEP 3: Brand Voice — with initialData auto-select
// ============================================================================

interface Step3DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    tone: string[];
    personality: string[];
    doWrite: string[];
    dontWrite: string[];
  }) => void;
  initialData?: {
    tone?: string[];
    personality?: string[];
    doWrite?: string[];
    dontWrite?: string[];
  };
}

export function Step3Dialog({ open, onOpenChange, onComplete, initialData }: Step3DialogProps) {
  const [selectedTones, setSelectedTones] = useState<string[]>([]);
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([]);
  const [doWrite, setDoWrite] = useState('');
  const [dontWrite, setDontWrite] = useState('');

  const toneOptions = [
    'Professional',
    'Casual',
    'Playful',
    'Sophisticated',
    'Educational',
    'Empathetic',
  ];

  const personalityOptions = [
    'Friendly',
    'Trustworthy',
    'Innovative',
    'Authentic',
    'Wellness-focused',
    'Empowering',
  ];

  // Auto-select extracted or smart-default tones/personality when dialog opens
  useEffect(() => {
    if (open && initialData) {
      if (Array.isArray(initialData.tone) && initialData.tone.length > 0) {
        // Match case-insensitively against our options list
        const matched = toneOptions.filter((opt) =>
          (initialData.tone as string[]).some((t) => t.toLowerCase() === opt.toLowerCase())
        );
        if (matched.length > 0) setSelectedTones(matched.slice(0, 3));
      }
      if (Array.isArray(initialData.personality) && initialData.personality.length > 0) {
        const matched = personalityOptions.filter((opt) =>
          (initialData.personality as string[]).some((p) => p.toLowerCase() === opt.toLowerCase())
        );
        if (matched.length > 0) setSelectedPersonality(matched.slice(0, 4));
      }
      if (initialData.doWrite && initialData.doWrite.length > 0) {
        setDoWrite(initialData.doWrite.join('\n'));
      }
      if (initialData.dontWrite && initialData.dontWrite.length > 0) {
        setDontWrite(initialData.dontWrite.join('\n'));
      }
    }
  }, [open, initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTone = (tone: string) => {
    setSelectedTones((prev) =>
      prev.includes(tone) ? prev.filter((t) => t !== tone) : [...prev, tone]
    );
  };

  const togglePersonality = (trait: string) => {
    setSelectedPersonality((prev) =>
      prev.includes(trait) ? prev.filter((p) => p !== trait) : [...prev, trait]
    );
  };

  const handleSubmit = () => {
    onComplete({
      tone: selectedTones,
      personality: selectedPersonality,
      doWrite: doWrite.split('\n').filter(Boolean),
      dontWrite: dontWrite.split('\n').filter(Boolean),
    });
    onOpenChange(false);
  };

  const hasAutoFill = initialData && (
    (Array.isArray(initialData.tone) && initialData.tone.length > 0) ||
    (Array.isArray(initialData.personality) && initialData.personality.length > 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Define Brand Voice</DialogTitle>
          <DialogDescription>
            Set the tone and personality for all AI-generated content.
            {hasAutoFill && (
              <span className="ml-1 text-baked-green font-medium">
                Suggestions pre-selected from your website — adjust as needed.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tone */}
          <div>
            <Label>Tone (Select up to 3)</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {toneOptions.map((tone) => (
                <Button
                  key={tone}
                  variant={selectedTones.includes(tone) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleTone(tone)}
                  className={
                    selectedTones.includes(tone)
                      ? 'bg-baked-green hover:bg-baked-green/90'
                      : ''
                  }
                  disabled={
                    !selectedTones.includes(tone) && selectedTones.length >= 3
                  }
                >
                  {tone}
                </Button>
              ))}
            </div>
          </div>

          {/* Personality */}
          <div>
            <Label>Personality Traits (Select up to 4)</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {personalityOptions.map((trait) => (
                <Button
                  key={trait}
                  variant={selectedPersonality.includes(trait) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => togglePersonality(trait)}
                  className={
                    selectedPersonality.includes(trait)
                      ? 'bg-baked-green hover:bg-baked-green/90'
                      : ''
                  }
                  disabled={
                    !selectedPersonality.includes(trait) && selectedPersonality.length >= 4
                  }
                >
                  {trait}
                </Button>
              ))}
            </div>
          </div>

          {/* Do Write */}
          <div>
            <Label htmlFor="doWrite">Do Write (One per line)</Label>
            <Textarea
              id="doWrite"
              placeholder="Use inclusive language&#10;Focus on wellness benefits&#10;Be transparent about effects"
              value={doWrite}
              onChange={(e) => setDoWrite(e.target.value)}
              className="mt-1.5 min-h-[80px] font-mono text-sm"
            />
          </div>

          {/* Don't Write */}
          <div>
            <Label htmlFor="dontWrite">Don&apos;t Write (One per line)</Label>
            <Textarea
              id="dontWrite"
              placeholder="Avoid medical claims&#10;Don't use slang excessively&#10;No pressure to buy"
              value={dontWrite}
              onChange={(e) => setDontWrite(e.target.value)}
              className="mt-1.5 min-h-[80px] font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedTones.length === 0 || selectedPersonality.length === 0}
            className="bg-baked-green hover:bg-baked-green/90"
          >
            Save & Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// STEP 4: Advanced Setup — with social handles
// ============================================================================

interface Step4DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    targetAudience?: string;
    competitorUrls?: string[];
    specialRequirements?: string;
    instagramHandle?: string;
    facebookHandle?: string;
  }) => void;
  initialData?: {
    targetAudience?: string;
    competitorUrls?: string[];
    specialRequirements?: string;
    instagramHandle?: string;
    facebookHandle?: string;
  };
}

export function Step4Dialog({ open, onOpenChange, onComplete, initialData }: Step4DialogProps) {
  const [targetAudience, setTargetAudience] = useState(initialData?.targetAudience || '');
  const [competitorUrls, setCompetitorUrls] = useState(
    initialData?.competitorUrls?.join('\n') || ''
  );
  const [specialRequirements, setSpecialRequirements] = useState(
    initialData?.specialRequirements || ''
  );
  const [instagramHandle, setInstagramHandle] = useState(initialData?.instagramHandle || '');
  const [facebookHandle, setFacebookHandle] = useState(initialData?.facebookHandle || '');

  useEffect(() => {
    if (open && initialData) {
      if (initialData.targetAudience) setTargetAudience(initialData.targetAudience);
      if (initialData.competitorUrls) setCompetitorUrls(initialData.competitorUrls.join('\n'));
      if (initialData.specialRequirements) setSpecialRequirements(initialData.specialRequirements);
      if (initialData.instagramHandle) setInstagramHandle(initialData.instagramHandle);
      if (initialData.facebookHandle) setFacebookHandle(initialData.facebookHandle);
    }
  }, [open, initialData]);

  const handleSubmit = () => {
    onComplete({
      targetAudience: targetAudience || undefined,
      competitorUrls: competitorUrls
        ? competitorUrls.split('\n').filter(Boolean)
        : undefined,
      specialRequirements: specialRequirements || undefined,
      instagramHandle: instagramHandle || undefined,
      facebookHandle: facebookHandle || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Setup</DialogTitle>
          <DialogDescription>
            Optional settings to fine-tune your brand guide.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Social Media Handles */}
          <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50 space-y-3">
            <Label className="flex items-center gap-1.5 text-gray-700">
              Social Media Profiles
              <Badge variant="outline" className="text-[10px] ml-1">Enhances AI extraction</Badge>
            </Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Adding your social handles gives BakedBot more brand voice samples for better content.
            </p>
            <div>
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-500 flex-shrink-0" />
                <Input
                  placeholder="@yourdispensary"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <Input
                  placeholder="yourdispensarypage"
                  value={facebookHandle}
                  onChange={(e) => setFacebookHandle(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Textarea
              id="targetAudience"
              placeholder="Describe your ideal customer (age, interests, needs)..."
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="mt-1.5 min-h-[80px]"
            />
          </div>

          <div>
            <Label htmlFor="competitors">Competitor URLs (One per line)</Label>
            <Textarea
              id="competitors"
              placeholder="https://competitor1.com&#10;https://competitor2.com"
              value={competitorUrls}
              onChange={(e) => setCompetitorUrls(e.target.value)}
              className="mt-1.5 min-h-[80px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              We&apos;ll analyze competitors to help you stand out.
            </p>
          </div>

          <div>
            <Label htmlFor="requirements">Special Requirements</Label>
            <Textarea
              id="requirements"
              placeholder="Any specific compliance needs, accessibility requirements, or other special considerations..."
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              className="mt-1.5 min-h-[80px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip for Now
          </Button>
          <Button onClick={handleSubmit} className="bg-baked-green hover:bg-baked-green/90">
            Save Advanced Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ARCHETYPE STEP: Brand Archetype Selector (Brand Guide 2.0 Spec 01)
// ============================================================================

interface ArchetypeStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  initialPrimary?: ArchetypeId | null;
  initialSecondary?: ArchetypeId | null;
  scannerSuggestion?: ArchetypeId | null;
  onSaved?: (primary: ArchetypeId, secondary: ArchetypeId | null) => void;
}

export function ArchetypeStepDialog({
  open,
  onOpenChange,
  brandId,
  initialPrimary,
  initialSecondary,
  scannerSuggestion,
  onSaved,
}: ArchetypeStepDialogProps) {
  const [selectedPrimary, setSelectedPrimary] = useState<ArchetypeId | null>(initialPrimary ?? null);
  const [selectedSecondary, setSelectedSecondary] = useState<ArchetypeId | null>(initialSecondary ?? null);

  function handleSaved(primary: ArchetypeId, secondary: ArchetypeId | null) {
    setSelectedPrimary(primary);
    setSelectedSecondary(secondary);
    onSaved?.(primary, secondary);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Brand Archetype</DialogTitle>
          <DialogDescription>
            Choose the archetype that best represents your brand&apos;s personality. This shapes how
            Smokey, Craig, and all AI agents communicate on your behalf.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 py-4 lg:grid-cols-[1fr_260px]">
          {/* Selector */}
          <ArchetypeSelector
            brandId={brandId}
            initialPrimary={initialPrimary}
            initialSecondary={initialSecondary}
            scannerSuggestion={scannerSuggestion}
            onSaved={handleSaved}
          />

          {/* Live preview (only shown when something is selected) */}
          {selectedPrimary && (
            <div className="hidden lg:block">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Live Preview</div>
              <ArchetypePreview primary={selectedPrimary} secondary={selectedSecondary} />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip for Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// STEP 5: Business Strategy (Archetype + Growth Stage + Competitive Posture)
// ============================================================================

const ARCHETYPE_ICONS: Record<BusinessArchetype, React.ElementType> = {
  premium_boutique: Gem,
  value_leader: Tag,
  community_hub: Users,
  medical_focus: HeartPulse,
  lifestyle_brand: Sparkles,
};

export interface Step5Data {
  archetype: BusinessArchetype;
  growthStage: GrowthStage;
  competitivePosture: CompetitivePosture;
}

interface Step5DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: Step5Data) => void;
  initialData?: Partial<Step5Data>;
}

export function Step5Dialog({ open, onOpenChange, onComplete, initialData }: Step5DialogProps) {
  const [archetype, setArchetype] = useState<BusinessArchetype>(initialData?.archetype || 'community_hub');
  const [growthStage, setGrowthStage] = useState<GrowthStage>(initialData?.growthStage || 'growth');
  const [competitivePosture, setCompetitivePosture] = useState<CompetitivePosture>(
    initialData?.competitivePosture || 'differentiator'
  );

  const archetypes = Object.values(ARCHETYPE_METADATA);

  const growthStages: { value: GrowthStage; label: string; desc: string }[] = [
    { value: 'startup', label: 'Startup', desc: '<12 months; building awareness' },
    { value: 'growth', label: 'Growth', desc: '12-36 months; scaling loyal base' },
    { value: 'established', label: 'Established', desc: '36+ months; defending market share' },
    { value: 'expansion', label: 'Expanding', desc: 'Multi-location or new markets' },
  ];

  const postures: { value: CompetitivePosture; label: string; desc: string }[] = [
    { value: 'aggressive', label: 'Aggressive', desc: 'Match or beat competitors on price' },
    { value: 'defensive', label: 'Defensive', desc: 'Protect loyal customers; avoid price wars' },
    { value: 'differentiator', label: 'Differentiator', desc: 'Compete on experience and brand value' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Business Strategy</DialogTitle>
          <DialogDescription>
            Choose your archetype to seed default AI behaviors. You can fine-tune everything in Step 6.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Archetype Cards */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Business Archetype</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {archetypes.map((meta) => {
                const Icon = ARCHETYPE_ICONS[meta.archetype];
                const selected = archetype === meta.archetype;
                return (
                  <button
                    key={meta.archetype}
                    type="button"
                    onClick={() => setArchetype(meta.archetype)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      selected
                        ? 'border-baked-green bg-green-50'
                        : 'border-gray-200 hover:border-green-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${selected ? 'text-baked-green' : 'text-gray-400'}`} />
                      <span className="font-semibold text-sm">{meta.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{meta.description}</p>
                  </button>
                );
              })}
            </div>
            {archetype && (
              <ul className="mt-2 text-xs text-muted-foreground space-y-0.5 pl-1">
                {ARCHETYPE_METADATA[archetype].defaultHighlights.map((h) => (
                  <li key={h} className="flex items-center gap-1.5">
                    <span className="text-baked-green">✓</span> {h}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Growth Stage */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Growth Stage</Label>
            <div className="grid grid-cols-2 gap-2">
              {growthStages.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGrowthStage(g.value)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    growthStage === g.value
                      ? 'border-baked-green bg-green-50'
                      : 'border-gray-200 hover:border-green-200'
                  }`}
                >
                  <div className="font-semibold text-sm">{g.label}</div>
                  <div className="text-xs text-muted-foreground">{g.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Competitive Posture */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Competitive Posture</Label>
            <div className="grid grid-cols-3 gap-2">
              {postures.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setCompetitivePosture(p.value)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    competitivePosture === p.value
                      ? 'border-baked-green bg-green-50'
                      : 'border-gray-200 hover:border-green-200'
                  }`}
                >
                  <div className="font-semibold text-sm">{p.label}</div>
                  <div className="text-xs text-muted-foreground">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => { onComplete({ archetype, growthStage, competitivePosture }); onOpenChange(false); }}
            className="bg-baked-green hover:bg-baked-green/90"
          >
            Save Strategy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// STEP 6: Agent Behavior (Value Hierarchy Sliders + Smokey/Craig Configs)
// ============================================================================

export interface Step6Data {
  valueHierarchies: ValueHierarchies;
  smokeyConfig: SmokeyIntentConfig;
  craigConfig: CraigIntentConfig;
}

const DEFAULT_VALUE_HIERARCHIES: ValueHierarchies = {
  speedVsEducation: 0.5,
  volumeVsMargin: 0.5,
  acquisitionVsRetention: 0.5,
  complianceConservatism: 0.5,
  automationVsHumanTouch: 0.5,
  brandVoiceFormality: 0.5,
};

const DEFAULT_SMOKEY_CONFIG: SmokeyIntentConfig = {
  recommendationPhilosophy: 'effect_first',
  upsellAggressiveness: 0.5,
  newUserProtocol: 'guided',
  productEducationDepth: 'moderate',
};

const DEFAULT_CRAIG_CONFIG: CraigIntentConfig = {
  campaignFrequencyCap: 2,
  preferredChannels: ['sms', 'email'],
  toneArchetype: 'sage',
  promotionStrategy: 'value_led',
};

interface Step6DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: Step6Data) => void;
  initialData?: Partial<Step6Data>;
}

export function Step6Dialog({ open, onOpenChange, onComplete, initialData }: Step6DialogProps) {
  const [sliders, setSliders] = useState<ValueHierarchies>(
    initialData?.valueHierarchies || DEFAULT_VALUE_HIERARCHIES
  );
  const [smokey, setSmokey] = useState<SmokeyIntentConfig>(
    initialData?.smokeyConfig || DEFAULT_SMOKEY_CONFIG
  );
  const [craig, setCraig] = useState<CraigIntentConfig>(
    initialData?.craigConfig || DEFAULT_CRAIG_CONFIG
  );

  const sliderKeys = Object.keys(SLIDER_METADATA) as (keyof ValueHierarchies)[];

  function updateSlider(key: keyof ValueHierarchies, value: number) {
    setSliders((prev) => ({ ...prev, [key]: value }));
  }

  function toggleChannel(ch: 'sms' | 'email' | 'push') {
    setCraig((prev) => {
      const has = prev.preferredChannels.includes(ch);
      const updated = has
        ? prev.preferredChannels.filter((c) => c !== ch)
        : [...prev.preferredChannels, ch];
      return { ...prev, preferredChannels: updated.length ? updated : [ch] };
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agent Behavior</DialogTitle>
          <DialogDescription>
            Fine-tune how your AI agents make decisions when situations are ambiguous.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Value Hierarchy Sliders */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">AI Decision Trade-offs</Label>
            <div className="space-y-4">
              {sliderKeys.map((key) => {
                const meta = SLIDER_METADATA[key];
                const value = sliders[key];
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span className="font-medium">{meta.leftLabel}</span>
                      <span className="font-medium">{meta.rightLabel}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={value}
                      onChange={(e) => updateSlider(key, parseFloat(e.target.value))}
                      className="w-full accent-baked-green h-2 cursor-pointer"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {value < 0.4 ? meta.leftDescription : value > 0.6 ? meta.rightDescription : 'Balanced'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Smokey Config */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Smokey (Budtender)</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs mb-1 block">Recommendation Style</Label>
                <select
                  value={smokey.recommendationPhilosophy}
                  onChange={(e) => setSmokey((p) => ({ ...p, recommendationPhilosophy: e.target.value as SmokeyIntentConfig['recommendationPhilosophy'] }))}
                  className="w-full text-sm border rounded-md px-3 py-2 bg-background"
                >
                  <option value="effect_first">Effect-first</option>
                  <option value="chemistry_first">Chemistry-first</option>
                  <option value="price_first">Price-first</option>
                  <option value="popularity_first">Popularity-first</option>
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">New Customer Protocol</Label>
                <select
                  value={smokey.newUserProtocol}
                  onChange={(e) => setSmokey((p) => ({ ...p, newUserProtocol: e.target.value as SmokeyIntentConfig['newUserProtocol'] }))}
                  className="w-full text-sm border rounded-md px-3 py-2 bg-background"
                >
                  <option value="guided">Guided (intake questions)</option>
                  <option value="express">Express (top picks)</option>
                  <option value="discover">Discover (conversational)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Product Education Depth</Label>
                <select
                  value={smokey.productEducationDepth}
                  onChange={(e) => setSmokey((p) => ({ ...p, productEducationDepth: e.target.value as SmokeyIntentConfig['productEducationDepth'] }))}
                  className="w-full text-sm border rounded-md px-3 py-2 bg-background"
                >
                  <option value="minimal">Minimal</option>
                  <option value="moderate">Moderate</option>
                  <option value="comprehensive">Comprehensive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Craig Config */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Craig (Marketer)</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs mb-1 block">Tone Archetype</Label>
                <select
                  value={craig.toneArchetype}
                  onChange={(e) => setCraig((p) => ({ ...p, toneArchetype: e.target.value as CraigIntentConfig['toneArchetype'] }))}
                  className="w-full text-sm border rounded-md px-3 py-2 bg-background"
                >
                  <option value="sage">Sage (wise, educational)</option>
                  <option value="hero">Hero (empowering, community)</option>
                  <option value="rebel">Rebel (bold, disruptive)</option>
                  <option value="creator">Creator (innovative)</option>
                  <option value="jester">Jester (playful, fun)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Campaign Strategy</Label>
                <select
                  value={craig.promotionStrategy}
                  onChange={(e) => setCraig((p) => ({ ...p, promotionStrategy: e.target.value as CraigIntentConfig['promotionStrategy'] }))}
                  className="w-full text-sm border rounded-md px-3 py-2 bg-background"
                >
                  <option value="education_led">Education-led</option>
                  <option value="value_led">Value/Community-led</option>
                  <option value="discount_led">Discount-led</option>
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Max Campaigns/Week per Customer</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={craig.campaignFrequencyCap}
                  onChange={(e) => setCraig((p) => ({ ...p, campaignFrequencyCap: Math.max(1, Math.min(7, parseInt(e.target.value) || 2)) }))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs mb-2 block">Preferred Channels</Label>
                <div className="flex gap-2">
                  {(['sms', 'email', 'push'] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      className={`px-3 py-1.5 text-xs rounded-md border-2 font-medium transition-all ${
                        craig.preferredChannels.includes(ch)
                          ? 'border-baked-green bg-green-50 text-baked-green'
                          : 'border-gray-200 text-muted-foreground'
                      }`}
                    >
                      {ch.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => { onComplete({ valueHierarchies: sliders, smokeyConfig: smokey, craigConfig: craig }); onOpenChange(false); }}
            className="bg-baked-green hover:bg-baked-green/90"
          >
            Save Agent Behavior
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// STEP 7: Hard Limits (Never-Do List + Escalation Triggers)
// ============================================================================

export interface Step7Data {
  neverDoList: string[];
  escalationTriggers: string[];
}

interface Step7DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: Step7Data) => void;
  initialData?: Partial<Step7Data>;
}

const DEFAULT_NEVER_DO_LIST = [
  'Never compare prices to competitors by name',
  'Never make medical claims or promise specific health outcomes',
  'Never recommend products to minors',
].join('\n');

const DEFAULT_ESCALATION_LIST = [
  'Customer mentions a medical emergency',
  'Customer asks about driving after consumption',
  'Customer expresses intent to harm themselves or others',
].join('\n');

export function Step7Dialog({ open, onOpenChange, onComplete, initialData }: Step7DialogProps) {
  const [neverDo, setNeverDo] = useState(
    initialData?.neverDoList?.join('\n') || DEFAULT_NEVER_DO_LIST
  );
  const [escalation, setEscalation] = useState(
    initialData?.escalationTriggers?.join('\n') || DEFAULT_ESCALATION_LIST
  );

  useEffect(() => {
    if (open && initialData) {
      if (initialData.neverDoList) setNeverDo(initialData.neverDoList.join('\n'));
      if (initialData.escalationTriggers) setEscalation(initialData.escalationTriggers.join('\n'));
    }
  }, [open, initialData]);

  function toLines(text: string) {
    return text.split('\n').map((l) => l.trim()).filter(Boolean);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-500" />
            Hard Limits
          </DialogTitle>
          <DialogDescription>
            Define absolute rules for your AI agents. These are enforced at every interaction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label className="text-sm font-semibold mb-1 block">Never-Do List</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Things agents must never do or say on your behalf. One rule per line.
            </p>
            <Textarea
              value={neverDo}
              onChange={(e) => setNeverDo(e.target.value)}
              placeholder="Never compare prices to competitors by name&#10;Never make medical claims..."
              className="min-h-[140px] text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">{toLines(neverDo).length} rules</p>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-1 block">Escalation Triggers</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Conditions that must trigger an immediate human handoff. One trigger per line.
            </p>
            <Textarea
              value={escalation}
              onChange={(e) => setEscalation(e.target.value)}
              placeholder="Customer mentions a medical emergency&#10;Customer asks about driving..."
              className="min-h-[120px] text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">{toLines(escalation).length} triggers</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Skip for Now</Button>
          <Button
            onClick={() => {
              onComplete({ neverDoList: toLines(neverDo), escalationTriggers: toLines(escalation) });
              onOpenChange(false);
            }}
            className="bg-baked-green hover:bg-baked-green/90"
          >
            Save Hard Limits
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
