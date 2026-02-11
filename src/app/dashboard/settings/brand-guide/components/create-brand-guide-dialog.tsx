/**
 * Create Brand Guide Dialog
 *
 * Wizard for creating a new brand guide from URL, template, or manual entry.
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Loader2, Link as LinkIcon, FileText, Edit } from 'lucide-react';
import { createBrandGuide, getBrandGuideTemplates } from '@/server/actions/brand-guide';
import { useToast } from '@/hooks/use-toast';
import type { BrandGuide, BrandGuideTemplate } from '@/types/brand-guide';

interface CreateBrandGuideDialogProps {
  brandId: string;
  onComplete: (brandGuide: BrandGuide) => void;
}

export function CreateBrandGuideDialog({
  brandId,
  onComplete,
}: CreateBrandGuideDialogProps) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<'url' | 'template' | 'manual'>('url');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<BrandGuideTemplate[]>([]);
  const { toast } = useToast();

  // Form state
  const [url, setUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Load templates when dialog opens
  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && templates.length === 0) {
      const result = await getBrandGuideTemplates();
      if (result.success && result.templates) {
        setTemplates(result.templates);
      }
    }
  };

  const handleCreate = async () => {
    setLoading(true);

    try {
      const result = await createBrandGuide({
        brandId,
        brandName: 'My Brand', // TODO: Get from user input
        method,
        sourceUrl: method === 'url' ? url : undefined,
        socialHandles:
          method === 'url' && (instagram || twitter)
            ? {
                instagram: instagram || undefined,
                twitter: twitter || undefined,
              }
            : undefined,
        templateId: method === 'template' ? selectedTemplate : undefined,
      });

      if (!result.success || !result.brandGuide) {
        throw new Error(result.error || 'Failed to create brand guide');
      }

      toast({
        title: 'Brand Guide Created',
        description: 'Your brand guide has been created successfully.',
      });

      onComplete(result.brandGuide);
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create brand guide',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="w-full bg-baked-green hover:bg-baked-green/90 text-white py-4 rounded-xl font-bold text-lg shadow-lg"
        >
          Create Brand Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Your Brand Guide</DialogTitle>
          <DialogDescription>
            Choose how you'd like to create your brand guide
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Method selection */}
          <div className="space-y-4">
            <Label>Creation Method</Label>
            <RadioGroup value={method} onValueChange={(v: any) => setMethod(v)}>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="url" id="url" />
                  <div className="flex-1">
                    <Label htmlFor="url" className="flex items-center gap-2 cursor-pointer">
                      <LinkIcon className="w-4 h-4" />
                      <span className="font-semibold">Extract from Website</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Automatically extract brand data from your website and social media
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="template" id="template" />
                  <div className="flex-1">
                    <Label htmlFor="template" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="w-4 h-4" />
                      <span className="font-semibold">Start from Template</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose a pre-built template for your industry
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="manual" id="manual" />
                  <div className="flex-1">
                    <Label htmlFor="manual" className="flex items-center gap-2 cursor-pointer">
                      <Edit className="w-4 h-4" />
                      <span className="font-semibold">Create Manually</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start with a blank guide and fill it in yourself
                    </p>
                  </div>
                </div>
              </Card>
            </RadioGroup>
          </div>

          {/* URL method fields */}
          {method === 'url' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="website">Website URL *</Label>
                <Input
                  id="website"
                  placeholder="https://yourbrand.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram Handle (optional)</Label>
                <Input
                  id="instagram"
                  placeholder="@yourbrand"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="twitter">Twitter Handle (optional)</Label>
                <Input
                  id="twitter"
                  placeholder="@yourbrand"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Template selection */}
          {method === 'template' && (
            <div className="space-y-4">
              <Label>Choose a Template</Label>
              <div className="grid grid-cols-2 gap-4">
                {templates.filter((t) => t.featured).map((template) => (
                  <Card
                    key={template.id}
                    className={`p-4 cursor-pointer hover:border-primary transition-colors ${
                      selectedTemplate === template.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <h4 className="font-semibold mb-1">{template.name}</h4>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Manual method info */}
          {method === 'manual' && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                You'll be able to fill in all brand details manually after creation.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading || (method === 'url' && !url) || (method === 'template' && !selectedTemplate)}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Brand Guide
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
