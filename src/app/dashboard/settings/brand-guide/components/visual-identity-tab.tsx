/**
 * Visual Identity Tab
 *
 * Manage brand visual identity: colors, typography, spacing, imagery.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Check, AlertCircle, Info, CloudUpload } from 'lucide-react';
import { updateBrandGuide, mirrorLogoToStorage } from '@/server/actions/brand-guide';
import { validateColorAccessibility } from '@/server/actions/brand-guide';
import { useToast } from '@/hooks/use-toast';
import type { BrandGuide, BrandVisualIdentity, BrandTypography } from '@/types/brand-guide';
import { BRAND_ARCHETYPES, type ArchetypeId } from '@/constants/brand-archetypes';
import { ArchetypeSelector } from './archetype-selector';
import { ArchetypePreview } from './archetype-preview';

interface VisualIdentityTabProps {
  brandId: string;
  brandGuide: BrandGuide;
  onUpdate: (updates: Partial<BrandGuide>) => void;
}

const DEFAULT_COLORS = {
  primary:    { hex: '#4ade80', name: 'Primary',    usage: 'Primary CTA buttons, headers' },
  secondary:  { hex: '#22d3ee', name: 'Secondary',  usage: 'Secondary elements' },
  accent:     { hex: '#f59e0b', name: 'Accent',     usage: 'Highlights, accents' },
  text:       { hex: '#111827', name: 'Text',       usage: 'Body text' },
  background: { hex: '#ffffff', name: 'Background', usage: 'Page background' },
};

const DEFAULT_FONT = { family: 'Inter', weights: [400, 700], source: 'google' as const };
const DEFAULT_SPACING = { scale: 4 as const, borderRadius: 'md' as const };
const DEFAULT_LOGO = { primary: '' };

function normalizeVisualIdentity(vi: BrandVisualIdentity | undefined | null): BrandVisualIdentity {
  const raw = vi ?? {} as Partial<BrandVisualIdentity>;
  const colors = (raw.colors ?? {}) as Partial<BrandVisualIdentity['colors']>;
  const typo = (raw.typography ?? {}) as Partial<BrandTypography>;
  return {
    ...raw as BrandVisualIdentity,
    logo: { ...DEFAULT_LOGO, ...(raw.logo ?? {}) },
    colors: {
      primary:    colors.primary    ?? DEFAULT_COLORS.primary,
      secondary:  colors.secondary  ?? DEFAULT_COLORS.secondary,
      accent:     colors.accent     ?? DEFAULT_COLORS.accent,
      text:       colors.text       ?? DEFAULT_COLORS.text,
      background: colors.background ?? DEFAULT_COLORS.background,
    },
    typography: {
      headingFont: typo.headingFont ?? DEFAULT_FONT,
      bodyFont:    typo.bodyFont    ?? DEFAULT_FONT,
      ...typo,
    },
    spacing: { ...DEFAULT_SPACING, ...(raw.spacing ?? {}) },
  };
}

export function VisualIdentityTab({ brandId, brandGuide, onUpdate }: VisualIdentityTabProps) {
  const [visualIdentity, setVisualIdentity] = useState<BrandVisualIdentity>(
    normalizeVisualIdentity(brandGuide.visualIdentity)
  );
  const [loading, setLoading] = useState(false);
  const [mirroringLogo, setMirroringLogo] = useState(false);
  const [accessibilityCheck, setAccessibilityCheck] = useState<any>(null);
  const [savedPrimary, setSavedPrimary] = useState<ArchetypeId | null>(
    brandGuide.archetype?.primary ?? null
  );
  const [savedSecondary, setSavedSecondary] = useState<ArchetypeId | null>(
    brandGuide.archetype?.secondary ?? null
  );
  const { toast } = useToast();

  // Validate accessibility whenever colors change
  const handleColorChange = async (colorType: string, value: string) => {
    const updatedColors = {
      ...visualIdentity.colors,
      [colorType]: { hex: value, name: colorType },
    };

    setVisualIdentity({ ...visualIdentity, colors: updatedColors });

    // Run accessibility check
    if (
      updatedColors.primary.hex &&
      updatedColors.secondary.hex &&
      updatedColors.accent.hex &&
      updatedColors.text.hex &&
      updatedColors.background.hex
    ) {
      const result = await validateColorAccessibility(updatedColors as any);
      if (result.success) {
        setAccessibilityCheck(result.result);
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const result = await updateBrandGuide({
        brandId,
        updates: { visualIdentity },
        createVersion: true,
        reason: 'Updated visual identity',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update visual identity');
      }

      toast({
        title: 'Visual Identity Updated',
        description: 'Your brand visual identity has been saved successfully.',
      });

      onUpdate({ visualIdentity });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMirrorLogo = async () => {
    const url = visualIdentity.logo?.primary;
    if (!url || url.includes('storage.googleapis.com/bakedbot-global-assets')) {
      toast({ title: 'Already saved', description: 'Logo is already in BakedBot storage.' });
      return;
    }
    setMirroringLogo(true);
    try {
      const result = await mirrorLogoToStorage(brandId, url);
      if (!result.success || !result.storageUrl) throw new Error(result.error || 'Upload failed');
      setVisualIdentity(prev => ({ ...prev, logo: { ...prev.logo, primary: result.storageUrl! } }));
      toast({ title: 'Logo saved to library', description: 'Now served from BakedBot storage.' });
    } catch (err) {
      toast({ title: 'Upload failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setMirroringLogo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Brand Archetype Section — Brand Guide 2.0 Spec 01 */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Archetype</CardTitle>
          <CardDescription>
            The personality blueprint that shapes every agent interaction — Smokey&apos;s greeting style,
            Craig&apos;s subject lines, and tone across all content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
            <ArchetypeSelector
              brandId={brandId}
              initialPrimary={savedPrimary}
              initialSecondary={savedSecondary}
              onSaved={(primary, secondary) => {
                setSavedPrimary(primary);
                setSavedSecondary(secondary);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onUpdate({ archetype: { primary, secondary, selected_at: new Date() as any, suggested_by_scanner: brandGuide.archetype?.suggested_by_scanner ?? null } });
              }}
            />
            {savedPrimary && (
              <div className="hidden lg:block">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Live Preview</div>
                <ArchetypePreview
                  primary={savedPrimary}
                  secondary={savedSecondary}
                  brandName={brandGuide.brandName}
                  smokeyGreeting={brandGuide.messaging?.smokeyGreeting}
                  craigSubjectTemplate={brandGuide.messaging?.craigSubjectTemplate}
                  onSaveGreeting={async (greeting) => {
                    await updateBrandGuide({
                      brandId,
                      updates: { messaging: { ...brandGuide.messaging, smokeyGreeting: greeting } },
                      createVersion: false,
                      reason: 'Updated Smokey greeting',
                    });
                    onUpdate({ messaging: { ...brandGuide.messaging, smokeyGreeting: greeting } });
                  }}
                  onSaveCraigSubject={async (subject) => {
                    await updateBrandGuide({
                      brandId,
                      updates: { messaging: { ...brandGuide.messaging, craigSubjectTemplate: subject } },
                      createVersion: false,
                      reason: 'Updated Craig subject template',
                    });
                    onUpdate({ messaging: { ...brandGuide.messaging, craigSubjectTemplate: subject } });
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>Your primary brand mark and logo variants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="logo-primary">Primary Logo URL</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="logo-primary"
                value={visualIdentity.logo.primary || ''}
                onChange={(e) =>
                  setVisualIdentity({
                    ...visualIdentity,
                    logo: { ...visualIdentity.logo, primary: e.target.value },
                  })
                }
                placeholder="https://example.com/logo.png"
              />
              <Button variant="outline" size="icon">
                <Upload className="w-4 h-4" />
              </Button>
              {visualIdentity.logo?.primary && !visualIdentity.logo.primary.includes('storage.googleapis.com/bakedbot-global-assets') && (
                <Button variant="outline" size="sm" onClick={handleMirrorLogo} disabled={mirroringLogo} title="Save to BakedBot storage">
                  {mirroringLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                </Button>
              )}
            </div>
            {visualIdentity.logo?.primary?.includes('storage.googleapis.com/bakedbot-global-assets') && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><Check className="h-3 w-3" /> Saved in BakedBot storage</p>
            )}
          </div>

          <div>
            <Label htmlFor="logo-secondary">Secondary Logo URL (optional)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="logo-secondary"
                value={visualIdentity.logo.secondary || ''}
                onChange={(e) =>
                  setVisualIdentity({
                    ...visualIdentity,
                    logo: { ...visualIdentity.logo, secondary: e.target.value },
                  })
                }
                placeholder="https://example.com/logo-alt.png"
              />
              <Button variant="outline" size="icon">
                <Upload className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="logo-specifications">Logo Usage Guidelines</Label>
            <Textarea
              id="logo-specifications"
              value={visualIdentity.logo.specifications?.fileFormats?.join(', ') || ''}
              onChange={(e) =>
                setVisualIdentity({
                  ...visualIdentity,
                  logo: {
                    ...visualIdentity.logo,
                    specifications: {
                      ...visualIdentity.logo.specifications,
                      fileFormats: e.target.value.split(',').map((s) => s.trim()),
                    },
                  },
                })
              }
              placeholder="SVG, PNG, PDF"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Color Palette Section */}
      <Card>
        <CardHeader>
          <CardTitle>Color Palette</CardTitle>
          <CardDescription>Define your brand colors with accessibility validation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="color-primary">Primary Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  id="color-primary"
                  value={visualIdentity.colors.primary.hex}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={visualIdentity.colors.primary.hex}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="color-secondary">Secondary Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  id="color-secondary"
                  value={visualIdentity.colors.secondary.hex}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={visualIdentity.colors.secondary.hex}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Accent, Text, Background Colors */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="color-accent">Accent Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  id="color-accent"
                  value={visualIdentity.colors.accent.hex}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={visualIdentity.colors.accent.hex}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="color-text">Text Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  id="color-text"
                  value={visualIdentity.colors.text.hex}
                  onChange={(e) => handleColorChange('text', e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={visualIdentity.colors.text.hex}
                  onChange={(e) => handleColorChange('text', e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="color-background">Background Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  id="color-background"
                  value={visualIdentity.colors.background.hex}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={visualIdentity.colors.background.hex}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Accessibility Check Results */}
          {accessibilityCheck && (
            <Alert
              variant={
                accessibilityCheck.overallCompliance === 'AAA'
                  ? 'default'
                  : accessibilityCheck.overallCompliance === 'AA'
                  ? 'default'
                  : 'destructive'
              }
            >
              <div className="flex items-start gap-2">
                {accessibilityCheck.overallCompliance === 'fail' ? (
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                ) : (
                  <Check className="w-4 h-4 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription>
                    <div className="font-semibold mb-1">
                      WCAG {accessibilityCheck.overallCompliance} Compliance
                    </div>
                    <ul className="text-sm space-y-1">
                      {accessibilityCheck.suggestions?.map((suggestion: string, i: number) => (
                        <li key={i}>• {suggestion}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Typography Section */}
      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
          <CardDescription>Define your brand fonts and text styles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="font-heading">Heading Font Family</Label>
              <Select
                value={visualIdentity.typography.headingFont.family}
                onValueChange={(value) =>
                  setVisualIdentity({
                    ...visualIdentity,
                    typography: {
                      ...visualIdentity.typography,
                      headingFont: { ...visualIdentity.typography.headingFont, family: value },
                    },
                  })
                }
              >
                <SelectTrigger id="font-heading">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Roboto">Roboto</SelectItem>
                  <SelectItem value="Poppins">Poppins</SelectItem>
                  <SelectItem value="Montserrat">Montserrat</SelectItem>
                  <SelectItem value="Raleway">Raleway</SelectItem>
                  <SelectItem value="Lato">Lato</SelectItem>
                  <SelectItem value="Open Sans">Open Sans</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="font-body">Body Font Family</Label>
              <Select
                value={visualIdentity.typography.bodyFont.family}
                onValueChange={(value) =>
                  setVisualIdentity({
                    ...visualIdentity,
                    typography: {
                      ...visualIdentity.typography,
                      bodyFont: { ...visualIdentity.typography.bodyFont, family: value },
                    },
                  })
                }
              >
                <SelectTrigger id="font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Roboto">Roboto</SelectItem>
                  <SelectItem value="Poppins">Poppins</SelectItem>
                  <SelectItem value="Montserrat">Montserrat</SelectItem>
                  <SelectItem value="Raleway">Raleway</SelectItem>
                  <SelectItem value="Lato">Lato</SelectItem>
                  <SelectItem value="Open Sans">Open Sans</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Heading Font Weight</Label>
              <Select
                value={String(visualIdentity.typography.headingFont.weights[0] || 700)}
                onValueChange={(value) =>
                  setVisualIdentity({
                    ...visualIdentity,
                    typography: {
                      ...visualIdentity.typography,
                      headingFont: {
                        ...visualIdentity.typography.headingFont,
                        weights: [parseInt(value)],
                      },
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">Light (300)</SelectItem>
                  <SelectItem value="400">Regular (400)</SelectItem>
                  <SelectItem value="500">Medium (500)</SelectItem>
                  <SelectItem value="600">Semibold (600)</SelectItem>
                  <SelectItem value="700">Bold (700)</SelectItem>
                  <SelectItem value="800">Extrabold (800)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Body Font Weight</Label>
              <Select
                value={String(visualIdentity.typography.bodyFont.weights[0] || 400)}
                onValueChange={(value) =>
                  setVisualIdentity({
                    ...visualIdentity,
                    typography: {
                      ...visualIdentity.typography,
                      bodyFont: {
                        ...visualIdentity.typography.bodyFont,
                        weights: [parseInt(value)],
                      },
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">Light (300)</SelectItem>
                  <SelectItem value="400">Regular (400)</SelectItem>
                  <SelectItem value="500">Medium (500)</SelectItem>
                  <SelectItem value="600">Semibold (600)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spacing & Layout Section */}
      <Card>
        <CardHeader>
          <CardTitle>Spacing & Layout</CardTitle>
          <CardDescription>Define spacing scale and border radius</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Base Spacing Unit</Label>
              <span className="text-sm text-muted-foreground">
                {visualIdentity.spacing.scale}px
              </span>
            </div>
            <Select
              value={String(visualIdentity.spacing.scale)}
              onValueChange={(value) =>
                setVisualIdentity({
                  ...visualIdentity,
                  spacing: { ...visualIdentity.spacing, scale: parseInt(value) as 4 | 8 },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4px</SelectItem>
                <SelectItem value="8">8px</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Border Radius</Label>
              <span className="text-sm text-muted-foreground">
                {typeof visualIdentity.spacing.borderRadius === 'number'
                  ? `${visualIdentity.spacing.borderRadius}px`
                  : visualIdentity.spacing.borderRadius}
              </span>
            </div>
            <Select
              value={String(visualIdentity.spacing.borderRadius)}
              onValueChange={(value) =>
                setVisualIdentity({
                  ...visualIdentity,
                  spacing: {
                    ...visualIdentity.spacing,
                    borderRadius: isNaN(parseInt(value)) ? value as 'none' | 'sm' | 'md' | 'lg' | 'full' : parseInt(value)
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="4">4px</SelectItem>
                <SelectItem value="8">8px</SelectItem>
                <SelectItem value="12">12px</SelectItem>
                <SelectItem value="16">16px</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Imagery Section */}
      <Card>
        <CardHeader>
          <CardTitle>Imagery Guidelines</CardTitle>
          <CardDescription>Define your visual content style and guidelines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="imagery-style">Photography Style</Label>
            <Select
              value={visualIdentity.imagery?.style || 'lifestyle'}
              onValueChange={(value) =>
                setVisualIdentity({
                  ...visualIdentity,
                  imagery: {
                    ...visualIdentity.imagery,
                    style: value as 'lifestyle' | 'product-focused' | 'white-background' | 'abstract' | 'illustrative' | 'mixed',
                  },
                })
              }
            >
              <SelectTrigger id="imagery-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lifestyle">Lifestyle</SelectItem>
                <SelectItem value="product-focused">Product-focused</SelectItem>
                <SelectItem value="white-background">White Background</SelectItem>
                <SelectItem value="abstract">Abstract</SelectItem>
                <SelectItem value="illustrative">Illustrative</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="imagery-guidelines">Imagery Guidelines</Label>
            <Textarea
              id="imagery-guidelines"
              value={visualIdentity.imagery?.guidelines || ''}
              onChange={(e) =>
                setVisualIdentity({
                  ...visualIdentity,
                  imagery: {
                    ...visualIdentity.imagery,
                    style: visualIdentity.imagery?.style || 'lifestyle',
                    guidelines: e.target.value,
                  },
                })
              }
              placeholder="Describe your imagery guidelines (composition, lighting, subject matter)"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="imagery-filters">Filters</Label>
            <Input
              id="imagery-filters"
              value={visualIdentity.imagery?.filters || ''}
              onChange={(e) =>
                setVisualIdentity({
                  ...visualIdentity,
                  imagery: {
                    ...visualIdentity.imagery,
                    style: visualIdentity.imagery?.style || 'lifestyle',
                    filters: e.target.value,
                  },
                })
              }
              placeholder="e.g., High contrast, vibrant colors"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setVisualIdentity(normalizeVisualIdentity(brandGuide.visualIdentity))}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
