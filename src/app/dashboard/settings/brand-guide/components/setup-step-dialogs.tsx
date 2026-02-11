/**
 * Setup Step Dialogs
 *
 * Individual dialogs for each brand guide setup step
 */

'use client';

import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';

// ============================================================================
// STEP 1: Brand Name & Description
// ============================================================================

interface Step1DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: { brandName: string; description: string; tagline?: string }) => void;
}

export function Step1Dialog({ open, onOpenChange, onComplete }: Step1DialogProps) {
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');

  const handleSubmit = () => {
    onComplete({ brandName, description, tagline });
    onOpenChange(false);
  };

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
              className="mt-1.5 min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              This will be used across your marketing materials and customer communications.
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
// STEP 2: Colors & Logo
// ============================================================================

interface Step2DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    primaryColor: string;
    secondaryColor?: string;
    logoUrl?: string;
  }) => void;
}

export function Step2Dialog({ open, onOpenChange, onComplete }: Step2DialogProps) {
  const [primaryColor, setPrimaryColor] = useState('#4ade80');
  const [secondaryColor, setSecondaryColor] = useState('#1f3324');
  const [logoUrl, setLogoUrl] = useState('');

  const handleSubmit = () => {
    onComplete({
      primaryColor,
      secondaryColor: secondaryColor || undefined,
      logoUrl: logoUrl || undefined,
    });
    onOpenChange(false);
  };

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

          <div>
            <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
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
// STEP 3: Brand Voice
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
}

export function Step3Dialog({ open, onOpenChange, onComplete }: Step3DialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Define Brand Voice</DialogTitle>
          <DialogDescription>
            Set the tone and personality for all AI-generated content.
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
            <Label htmlFor="dontWrite">Don't Write (One per line)</Label>
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
// STEP 4: Advanced Setup
// ============================================================================

interface Step4DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    targetAudience?: string;
    competitorUrls?: string[];
    specialRequirements?: string;
  }) => void;
}

export function Step4Dialog({ open, onOpenChange, onComplete }: Step4DialogProps) {
  const [targetAudience, setTargetAudience] = useState('');
  const [competitorUrls, setCompetitorUrls] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');

  const handleSubmit = () => {
    onComplete({
      targetAudience: targetAudience || undefined,
      competitorUrls: competitorUrls
        ? competitorUrls.split('\n').filter(Boolean)
        : undefined,
      specialRequirements: specialRequirements || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Advanced Setup</DialogTitle>
          <DialogDescription>
            Optional settings to fine-tune your brand guide.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              We'll analyze competitors to help you stand out.
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
