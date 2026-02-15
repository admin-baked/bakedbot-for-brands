'use client';



/**
 * BakedBot Drive Page
 *
 * Standalone file storage page accessible to all paid roles.
 * Reuses the DriveTab component from the CEO dashboard.
 */

import { useEffect } from 'react';
import { useDriveStore } from '@/lib/store/drive-store';
import { getTrash } from '@/server/actions/drive';
import { FileBrowser, UploadDialog, ShareDialog } from '@/components/drive';

export default function DrivePage() {
  const { isTrashViewOpen, setFolders, setFiles, setIsLoading, setError } = useDriveStore();

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
    <div className="h-[calc(100vh-4rem)] p-4">
      <div className="h-full border rounded-lg bg-background overflow-hidden">
        <FileBrowser />
      </div>
      <UploadDialog />
      <ShareDialog />
    </div>
  );
}
