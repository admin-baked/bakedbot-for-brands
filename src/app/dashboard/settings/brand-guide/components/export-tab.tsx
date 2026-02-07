/**
 * Export Tab
 *
 * Export brand guide in various formats (PDF, Figma, Adobe XD, JSON).
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Download, FileText, Palette, Code, Share2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { BrandGuide } from '@/types/brand-guide';

interface ExportTabProps {
  brandId: string;
  brandGuide: BrandGuide;
}

export function ExportTab({ brandId, brandGuide }: ExportTabProps) {
  const [loading, setLoading] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    includeVisual: true,
    includeVoice: true,
    includeMessaging: true,
    includeCompliance: true,
    includeAssets: true,
  });
  const { toast } = useToast();

  const handleExportPDF = async () => {
    setLoading(true);

    try {
      // TODO: Implement PDF export
      toast({
        title: 'Coming Soon',
        description: 'PDF export is currently in development.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export PDF',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = () => {
    try {
      const exportData = {
        brandGuide,
        exportedAt: new Date().toISOString(),
        version: brandGuide.version,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${brandGuide.brandName.toLowerCase().replace(/\s+/g, '-')}-brand-guide.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'Brand guide exported as JSON.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export JSON',
        variant: 'destructive',
      });
    }
  };

  const handleExportFigma = () => {
    try {
      // Generate Figma color palette JSON
      const figmaColors = {
        name: `${brandGuide.brandName} Brand Colors`,
        colors: [
          {
            name: 'Primary',
            hex: brandGuide.visualIdentity.colors.primary.hex,
            r: hexToRgb(brandGuide.visualIdentity.colors.primary.hex).r / 255,
            g: hexToRgb(brandGuide.visualIdentity.colors.primary.hex).g / 255,
            b: hexToRgb(brandGuide.visualIdentity.colors.primary.hex).b / 255,
          },
          {
            name: 'Secondary',
            hex: brandGuide.visualIdentity.colors.secondary.hex,
            r: hexToRgb(brandGuide.visualIdentity.colors.secondary.hex).r / 255,
            g: hexToRgb(brandGuide.visualIdentity.colors.secondary.hex).g / 255,
            b: hexToRgb(brandGuide.visualIdentity.colors.secondary.hex).b / 255,
          },
          {
            name: 'Accent',
            hex: brandGuide.visualIdentity.colors.accent.hex,
            r: hexToRgb(brandGuide.visualIdentity.colors.accent.hex).r / 255,
            g: hexToRgb(brandGuide.visualIdentity.colors.accent.hex).g / 255,
            b: hexToRgb(brandGuide.visualIdentity.colors.accent.hex).b / 255,
          },
        ],
        typography: {
          heading: brandGuide.visualIdentity.typography.headingFont.family,
          body: brandGuide.visualIdentity.typography.bodyFont.family,
        },
      };

      const blob = new Blob([JSON.stringify(figmaColors, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${brandGuide.brandName.toLowerCase().replace(/\s+/g, '-')}-figma-colors.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'Figma color palette exported. Import this file in Figma.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export Figma colors',
        variant: 'destructive',
      });
    }
  };

  const handleExportCSS = () => {
    try {
      const cssVariables = `
/* ${brandGuide.brandName} Brand Colors */
:root {
  /* Colors */
  --brand-primary: ${brandGuide.visualIdentity.colors.primary.hex};
  --brand-secondary: ${brandGuide.visualIdentity.colors.secondary.hex};
  --brand-accent: ${brandGuide.visualIdentity.colors.accent.hex};
  --brand-text: ${brandGuide.visualIdentity.colors.text.hex};
  --brand-background: ${brandGuide.visualIdentity.colors.background.hex};

  /* Typography */
  --font-heading: ${brandGuide.visualIdentity.typography.headingFont.family}, sans-serif;
  --font-body: ${brandGuide.visualIdentity.typography.bodyFont.family}, sans-serif;
  --font-weight-heading: ${brandGuide.visualIdentity.typography.headingFont.weights[0] || 400};
  --font-weight-body: ${brandGuide.visualIdentity.typography.bodyFont.weights[0] || 400};

  /* Spacing */
  --spacing-base: ${brandGuide.visualIdentity.spacing.scale}px;
  --border-radius: ${typeof brandGuide.visualIdentity.spacing.borderRadius === 'number' ? brandGuide.visualIdentity.spacing.borderRadius + 'px' : brandGuide.visualIdentity.spacing.borderRadius};
}

