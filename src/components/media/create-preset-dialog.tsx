'use client';

/**
 * Create Custom Style Preset Dialog
 *
 * Allows users to create custom style presets with:
 * - Name and description
 * - Style prompt and negative prompt
 * - Aspect ratios
 * - Color palette (optional)
 * - Typography (optional)
 * - Tags for organization
 */

import { useState } from 'react';
import { StylePreset } from '@/types/media-generation';
import { createStylePreset } from '@/server/actions/style-presets';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Palette, Type } from 'lucide-react';

interface CreatePresetDialogProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (preset: StylePreset) => void;
}

export function CreatePresetDialog({
  tenantId,
  open,
  onOpenChange,
  onSuccess,
}: CreatePresetDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedAspectRatios, setSelectedAspectRatios] = useState<Array<'1:1' | '4:5' | '16:9' | '9:16'>>(['1:1']);
  const [tags, setTags] = useState('');
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [secondaryColor, setSecondaryColor] = useState('#666666');
  const [accentColor, setAccentColor] = useState('#ff0000');
  const [showTypography, setShowTypography] = useState(false);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState('medium');
  const [fontWeight, setFontWeight] = useState('normal');
  const [isPublic, setIsPublic] = useState(false);

  const aspectRatios: Array<{ value: '1:1' | '4:5' | '16:9' | '9:16'; label: string }> = [
    { value: '1:1', label: 'Square (1:1)' },
    { value: '4:5', label: 'Portrait (4:5)' },
    { value: '16:9', label: 'Landscape (16:9)' },
    { value: '9:16', label: 'Story (9:16)' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !stylePrompt.trim()) {
      toast({
        title: 'Missing Fields',
        description: 'Please provide a name and style prompt',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const presetData: Omit<
        StylePreset,
        'id' | 'tenantId' | 'category' | 'usageCount' | 'createdAt' | 'updatedAt'
      > = {
        name,
        description,
        stylePrompt,
        negativePrompt: negativePrompt || undefined,
        aspectRatios: selectedAspectRatios,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        colorPalette: showColorPalette
          ? { primary: primaryColor, secondary: secondaryColor, accent: accentColor }
          : undefined,
        typography: showTypography
          ? {
              fontFamily,
              fontSize: fontSize as 'small' | 'medium' | 'large',
              fontWeight: fontWeight as 'light' | 'normal' | 'bold',
            }
          : undefined,
        isPublic,
      };

      const result = await createStylePreset(tenantId, presetData);

      if (result.success && result.presetId) {
        toast({
          title: 'Preset Created',
          description: `"${name}" has been added to your style presets`,
        });
        onSuccess?.({ ...presetData, id: result.presetId, tenantId, category: 'custom', usageCount: 0 } as StylePreset);
        handleReset();
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Failed to create preset');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create preset',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName('');
    setDescription('');
    setStylePrompt('');
    setNegativePrompt('');
    setSelectedAspectRatios(['1:1']);
    setTags('');
    setShowColorPalette(false);
    setShowTypography(false);
    setIsPublic(false);
  };

  const toggleAspectRatio = (ratio: '1:1' | '4:5' | '16:9' | '9:16') => {
    if (selectedAspectRatios.includes(ratio)) {
      setSelectedAspectRatios(selectedAspectRatios.filter((r) => r !== ratio));
    } else {
      setSelectedAspectRatios([...selectedAspectRatios, ratio]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Style Preset</DialogTitle>
          <DialogDescription>
            Define a reusable style preset for consistent media generation
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Luxury Cannabis"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this style"
              />
            </div>

            <div>
              <Label htmlFor="stylePrompt">Style Prompt *</Label>
              <Textarea
                id="stylePrompt"
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                placeholder="luxury product photography, cannabis bud, premium aesthetic, soft lighting, high-end, elegant composition..."
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Describe the visual style, composition, lighting, and aesthetic you want
              </p>
            </div>

            <div>
              <Label htmlFor="negativePrompt">Negative Prompt (Optional)</Label>
              <Textarea
                id="negativePrompt"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, low quality, cluttered, busy, amateur..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">
                What to avoid in the generated images
              </p>
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="luxury, premium, elegant, professional"
              />
            </div>
          </div>

          {/* Aspect Ratios */}
          <div className="space-y-2">
            <Label>Aspect Ratios</Label>
            <div className="flex flex-wrap gap-2">
              {aspectRatios.map((ratio) => (
                <Button
                  key={ratio.value}
                  type="button"
                  variant={selectedAspectRatios.includes(ratio.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleAspectRatio(ratio.value)}
                >
                  {ratio.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Optional: Color Palette */}
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <Label htmlFor="colorPalette" className="cursor-pointer">
                  Add Color Palette (Optional)
                </Label>
              </div>
              <Checkbox
                id="colorPalette"
                checked={showColorPalette}
                onCheckedChange={(checked) => setShowColorPalette(checked as boolean)}
              />
            </div>

            {showColorPalette && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <Label htmlFor="primaryColor" className="text-xs">Primary</Label>
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="secondaryColor" className="text-xs">Secondary</Label>
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="accentColor" className="text-xs">Accent</Label>
                  <Input
                    id="accentColor"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Optional: Typography */}
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                <Label htmlFor="typography" className="cursor-pointer">
                  Add Typography (Optional)
                </Label>
              </div>
              <Checkbox
                id="typography"
                checked={showTypography}
                onCheckedChange={(checked) => setShowTypography(checked as boolean)}
              />
            </div>

            {showTypography && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <Label htmlFor="fontFamily" className="text-xs">Font Family</Label>
                  <Input
                    id="fontFamily"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    placeholder="Inter"
                  />
                </div>
                <div>
                  <Label htmlFor="fontSize" className="text-xs">Size</Label>
                  <select
                    id="fontSize"
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="fontWeight" className="text-xs">Weight</Label>
                  <select
                    id="fontWeight"
                    value={fontWeight}
                    onChange={(e) => setFontWeight(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="light">Light</option>
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Public Sharing */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublic"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked as boolean)}
            />
            <Label htmlFor="isPublic" className="cursor-pointer text-sm">
              Make this preset publicly available to other users
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Preset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
