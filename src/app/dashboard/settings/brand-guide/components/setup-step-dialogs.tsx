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
import { Instagram, Facebook, MapPin, Building2 } from 'lucide-react';

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
      if (initialData.brandName) setBrandName(initialData.brandName);
      if (initialData.description) setDescription(initialData.description);
      if (initialData.tagline) setTagline(initialData.tagline);
      if (initialData.city) setCity(initialData.city);
      if (initialData.state) setState(initialData.state);
      if (initialData.dispensaryType) setDispensaryType(initialData.dispensaryType);
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
      if (initialData.primaryColor) setPrimaryColor(initialData.primaryColor);
      if (initialData.secondaryColor) setSecondaryColor(initialData.secondaryColor);
      if (initialData.logoUrl) setLogoUrl(initialData.logoUrl);
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
      if (initialData.tone && initialData.tone.length > 0) {
        // Match case-insensitively against our options list
        const matched = toneOptions.filter((opt) =>
          initialData.tone!.some((t) => t.toLowerCase() === opt.toLowerCase())
        );
        if (matched.length > 0) setSelectedTones(matched.slice(0, 3));
      }
      if (initialData.personality && initialData.personality.length > 0) {
        const matched = personalityOptions.filter((opt) =>
          initialData.personality!.some((p) => p.toLowerCase() === opt.toLowerCase())
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
    (initialData.tone?.length ?? 0) > 0 || (initialData.personality?.length ?? 0) > 0
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