/* Utility Classes */
.brand-heading {
  font-family: var(--font-heading);
  font-weight: var(--font-weight-heading);
  color: var(--brand-text);
}

.brand-body {
  font-family: var(--font-body);
  font-weight: var(--font-weight-body);
  color: var(--brand-text);
}

.brand-primary {
  background-color: var(--brand-primary);
}

.brand-secondary {
  background-color: var(--brand-secondary);
}

.brand-accent {
  background-color: var(--brand-accent);
}
`.trim();

      const blob = new Blob([cssVariables], { type: 'text/css' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${brandGuide.brandName.toLowerCase().replace(/\s+/g, '-')}-brand.css`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'CSS variables exported.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export CSS',
        variant: 'destructive',
      });
    }
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Share2 className="w-4 h-4" />
        <AlertDescription>
          Export your brand guide in various formats to share with your team, vendors, or design
          tools.
        </AlertDescription>
      </Alert>

      {/* PDF Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>PDF Brand Guide</CardTitle>
              <CardDescription>
                Complete brand guide PDF with your brand colors and BakedBot AI branding
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Include Sections:</Label>
            {[
              { id: 'includeVisual', label: 'Visual Identity (colors, typography, logo)' },
              { id: 'includeVoice', label: 'Brand Voice & Tone' },
              { id: 'includeMessaging', label: 'Messaging & Positioning' },
              { id: 'includeCompliance', label: 'Compliance Guidelines' },
              { id: 'includeAssets', label: 'Asset Library' },
            ].map((option) => (
              <div key={option.id} className="flex items-center gap-2">
                <Checkbox
                  id={option.id}
                  checked={pdfOptions[option.id as keyof typeof pdfOptions]}
                  onCheckedChange={(checked) =>
                    setPdfOptions({ ...pdfOptions, [option.id]: checked === true })
                  }
                />
                <Label htmlFor={option.id} className="cursor-pointer font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>

          <Button onClick={handleExportPDF} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </CardContent>
      </Card>

      {/* Design Tool Exports */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Palette className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <CardTitle>Design Tool Exports</CardTitle>
              <CardDescription>
                Export color palettes and styles for Figma, Adobe XD, and other tools
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handleExportFigma}>
              <Download className="w-4 h-4 mr-2" />
              Figma Colors
            </Button>
            <Button variant="outline" onClick={handleExportCSS}>
              <Download className="w-4 h-4 mr-2" />
              CSS Variables
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* JSON Export for LLM Training */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Code className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <CardTitle>LLM Training Data</CardTitle>
              <CardDescription>
                Export brand voice as JSON for fine-tuning language models
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertDescription className="text-sm">
              Use this export to fine-tune AI models on your brand voice, ensuring consistent
              messaging across all AI-generated content.
            </AlertDescription>
          </Alert>

          <Button variant="outline" onClick={handleExportJSON}>
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </CardContent>
      </Card>

      {/* Shareable Link */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Share2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Shareable Link</CardTitle>
              <CardDescription>
                Create a public link to share your brand guide with vendors and partners
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertDescription className="text-sm">
              Generate a read-only link that others can view without needing an account. Perfect
              for sharing with dispensaries, designers, and vendors.
            </AlertDescription>
          </Alert>

          <Button
            variant="outline"
            onClick={() => {
              toast({
                title: 'Coming Soon',
                description: 'Shareable links are currently in development.',
              });
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Generate Share Link
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
