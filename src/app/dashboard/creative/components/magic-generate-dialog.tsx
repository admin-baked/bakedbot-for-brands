/**
 * Magic Generate Dialog
 *
 * Smart AI generation dialog with brand guide integration,
 * memory-powered suggestions, and template selection
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Wand2,
  ChevronRight,
  Zap,
  Brain,
  AlertCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SocialPlatform } from '@/types/creative-content';
import type { AssetTemplate } from '@/types/creative-asset';
import type { BrandGuide } from '@/types/brand-guide';
import { useBrandColors, useBrandVoice } from '@/hooks/use-brand-guide';
import { usePromptSuggestions } from '@/hooks/use-creative-memory';
import type { UseCreativeMemoryReturn } from '@/hooks/use-creative-memory';

interface MagicGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: AssetTemplate | null;
  platform: SocialPlatform;
  brandGuide: BrandGuide | null;
  memory: UseCreativeMemoryReturn;
  onGenerate: (params: GenerateParams) => void;
}

export interface GenerateParams {
  templateId: string;
  platform: SocialPlatform;
  prompt: string;
  tone: string;
  style?: string;
  includeCompliance: boolean;
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', icon: '💼' },
  { value: 'friendly', label: 'Friendly', icon: '😊' },
  { value: 'playful', label: 'Playful', icon: '🎉' },
  { value: 'educational', label: 'Educational', icon: '📚' },
  { value: 'hype', label: 'Hype', icon: '🔥' },
  { value: 'chill', label: 'Chill', icon: '😌' },
];

const STYLE_OPTIONS = [
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'bold', label: 'Bold & Vibrant' },
  { value: 'modern', label: 'Modern' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'organic', label: 'Organic/Natural' },
  { value: 'luxury', label: 'Luxury' },
];

export function MagicGenerateDialog({
  open,
  onOpenChange,
  template,
  platform,
  brandGuide,
  memory,
  onGenerate,
}: MagicGenerateDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('friendly');
  const [style, setStyle] = useState('modern');
  const [includeCompliance, setIncludeCompliance] = useState(true);
  const [generating, setGenerating] = useState(false);

  const brandColors = useBrandColors(brandGuide);
  const brandVoice = useBrandVoice(brandGuide);
  const promptSuggestions = usePromptSuggestions(template, brandGuide, memory);

  // Auto-fill from brand guide and memory when dialog opens
  useEffect(() => {
    if (open && template) {
      // Get suggested tone from memory or brand guide
      const suggestedTone = memory.getSuggestedTone(platform) || brandVoice.tone;
      setTone(suggestedTone);

      // Get suggested prompt from memory
      const suggestedPrompt = memory.getSuggestedPrompt(template.id);
      if (suggestedPrompt) {
        setPrompt(suggestedPrompt);
      }

      // Auto-enable compliance for high-compliance templates
      if (template.complianceLevel === 'high' || template.complianceLevel === 'educational') {
        setIncludeCompliance(true);
      }
    }
  }, [open, template, platform, brandGuide, memory, brandVoice]);

  const handleGenerate = async () => {
    if (!template || !prompt.trim()) return;

    setGenerating(true);

    try {
      // Record this generation attempt in memory
      await memory.recordGeneration({
        templateId: template.id,
        platform,
        prompt,
        tone,
        approved: false, // Will be updated later
      });

      await memory.recordTemplateUse(template.id);

      // Call parent's generate function
      onGenerate({
        templateId: template.id,
        platform,
        prompt: prompt.trim(),
        tone,
        style,
        includeCompliance,
      });

      // Close dialog after successful generation
      onOpenChange(false);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-baked-green to-green-600 flex items-center justify-center">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Magic Generate</DialogTitle>
              <DialogDescription>
                AI-powered creation with your brand guide
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Template Info */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
            <Badge variant="outline" className="capitalize">
              {platform}
            </Badge>
          </div>

          {/* Template Metadata */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="w-3 h-3" />
              <span>~{template.generationTime}s</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <DollarSign className="w-3 h-3" />
              <span>${template.estimatedCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Sparkles className="w-3 h-3" />
              <span className="uppercase">{template.format}</span>
            </div>
          </div>
        </div>

        {/* Brand Guide Preview */}
        {brandGuide && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-baked-green" />
              <span className="font-bold text-sm text-gray-900">Using Your Brand Guide</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <div
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: brandColors.primary }}
                  title="Primary Color"
                />
                <div
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: brandColors.secondary }}
                  title="Secondary Color"
                />
                <div
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: brandColors.accent }}
                  title="Accent Color"
                />
              </div>
              <div className="text-xs text-gray-600">
                <span className="font-semibold">{brandGuide.brandName}</span> •{' '}
                <span className="capitalize">{brandVoice.tone}</span> tone
              </div>
            </div>
          </div>
        )}

        {/* Prompt Input */}
        <div className="space-y-3">
          <Label htmlFor="prompt" className="text-sm font-bold">
            What do you want to create?
          </Label>
          <Textarea
            id="prompt"
            placeholder="Describe what you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none"
          />

          {/* Prompt Suggestions */}
          {promptSuggestions.length > 0 && !prompt && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">Suggested prompts:</p>
              <div className="flex flex-wrap gap-2">
                {promptSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPrompt(suggestion)}
                    className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-baked-green hover:bg-green-50 transition text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tone Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-bold">Tone</Label>
          <div className="grid grid-cols-3 gap-2">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setTone(option.value)}
                className={cn(
                  'px-4 py-3 rounded-lg border-2 transition flex items-center gap-2 justify-center',
                  tone === option.value
                    ? 'border-baked-green bg-green-50 text-baked-green'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <span>{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Style Selection */}
        <div className="space-y-3">
          <Label htmlFor="style" className="text-sm font-bold">
            Visual Style
          </Label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STYLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Compliance Toggle */}
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <input
            type="checkbox"
            id="compliance"
            checked={includeCompliance}
            onChange={(e) => setIncludeCompliance(e.target.checked)}
            className="mt-1"
          />
          <div className="flex-1">
            <label htmlFor="compliance" className="font-bold text-sm text-gray-900 cursor-pointer">
              Include compliance disclaimers
            </label>
            <p className="text-xs text-gray-600 mt-1">
              Automatically adds state-required disclaimers and warnings
              {brandGuide?.compliance?.primaryState && ` for ${brandGuide.compliance.primaryState}`}
            </p>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={generating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
            className="flex-1 bg-gradient-to-r from-baked-green to-green-600 hover:from-baked-green/90 hover:to-green-600/90 text-white"
          >
            {generating ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Generate Now
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
