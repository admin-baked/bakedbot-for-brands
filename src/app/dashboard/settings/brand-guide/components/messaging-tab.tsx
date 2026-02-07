/**
 * Messaging Tab
 *
 * Manage brand messaging: tagline, positioning, mission, values.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, X } from 'lucide-react';
import { updateBrandGuide } from '@/server/actions/brand-guide';
import { useToast } from '@/hooks/use-toast';
import type { BrandGuide, BrandMessaging } from '@/types/brand-guide';

interface MessagingTabProps {
  brandId: string;
  brandGuide: BrandGuide;
  onUpdate: (updates: Partial<BrandGuide>) => void;
}

export function MessagingTab({ brandId, brandGuide, onUpdate }: MessagingTabProps) {
  const [messaging, setMessaging] = useState<BrandMessaging>(brandGuide.messaging);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setLoading(true);

    try {
      const result = await updateBrandGuide({
        brandId,
        updates: { messaging },
        createVersion: true,
        reason: 'Updated brand messaging',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update messaging');
      }

      toast({
        title: 'Brand Messaging Updated',
        description: 'Your brand messaging has been saved successfully.',
      });

      onUpdate({ messaging });
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

  const addValueProposition = () => {
    setMessaging({
      ...messaging,
      valuePropositions: [...messaging.valuePropositions, ''],
    });
  };

  const removeValueProposition = (index: number) => {
    setMessaging({
      ...messaging,
      valuePropositions: messaging.valuePropositions.filter((_, i) => i !== index),
    });
  };

  const updateValueProposition = (index: number, value: string) => {
    const updated = [...messaging.valuePropositions];
    updated[index] = value;
    setMessaging({ ...messaging, valuePropositions: updated });
  };

  const addKeyMessage = () => {
    setMessaging({
      ...messaging,
      keyMessages: [...(messaging.keyMessages || []), { audience: '', message: '', supportingPoints: [] }],
    });
  };

  const removeKeyMessage = (index: number) => {
    setMessaging({
      ...messaging,
      keyMessages: (messaging.keyMessages || []).filter((_, i) => i !== index),
    });
  };

  const updateKeyMessage = (index: number, field: 'audience' | 'message', value: string) => {
    const updated = [...(messaging.keyMessages || [])];
    updated[index] = { ...updated[index], [field]: value };
    setMessaging({ ...messaging, keyMessages: updated });
  };

  return (
    <div className="space-y-6">
      {/* Tagline */}
      <Card>
        <CardHeader>
          <CardTitle>Tagline</CardTitle>
          <CardDescription>Your brand tagline or slogan (short and memorable)</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={messaging.tagline}
            onChange={(e) => setMessaging({ ...messaging, tagline: e.target.value })}
            placeholder="e.g., Elevate Your Experience"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {messaging.tagline.length}/100 characters
          </p>
        </CardContent>
      </Card>

      {/* Positioning Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Positioning Statement</CardTitle>
          <CardDescription>
            How you want to be perceived in the market (1-2 sentences)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={messaging.positioning}
            onChange={(e) => setMessaging({ ...messaging, positioning: e.target.value })}
            placeholder="For [target audience], [brand name] is the [category] that [unique benefit] because [reason to believe]."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Mission Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Mission Statement</CardTitle>
          <CardDescription>Your brand purpose and reason for existence</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={messaging.missionStatement}
            onChange={(e) => setMessaging({ ...messaging, missionStatement: e.target.value })}
            placeholder="Our mission is to..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Value Propositions */}
      <Card>
        <CardHeader>
          <CardTitle>Value Propositions</CardTitle>
          <CardDescription>
            The key benefits you provide to customers (3-5 propositions)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {messaging.valuePropositions.map((prop, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={prop}
                onChange={(e) => updateValueProposition(index, e.target.value)}
                placeholder={`Value proposition ${index + 1}`}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => removeValueProposition(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addValueProposition}>
            <Plus className="w-4 h-4 mr-2" />
            Add Value Proposition
          </Button>
        </CardContent>
      </Card>

      {/* Key Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Key Messages</CardTitle>
          <CardDescription>
            Core messages to communicate consistently across all channels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(messaging.keyMessages || []).map((km, index) => (
            <div key={index} className="space-y-2 p-3 border rounded">
              <div className="flex gap-2">
                <Input
                  value={km.audience}
                  onChange={(e) => updateKeyMessage(index, 'audience', e.target.value)}
                  placeholder="Target audience (e.g., First-time users)"
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={() => removeKeyMessage(index)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                value={km.message}
                onChange={(e) => updateKeyMessage(index, 'message', e.target.value)}
                placeholder="Key message for this audience"
                rows={2}
              />
            </div>
          ))}
          <Button variant="outline" onClick={addKeyMessage}>
            <Plus className="w-4 h-4 mr-2" />
            Add Key Message
          </Button>
        </CardContent>
      </Card>

      {/* Brand Story */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Story</CardTitle>
          <CardDescription>Your brand origin story, values, and differentiators</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="brand-origin">Origin Story</Label>
            <Textarea
              id="brand-origin"
              value={messaging.brandStory?.origin || ''}
              onChange={(e) =>
                setMessaging({
                  ...messaging,
                  brandStory: {
                    ...messaging.brandStory,
                    origin: e.target.value,
                    values: messaging.brandStory?.values || [],
                    differentiators: messaging.brandStory?.differentiators || [],
                  },
                })
              }
              placeholder="Tell the story of how your brand came to be..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setMessaging(brandGuide.messaging)}>
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
