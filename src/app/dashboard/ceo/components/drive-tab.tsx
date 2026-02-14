'use client';

/**
 * BakedBot Drive Tab
 *
 * Main tab component for the Drive feature in CEO Dashboard.
 * Provides a Google Drive-like file storage experience.
 */

import { useEffect } from 'react';
import { useDriveStore } from '@/lib/store/drive-store';
import { getStorageStats, getTrash } from '@/server/actions/drive';
import { FileBrowser, UploadDialog, ShareDialog } from '@/components/drive';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFileSize } from '@/types/drive';
import { HardDrive, File, Folder, Bot, QrCode, Image, FileText } from 'lucide-react';

export default function DriveTab() {
  const { isTrashViewOpen, setFolders, setFiles, setIsLoading, setError } = useDriveStore();

  // Load trash view when opened
  useEffect(() => {
    if (isTrashViewOpen) {
      loadTrash();
    }
  }, [isTrashViewOpen]);

  const loadTrash = async () => {
    setIsLoading(true);
    const result = await getTrash();
    if (result.success && result.data) {
      setFolders(result.data.folders);
      setFiles(result.data.files);
    } else {
      setError(result.error || 'Failed to load trash');
    }
    setIsLoading(false);
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Main File Browser */}
      <div className="h-full border rounded-lg bg-background overflow-hidden">
        <FileBrowser />
      </div>

      {/* Dialogs */}
      <UploadDialog />
      <ShareDialog />
    </div>
  );
}
