'use client';

/**
 * Vibe Builder - Submit Template
 *
 * Allow users to submit their project as a community template
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, ArrowLeft, Upload, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getVibeProject } from '@/server/actions/vibe-projects';
import { submitProjectAsTemplate } from '@/server/actions/vibe-template-submit';
import type { VibeProject } from '@/types/vibe-project';

const CATEGORIES = [
  { value: 'dispensary', label: 'Dispensary' },
  { value: 'brand', label: 'Brand' },
  { value: 'delivery', label: 'Delivery Service' },
  { value: 'cultivation', label: 'Cultivation' },
  { value: 'accessories', label: 'Accessories' },
];

const FEATURE_OPTIONS = [
  'Product Grid',
  'Age Verification',
  'Contact Form',
  'Hero Section',
  'Mobile Responsive',
  'E-Commerce Ready',
  'POS Integration',
  'Newsletter Signup',
  'Location Finder',
  'Menu Display',
];

export default function SubmitTemplatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [project, setProject] = useState<VibeProject | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);

  // Require authentication
  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to submit a template',
        variant: 'destructive',
      });
      router.push('/signup?redirect=/vibe/builder/submit-template');
    }
  }, [user, loading, router, toast]);

  // Load project
  useEffect(() => {
    async function loadProject() {
      const projectId = searchParams.get('projectId');

      if (!projectId) {
        toast({
          title: 'No Project',
          description: 'No project ID provided',
          variant: 'destructive',
        });
        router.push('/vibe/builder/projects');
        return;
      }

      try {
        const fetchedProject = await getVibeProject(projectId);

        if (!fetchedProject) {
          toast({
            title: 'Project Not Found',
            description: 'The project could not be found',
            variant: 'destructive',
          });
          router.push('/vibe/builder/projects');
          return;
        }

        setProject(fetchedProject);
        setTemplateName(fetchedProject.name);
      } catch (error) {
        console.error('Failed to load project:', error);
        toast({
          title: 'Error',
          description: 'Failed to load project',
          variant: 'destructive',
        });
      } finally {
        setLoadingProject(false);
      }
    }

    loadProject();
  }, [searchParams, router, toast]);

  const toggleFeature = (feature: string) => {
    setFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !project) return;

    // Validation
    if (!templateName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Template name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Description is required',
        variant: 'destructive',
      });
      return;
    }

    if (!category) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const result = await submitProjectAsTemplate(
        {
          projectId: project.id,
          name: templateName,
          description,
          category: category as any,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          features,
          isPremium,
        },
        user.uid,
        user.displayName || user.email || 'Anonymous'
      );

      if (result.success) {
        setSubmitted(true);
        toast({
          title: 'Template Submitted!',
          description: 'Your template is pending approval',
        });

        setTimeout(() => {
          router.push('/vibe/builder/projects');
        }, 3000);
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (error) {
      console.error('Failed to submit template:', error);
      toast({
        title: 'Submission Failed',
        description: 'Could not submit your template',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingProject) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !project) {
    return null;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md mx-auto text-center space-y-6 p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold">Template Submitted!</h1>
          <p className="text-muted-foreground">
            Your template has been submitted for review. Our team will review it
            within 24-48 hours and notify you once it's approved.
          </p>
          <Button onClick={() => router.push('/vibe/builder/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Submit Template</h1>
              <p className="text-muted-foreground mt-1">
                Share your design with the community
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Modern Dispensary Landing"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what makes your template unique..."
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              Explain the design style, target audience, and key features
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="modern, minimal, dark, luxury"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated keywords (e.g., modern, minimal, dark)
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label>Features</Label>
            <div className="flex flex-wrap gap-2">
              {FEATURE_OPTIONS.map((feature) => (
                <Badge
                  key={feature}
                  variant={features.includes(feature) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleFeature(feature)}
                >
                  {feature}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Click features to toggle them
            </p>
          </div>

          {/* Premium */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="premium"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="premium" className="cursor-pointer">
              Mark as Premium (requires payment to use)
            </Label>
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <h3 className="font-semibold mb-2">Preview</h3>
            <div className="aspect-video bg-muted rounded overflow-hidden">
              {project.thumbnail ? (
                <img
                  src={project.thumbnail}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No preview available
                </div>
              )}
            </div>
          </div>

          {/* Submission Guidelines */}
          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
            <h3 className="font-semibold mb-2">Submission Guidelines</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Templates must be original designs</li>
              <li>• All images should be properly licensed</li>
              <li>• Comply with cannabis advertising regulations</li>
              <li>• Review typically takes 24-48 hours</li>
              <li>• You'll be notified via email when approved</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Submit Template
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
