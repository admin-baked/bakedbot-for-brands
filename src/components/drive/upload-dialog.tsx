'use client';

/**
 * Upload Dialog Component
 *
 * Dialog for uploading files via drag-drop or URL input.
 */

import { useState, useCallback, useRef } from 'react';
import { useDriveStore } from '@/lib/store/drive-store';
import { uploadFile, uploadFileFromUrl } from '@/server/actions/drive';
import { DRIVE_CATEGORIES, type DriveCategory, formatFileSize } from '@/types/drive';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Upload, Link, X, File, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function UploadDialog() {
  const { isUploadDialogOpen, closeUploadDialog, currentFolderId, addFile } = useDriveStore();
  const { toast } = useToast();

  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DriveCategory>('custom');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    addFilesToQueue(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addFilesToQueue(files);
    }
  }, []);

  const addFilesToQueue = (files: File[]) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending',
    }));
    setUploadQueue((prev) => [...prev, ...newItems]);
  };

  const removeFromQueue = (id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQueueItem = (id: string, updates: Partial<UploadItem>) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const uploadAllFiles = async () => {
    const pendingItems = uploadQueue.filter((item) => item.status === 'pending');
    if (pendingItems.length === 0) return;

    setIsUploading(true);

    for (const item of pendingItems) {
      updateQueueItem(item.id, { status: 'uploading', progress: 10 });

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        if (currentFolderId) {
          formData.append('folderId', currentFolderId);
        }
        formData.append('category', selectedCategory);

        updateQueueItem(item.id, { progress: 50 });

        const result = await uploadFile(formData);

        if (result.success && result.data) {
          updateQueueItem(item.id, { status: 'success', progress: 100 });
          addFile(result.data);
        } else {
          updateQueueItem(item.id, { status: 'error', error: result.error || 'Upload failed' });
        }
      } catch (err) {
        updateQueueItem(item.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    }

    setIsUploading(false);

    const successCount = uploadQueue.filter((item) => item.status === 'success').length;
    if (successCount > 0) {
      toast({ title: `${successCount} file(s) uploaded successfully` });
    }
  };

  const handleUploadFromUrl = async () => {
    if (!urlInput.trim()) return;

    setIsUploading(true);

    try {
      const result = await uploadFileFromUrl(urlInput.trim(), currentFolderId, selectedCategory);

      if (result.success && result.data) {
        addFile(result.data);
        setUrlInput('');
        toast({ title: 'File uploaded from URL' });
      } else {
        toast({ title: 'Failed to upload from URL', description: result.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({
        title: 'Failed to upload from URL',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }

    setIsUploading(false);
  };

  const handleClose = () => {
    if (!isUploading) {
      setUploadQueue([]);
      setUrlInput('');
      closeUploadDialog();
    }
  };

  const pendingCount = uploadQueue.filter((item) => item.status === 'pending').length;
  const hasUploaded = uploadQueue.some((item) => item.status === 'success');

  return (
    <Dialog
      open={isUploadDialogOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Drag and drop files or enter a URL to upload.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="files">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="files">
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link className="h-4 w-4 mr-2" />
              From URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4">
            {/* Category Selection */}
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as DriveCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DRIVE_CATEGORIES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Drop Zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                'hover:border-primary hover:bg-primary/5'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium mb-1">
                {isDragging ? 'Drop files here' : 'Drag and drop files'}
              </p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Upload Queue */}
            {uploadQueue.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uploadQueue.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 border rounded-lg">
                    <File className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(item.size)}</p>
                      {item.status === 'uploading' && (
                        <Progress value={item.progress} className="h-1 mt-1" />
                      )}
                      {item.status === 'error' && (
                        <p className="text-xs text-destructive">{item.error}</p>
                      )}
                    </div>
                    {item.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeFromQueue(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {item.status === 'uploading' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {item.status === 'success' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {item.status === 'error' && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {pendingCount > 0 && (
              <Button onClick={uploadAllFiles} disabled={isUploading} className="w-full">
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {pendingCount} file{pendingCount > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}

            {/* Done Button */}
            {hasUploaded && pendingCount === 0 && (
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            )}
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            {/* Category Selection */}
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as DriveCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DRIVE_CATEGORIES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* URL Input */}
            <div>
              <Label htmlFor="url-input">File URL</Label>
              <Input
                id="url-input"
                placeholder="https://example.com/file.png"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUploadFromUrl()}
              />
            </div>

            <Button
              onClick={handleUploadFromUrl}
              disabled={!urlInput.trim() || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Upload from URL
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
