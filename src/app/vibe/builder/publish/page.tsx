'use client';

/**
 * Vibe Builder - Publish Flow
 *
 * Deploy website to BakedBot hosting with custom subdomain
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, ArrowLeft, Rocket, Globe, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getVibeProject } from '@/server/actions/vibe-projects';
import { publishWebsite, checkSubdomainAvailability } from '@/server/actions/vibe-publish';
import type { VibeProject } from '@/types/vibe-project';

export default function PublishPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [project, setProject] = useState<VibeProject | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  // Form state
  const [subdomain, setSubdomain] = useState('');
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [publishedUrl, setPublishedUrl] = useState('');

  // Require authentication
  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to publish',
        variant: 'destructive',
      });
      router.push('/signup?redirect=/vibe/builder/publish');
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

        // Set initial subdomain from project name
        const initialSubdomain = fetchedProject.name
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 30);
        setSubdomain(initialSubdomain);
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

  // Check subdomain availability
  useEffect(() => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSubdomain(true);
      try {
        const result = await checkSubdomainAvailability(subdomain);
        setSubdomainAvailable(result.available);
      } catch (error) {
        setSubdomainAvailable(null);
      } finally {
        setCheckingSubdomain(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [subdomain]);

  const handlePublish = async () => {
    if (!user || !project) return;

    // Validation
    if (!subdomain || subdomain.length < 3) {
      toast({
        title: 'Invalid Subdomain',
        description: 'Subdomain must be at least 3 characters',
        variant: 'destructive',
      });
      return;
    }

    if (subdomainAvailable === false) {
      toast({
        title: 'Subdomain Taken',
        description: 'This subdomain is already in use',
        variant: 'destructive',
      });
      return;
    }

    setPublishing(true);

    try {
      const result = await publishWebsite(project.id, subdomain, user.uid);

      if (result.success && result.url) {
        setPublished(true);
        setPublishedUrl(result.url);
        toast({
          title: 'Website Published!',
          description: 'Your site is now live',
        });
      } else {
        throw new Error(result.error || 'Publishing failed');
      }
    } catch (error) {
      console.error('Failed to publish:', error);
      toast({
        title: 'Publishing Failed',
        description: 'Could not publish your website',
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
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

  if (published) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center space-y-6 p-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>

          <h1 className="text-4xl font-bold">🎉 Your Site is Live!</h1>

          <p className="text-lg text-muted-foreground">
            Your website has been successfully published and is now accessible to the world.
          </p>

          <div className="bg-muted p-6 rounded-lg">
            <Label className="text-sm text-muted-foreground mb-2 block">
              Your website URL:
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={publishedUrl}
                readOnly
                className="text-center font-mono"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => window.open(publishedUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => window.open(publishedUrl, '_blank')}
              size="lg"
              className="gap-2"
            >
              <Globe className="w-5 h-5" />
              Visit Your Site
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push(`/vibe/builder?projectId=${project.id}`)}
            >
              Back to Editor
            </Button>
          </div>

          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold mb-3">What's Next?</h3>
            <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-md mx-auto">
              <li>✓ Share your site URL on social media</li>
              <li>✓ View analytics and track visitors</li>
              <li>✓ Update your site anytime by republishing</li>
            </ul>

            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/domains')}
                className="w-full gap-2"
              >
                <Globe className="w-4 h-4" />
                Connect Custom Domain
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Use your own domain like www.yourbusiness.com
              </p>
            </div>
          </div>
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
              <h1 className="text-3xl font-bold">Publish Your Website</h1>
              <p className="text-muted-foreground mt-1">
                Deploy {project.name} to BakedBot hosting
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
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

          {/* Subdomain */}
          <div className="space-y-2">
            <Label htmlFor="subdomain">Choose Your Website URL *</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">https://</span>
                <Input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                  placeholder="my-dispensary"
                  className="flex-1"
                  pattern="[a-z0-9-]+"
                />
                <span className="text-sm text-muted-foreground">.bakedbot.site</span>
              </div>
              {checkingSubdomain && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {!checkingSubdomain && subdomainAvailable === true && (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
              {!checkingSubdomain && subdomainAvailable === false && (
                <Badge variant="destructive">Taken</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Your site will be accessible at: https://{subdomain || 'your-site'}.bakedbot.site
            </p>
          </div>

          {/* Info Box */}
          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
            <h3 className="font-semibold mb-2">Publishing Features</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✓ Free SSL certificate (HTTPS)</li>
              <li>✓ Fast global CDN</li>
              <li>✓ Automatic updates when you republish</li>
              <li>✓ Custom domain support (Pro)</li>
              <li>✓ Analytics dashboard</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={publishing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishing || subdomainAvailable === false || !subdomain}
              className="gap-2"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Publish Website
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
