'use client';

/**
 * Theme Manager Component
 *
 * Main admin panel for managing WordPress themes:
 * - List uploaded themes
 * - Activate/deactivate themes
 * - Delete themes
 * - Upload new themes
 * - Preview themes
 */

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertCircle, Trash2, Eye, CheckCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { WordPressTheme } from '@/types/wordpress-theme';
import { ThemeUploader } from './theme-uploader';
import { ThemePreviewModal } from './theme-preview-modal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ThemeManagerProps {
  orgId: string;
  onTabChange?: (tab: 'themes' | 'upload') => void;
}

export function ThemeManager({ orgId, onTabChange }: ThemeManagerProps) {
  const [themes, setThemes] = useState<WordPressTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<WordPressTheme | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'themes' | 'upload'>('themes');

  // Load themes on mount
  useEffect(() => {
    loadThemes();
  }, [orgId]);

  const loadThemes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/themes/list?orgId=${orgId}&pageSize=20`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load themes');
        return;
      }

      setThemes(data.themes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('[Theme Manager] Load error', { error: err });
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateTheme = async (themeId: string) => {
    try {
      setIsActivating(themeId);

      const response = await fetch('/api/themes/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, themeId }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to activate theme');
        return;
      }

      // Update local state
      setThemes(
        themes.map((t) => ({
          ...t,
          active: t.id === themeId,
        }))
      );

      logger.info('[Theme Manager] Theme activated', { themeId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('[Theme Manager] Activate error', { error: err });
    } finally {
      setIsActivating(null);
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    try {
      setIsDeleting(themeId);

      const response = await fetch('/api/themes/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, themeId }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to delete theme');
        return;
      }

      // Remove from local state
      setThemes(themes.filter((t) => t.id !== themeId));
      setDeleteConfirm(null);

      logger.info('[Theme Manager] Theme deleted', { themeId, fallbackToDefault: data.fallbackToDefault });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('[Theme Manager] Delete error', { error: err });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUploadSuccess = (themeId: string, themeName: string) => {
    logger.info('[Theme Manager] Upload success, reloading themes', { themeId, themeName });
    loadThemes();
  };

  return (
    <div className="space-y-6">
      {/* Error alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-red-900">{error}</div>
            <Button
              variant="link"
              size="sm"
              className="text-red-700 p-0 h-auto mt-1"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'themes' | 'upload')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="themes">
            My Themes
            {themes.length > 0 && (
              <span className="ml-2 bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-medium">
                {themes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upload">Upload New</TabsTrigger>
        </TabsList>

        {/* My Themes Tab */}
        <TabsContent value="themes" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading themes...</div>
          ) : themes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">No themes uploaded yet</div>
              <Button onClick={() => setActiveTab('upload')}>
                Upload Your First Theme
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className={`border rounded-lg p-4 space-y-3 transition-colors ${
                    theme.active
                      ? 'bg-primary/5 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{theme.name}</h3>
                      <div className="text-sm text-muted-foreground">v{theme.version}</div>
                    </div>
                    {theme.active && (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                    )}
                  </div>

                  {/* Info */}
                  {theme.author && (
                    <div className="text-sm text-muted-foreground">by {theme.author}</div>
                  )}

                  {theme.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {theme.description}
                    </p>
                  )}

                  {/* Upload date */}
                  <div className="text-xs text-muted-foreground">
                    Uploaded {new Date(theme.uploadedAt).toLocaleDateString()}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewTheme(theme)}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>

                    {!theme.active && (
                      <Button
                        size="sm"
                        onClick={() => handleActivateTheme(theme.id)}
                        disabled={isActivating === theme.id}
                        className="flex-1"
                      >
                        {isActivating === theme.id ? 'Activating...' : 'Activate'}
                      </Button>
                    )}

                    {theme.active && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        className="flex-1"
                      >
                        Active
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(theme.id)}
                      disabled={isDeleting === theme.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="pt-4">
          <ThemeUploader
            orgId={orgId}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={(error) => setError(error)}
          />
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {previewTheme && (
        <ThemePreviewModal
          theme={previewTheme}
          onClose={() => setPreviewTheme(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Theme?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the "{themes.find((t) => t.id === deleteConfirm)?.name}" theme.
            {themes.find((t) => t.id === deleteConfirm)?.active && (
              <div className="mt-2 text-amber-700 bg-amber-50 p-2 rounded">
                This is your active theme. Your site will revert to the default BakedBot theme.
              </div>
            )}
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteTheme(deleteConfirm)}
              disabled={isDeleting === deleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting === deleteConfirm ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
