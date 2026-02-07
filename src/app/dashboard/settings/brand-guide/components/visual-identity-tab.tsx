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
import { Loader2, Upload, Check, AlertCircle, Info } from 'lucide-react';
import { updateBrandGuide } from '@/server/actions/brand-guide';
import { validateColorAccessibility } from '@/server/actions/brand-guide';
import { useToast } from '@/hooks/use-toast';
import type { BrandGuide, BrandVisualIdentity } from '@/types/brand-guide';

interface VisualIdentityTabProps {
  brandId: string;
  brandGuide: BrandGuide;
  onUpdate: (updates: Partial<BrandGuide>) => void;
}

export function VisualIdentityTab({ brandId, brandGuide, onUpdate }: VisualIdentityTabProps) {
  const [visualIdentity, setVisualIdentity] = useState<BrandVisualIdentity>(
    brandGuide.visualIdentity
  );
  const [loading, setLoading] = useState(false);
  const [accessibilityCheck, setAccessibilityCheck] = useState<any>(null);
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

  return (
    <div className="space-y-6">
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
            </div>
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
        <Button variant="outline" onClick={() => setVisualIdentity(brandGuide.visualIdentity)}>
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
