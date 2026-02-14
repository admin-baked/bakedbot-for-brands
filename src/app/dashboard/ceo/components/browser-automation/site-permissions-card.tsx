'use client';

/**
 * Site Permissions Card
 *
 * Manage domain-level permissions for browser automation.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Plus,
  Trash2,
  Globe,
  Loader2,
} from 'lucide-react';

import {
  grantSitePermission,
  revokeSitePermission,
  blockSiteDomain,
} from '@/server/actions/browser-automation';

import type {
  SitePermission,
  PermissionGrant,
  AccessLevel,
  AllowedAction,
  HighRiskAction,
} from '@/types/browser-automation';

interface SitePermissionsCardProps {
  permissions: SitePermission[];
  onPermissionsChange: (permissions: SitePermission[]) => void;
}

const ALL_ACTIONS: AllowedAction[] = [
  'navigate',
  'click',
  'type',
  'submit',
  'screenshot',
  'scroll',
  'execute_script',
];

const ALL_HIGH_RISK: HighRiskAction[] = [
  'purchase',
  'publish',
  'delete',
  'share',
  'login',
  'payment',
];

export function SitePermissionsCard({
  permissions,
  onPermissionsChange,
}: SitePermissionsCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [domain, setDomain] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('full');
  const [selectedActions, setSelectedActions] = useState<AllowedAction[]>(ALL_ACTIONS);
  const [confirmActions, setConfirmActions] = useState<HighRiskAction[]>(['purchase', 'publish', 'delete']);
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const handleGrant = async () => {
    if (!domain) return;

    setIsLoading(true);

    const grant: PermissionGrant = {
      accessLevel,
      allowedActions: selectedActions,
      requiresConfirmation: confirmActions,
      expiresInDays,
    };

    const result = await grantSitePermission(domain, grant);

    if (result.success && result.data) {
      // Update or add the permission
      const existing = permissions.findIndex((p) => p.domain === result.data!.domain);
      if (existing >= 0) {
        const updated = [...permissions];
        updated[existing] = result.data;
        onPermissionsChange(updated);
      } else {
        onPermissionsChange([result.data, ...permissions]);
      }

      // Reset form
      setDomain('');
      setAccessLevel('full');
      setSelectedActions(ALL_ACTIONS);
      setConfirmActions(['purchase', 'publish', 'delete']);
      setExpiresInDays(undefined);
      setIsDialogOpen(false);
    }

    setIsLoading(false);
  };

  const handleRevoke = async (permDomain: string) => {
    setIsLoading(true);
    const result = await revokeSitePermission(permDomain);
    if (result.success) {
      onPermissionsChange(permissions.filter((p) => p.domain !== permDomain));
    }
    setIsLoading(false);
  };

  const handleBlock = async (permDomain: string) => {
    setIsLoading(true);
    const result = await blockSiteDomain(permDomain);
    if (result.success) {
      // Update the permission to blocked
      const updated = permissions.map((p) =>
        p.domain === permDomain ? { ...p, accessLevel: 'blocked' as AccessLevel } : p
      );
      onPermissionsChange(updated);
    }
    setIsLoading(false);
  };

  const getAccessIcon = (level: AccessLevel) => {
    switch (level) {
      case 'full':
        return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case 'read-only':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'blocked':
        return <ShieldX className="h-4 w-4 text-red-500" />;
    }
  };

  const getAccessBadge = (level: AccessLevel) => {
    switch (level) {
      case 'full':
        return <Badge className="bg-green-500">Full Access</Badge>;
      case 'read-only':
        return <Badge variant="secondary">Read Only</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Site Permissions</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Add Site
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Grant Site Permission</DialogTitle>
                <DialogDescription>
                  Allow browser automation on a specific domain.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <Input
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as AccessLevel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Access</SelectItem>
                      <SelectItem value="read-only">Read Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {accessLevel === 'full' && (
                  <>
                    <div className="space-y-2">
                      <Label>Allowed Actions</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_ACTIONS.map((action) => (
                          <div key={action} className="flex items-center space-x-2">
                            <Checkbox
                              id={`action-${action}`}
                              checked={selectedActions.includes(action)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedActions([...selectedActions, action]);
                                } else {
                                  setSelectedActions(selectedActions.filter((a) => a !== action));
                                }
                              }}
                            />
                            <Label htmlFor={`action-${action}`} className="text-sm capitalize">
                              {action.replace('_', ' ')}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Require Confirmation For</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_HIGH_RISK.map((action) => (
                          <div key={action} className="flex items-center space-x-2">
                            <Checkbox
                              id={`confirm-${action}`}
                              checked={confirmActions.includes(action)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setConfirmActions([...confirmActions, action]);
                                } else {
                                  setConfirmActions(confirmActions.filter((a) => a !== action));
                                }
                              }}
                            />
                            <Label htmlFor={`confirm-${action}`} className="text-sm capitalize">
                              {action}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Expires In (days)</Label>
                  <Select
                    value={expiresInDays?.toString() || 'never'}
                    onValueChange={(v) => setExpiresInDays(v === 'never' ? undefined : parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGrant} disabled={isLoading || !domain}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Grant Permission
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>Manage which sites can be automated</CardDescription>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[300px]">
          {permissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No sites configured yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Add a site to start automating.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {permissions.map((perm) => (
                <div
                  key={perm.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    {getAccessIcon(perm.accessLevel)}
                    <div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{perm.domain}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {getAccessBadge(perm.accessLevel)}
                        {perm.expiresAt && (
                          <span className="text-xs text-muted-foreground">
                            Expires: {new Date(perm.expiresAt.toDate()).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {perm.accessLevel !== 'blocked' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleBlock(perm.domain)}
                        disabled={isLoading}
                      >
                        <ShieldX className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRevoke(perm.domain)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
