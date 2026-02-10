'use client';

/**
 * File Browser Component
 *
 * Main component for browsing files and folders in BakedBot Drive.
 * Provides a split view with folder tree and file grid.
 */

import { useEffect, useCallback } from 'react';
import { useDriveStore, useFilteredItems } from '@/lib/store/drive-store';
import { getFolderContents, getFolderTree } from '@/server/actions/drive';
import { FolderTree } from './folder-tree';
import { FileGrid } from './file-grid';
import { DriveBreadcrumbs } from './breadcrumbs';
import { DriveToolbar } from './toolbar';
import { Loader2 } from 'lucide-react';

export function FileBrowser() {
  const {
    currentFolderId,
    isLoading,
    isTrashViewOpen,
    setFolders,
    setFiles,
    setBreadcrumbs,
    setFolderTree,
    setIsLoading,
    setError,
  } = useDriveStore();

  const { folders, files } = useFilteredItems();

  // Load folder contents
  const loadContents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getFolderContents(currentFolderId);
      if (result.success && result.data) {
        setFolders(result.data.folders);
        setFiles(result.data.files);
        setBreadcrumbs(result.data.breadcrumbs);
      } else {
        setError(result.error || 'Failed to load contents');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contents');
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId, setFolders, setFiles, setBreadcrumbs, setIsLoading, setError]);

  // Load folder tree
  const loadTree = useCallback(async () => {
    try {
      const result = await getFolderTree();
      if (result.success && result.data) {
        setFolderTree(result.data);
      }
    } catch (err) {
      // Tree loading failure is non-critical
    }
  }, [setFolderTree]);

  // Initial load
  useEffect(() => {
    loadContents();
    loadTree();
  }, [loadContents, loadTree]);

  // Reload when folder changes
  useEffect(() => {
    if (!isTrashViewOpen) {
      loadContents();
    }
  }, [currentFolderId, isTrashViewOpen, loadContents]);

  return (
    <div className="flex h-full">
      {/* Sidebar - Folder Tree */}
      <div className="w-64 border-r bg-muted/30 overflow-y-auto hidden lg:block">
        <FolderTree />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <DriveToolbar onRefresh={loadContents} />

        {/* Breadcrumbs */}
        <DriveBreadcrumbs />

        {/* File Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <FileGrid folders={folders} files={files} onRefresh={loadContents} />
          )}
        </div>
      </div>
    </div>
  );
}
