'use client';

/**
 * Share Dialog Component
 *
 * Dialog for configuring sharing settings for files and folders.
 */

import { useState, useEffect } from 'react';
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
import { Copy, Link, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ShareDialog() {
  const { isShareDialogOpen, closeShareDialog, selectedItems, files, folders } = useDriveStore();
  const { toast } = useToast();

  const [accessControl, setAccessControl] = useState<DriveAccessControl>('link-only');
  const [accessLevel, setAccessLevel] = useState<DriveAccessLevel>('view');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [existingShares, setExistingShares] = useState<DriveShare[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

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

    setIsCreating(true);
    const result = await createShare({
      targetType: selectedItem.type,
      targetId: selectedItem.id,
      accessControl,
      accessLevel,
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
    setPassword('');
    setUsePassword(false);
    setExistingShares([]);
    closeShareDialog();
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
          <Button onClick={handleCreateShare} disabled={isCreating} className="w-full">
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
