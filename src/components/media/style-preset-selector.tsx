'use client';

/**
 * Style Preset Selector Component
 *
 * Allows users to select from built-in or custom style presets when generating media.
 * Features:
 * - Gallery view of built-in presets (8 options)
 * - Custom preset creation
 * - Preview of preset styles
 * - Usage tracking
 */

import { useState, useEffect } from 'react';
import { StylePreset } from '@/types/media-generation';
import { getStylePresets, trackPresetUsage } from '@/server/actions/style-presets';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Star, TrendingUp, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StylePresetSelectorProps {
  tenantId: string;
  selectedPresetId?: string;
  onSelect: (preset: StylePreset) => void;
  onCreateCustom?: () => void;
}

export function StylePresetSelector({
  tenantId,
  selectedPresetId,
  onSelect,
  onCreateCustom,
}: StylePresetSelectorProps) {
  const [presets, setPresets] = useState<StylePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'built-in' | 'custom'>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadPresets();
  }, [tenantId]);

  const loadPresets = async () => {
    try {
      setLoading(true);
      const data = await getStylePresets(tenantId);
      setPresets(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load style presets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = async (preset: StylePreset) => {
    // Track usage
    await trackPresetUsage(tenantId, preset.id);
    onSelect(preset);
  };

  const filteredPresets = presets.filter((p) => {
    if (activeTab === 'built-in') return p.category === 'built-in';
    if (activeTab === 'custom') return p.category === 'custom';
    return true;
  });

  const builtInPresets = presets.filter((p) => p.category === 'built-in');
  const customPresets = presets.filter((p) => p.category === 'custom');

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-full" />
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Style Presets</h3>
          <p className="text-sm text-muted-foreground">
            Choose a style preset for consistent branding across all your media
          </p>
        </div>
        {onCreateCustom && (
          <Button onClick={onCreateCustom} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Custom
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="all">
            All ({presets.length})
          </TabsTrigger>
          <TabsTrigger value="built-in">
            Built-in ({builtInPresets.length})
          </TabsTrigger>
          <TabsTrigger value="custom">
            Custom ({customPresets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredPresets.map((preset) => (
              <Card
                key={preset.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedPresetId === preset.id
                    ? 'ring-2 ring-primary shadow-lg'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleSelectPreset(preset)}
              >
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {preset.name}
                      {preset.category === 'built-in' && (
                        <Sparkles className="w-3 h-3 text-primary" />
                      )}
                    </CardTitle>
                    {selectedPresetId === preset.id && (
                      <Star className="w-4 h-4 text-primary fill-primary" />
                    )}
                  </div>
                  <CardDescription className="text-xs line-clamp-2">
                    {preset.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Color Palette Preview */}
                  {preset.colorPalette && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Colors</p>
                      <div className="flex gap-1">
                        <div
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: preset.colorPalette.primary }}
                          title="Primary"
                        />
                        <div
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: preset.colorPalette.secondary }}
                          title="Secondary"
                        />
                        <div
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: preset.colorPalette.accent }}
                          title="Accent"
                        />
                      </div>
                    </div>
                  )}

                  {/* Typography Preview */}
                  {preset.typography && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Typography</p>
                      <p className="text-xs" style={{ fontFamily: preset.typography.fontFamily }}>
                        {preset.typography.fontFamily}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {preset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {preset.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {preset.tags.length > 3 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          +{preset.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="text-xs text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" />
                  Used {preset.usageCount || 0} times
                </CardFooter>
              </Card>
            ))}
          </div>

          {filteredPresets.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {activeTab === 'custom'
                  ? 'No custom presets yet. Create your first one!'
                  : 'No presets found'}
              </p>
              {activeTab === 'custom' && onCreateCustom && (
                <Button onClick={onCreateCustom} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Custom Preset
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
