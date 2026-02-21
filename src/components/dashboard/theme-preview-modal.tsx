'use client';

/**
 * Theme Preview Modal Component
 *
 * Full-screen modal showing theme preview
 * - Theme metadata (name, author, description, version)
 * - Screenshot preview (if available)
 * - Safe for displaying third-party theme content
 */

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WordPressTheme } from '@/types/wordpress-theme';

interface ThemePreviewModalProps {
  theme: WordPressTheme;
  onClose: () => void;
}

export function ThemePreviewModal({ theme, onClose }: ThemePreviewModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{theme.name}</h2>
              {theme.author && (
                <p className="text-sm text-muted-foreground">by {theme.author}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">v{theme.version}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            {/* Screenshot */}
            {theme.screenshotUrl ? (
              <div className="space-y-2">
                <h3 className="font-medium">Preview</h3>
                <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                  <img
                    src={theme.screenshotUrl}
                    alt={`${theme.name} preview`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-muted rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No preview image available</p>
              </div>
            )}

            {/* Description */}
            {theme.description && (
              <div>
                <h3 className="font-medium mb-2">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {theme.description}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">
                  Version
                </div>
                <div className="text-sm font-medium">{theme.version}</div>
              </div>
              {theme.author && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">
                    Author
                  </div>
                  <div className="text-sm font-medium">{theme.author}</div>
                </div>
              )}
              {theme.license && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase">
                    License
                  </div>
                  <div className="text-sm font-medium">{theme.license}</div>
                </div>
              )}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">
                  File Size
                </div>
                <div className="text-sm font-medium">
                  {(theme.fileSize / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>

            {/* Theme URI */}
            {theme.themeUri && (
              <div className="pt-4 border-t">
                <a
                  href={theme.themeUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View Theme Website →
                </a>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 p-6 border-t bg-muted/30">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
