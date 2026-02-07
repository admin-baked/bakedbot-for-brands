/**
 * A/B Testing Tab
 *
 * Create and manage A/B tests for brand voices.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Play, Pause, CheckCircle, TrendingUp, Eye, MousePointer, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BrandGuide, BrandVoice, BrandPersonalityTrait, BrandTone } from '@/types/brand-guide';

interface ABTestingTabProps {
  brandId: string;
  brandGuide: BrandGuide;
}

interface ABTest {
  id: string;
  testName: string;
  status: 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  variants: Array<{
    id: string;
    name: string;
    voice: BrandVoice;
    impressions: number;
    clicks: number;
    conversions: number;
    engagementScore: number;
  }>;
  results?: {
    winner?: string;
    confidence: number;
    metrics: any[];
  };
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

export function ABTestingTab({ brandId, brandGuide }: ABTestingTabProps) {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [testName, setTestName] = useState('');
  const [duration, setDuration] = useState('30');
  const [variantAName, setVariantAName] = useState('Variant A');
  const [variantBName, setVariantBName] = useState('Variant B');
  const [variantATone, setVariantATone] = useState<BrandTone>('professional');
  const [variantBTone, setVariantBTone] = useState<BrandTone>('casual');
  const { toast } = useToast();

  const handleCreateTest = async () => {
    if (!testName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a test name.',
        variant: 'destructive',
      });
      return;
    }

    // Create mock test (in production, call server action)
    const newTest: ABTest = {
      id: `test_${Date.now()}`,
      testName,
      status: 'running',
      startDate: new Date(),
      endDate: new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000),
      variants: [
        {
          id: 'variant_a',
          name: variantAName,
          voice: {
            ...brandGuide.voice,
            tone: variantATone,
          },
          impressions: 0,
          clicks: 0,
          conversions: 0,
          engagementScore: 0,
        },
        {
          id: 'variant_b',
          name: variantBName,
          voice: {
            ...brandGuide.voice,
            tone: variantBTone,
          },
          impressions: 0,
          clicks: 0,
          conversions: 0,
          engagementScore: 0,
        },
      ],
    };

    setTests([...tests, newTest]);
    setShowCreateDialog(false);
    setTestName('');

    toast({
      title: 'Test Created',
      description: `${testName} is now running`,
    });
  };

  const getStatusColor = (status: ABTest['status']) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: ABTest['status']) => {
    switch (status) {
      case 'running':
        return <Play className="w-3 h-3" />;
      case 'paused':
        return <Pause className="w-3 h-3" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const calculateCTR = (clicks: number, impressions: number) => {
    return impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
  };

  const calculateConversionRate = (conversions: number, clicks: number) => {
    return clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : '0.00';
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">A/B Tests</h2>
          <p className="text-muted-foreground">
            Test different brand voices to optimize engagement
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create A/B Test</DialogTitle>
              <DialogDescription>
                Test two brand voice variants to see which performs better
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="test-name">Test Name</Label>
                <Input
                  id="test-name"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g., Casual vs Professional Tone"
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                  max="90"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Variant A */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Variant A</h3>
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={variantAName}
                      onChange={(e) => setVariantAName(e.target.value)}
                      placeholder="Variant A"
                    />
                  </div>
                  <div>
                    <Label>Tone</Label>
                    <Select value={variantATone} onValueChange={(v) => setVariantATone(v as BrandTone)}>
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
                  </div>
                </div>

                {/* Variant B */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Variant B</h3>
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={variantBName}
                      onChange={(e) => setVariantBName(e.target.value)}
                      placeholder="Variant B"
                    />
                  </div>
                  <div>
                    <Label>Tone</Label>
                    <Select value={variantBTone} onValueChange={(v) => setVariantBTone(v as BrandTone)}>
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
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTest}>Create Test</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Tests */}
      {tests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Active Tests</h3>
            <p className="text-muted-foreground mb-4">
              Create your first A/B test to optimize your brand voice
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Test
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <Card key={test.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(test.status)}`} />
                    <CardTitle className="text-lg">{test.testName}</CardTitle>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getStatusIcon(test.status)}
                      {test.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {test.status === 'running' && test.endDate && (
                      <span>
                        Ends {new Date(test.endDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="metrics" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    <TabsTrigger value="variants">Variants</TabsTrigger>
                  </TabsList>

                  <TabsContent value="metrics" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      {test.variants.map((variant) => (
                        <Card key={variant.id}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">{variant.name}</CardTitle>
                            <CardDescription className="capitalize">
                              {variant.voice.tone} tone
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Impressions */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm">
                                <Eye className="w-4 h-4 text-muted-foreground" />
                                <span>Impressions</span>
                              </div>
                              <span className="font-semibold">{variant.impressions}</span>
                            </div>

                            {/* Clicks */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm">
                                <MousePointer className="w-4 h-4 text-muted-foreground" />
                                <span>Clicks</span>
                              </div>
                              <span className="font-semibold">{variant.clicks}</span>
                            </div>

                            {/* Conversions */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm">
                                <Target className="w-4 h-4 text-muted-foreground" />
                                <span>Conversions</span>
                              </div>
                              <span className="font-semibold">{variant.conversions}</span>
                            </div>

                            <div className="pt-2 border-t">
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">CTR</span>
                                  <span className="font-medium">
                                    {calculateCTR(variant.clicks, variant.impressions)}%
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Conversion Rate</span>
                                  <span className="font-medium">
                                    {calculateConversionRate(variant.conversions, variant.clicks)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Winner Display */}
                    {test.results?.winner && (
                      <Card className="border-green-200 bg-green-50">
                        <CardContent className="py-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-semibold text-green-900">
                                Winner: {test.variants.find((v) => v.id === test.results?.winner)?.name}
                              </p>
                              <p className="text-sm text-green-700">
                                Confidence: {test.results.confidence}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="variants" className="space-y-4 mt-4">
                    {test.variants.map((variant) => (
                      <Card key={variant.id}>
                        <CardHeader>
                          <CardTitle className="text-base">{variant.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Personality</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {variant.voice.personality.map((trait) => (
                                <Badge key={trait} variant="secondary" className="text-xs">
                                  {trait}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs text-muted-foreground">Tone</Label>
                            <p className="text-sm mt-1 capitalize">{variant.voice.tone}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {test.status === 'running' && (
                    <Button variant="outline" size="sm">
                      <Pause className="w-3 h-3 mr-1" />
                      Pause Test
                    </Button>
                  )}
                  {test.status === 'paused' && (
                    <Button variant="outline" size="sm">
                      <Play className="w-3 h-3 mr-1" />
                      Resume Test
                    </Button>
                  )}
                  {test.status === 'running' && (
                    <Button variant="default" size="sm">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complete Test
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
