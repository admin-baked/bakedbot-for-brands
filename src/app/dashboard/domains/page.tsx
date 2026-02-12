'use client';

/**
 * Unified Domain Manager
 *
 * Central hub for managing all custom domains:
 * - Menu domains (product catalog)
 * - Vibe site domains (marketing/landing pages)
 * - Hybrid domains (both on same domain with path routing)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useUserRole } from '@/hooks/use-user-role';
import {
  Loader2,
  Plus,
  Globe,
  ShoppingBag,
  Palette,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Trash2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  addCustomDomain,
  listDomains,
  removeDomain,
  verifyCustomDomain,
  updateDomainTarget,
} from '@/server/actions/domain-management';
import type {
  DomainTargetType,
  DomainConnectionType,
} from '@/types/tenant';
import type { DomainListItem } from '@/server/actions/domain-management';
import { getDNSInstructions, isSubdomain } from '@/lib/dns-utils';
import { getUserVibeProjects } from '@/server/actions/vibe-projects';

const TARGET_TYPES = [
  {
    value: 'menu' as DomainTargetType,
    label: 'Product Menu',
    description: 'Point to your BakedBot product catalog',
    icon: ShoppingBag,
  },
  {
    value: 'vibe_site' as DomainTargetType,
    label: 'Vibe Builder Site',
    description: 'Point to a website built with Vibe Builder',
    icon: Palette,
  },
  {
    value: 'hybrid' as DomainTargetType,
    label: 'Both (Hybrid)',
    description: 'Vibe site at root + menu at /shop',
    icon: Layers,
  },
];

interface VibeProject {
  id: string;
  name: string;
  status: string;
}

export default function DomainsPage() {
  const { user, loading } = useAuth();
  const { orgId: tenantId } = useUserRole();
  const { toast } = useToast();

  const [domains, setDomains] = useState<DomainListItem[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [vibeProjects, setVibeProjects] = useState<VibeProject[]>([]);

  // Add domain form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newTargetType, setNewTargetType] = useState<DomainTargetType>('menu');
  const [newTargetId, setNewTargetId] = useState('');
  const [adding, setAdding] = useState(false);

  // Processing states
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
  const [removingDomain, setRemovingDomain] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadDomains();
      loadVibeProjects();
    }
  }, [tenantId]);

  const loadDomains = async () => {
    if (!tenantId) return;
    setLoadingDomains(true);
    try {
      const result = await listDomains(tenantId);
      if (result.success && result.domains) {
        setDomains(result.domains);
      }
    } catch (error) {
      console.error('Failed to load domains:', error);
    } finally {
      setLoadingDomains(false);
    }
  };

  const loadVibeProjects = async () => {
    if (!user) return;
    try {
      const projects = await getUserVibeProjects(user.uid);
      setVibeProjects(
        (projects || [])
          .filter((p: any) => p.status === 'published')
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            status: p.status,
          }))
      );
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleAddDomain = async () => {
    if (!tenantId || !user || !newDomain) return;

    if (newTargetType !== 'menu' && !newTargetId) {
      toast({
        title: 'Select a Project',
        description: 'Please select a Vibe Builder project for this domain.',
        variant: 'destructive',
      });
      return;
    }

    setAdding(true);
    try {
      const detectedConnectionType: DomainConnectionType = isSubdomain(newDomain)
        ? 'cname'
        : 'nameserver';

      const selectedProject = vibeProjects.find((p) => p.id === newTargetId);

      const result = await addCustomDomain(
        tenantId,
        newDomain,
        detectedConnectionType,
        newTargetType,
        newTargetType !== 'menu' ? newTargetId : undefined,
        selectedProject?.name,
        newTargetType === 'hybrid'
          ? { rootPath: 'vibe', menuPath: '/shop' }
          : undefined,
        user.uid
      );

      if (result.success) {
        toast({
          title: 'Domain Added',
          description: 'Follow the DNS instructions to verify.',
        });
        setShowAddForm(false);
        setNewDomain('');
        setNewTargetType('menu');
        setNewTargetId('');
        loadDomains();
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

  const handleVerify = async (domain: string) => {
    if (!tenantId) return;
    setVerifyingDomain(domain);
    try {
      const result = await verifyCustomDomain(tenantId);
      if (result.success) {
        toast({
          title: 'Domain Verified!',
          description: `${domain} is now active.`,
        });
        loadDomains();
      } else {
        toast({
          title: 'Verification Pending',
          description: result.error || 'DNS records not detected yet.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: 'Could not verify domain.',
        variant: 'destructive',
      });
    } finally {
      setVerifyingDomain(null);
    }
  };

  const handleRemove = async (domain: string) => {
    if (!tenantId) return;
    if (!confirm(`Remove ${domain}? This will disconnect the domain.`)) return;

    setRemovingDomain(domain);
    try {
      const result = await removeDomain(tenantId, domain);
      if (result.success) {
        toast({
          title: 'Domain Removed',
          description: `${domain} has been disconnected.`,
        });
        loadDomains();
      } else {
        throw new Error(result.error || 'Failed to remove');
      }
    } catch (error) {
      toast({
        title: 'Removal Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRemovingDomain(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!' });
  };

  const getTargetIcon = (targetType: DomainTargetType) => {
    switch (targetType) {
      case 'menu':
        return <ShoppingBag className="w-4 h-4" />;
      case 'vibe_site':
        return <Palette className="w-4 h-4" />;
      case 'hybrid':
        return <Layers className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getTargetLabel = (d: DomainListItem) => {
    switch (d.targetType) {
      case 'menu':
        return 'Product Menu';
      case 'vibe_site':
        return d.targetName || 'Vibe Site';
      case 'hybrid':
        return `Hybrid: ${d.targetName || 'Site'} + Menu`;
      default:
        return 'Product Menu';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="gap-1 bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3" />
            Verified
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
    }
  };

  if (loading || loadingDomains) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Custom Domains</h1>
          <p className="text-muted-foreground mt-1">
            Connect your domains to menus, sites, and landing pages
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Domain
        </Button>
      </div>

      {/* Add Domain Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
            <DialogDescription>
              Connect your domain to BakedBot-hosted content
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Domain Input */}
            <div>
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                placeholder="www.yourbrand.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Subdomains use CNAME, root domains use Nameservers
              </p>
            </div>

            {/* Target Type */}
            <div>
              <Label>What should this domain serve?</Label>
              <div className="grid gap-2 mt-2">
                {TARGET_TYPES.map((target) => {
                  const Icon = target.icon;
                  return (
                    <div
                      key={target.value}
                      onClick={() => setNewTargetType(target.value)}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        newTargetType === target.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        newTargetType === target.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{target.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {target.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Project Selector (for vibe_site and hybrid) */}
            {newTargetType !== 'menu' && (
              <div>
                <Label>Select Vibe Builder Project</Label>
                <Select value={newTargetId} onValueChange={setNewTargetId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a published project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vibeProjects.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No published projects
                      </SelectItem>
                    ) : (
                      vibeProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {vibeProjects.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    You need to publish a Vibe Builder project first.
                  </p>
                )}
              </div>
            )}

            {/* Hybrid Routing Info */}
            {newTargetType === 'hybrid' && newTargetId && (
              <Alert>
                <Layers className="h-4 w-4" />
                <AlertTitle>Hybrid Routing</AlertTitle>
                <AlertDescription>
                  <code>{newDomain || 'yourdomain.com'}/</code> → Vibe site
                  <br />
                  <code>{newDomain || 'yourdomain.com'}/shop</code> → Product menu
                </AlertDescription>
              </Alert>
            )}

            {/* Submit */}
            <Button
              onClick={handleAddDomain}
              disabled={adding || !newDomain}
              className="w-full"
            >
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding Domain...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Domain
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Domains List */}
      {domains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Globe className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Domains Yet</h3>
            <p className="text-muted-foreground mb-4">
              Connect your first custom domain to start serving your content
              on your own brand URL.
            </p>
            <Button onClick={() => setShowAddForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Domain
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {domains.map((d) => (
            <Card key={d.domain}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {getTargetIcon(d.targetType)}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {d.domain}
                        {getStatusBadge(d.verificationStatus)}
                      </CardTitle>
                      <CardDescription>
                        {getTargetLabel(d)} &middot;{' '}
                        {d.connectionType === 'cname' ? 'CNAME' : 'Nameserver'}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {d.verificationStatus === 'verified' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          window.open(`https://${d.domain}`, '_blank')
                        }
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(d.domain)}
                      disabled={removingDomain === d.domain}
                    >
                      {removingDomain === d.domain ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* DNS Instructions (pending domains) */}
              {d.verificationStatus !== 'verified' && (
                <CardContent className="space-y-3">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Configure DNS</AlertTitle>
                    <AlertDescription className="text-xs">
                      Add these records at your domain registrar, then click
                      Verify.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    {/* CNAME / NS record */}
                    <div className="grid grid-cols-3 gap-2 text-xs border rounded-lg p-3 bg-muted/30">
                      <div>
                        <div className="font-semibold text-muted-foreground">
                          Type
                        </div>
                        <div className="font-mono">
                          {d.connectionType === 'cname' ? 'CNAME' : 'NS'}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-muted-foreground">
                          Host
                        </div>
                        <div className="font-mono break-all">
                          {d.connectionType === 'cname'
                            ? d.domain.split('.')[0]
                            : '@'}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-muted-foreground">
                          Value
                        </div>
                        <div className="font-mono break-all flex items-center gap-1">
                          {d.connectionType === 'cname'
                            ? 'cname.bakedbot.ai'
                            : 'ns1.bakedbot.ai'}
                          <button
                            onClick={() =>
                              copyToClipboard(
                                d.connectionType === 'cname'
                                  ? 'cname.bakedbot.ai'
                                  : 'ns1.bakedbot.ai'
                              )
                            }
                            className="hover:text-primary"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleVerify(d.domain)}
                    disabled={verifyingDomain === d.domain}
                    size="sm"
                    className="w-full gap-2"
                  >
                    {verifyingDomain === d.domain ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Verify DNS
                      </>
                    )}
                  </Button>
                </CardContent>
              )}

              {/* Verified domain info */}
              {d.verificationStatus === 'verified' && (
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      SSL:{' '}
                      {d.sslStatus === 'active' ? (
                        <Badge
                          variant="outline"
                          className="text-green-700 border-green-200"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">Provisioning</Badge>
                      )}
                    </span>
                    {d.verifiedAt && (
                      <span>
                        Verified:{' '}
                        {new Date(d.verifiedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* SEO Benefits */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">SEO Benefits of Custom Domains</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Custom domains provide full SEO benefits over embedded menus
            (iframes). Your content is indexed by search engines under your
            own domain.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your domain appears in search results</li>
            <li>Product pages indexed under your brand</li>
            <li>Build domain authority over time</li>
            <li>Vibe Builder sites get full SEO indexing</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
