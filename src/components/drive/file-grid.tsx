'use client';

/**
 * File Grid Component
 *
 * Displays files and folders in a grid or list view.
 */

import { useDriveStore } from '@/lib/store/drive-store';
import type { DriveFile, DriveFolder } from '@/types/drive';
import { FolderCard } from './folder-card';
import { FileCard } from './file-card';
import { cn } from '@/lib/utils';
import { FolderPlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileGridProps {
  folders: DriveFolder[];
  files: DriveFile[];
  onRefresh: () => void;
}

export function FileGrid({ folders, files, onRefresh }: FileGridProps) {
  const { viewMode, openUploadDialog, isTrashViewOpen } = useDriveStore();

  const isEmpty = folders.length === 0 && files.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          {isTrashViewOpen ? (
            <FolderPlus className="h-8 w-8 text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <h3 className="font-medium mb-1">
          {isTrashViewOpen ? 'Trash is empty' : 'No files yet'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {isTrashViewOpen
            ? 'Items you delete will appear here'
            : 'Upload files or create folders to get started'}
        </p>
        {!isTrashViewOpen && (
          <Button onClick={openUploadDialog}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        viewMode === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
          : 'flex flex-col gap-2'
      )}
    >
      {/* Folders first */}
      {folders.map((folder) => (
        <FolderCard key={folder.id} folder={folder} viewMode={viewMode} onRefresh={onRefresh} />
      ))}

      {/* Then files */}
      {files.map((file) => (
        <FileCard key={file.id} file={file} viewMode={viewMode} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
