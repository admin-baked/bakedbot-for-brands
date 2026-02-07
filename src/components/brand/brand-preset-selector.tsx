/**
 * Brand Preset Selector - Inline Component
 *
 * Lightweight, reusable brand preset selector for use in content generation,
 * inbox, and other features where brand guidelines need to be applied.
 *
 * Features:
 * - Quick brand preset selection
 * - Live preview of colors and voice
 * - Compact inline design
 * - Callback for preset changes
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Palette, MessageSquare, Settings, Sparkles } from 'lucide-react';
import { getBrandGuide, getBrandGuidesList } from '@/server/actions/brand-guide';
import type { BrandGuide } from '@/types/brand-guide';

interface BrandPresetSelectorProps {
  brandId: string;
  selectedPresetId?: string;
  onPresetChange?: (preset: BrandGuide) => void;
  showPreview?: boolean;
  compact?: boolean;
}

interface BrandGuideSummary {
  id: string;
  brandName: string;
  status: string;
  completenessScore: number;
}

export function BrandPresetSelector({
  brandId,
  selectedPresetId,
  onPresetChange,
  showPreview = true,
  compact = false,
}: BrandPresetSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [presets, setPresets] = useState<BrandGuideSummary[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<BrandGuide | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(selectedPresetId);

  // Load available brand guides
  useEffect(() => {
    loadPresets();
  }, [brandId]);

  // Load selected preset details when selection changes
  useEffect(() => {
    if (selectedId) {
      loadPresetDetails(selectedId);
    }
  }, [selectedId]);

  const loadPresets = async () => {
    setLoading(true);
    try {
      // Get list of brand guides for this brand
      const result = await getBrandGuidesList(brandId);
      if (result.success && result.guides) {
        setPresets(result.guides as BrandGuideSummary[]);

        // Auto-select first active preset if none selected
        if (!selectedId && result.guides.length > 0) {
          const activePreset = result.guides.find((g: any) => g.status === 'active') || result.guides[0];
          setSelectedId(activePreset.id);
        }
      }
    } catch (error) {
      console.error('Failed to load brand presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPresetDetails = async (presetId: string) => {
    try {
      const result = await getBrandGuide(presetId);
      if (result.success && result.brandGuide) {
        setSelectedPreset(result.brandGuide);
        if (onPresetChange) {
          onPresetChange(result.brandGuide);
        }
      }
    } catch (error) {
      console.error('Failed to load preset details:', error);
    }
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedId(presetId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (presets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="text-center text-sm text-muted-foreground">
            <Sparkles className="w-5 h-5 mx-auto mb-2" />
            <p>No brand presets yet.</p>
            <Button variant="link" size="sm" className="mt-1" asChild>
              <a href="/dashboard/settings/brand-guide">Create Brand Guide</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-sm whitespace-nowrap">Brand:</Label>
        <Select value={selectedId} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select brand preset..." />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                <div className="flex items-center gap-2">
                  <span>{preset.brandName}</span>
                  {preset.status === 'active' && (
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Preset Selector */}
        <div>
          <Label htmlFor="brand-preset">Brand Preset</Label>
          <Select value={selectedId} onValueChange={handlePresetChange}>
            <SelectTrigger id="brand-preset">
              <SelectValue placeholder="Select a brand preset..." />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{preset.brandName}</span>
                    <div className="flex items-center gap-2 ml-4">
                      {preset.status === 'active' && <Badge variant="default" className="text-xs">Active</Badge>}
                      {preset.completenessScore < 100 && (
                        <span className="text-xs text-muted-foreground">
                          {preset.completenessScore}%
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        {showPreview && selectedPreset && (
          <div className="space-y-3 pt-2 border-t">
            {/* Color Preview */}
            <div className="flex items-start gap-3">
              <Palette className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Colors</p>
                <div className="flex gap-2">
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: selectedPreset.visualIdentity.colors.primary.hex }}
                    title="Primary"
                  />
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: selectedPreset.visualIdentity.colors.secondary.hex }}
                    title="Secondary"
                  />
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: selectedPreset.visualIdentity.colors.accent.hex }}
                    title="Accent"
                  />
                </div>
              </div>
            </div>

            {/* Voice Preview */}
            <div className="flex items-start gap-3">
              <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Voice</p>
                <div className="flex flex-wrap gap-1">
                  {selectedPreset.voice.personality.slice(0, 3).map((trait) => (
                    <Badge key={trait} variant="secondary" className="text-xs">
                      {trait}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-xs">
                    {selectedPreset.voice.tone}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Edit Link */}
            <div className="flex justify-end pt-2">
              <Button variant="ghost" size="sm" asChild>
                <a href="/dashboard/settings/brand-guide" className="flex items-center gap-1">
                  <Settings className="w-3 h-3" />
                  Edit Brand Guide
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
