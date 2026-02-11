'use client';

/**
 * A/B Test Creation Wizard
 *
 * Multi-step wizard for creating media A/B tests:
 * 1. Basic Info: Name, description, base prompt
 * 2. Variants: Multiple style variations to test
 * 3. Audience Split: Traffic distribution
 * 4. Metrics: What to track
 */

import { useState } from 'react';
import { MediaABTest, StylePreset } from '@/types/media-generation';
import { createMediaABTest } from '@/server/actions/style-presets';
import { getStylePresets } from '@/server/actions/style-presets';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ABTestWizardProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (test: MediaABTest) => void;
}

interface Variant {
  id: string;
  name: string;
  stylePresetId?: string;
  customPrompt?: string;
}

export function ABTestWizard({ tenantId, open, onOpenChange, onSuccess }: ABTestWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [presets, setPresets] = useState<StylePreset[]>([]);
  const { toast } = useToast();

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrompt, setBasePrompt] = useState('');

  // Step 2: Variants
  const [variants, setVariants] = useState<Variant[]>([
    { id: crypto.randomUUID(), name: 'Variant A', stylePresetId: undefined, customPrompt: '' },
    { id: crypto.randomUUID(), name: 'Variant B', stylePresetId: undefined, customPrompt: '' },
  ]);

  // Step 3: Audience Split
  const [audienceSplit, setAudienceSplit] = useState<Record<string, number>>({});

  // Step 4: Metrics
  const [selectedMetrics, setSelectedMetrics] = useState<
    Array<'impressions' | 'clicks' | 'conversions' | 'engagement' | 'cost'>
  >(['impressions', 'clicks', 'conversions']);

  const availableMetrics: Array<{
    value: 'impressions' | 'clicks' | 'conversions' | 'engagement' | 'cost';
    label: string;
    description: string;
  }> = [
    { value: 'impressions', label: 'Impressions', description: 'Number of times shown' },
    { value: 'clicks', label: 'Clicks', description: 'Click-through rate' },
    { value: 'conversions', label: 'Conversions', description: 'Conversion rate' },
    { value: 'engagement', label: 'Engagement', description: 'Likes, shares, comments' },
    { value: 'cost', label: 'Cost', description: 'Cost per result' },
  ];

  const loadPresets = async () => {
    try {
      const data = await getStylePresets(tenantId);
      setPresets(data);
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const handleNext = () => {
    if (step === 1 && (!name.trim() || !basePrompt.trim())) {
      toast({
        title: 'Missing Fields',
        description: 'Please provide a name and base prompt',
        variant: 'destructive',
      });
      return;
    }
    if (step === 2 && variants.length < 2) {
      toast({
        title: 'Not Enough Variants',
        description: 'You need at least 2 variants to run an A/B test',
        variant: 'destructive',
      });
      return;
    }
    if (step === 2 && variants.some((v) => !v.name.trim())) {
      toast({
        title: 'Missing Variant Names',
        description: 'All variants must have a name',
        variant: 'destructive',
      });
      return;
    }
    if (step === 2) {
      // Auto-calculate equal split
      const equalSplit = Math.floor(100 / variants.length);
      const remainder = 100 - equalSplit * variants.length;
      const split: Record<string, number> = {};
      variants.forEach((v, i) => {
        split[v.id] = i === 0 ? equalSplit + remainder : equalSplit;
      });
      setAudienceSplit(split);
    }
    if (step === 3) {
      const total = Object.values(audienceSplit).reduce((sum, val) => sum + val, 0);
      if (total !== 100) {
        toast({
          title: 'Invalid Split',
          description: 'Audience split must total 100%',
          variant: 'destructive',
        });
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const testData: Omit<MediaABTest, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> = {
        name,
        description,
        status: 'draft',
        basePrompt,
        variants: variants.map((v) => ({
          id: v.id,
          name: v.name,
          stylePresetId: v.stylePresetId,
          customPrompt: v.customPrompt,
          mediaUrl: undefined,
        })),
        audienceSplit,
        metrics: selectedMetrics,
        startDate: undefined,
        endDate: undefined,
      };

      const result = await createMediaABTest(tenantId, testData);

      if (result.success && result.testId) {
        toast({
          title: 'A/B Test Created',
          description: `"${name}" is ready to start. Generate media for each variant to begin testing.`,
        });
        onSuccess?.({ ...testData, id: result.testId, tenantId } as MediaABTest);
        handleReset();
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Failed to create test');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create test',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setName('');
    setDescription('');
    setBasePrompt('');
    setVariants([
      { id: crypto.randomUUID(), name: 'Variant A', stylePresetId: undefined, customPrompt: '' },
      { id: crypto.randomUUID(), name: 'Variant B', stylePresetId: undefined, customPrompt: '' },
    ]);
    setAudienceSplit({});
    setSelectedMetrics(['impressions', 'clicks', 'conversions']);
  };

  const addVariant = () => {
    setVariants([
      ...variants,
      {
        id: crypto.randomUUID(),
        name: `Variant ${String.fromCharCode(65 + variants.length)}`,
        stylePresetId: undefined,
        customPrompt: '',
      },
    ]);
  };

  const removeVariant = (id: string) => {
    if (variants.length <= 2) {
      toast({
        title: 'Cannot Remove',
        description: 'You need at least 2 variants',
        variant: 'destructive',
      });
      return;
    }
    setVariants(variants.filter((v) => v.id !== id));
  };

  const updateVariant = (id: string, updates: Partial<Variant>) => {
    setVariants(variants.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  };

  const toggleMetric = (metric: (typeof availableMetrics)[0]['value']) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(selectedMetrics.filter((m) => m !== metric));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create A/B Test</DialogTitle>
          <DialogDescription>
            Test different style variations to find what works best
          </DialogDescription>
          <div className="flex items-center gap-2 pt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            Step {step} of 4:{' '}
            {step === 1 && 'Basic Info'}
            {step === 2 && 'Variants'}
            {step === 3 && 'Audience Split'}
            {step === 4 && 'Metrics'}
          </p>
        </DialogHeader>

        <div className="py-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Test Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Product Photography Style Test"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you testing?"
                />
              </div>

              <div>
                <Label htmlFor="basePrompt">Base Prompt *</Label>
                <Textarea
                  id="basePrompt"
                  value={basePrompt}
                  onChange={(e) => setBasePrompt(e.target.value)}
                  placeholder="cannabis product, professional photography..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This prompt will be used for all variants (style variations will be applied on top)
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Variants */}
          {step === 2 && (
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <Card key={variant.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{variant.name}</CardTitle>
                      {variants.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariant(variant.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor={`variant-name-${index}`}>Variant Name</Label>
                      <Input
                        id={`variant-name-${index}`}
                        value={variant.name}
                        onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`variant-preset-${index}`}>Style Preset (Optional)</Label>
                      <Select
                        value={variant.stylePresetId || 'none'}
                        onValueChange={(value) =>
                          updateVariant(variant.id, {
                            stylePresetId: value === 'none' ? undefined : value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a preset" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No preset</SelectItem>
                          {presets.map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                              {preset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`variant-custom-${index}`}>Custom Prompt (Optional)</Label>
                      <Textarea
                        id={`variant-custom-${index}`}
                        value={variant.customPrompt || ''}
                        onChange={(e) =>
                          updateVariant(variant.id, { customPrompt: e.target.value })
                        }
                        placeholder="Additional style instructions..."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button type="button" variant="outline" onClick={addVariant} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Variant
              </Button>
            </div>
          )}

          {/* Step 3: Audience Split */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Distribute traffic across variants. Must total 100%.
              </p>
              {variants.map((variant) => (
                <div key={variant.id} className="flex items-center gap-4">
                  <Label className="flex-1">{variant.name}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={audienceSplit[variant.id] || 0}
                      onChange={(e) =>
                        setAudienceSplit({
                          ...audienceSplit,
                          [variant.id]: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20"
                    />
                    <span className="text-sm">%</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t">
                <p className="text-sm font-medium">
                  Total:{' '}
                  <span
                    className={
                      Object.values(audienceSplit).reduce((sum, val) => sum + val, 0) === 100
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {Object.values(audienceSplit).reduce((sum, val) => sum + val, 0)}%
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Metrics */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select which metrics to track for this test
              </p>
              <div className="grid grid-cols-1 gap-3">
                {availableMetrics.map((metric) => (
                  <Card
                    key={metric.value}
                    className={`cursor-pointer transition-all ${
                      selectedMetrics.includes(metric.value)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => toggleMetric(metric.value)}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <Checkbox
                        checked={selectedMetrics.includes(metric.value)}
                        onCheckedChange={() => toggleMetric(metric.value)}
                      />
                      <div>
                        <p className="font-medium">{metric.label}</p>
                        <p className="text-sm text-muted-foreground">{metric.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step < 4 ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Test
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
