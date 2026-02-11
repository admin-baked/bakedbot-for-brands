'use client';

/**
 * Live Preview Pane - Side-by-side preview for /vibe
 *
 * Shows real-time preview of generated vibes as users build them.
 * Sticky on desktop, modal on mobile.
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Sparkles,
  Save,
  Code,
  Maximize2,
  Monitor,
  Smartphone,
  ArrowRight,
} from 'lucide-react';
import { VibePreview } from '../vibe-preview';
import type { PublicVibe, PublicMobileVibe } from '../actions';
import Link from 'next/link';

interface LivePreviewPaneProps {
  currentVibe: PublicVibe | PublicMobileVibe | null;
  generating: boolean;
  onSaveClick?: () => void;
  onExportClick?: () => void;
  onUpgradeClick?: () => void;
}

export function LivePreviewPane({
  currentVibe,
  generating,
  onSaveClick,
  onExportClick,
  onUpgradeClick,
}: LivePreviewPaneProps) {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <Card className="sticky top-4 h-[calc(100vh-2rem)] flex flex-col shadow-lg border-2">
      {/* Header */}
      <div className="border-b p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Live Preview</h3>
            {generating && (
              <Badge variant="secondary" className="gap-1 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating...
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
              className="h-7 px-2"
              onClick={() => setPreviewDevice('desktop')}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
              className="h-7 px-2"
              onClick={() => setPreviewDevice('mobile')}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {generating
            ? 'AI is crafting your design...'
            : currentVibe
            ? 'Your design updates in real-time'
            : 'Describe your vibe to see a preview'}
        </p>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-gradient-to-b from-muted/20 to-background">
        {generating && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Generating your vibe...</p>
                <p className="text-xs text-muted-foreground">This takes 10-15 seconds</p>
              </div>
            </div>
          </div>
        )}

        {!generating && !currentVibe && (
          <div className="flex items-center justify-center h-full text-muted-foreground p-8">
            <div className="text-center space-y-4 max-w-xs">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-primary/40" />
              </div>
              <div className="space-y-2">
                <p className="font-medium">Preview Your Design</p>
                <p className="text-xs leading-relaxed">
                  Describe your vibe on the left and watch your design come to life here in real-time
                </p>
              </div>
            </div>
          </div>
        )}

        {!generating && currentVibe && (
          <div className={`p-6 ${previewDevice === 'mobile' ? 'flex justify-center' : ''}`}>
            <div className={previewDevice === 'mobile' ? 'w-full max-w-sm' : 'w-full'}>
              <VibePreview vibe={currentVibe} />
            </div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      {currentVibe && !generating && (
        <div className="border-t p-4 bg-muted/30 space-y-2">
          {/* Primary Actions */}
          <div className="space-y-2">
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={onUpgradeClick}
            >
              <ArrowRight className="w-4 h-4" />
              Publish This Design
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={onSaveClick}
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={onExportClick}
              >
                <Code className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Ready for more?{' '}
              <Link href="/vibe/beta" className="text-primary hover:underline font-medium">
                Try the Builder →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Empty State Actions */}
      {!currentVibe && !generating && (
        <div className="border-t p-4 bg-muted/30">
          <div className="text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              Not sure where to start?
            </p>
            <Button size="sm" variant="outline" className="w-full" asChild>
              <Link href="#presets">
                Browse Presets
              </Link>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
