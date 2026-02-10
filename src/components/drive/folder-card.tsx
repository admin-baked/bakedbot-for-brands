'use client';

/**
 * Folder Card Component
 *
 * Displays a single folder item in grid or list view.
 */

import { useDriveStore, type DriveViewMode } from '@/lib/store/drive-store';
import type { DriveFolder } from '@/types/drive';
import { formatFileSize } from '@/types/drive';
import { cn } from '@/lib/utils';
import {
  Folder,
  FolderOpen,
  Bot,
  QrCode,
  Image,
  FileText,
  MoreVertical,
  Trash2,
  Edit,
  Move,
  Share2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { deleteItem, restoreItem } from '@/server/actions/drive';
import { useToast } from '@/hooks/use-toast';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  agents: Bot,
  qr: QrCode,
  images: Image,
  documents: FileText,
  custom: Folder,
};

interface FolderCardProps {
  folder: DriveFolder;
  viewMode: DriveViewMode;
  onRefresh: () => void;
}

export function FolderCard({ folder, viewMode, onRefresh }: FolderCardProps) {
  const {
    navigateToFolder,
    selectItem,
    isSelected,
    openRenameDialog,
    openMoveDialog,
    openShareDialog,
    isTrashViewOpen,
  } = useDriveStore();
  const { toast } = useToast();

  const selected = isSelected({ type: 'folder', id: folder.id });
  const Icon = folder.isSystemFolder
    ? CATEGORY_ICONS[folder.category || 'custom'] || Folder
    : Folder;

  const handleDoubleClick = () => {
    if (!isTrashViewOpen) {
      navigateToFolder(folder.id);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectItem({ type: 'folder', id: folder.id }, e.ctrlKey || e.metaKey);
  };

  const handleDelete = async () => {
    const result = await deleteItem('folder', folder.id);
    if (result.success) {
      toast({ title: 'Folder moved to trash' });
      onRefresh();
    } else {
      toast({ title: 'Failed to delete', description: result.error, variant: 'destructive' });
    }
  };

  const handleRestore = async () => {
    const result = await restoreItem('folder', folder.id);
    if (result.success) {
      toast({ title: 'Folder restored' });
      onRefresh();
    } else {
      toast({ title: 'Failed to restore', description: result.error, variant: 'destructive' });
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer',
          selected && 'bg-primary/10 border-primary'
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => selectItem({ type: 'folder', id: folder.id })}
          onClick={(e) => e.stopPropagation()}
        />
        <Icon className="h-5 w-5 text-blue-500" style={{ color: folder.color || undefined }} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{folder.name}</p>
          <p className="text-xs text-muted-foreground">
            {folder.fileCount} items{folder.totalSize > 0 && ` • ${formatFileSize(folder.totalSize)}`}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isTrashViewOpen ? (
              <DropdownMenuItem onClick={handleRestore}>Restore</DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => navigateToFolder(folder.id)}>Open</DropdownMenuItem>
                {!folder.isSystemFolder && (
                  <>
                    <DropdownMenuItem onClick={() => openRenameDialog({ type: 'folder', id: folder.id })}>
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openMoveDialog({ type: 'folder', id: folder.id })}>
                      <Move className="h-4 w-4 mr-2" />
                      Move
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => openShareDialog({ type: 'folder', id: folder.id })}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                {!folder.isSystemFolder && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col items-center p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors',
        selected && 'bg-primary/10 border-primary'
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Selection checkbox */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Checkbox
          checked={selected}
          onCheckedChange={() => selectItem({ type: 'folder', id: folder.id })}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Menu */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isTrashViewOpen ? (
              <DropdownMenuItem onClick={handleRestore}>Restore</DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => navigateToFolder(folder.id)}>Open</DropdownMenuItem>
                {!folder.isSystemFolder && (
                  <>
                    <DropdownMenuItem onClick={() => openRenameDialog({ type: 'folder', id: folder.id })}>
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openMoveDialog({ type: 'folder', id: folder.id })}>
                      <Move className="h-4 w-4 mr-2" />
                      Move
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => openShareDialog({ type: 'folder', id: folder.id })}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                {!folder.isSystemFolder && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Icon */}
      <div className="mb-2">
        <Icon
          className="h-12 w-12 text-blue-500"
          style={{ color: folder.color || undefined }}
        />
      </div>

      {/* Name */}
      <p className="text-sm font-medium text-center truncate w-full">{folder.name}</p>
      <p className="text-xs text-muted-foreground">
        {folder.fileCount} items
      </p>

      {/* Shared indicator */}
      {folder.isShared && (
        <div className="absolute bottom-2 right-2">
          <Share2 className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
