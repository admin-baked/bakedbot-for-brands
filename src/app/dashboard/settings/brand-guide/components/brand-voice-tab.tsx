/**
 * Brand Voice Tab
 *
 * Manage brand voice: personality, tone, vocabulary, writing style.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, X, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateBrandGuide, analyzeBrandVoice, suggestVocabularyTerms, generateSampleContent } from '@/server/actions/brand-guide';
import { useToast } from '@/hooks/use-toast';
import type { BrandGuide, BrandVoice, BrandPersonalityTrait, BrandTone, BrandWritingStyle } from '@/types/brand-guide';

interface BrandVoiceTabProps {
  brandId: string;
  brandGuide: BrandGuide;
  onUpdate: (updates: Partial<BrandGuide>) => void;
}

const PERSONALITY_TRAITS: BrandPersonalityTrait[] = [
  'Friendly',
  'Professional',
  'Playful',
  'Sophisticated',
  'Educational',
  'Trustworthy',
  'Innovative',
  'Authentic',
  'Empowering',
  'Wellness-focused',
];

const TONES: BrandTone[] = [
  'professional',
  'casual',
  'playful',
  'sophisticated',
  'educational',
  'empathetic',
  'authoritative',
];

const DEFAULT_WRITING_STYLE: BrandWritingStyle = {
  sentenceLength: 'medium',
  paragraphLength: 'moderate',
  useEmojis: false,
  useExclamation: false,
  useQuestions: false,
  useHumor: false,
  formalityLevel: 3,
  complexity: 'moderate',
  perspective: 'second-person',
};

function normalizeVoice(v: BrandVoice | undefined | null): BrandVoice {
  const raw = (v ?? {}) as Partial<BrandVoice>;
  const vocab = (raw.vocabulary ?? {}) as Partial<BrandVoice['vocabulary']>;
  return {
    personality: raw.personality ?? [],
    tone: raw.tone ?? 'professional',
    vocabulary: {
      preferred: vocab.preferred ?? [],
      avoid: vocab.avoid ?? [],
      cannabisTerms: vocab.cannabisTerms ?? [],
      ...vocab,
    },
    writingStyle: { ...DEFAULT_WRITING_STYLE, ...(raw.writingStyle ?? {}) },
    sampleContent: raw.sampleContent ?? [],
    ...(raw.subTones ? { subTones: raw.subTones } : {}),
    ...(raw.voiceAnalysis ? { voiceAnalysis: raw.voiceAnalysis } : {}),
  };
}

export function BrandVoiceTab({ brandId, brandGuide, onUpdate }: BrandVoiceTabProps) {
  const [voice, setVoice] = useState<BrandVoice>(normalizeVoice(brandGuide.voice));
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestingTerms, setSuggestingTerms] = useState(false);
  const [generatingSamples, setGeneratingSamples] = useState(false);
  const [contentSample, setContentSample] = useState('');
  const { toast } = useToast();

  const handleAnalyzeVoice = async () => {
    if (!contentSample.trim()) {
      toast({
        title: 'Content Required',
        description: 'Please provide a content sample to analyze.',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(true);

    try {
      const result = await analyzeBrandVoice(brandId, [
        { type: 'website', text: contentSample },
      ]);

      if (!result.success || !result.voice) {
        throw new Error(result.error || 'Failed to analyze voice');
      }

      setVoice(result.voice);

      toast({
        title: 'Voice Analyzed',
        description: 'Your content has been analyzed. Review and save the results.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to analyze voice',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const result = await updateBrandGuide({
        brandId,
        updates: { voice },
        createVersion: true,
        reason: 'Updated brand voice',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update voice');
      }

      toast({
        title: 'Brand Voice Updated',
        description: 'Your brand voice has been saved successfully.',
      });

      onUpdate({ voice });
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

  const handleSuggestTerms = async () => {
    setSuggestingTerms(true);
    try {
      const result = await suggestVocabularyTerms(brandId);
      if (!result.success) throw new Error(result.error || 'Suggestion failed');
      setVoice((prev) => ({
        ...prev,
        vocabulary: {
          ...prev.vocabulary,
          preferred: prev.vocabulary.preferred.length === 0
            ? (result.preferred?.map((p) => ({ term: p.term, instead: p.instead, context: '' })) ?? prev.vocabulary.preferred)
            : [...prev.vocabulary.preferred, ...(result.preferred?.map((p) => ({ term: p.term, instead: p.instead, context: '' })) ?? [])],
          avoid: prev.vocabulary.avoid.length === 0
            ? (result.avoid ?? prev.vocabulary.avoid)
            : [...prev.vocabulary.avoid, ...(result.avoid ?? [])],
        },
      }));
      toast({ title: 'Terms suggested', description: 'Cannabis industry terms added based on your brand archetype and tone. Remove any that don\'t fit.' });
    } catch (err) {
      toast({ title: 'Suggestion failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSuggestingTerms(false);
    }
  };

  const togglePersonalityTrait = (trait: BrandPersonalityTrait) => {
    const updated = voice.personality.includes(trait)
      ? voice.personality.filter((t) => t !== trait)
      : [...voice.personality, trait];
    setVoice({ ...voice, personality: updated });
  };

  const addPreferredTerm = () => {
    setVoice({
      ...voice,
      vocabulary: {
        ...voice.vocabulary,
        preferred: [...voice.vocabulary.preferred, { term: '', instead: '', context: '' }],
      },
    });
  };

  const removePreferredTerm = (index: number) => {
    setVoice({
      ...voice,
      vocabulary: {
        ...voice.vocabulary,
        preferred: voice.vocabulary.preferred.filter((_, i) => i !== index),
      },
    });
  };

  const addAvoidTerm = () => {
    setVoice({
      ...voice,
      vocabulary: {
        ...voice.vocabulary,
        avoid: [...voice.vocabulary.avoid, { term: '', reason: '' }],
      },
    });
  };

  const removeAvoidTerm = (index: number) => {
    setVoice({
      ...voice,
      vocabulary: {
        ...voice.vocabulary,
        avoid: voice.vocabulary.avoid.filter((_, i) => i !== index),
      },
    });
  };

  const handleGenerateSamples = async () => {
    setGeneratingSamples(true);
    try {
      const result = await generateSampleContent(brandId);
      if (!result.success || !result.samples) throw new Error(result.error || 'Generation failed');
      setVoice(prev => ({ ...prev, sampleContent: result.samples! }));
      toast({ title: 'Sample content generated', description: 'Review the posts below and save when ready.' });
    } catch (err) {
      toast({ title: 'Generation failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setGeneratingSamples(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Voice Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Voice Analysis
          </CardTitle>
          <CardDescription>
            Paste a content sample to automatically analyze your brand voice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="content-sample">Content Sample</Label>
            <Textarea
              id="content-sample"
              value={contentSample}
              onChange={(e) => setContentSample(e.target.value)}
              placeholder="Paste a blog post, social media caption, or other brand content..."
              rows={5}
            />
          </div>
          <Button onClick={handleAnalyzeVoice} disabled={analyzing}>
            {analyzing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Analyze Voice
          </Button>
        </CardContent>
      </Card>

      {/* Personality Traits */}
      <Card>
        <CardHeader>
          <CardTitle>Personality Traits</CardTitle>
          <CardDescription>Select 3-5 traits that define your brand personality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {PERSONALITY_TRAITS.map((trait) => (
              <div key={trait} className="flex items-center space-x-2">
                <Checkbox
                  id={trait}
                  checked={voice.personality.includes(trait)}
                  onCheckedChange={() => togglePersonalityTrait(trait)}
                />
                <Label htmlFor={trait} className="cursor-pointer font-normal">
                  {trait}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tone */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Tone</CardTitle>
          <CardDescription>Select the overall tone for your brand communications</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={voice.tone} onValueChange={(value) => setVoice({ ...voice, tone: value as BrandTone })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((tone) => (
                <SelectItem key={tone} value={tone}>
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Vocabulary - Preferred Terms */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Vocabulary - Preferred Terms</CardTitle>
              <CardDescription>Define terms to use instead of alternatives</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleSuggestTerms} disabled={suggestingTerms} className="shrink-0">
              {suggestingTerms ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Suggest Terms
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {voice.vocabulary.preferred.map((pref, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={pref.term}
                onChange={(e) => {
                  const updated = [...voice.vocabulary.preferred];
                  updated[index] = { ...updated[index], term: e.target.value };
                  setVoice({ ...voice, vocabulary: { ...voice.vocabulary, preferred: updated } });
                }}
                placeholder="Use this term"
              />
              <Input
                value={pref.instead}
                onChange={(e) => {
                  const updated = [...voice.vocabulary.preferred];
                  updated[index] = { ...updated[index], instead: e.target.value };
                  setVoice({ ...voice, vocabulary: { ...voice.vocabulary, preferred: updated } });
                }}
                placeholder="Instead of this"
              />
              <Button variant="outline" size="icon" onClick={() => removePreferredTerm(index)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addPreferredTerm}>
            <Plus className="w-4 h-4 mr-2" />
            Add Preferred Term
          </Button>
        </CardContent>
      </Card>

      {/* Vocabulary - Avoid Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Vocabulary - Terms to Avoid</CardTitle>
          <CardDescription>
            Define terms that should not be used in brand communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {voice.vocabulary.avoid.map((avoid, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={avoid.term}
                onChange={(e) => {
                  const updated = [...voice.vocabulary.avoid];
                  updated[index] = { ...updated[index], term: e.target.value };
                  setVoice({ ...voice, vocabulary: { ...voice.vocabulary, avoid: updated } });
                }}
                placeholder="Term to avoid"
              />
              <Input
                value={avoid.reason}
                onChange={(e) => {
                  const updated = [...voice.vocabulary.avoid];
                  updated[index] = { ...updated[index], reason: e.target.value };
                  setVoice({ ...voice, vocabulary: { ...voice.vocabulary, avoid: updated } });
                }}
                placeholder="Reason"
              />
              <Button variant="outline" size="icon" onClick={() => removeAvoidTerm(index)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addAvoidTerm}>
            <Plus className="w-4 h-4 mr-2" />
            Add Term to Avoid
          </Button>
        </CardContent>
      </Card>

      {/* Writing Style */}
      <Card>
        <CardHeader>
          <CardTitle>Writing Style</CardTitle>
          <CardDescription>Define your brand writing preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sentence Length</Label>
              <Select
                value={voice.writingStyle.sentenceLength}
                onValueChange={(value) =>
                  setVoice({
                    ...voice,
                    writingStyle: {
                      ...voice.writingStyle,
                      sentenceLength: value as 'short' | 'medium' | 'long' | 'varied',
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="varied">Varied</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Complexity</Label>
              <Select
                value={voice.writingStyle.complexity}
                onValueChange={(value) =>
                  setVoice({
                    ...voice,
                    writingStyle: {
                      ...voice.writingStyle,
                      complexity: value as 'simple' | 'moderate' | 'advanced',
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-emojis"
                checked={voice.writingStyle.useEmojis}
                onCheckedChange={(checked) =>
                  setVoice({
                    ...voice,
                    writingStyle: { ...voice.writingStyle, useEmojis: checked === true },
                  })
                }
              />
              <Label htmlFor="use-emojis" className="cursor-pointer font-normal">
                Use Emojis
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-humor"
                checked={voice.writingStyle.useHumor}
                onCheckedChange={(checked) =>
                  setVoice({
                    ...voice,
                    writingStyle: { ...voice.writingStyle, useHumor: checked === true },
                  })
                }
              />
              <Label htmlFor="use-humor" className="cursor-pointer font-normal">
                Use Humor
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-questions"
                checked={voice.writingStyle.useQuestions}
                onCheckedChange={(checked) =>
                  setVoice({
                    ...voice,
                    writingStyle: { ...voice.writingStyle, useQuestions: checked === true },
                  })
                }
              />
              <Label htmlFor="use-questions" className="cursor-pointer font-normal">
                Use Questions
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Content */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Sample Content</CardTitle>
            <CardDescription>Example posts in your brand voice — required for 100% completeness</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleGenerateSamples} disabled={generatingSamples} className="shrink-0">
            {generatingSamples ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Samples
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {voice.sampleContent && voice.sampleContent.length > 0 ? (
            voice.sampleContent.map((s, i) => (
              <div key={i} className="space-y-1">
                <Badge variant="outline" className="text-xs capitalize">{s.type.replace(/_/g, ' ')}</Badge>
                <Textarea
                  value={s.text}
                  onChange={e => {
                    const updated = [...voice.sampleContent];
                    updated[i] = { ...updated[i], text: e.target.value };
                    setVoice({ ...voice, sampleContent: updated });
                  }}
                  rows={3}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No samples yet — click Generate Samples to create branded example posts.</p>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setVoice(normalizeVoice(brandGuide.voice))}>
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
