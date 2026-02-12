'use client';

/**
 * Custom Domain Management
 *
 * Add and manage custom domains for published Vibe sites
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  Loader2,
  Check,
  Copy,
  Globe,
  AlertCircle,
  ArrowLeft,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  addCustomDomain,
  verifyCustomDomain,
  removeCustomDomain,
  getPublishedSiteByProject,
} from '@/server/actions/vibe-publish';
import { getVibeProject } from '@/server/actions/vibe-projects';

export default function CustomDomainPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const projectId = searchParams.get('projectId');

  const [project, setProject] = useState<any>(null);
  const [publishedSite, setPublishedSite] = useState<any>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [customDomain, setCustomDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<
    { type: string; host: string; value: string }[] | null
  >(null);
  const [domainAdded, setDomainAdded] = useState(false);
  const [domainVerified, setDomainVerified] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (projectId && user) {
      loadProject();
    }
  }, [projectId, user]);

  const loadProject = async () => {
    if (!projectId || !user) return;

    setLoadingProject(true);
    try {
      // Load both project and published site data
      const [projectData, publishedSiteData] = await Promise.all([
        getVibeProject(projectId),
        getPublishedSiteByProject(projectId),
      ]);

      setProject(projectData);
      setPublishedSite(publishedSiteData);

      // Check if custom domain is already configured on published site
      if (publishedSiteData?.customDomain) {
        setCustomDomain(publishedSiteData.customDomain as string);
        setDomainAdded(true);
        setDomainVerified((publishedSiteData.customDomainVerified as boolean) || false);
      }
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
  };

  const handleAddDomain = async () => {
    if (!projectId || !user || !customDomain) return;

    // Basic validation
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(customDomain)) {
      toast({
        title: 'Invalid Domain',
        description: 'Please enter a valid domain name',
        variant: 'destructive',
      });
      return;
    }

    setAdding(true);
    try {
      const result = await addCustomDomain(projectId, customDomain, user.uid);

      if (result.success && result.dnsRecords) {
        setDnsRecords(result.dnsRecords);
        setDomainAdded(true);
        toast({
          title: 'Custom Domain Added',
          description: 'Follow the DNS instructions below to complete setup',
        });
      } else {
        throw new Error(result.error || 'Failed to add domain');
      }
    } catch (error) {
      toast({
        title: 'Failed to Add Domain',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleVerify = async () => {
    if (!projectId || !user) return;

    setVerifying(true);
    try {
      const result = await verifyCustomDomain(projectId, user.uid);

      if (result.success && result.verified) {
        setDomainVerified(true);
        toast({
          title: 'Domain Verified!',
          description: 'Your custom domain is now active',
        });
      } else if (result.success && !result.verified) {
        toast({
          title: 'Verification Pending',
          description: 'DNS records not detected yet. Try again in a few minutes.',
          variant: 'destructive',
        });
      } else {
        throw new Error(result.error || 'Verification failed');
      }
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleRemove = async () => {
    if (!projectId || !user) return;

    if (!confirm('Are you sure you want to remove this custom domain?')) {
      return;
    }

    setRemoving(true);
    try {
      const result = await removeCustomDomain(projectId, user.uid);

      if (result.success) {
        setCustomDomain('');
        setDomainAdded(false);
        setDomainVerified(false);
        setDnsRecords(null);
        toast({
          title: 'Domain Removed',
          description: 'Custom domain has been removed',
        });
      } else {
        throw new Error(result.error || 'Failed to remove domain');
      }
    } catch (error) {
      toast({
        title: 'Failed to Remove Domain',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRemoving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'DNS record copied to clipboard',
    });
  };

  if (loading || loadingProject) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
          <Button onClick={() => router.push('/vibe/builder')}>
            Go to Projects
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/vibe/builder/publish?projectId=${projectId}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Publishing
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Custom Domain</h1>
              <p className="text-muted-foreground">
                Use your own domain for {project.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Domain Input */}
          {!domainAdded && (
            <Card>
              <CardHeader>
                <CardTitle>Add Custom Domain</CardTitle>
                <CardDescription>
                  Connect your own domain name to this website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="domain">Domain Name</Label>
                  <Input
                    id="domain"
                    placeholder="www.mydispensary.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your domain (e.g., www.yourdomain.com or yourdomain.com)
                  </p>
                </div>

                <Button
                  onClick={handleAddDomain}
                  disabled={!customDomain || adding}
                  className="w-full"
                >
                  {adding ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding Domain...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 mr-2" />
                      Add Domain
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* DNS Instructions */}
          {domainAdded && dnsRecords && !domainVerified && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  DNS Configuration Required
                </CardTitle>
                <CardDescription>
                  Add these DNS records to your domain provider
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Setup Instructions</AlertTitle>
                  <AlertDescription>
                    1. Log in to your domain registrar (GoDaddy, Namecheap, etc.)
                    <br />
                    2. Find the DNS settings for <strong>{customDomain}</strong>
                    <br />
                    3. Add the DNS record below
                    <br />
                    4. Wait 5-60 minutes for DNS propagation
                    <br />
                    5. Click "Verify DNS" below
                  </AlertDescription>
                </Alert>

                {dnsRecords.map((record, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 space-y-2 bg-muted/30"
                  >
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-muted-foreground">Type</div>
                        <div className="font-mono">{record.type}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Host</div>
                        <div className="font-mono break-all">{record.host}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Value</div>
                        <div className="font-mono break-all">{record.value}</div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(record.value)}
                      className="w-full"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Value
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="flex-1"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Verify DNS
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRemove}
                    disabled={removing}
                  >
                    {removing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Domain Verified */}
          {domainAdded && domainVerified && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <Check className="w-5 h-5" />
                  Domain Verified
                </CardTitle>
                <CardDescription className="text-green-700">
                  Your custom domain is live and working
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white rounded-lg border border-green-200">
                  <div className="text-sm text-muted-foreground mb-1">
                    Active Domain
                  </div>
                  <div className="font-mono text-lg">{customDomain}</div>
                  <a
                    href={`https://${customDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Visit your site →
                  </a>
                </div>

                <Button
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={removing}
                  className="w-full"
                >
                  {removing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Custom Domain
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>DNS propagation takes time:</strong> After adding DNS
                records, it can take 5-60 minutes for changes to take effect
                globally.
              </p>
              <p>
                <strong>TTL (Time To Live):</strong> Set to 3600 (1 hour) or lower
                for faster updates.
              </p>
              <p>
                <strong>Common issues:</strong> Make sure you're adding the record
                to the correct domain and that there are no conflicting records.
              </p>
              <p>
                <strong>Contact support:</strong> If you need help, email{' '}
                <a
                  href="mailto:support@bakedbot.ai"
                  className="text-primary hover:underline"
                >
                  support@bakedbot.ai
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
