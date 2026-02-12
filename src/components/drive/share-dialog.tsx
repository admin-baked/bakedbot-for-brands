'use client';

/**
 * Share Dialog Component
 *
 * Dialog for configuring sharing settings for files and folders.
 */

import { useState, useEffect, useMemo } from 'react';
import { useDriveStore } from '@/lib/store/drive-store';
import { createShare, getSharesForItem, revokeShare } from '@/server/actions/drive';
import { DRIVE_ACCESS_CONTROLS, DRIVE_ACCESS_LEVELS, type DriveAccessControl, type DriveAccessLevel } from '@/types/drive';
import type { DriveShare } from '@/types/drive';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Copy, Link, Trash2, Loader2, CheckCircle, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ShareDialog() {
  const { isShareDialogOpen, closeShareDialog, selectedItems, files, folders } = useDriveStore();
  const { toast } = useToast();

  const [accessControl, setAccessControl] = useState<DriveAccessControl>('link-only');
  const [accessLevel, setAccessLevel] = useState<DriveAccessLevel>('view');
  const [inviteInput, setInviteInput] = useState('');
  const [allowedUsers, setAllowedUsers] = useState<Array<{ email: string; accessLevel: DriveAccessLevel }>>([]);
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [existingShares, setExistingShares] = useState<DriveShare[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  const requiresAllowedUsers = accessControl === 'users-only';
  const canCreateShare = !requiresAllowedUsers || allowedUsers.length > 0;

  useEffect(() => {
    if (accessControl !== 'users-only') {
      setInviteInput('');
      setAllowedUsers([]);
    }
  }, [accessControl]);

  const normalizedAllowedUsers = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ email: string; accessLevel: DriveAccessLevel }> = [];
    for (const u of allowedUsers) {
      const email = (u.email || '').trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      result.push({ email, accessLevel: u.accessLevel });
    }
    return result;
  }, [allowedUsers]);

  // Get selected item details
  const selectedItem = selectedItems[0];
  const itemDetails = selectedItem
    ? selectedItem.type === 'file'
      ? files.find((f) => f.id === selectedItem.id)
      : folders.find((f) => f.id === selectedItem.id)
    : null;

  // Load existing shares
  useEffect(() => {
    if (isShareDialogOpen && selectedItem) {
      loadExistingShares();
    }
  }, [isShareDialogOpen, selectedItem]);

  const loadExistingShares = async () => {
    if (!selectedItem) return;

    setIsLoadingShares(true);
    const result = await getSharesForItem(selectedItem.type, selectedItem.id);
    if (result.success && result.data) {
      setExistingShares(result.data);
    }
    setIsLoadingShares(false);
  };

  const handleCreateShare = async () => {
    if (!selectedItem) return;
    if (!canCreateShare) {
      toast({
        title: 'Add at least one email',
        description: 'Select "Specific people" and add emails before creating a share link.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    const result = await createShare({
      targetType: selectedItem.type,
      targetId: selectedItem.id,
      accessControl,
      accessLevel,
      allowedUsers: requiresAllowedUsers ? normalizedAllowedUsers : undefined,
      password: usePassword && password ? password : undefined,
    });

    if (result.success && result.data) {
      await navigator.clipboard.writeText(result.data.shareUrl);
      toast({ title: 'Share link created and copied to clipboard' });
      loadExistingShares();
    } else {
      toast({ title: 'Failed to create share', description: result.error, variant: 'destructive' });
    }
    setIsCreating(false);
  };

  const handleCopyLink = async (shareUrl: string, shareId: string) => {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedShareId(shareId);
    setTimeout(() => setCopiedShareId(null), 2000);
    toast({ title: 'Link copied to clipboard' });
  };

  const handleRevokeShare = async (shareId: string) => {
    const result = await revokeShare(shareId);
    if (result.success) {
      toast({ title: 'Share revoked' });
      loadExistingShares();
    } else {
      toast({ title: 'Failed to revoke share', description: result.error, variant: 'destructive' });
    }
  };

  const handleClose = () => {
    setAccessControl('link-only');
    setAccessLevel('view');
    setInviteInput('');
    setAllowedUsers([]);
    setPassword('');
    setUsePassword(false);
    setExistingShares([]);
    closeShareDialog();
  };

  const addInvites = () => {
    const raw = inviteInput.trim();
    if (!raw) return;

    // Allow comma/space/newline separated emails
    const emails = raw
      .split(/[\s,;]+/g)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const valid = emails.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    const invalid = emails.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (invalid.length > 0) {
      toast({
        title: 'Invalid email(s)',
        description: invalid.slice(0, 3).join(', '),
        variant: 'destructive',
      });
    }

    if (valid.length === 0) return;

    setAllowedUsers((prev) => {
      const next = [...prev];
      for (const email of valid) {
        if (next.some((u) => u.email.toLowerCase() === email)) continue;
        next.push({ email, accessLevel });
      }
      return next;
    });

    setInviteInput('');
  };

  const removeInvite = (email: string) => {
    setAllowedUsers((prev) => prev.filter((u) => u.email.toLowerCase() !== email.toLowerCase()));
  };

  return (
    <Dialog open={isShareDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share {selectedItem?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
          <DialogDescription>
            {itemDetails?.name ? `"${itemDetails.name}"` : 'Configure sharing settings'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Access Control */}
          <div>
            <Label>Who can access</Label>
            <Select value={accessControl} onValueChange={(v) => setAccessControl(v as DriveAccessControl)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DRIVE_ACCESS_CONTROLS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-muted-foreground">{config.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Access Level */}
          <div>
            <Label>Permission level</Label>
            <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as DriveAccessLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DRIVE_ACCESS_LEVELS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-muted-foreground">{config.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* People Invites */}
          {requiresAllowedUsers && (
            <div className="space-y-2">
              <div>
                <Label>Invite people</Label>
                <p className="text-xs text-muted-foreground">Only these emails will be allowed to access.</p>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="name@example.com, other@example.com"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addInvites();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={addInvites} disabled={!inviteInput.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {normalizedAllowedUsers.length > 0 ? (
                <div className="space-y-1">
                  {normalizedAllowedUsers.map((u) => (
                    <div key={u.email} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1 truncate">{u.email}</div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeInvite(u.email)}
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No invites added yet.</p>
              )}
            </div>
          )}

          {/* Password Protection */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Password protection</Label>
              <p className="text-xs text-muted-foreground">Require password to access</p>
            </div>
            <Switch checked={usePassword} onCheckedChange={setUsePassword} />
          </div>

          {usePassword && (
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          {/* Create Share Button */}
          <Button onClick={handleCreateShare} disabled={isCreating || !canCreateShare} className="w-full">
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Create Share Link
              </>
            )}
          </Button>

          {/* Existing Shares */}
          {existingShares.length > 0 && (
            <>
              <Separator />
              <div>
                <Label className="mb-2 block">Active Share Links</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {existingShares.map((share) => {
                    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/drive/share/${share.shareToken}`;
                    return (
                      <div key={share.id} className="flex items-center gap-2 p-2 border rounded-lg text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{DRIVE_ACCESS_CONTROLS[share.accessControl].label}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {share.viewCount} views • {share.downloadCount} downloads
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyLink(shareUrl, share.id)}
                        >
                          {copiedShareId === share.id ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRevokeShare(share.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
