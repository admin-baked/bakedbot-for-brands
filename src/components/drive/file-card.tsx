'use client';

/**
 * File Card Component
 *
 * Displays a single file item in grid or list view.
 */

import { useDriveStore, type DriveViewMode } from '@/lib/store/drive-store';
import type { DriveFile } from '@/types/drive';
import { formatFileSize, getFileIcon } from '@/types/drive';
import { cn } from '@/lib/utils';
import {
  File,
  Image,
  FileText,
  Video,
  Music,
  Braces,
  FileCode,
  Table,
  Presentation,
  MoreVertical,
  Trash2,
  Edit,
  Move,
  Share2,
  Download,
  Copy,
  ExternalLink,
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
import { deleteItem, restoreItem, duplicateFile } from '@/server/actions/drive';
import { useToast } from '@/hooks/use-toast';
import NextImage from 'next/image';

const FILE_ICONS: Record<string, React.ElementType> = {
  Image: Image,
  FileText: FileText,
  Video: Video,
  Music: Music,
  Braces: Braces,
  FileCode: FileCode,
  Table: Table,
  Presentation: Presentation,
  File: File,
};

interface FileCardProps {
  file: DriveFile;
  viewMode: DriveViewMode;
  onRefresh: () => void;
}

export function FileCard({ file, viewMode, onRefresh }: FileCardProps) {
  const {
    selectItem,
    isSelected,
    openRenameDialog,
    openMoveDialog,
    openShareDialog,
    isTrashViewOpen,
  } = useDriveStore();
  const { toast } = useToast();

  const selected = isSelected({ type: 'file', id: file.id });
  const iconName = getFileIcon(file.mimeType);
  const Icon = FILE_ICONS[iconName] || File;
  const isImage = file.mimeType.startsWith('image/');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectItem({ type: 'file', id: file.id }, e.ctrlKey || e.metaKey);
  };

  const handleDownload = () => {
    window.open(file.downloadUrl, '_blank');
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(file.downloadUrl);
    toast({ title: 'Link copied to clipboard' });
  };

  const handleDelete = async () => {
    const result = await deleteItem('file', file.id);
    if (result.success) {
      toast({ title: 'File moved to trash' });
      onRefresh();
    } else {
      toast({ title: 'Failed to delete', description: result.error, variant: 'destructive' });
    }
  };

  const handleRestore = async () => {
    const result = await restoreItem('file', file.id);
    if (result.success) {
      toast({ title: 'File restored' });
      onRefresh();
    } else {
      toast({ title: 'Failed to restore', description: result.error, variant: 'destructive' });
    }
  };

  const handleDuplicate = async () => {
    const result = await duplicateFile(file.id);
    if (result.success) {
      toast({ title: 'File duplicated' });
      onRefresh();
    } else {
      toast({ title: 'Failed to duplicate', description: result.error, variant: 'destructive' });
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
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => selectItem({ type: 'file', id: file.id })}
          onClick={(e) => e.stopPropagation()}
        />
        {isImage && file.thumbnailUrl ? (
          <div className="h-10 w-10 rounded overflow-hidden bg-muted">
            <NextImage
              src={file.thumbnailUrl || file.downloadUrl}
              alt={file.name}
              width={40}
              height={40}
              className="object-cover"
            />
          </div>
        ) : (
          <Icon className="h-5 w-5 text-muted-foreground" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
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
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openRenameDialog({ type: 'file', id: file.id })}>
                  <Edit className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openMoveDialog({ type: 'file', id: file.id })}>
                  <Move className="h-4 w-4 mr-2" />
                  Move
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openShareDialog({ type: 'file', id: file.id })}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
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
    >
      {/* Selection checkbox */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Checkbox
          checked={selected}
          onCheckedChange={() => selectItem({ type: 'file', id: file.id })}
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
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openRenameDialog({ type: 'file', id: file.id })}>
                  <Edit className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openMoveDialog({ type: 'file', id: file.id })}>
                  <Move className="h-4 w-4 mr-2" />
                  Move
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openShareDialog({ type: 'file', id: file.id })}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Preview / Icon */}
      <div className="mb-2 h-16 w-full flex items-center justify-center">
        {isImage ? (
          <div className="h-16 w-full rounded overflow-hidden bg-muted flex items-center justify-center">
            <NextImage
              src={file.thumbnailUrl || file.downloadUrl}
              alt={file.name}
              width={64}
              height={64}
              className="object-contain max-h-16"
            />
          </div>
        ) : (
          <Icon className="h-12 w-12 text-muted-foreground" />
        )}
      </div>

      {/* Name */}
      <p className="text-sm font-medium text-center truncate w-full">{file.name}</p>
      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>

      {/* Shared indicator */}
      {file.isShared && (
        <div className="absolute bottom-2 right-2">
          <Share2 className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
