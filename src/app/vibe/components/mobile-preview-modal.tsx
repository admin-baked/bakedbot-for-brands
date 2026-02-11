'use client';

/**
 * Mobile Preview Modal - Full-screen preview for mobile devices
 *
 * Triggered by floating "Preview" button on mobile
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Monitor,
  Smartphone,
  Save,
  Share2,
  ArrowRight,
} from 'lucide-react';
import { VibePreview } from '../vibe-preview';
import type { PublicVibe, PublicMobileVibe } from '../actions';
import { useState } from 'react';

interface MobilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVibe: PublicVibe | PublicMobileVibe | null;
  onSaveClick?: () => void;
  onShareClick?: () => void;
  onUpgradeClick?: () => void;
}

export function MobilePreviewModal({
  open,
  onOpenChange,
  currentVibe,
  onSaveClick,
  onShareClick,
  onUpgradeClick,
}: MobilePreviewModalProps) {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  if (!currentVibe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-full m-0 p-0 gap-0">
        {/* Header */}
        <DialogHeader className="border-b p-4 space-y-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base flex items-center gap-2">
              {currentVibe.config.name || 'Your Vibe'}
              <Badge variant="secondary" className="text-xs">
                {currentVibe.type === 'web' ? 'Web' : 'Mobile'}
              </Badge>
            </DialogTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Device Toggle */}
          <div className="flex gap-1 pt-2">
            <Button
              size="sm"
              variant={previewDevice === 'desktop' ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setPreviewDevice('desktop')}
            >
              <Monitor className="w-3 h-3 mr-1" />
              Desktop
            </Button>
            <Button
              size="sm"
              variant={previewDevice === 'mobile' ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setPreviewDevice('mobile')}
            >
              <Smartphone className="w-3 h-3 mr-1" />
              Mobile
            </Button>
          </div>
        </DialogHeader>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-gradient-to-b from-muted/20 to-background p-4">
          <div className={previewDevice === 'mobile' ? 'max-w-sm mx-auto' : ''}>
            <VibePreview vibe={currentVibe} />
          </div>
        </div>

        {/* Action Bar */}
        <div className="border-t p-4 bg-background space-y-2">
          <Button
            className="w-full gap-2"
            onClick={() => {
              onUpgradeClick?.();
              onOpenChange(false);
            }}
          >
            <ArrowRight className="w-4 h-4" />
            Publish This Design
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                onSaveClick?.();
                onOpenChange(false);
              }}
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                onShareClick?.();
                onOpenChange(false);
              }}
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
