'use client';

/**
 * Theme Uploader Component
 *
 * Drag-drop zone for uploading WordPress theme ZIPs
 * - File validation (must be .zip)
 * - Progress tracking
 * - Error handling with validation error display
 * - Success state
 */

import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { ThemeValidationError } from '@/types/wordpress-theme';

interface ThemeUploaderProps {
  orgId: string;
  onUploadSuccess?: (themeId: string, themeName: string) => void;
  onUploadError?: (error: string) => void;
}

export function ThemeUploader({ orgId, onUploadSuccess, onUploadError }: ThemeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ThemeValidationError[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    // Validate file
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setStatus('error');
      setError('File must be a ZIP archive (.zip)');
      onUploadError?.('File must be a ZIP archive');
      return;
    }

    setStatus('uploading');
    setError(null);
    setValidationErrors([]);
    setSuccessMessage(null);
    setIsUploading(true);
    setProgress(0);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('orgId', orgId);

      // Upload with progress simulation (actual progress depends on fetch API)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 30, 90));
      }, 200);

      const response = await fetch('/api/themes/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatus('error');
        setError(data.error || 'Upload failed');
        setValidationErrors(data.validationErrors || []);
        onUploadError?.(data.error || 'Upload failed');
        logger.error('[Theme Uploader] Upload error', { error: data.error });
        setProgress(0);
        return;
      }

      // Success
      setProgress(100);
      setStatus('success');
      setSuccessMessage(`✓ Theme "${data.theme?.name}" uploaded successfully!`);
      onUploadSuccess?.(data.themeId, data.theme?.name);

      logger.info('[Theme Uploader] Upload successful', {
        themeId: data.themeId,
        themeName: data.theme?.name,
      });

      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setSuccessMessage(null);
        setProgress(0);
      }, 3000);
    } catch (err) {
      setStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
      logger.error('[Theme Uploader] Upload error', { error: err });
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setStatus('idle');
    setError(null);
    setValidationErrors([]);
    setSuccessMessage(null);
    setProgress(0);
  };

  return (
    <div className="space-y-4">
      {/* Drag-drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 hover:border-muted-foreground/50'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        {/* Content */}
        {status === 'idle' && (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <div className="font-medium">Drag and drop your WordPress theme ZIP</div>
            <div className="text-sm text-muted-foreground">or click to select a file</div>
            <div className="text-xs text-muted-foreground mt-2">
              Maximum size: 50 MB. Must include: style.css, functions.php, index.php
            </div>
          </div>
        )}

        {status === 'uploading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <div>
              <div className="font-medium mb-2">Uploading...</div>
              <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2">{progress}%</div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="font-medium text-green-600">{successMessage}</div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <div className="font-medium text-red-600">{error}</div>
            {validationErrors.length > 0 && (
              <div className="text-sm text-red-500 max-w-xs">
                {validationErrors.map((err) => (
                  <div key={err.type} className="mt-1">
                    • {err.message}
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={resetState}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* Error state - retry button */}
      {status === 'error' && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={resetState}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
