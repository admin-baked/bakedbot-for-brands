'use client';

/**
 * Folder Tree Component
 *
 * Displays a hierarchical tree of folders for navigation.
 */

import { useDriveStore } from '@/lib/store/drive-store';
import { DRIVE_CATEGORIES } from '@/types/drive';
import type { DriveFolder } from '@/types/drive';
import { cn } from '@/lib/utils';
import {
  Bot,
  QrCode,
  Image,
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  HardDrive,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  agents: Bot,
  qr: QrCode,
  images: Image,
  documents: FileText,
  custom: Folder,
};

interface FolderTreeItemProps {
  folder: DriveFolder;
  level: number;
}

function FolderTreeItem({ folder, level }: FolderTreeItemProps) {
  const { currentFolderId, navigateToFolder } = useDriveStore();
  const isActive = currentFolderId === folder.id;
  const Icon = folder.isSystemFolder
    ? CATEGORY_ICONS[folder.category || 'custom'] || Folder
    : isActive
    ? FolderOpen
    : Folder;

  return (
    <Button
      variant="ghost"
      className={cn(
        'w-full justify-start h-9 px-2 font-normal',
        isActive && 'bg-accent text-accent-foreground',
        level > 0 && 'pl-' + (level * 4 + 2)
      )}
      style={{ paddingLeft: level > 0 ? `${level * 16 + 8}px` : undefined }}
      onClick={() => navigateToFolder(folder.id)}
    >
      <Icon className="h-4 w-4 mr-2 shrink-0" style={{ color: folder.color || undefined }} />
      <span className="truncate">{folder.name}</span>
      {folder.fileCount > 0 && (
        <span className="ml-auto text-xs text-muted-foreground">{folder.fileCount}</span>
      )}
    </Button>
  );
}

export function FolderTree() {
  const { folderTree, currentFolderId, navigateToFolder, openTrashView, isTrashViewOpen } =
    useDriveStore();

  // Separate system folders and custom folders
  const systemFolders = folderTree.filter((f) => f.isSystemFolder && f.depth === 0);
  const customFolders = folderTree.filter((f) => !f.isSystemFolder && f.parentId === null);

  // Build nested tree for custom folders
  const buildTree = (parentId: string | null, level: number = 0): DriveFolder[] => {
    return folderTree
      .filter((f) => f.parentId === parentId && !f.isSystemFolder)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  return (
    <div className="py-4">
      {/* Root / All Files */}
      <div className="px-3 mb-2">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start h-9 px-2 font-normal',
            currentFolderId === null && !isTrashViewOpen && 'bg-accent text-accent-foreground'
          )}
          onClick={() => navigateToFolder(null)}
        >
          <HardDrive className="h-4 w-4 mr-2" />
          <span>All Files</span>
        </Button>
      </div>

      {/* System Folders */}
      {systemFolders.length > 0 && (
        <div className="px-3 mb-4">
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Categories</div>
          {systemFolders.map((folder) => (
            <FolderTreeItem key={folder.id} folder={folder} level={0} />
          ))}
        </div>
      )}

      {/* Custom Folders */}
      {customFolders.length > 0 && (
        <div className="px-3 mb-4">
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Folders</div>
          {customFolders.map((folder) => (
            <FolderTreeItem key={folder.id} folder={folder} level={0} />
          ))}
        </div>
      )}

      {/* Trash */}
      <div className="px-3 mt-4 pt-4 border-t">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start h-9 px-2 font-normal text-muted-foreground',
            isTrashViewOpen && 'bg-accent text-accent-foreground'
          )}
          onClick={openTrashView}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          <span>Trash</span>
        </Button>
      </div>
    </div>
  );
}
