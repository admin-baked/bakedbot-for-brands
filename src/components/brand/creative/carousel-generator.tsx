'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2, ImageIcon, Wand2, Check, AlertCircle } from 'lucide-react';
import { HeroCarousel } from '@/components/demo/hero-carousel';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface CarouselSlide {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  ctaText?: string;
  ctaLink?: string;
  image?: string;
  backgroundColor?: string;
}

interface CarouselGeneratorProps {
  brandId: string;
  brandName?: string;
  primaryColor?: string;
  onSave?: (slides: CarouselSlide[]) => Promise<void>;
}

type ImageTier = 'free' | 'paid';

export function CarouselGenerator({
  brandId,
  brandName = 'Your Brand',
  primaryColor = '#16a34a',
  onSave,
}: CarouselGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [slideCount, setSlideCount] = useState(3);
  const [tier, setTier] = useState<ImageTier>('free');
  const [generatedSlides, setGeneratedSlides] = useState<CarouselSlide[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a campaign theme or prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/creative/generate-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          prompt: prompt.trim(),
          slideCount,
          tier,
          brandName,
          primaryColor,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate carousel');
      }

      const data = await response.json();
      setGeneratedSlides(data.slides);
      setSuccess(`Generated ${data.slides.length} carousel slides!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate carousel');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!onSave || generatedSlides.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave(generatedSlides);
      setSuccess('Carousel saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save carousel');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Carousel Generator
          </CardTitle>
          <CardDescription>
            Create eye-catching hero slides for your brand menu homepage using AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prompt Input */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Campaign Theme / Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="e.g., 'Holiday sale with festive colors' or 'New product launch with premium feel' or 'Summer vibes beach theme'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Describe the theme, style, or promotion for your carousel slides.
            </p>
          </div>

          {/* Options Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slideCount">Number of Slides</Label>
              <Select
                value={String(slideCount)}
                onValueChange={(v) => setSlideCount(Number(v))}
              >
                <SelectTrigger id="slideCount">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Slides</SelectItem>
                  <SelectItem value="3">3 Slides</SelectItem>
                  <SelectItem value="4">4 Slides</SelectItem>
                  <SelectItem value="5">5 Slides</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier">Image Quality</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as ImageTier)}>
                <SelectTrigger id="tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Standard (Gemini 2.5 Flash)
                    </span>
                  </SelectItem>
                  <SelectItem value="paid">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      Premium (Gemini 3 Pro)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {tier === 'paid'
                  ? 'Higher quality images, slower generation'
                  : 'Fast generation, good quality'}
              </p>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-500 bg-green-50 text-green-800">
              <Check className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
            style={{ backgroundColor: primaryColor }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating {slideCount} slides...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Carousel
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      {generatedSlides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Preview your generated carousel. Click save to apply to your homepage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg overflow-hidden border">
              <HeroCarousel slides={generatedSlides} autoPlay={false} />
            </div>

            {onSave && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                variant="outline"
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Carousel
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
