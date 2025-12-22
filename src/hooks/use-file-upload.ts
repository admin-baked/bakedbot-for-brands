/**
 * File Upload Handler Hook
 * Handles file uploads with validation and processing
 */

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface UploadedFile {
    id: string;
    name: string;
    size: number;
    type: string;
    data: string | ArrayBuffer; // base64 or buffer
    preview?: string; // For images
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
    'text/csv',
    'text/plain',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/json'
];

export function useFileUpload() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const validateFile = (file: File): boolean => {
        if (file.size > MAX_FILE_SIZE) {
            toast({
                title: 'File too large',
                description: `${file.name} exceeds 10MB limit`,
                variant: 'destructive'
            });
            return false;
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            toast({
                title: 'Unsupported file type',
                description: `${file.type} is not supported`,
                variant: 'destructive'
            });
            return false;
        }

        return true;
    };

    const readFile = (file: File): Promise<UploadedFile> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const uploadedFile: UploadedFile = {
                    id: Math.random().toString(36).substring(7),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: reader.result || ''
                };

                // Create preview for images
                if (file.type.startsWith('image/')) {
                    uploadedFile.preview = reader.result as string;
                }

                resolve(uploadedFile);
            };

            reader.onerror = () => {
                reject(new Error(`Failed to read ${file.name}`));
            };

            // Read as data URL for images, text for others
            if (file.type.startsWith('image/')) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }
        });
    };

    const uploadFiles = async (fileList: FileList) => {
        setIsUploading(true);
        const newFiles: UploadedFile[] = [];

        try {
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];

                if (!validateFile(file)) {
                    continue;
                }

                const uploadedFile = await readFile(file);
                newFiles.push(uploadedFile);
            }

            setFiles(prev => [...prev, ...newFiles]);

            if (newFiles.length > 0) {
                toast({
                    title: 'Files uploaded',
                    description: `${newFiles.length} file(s) ready to use`
                });
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                title: 'Upload failed',
                description: 'Failed to process files',
                variant: 'destructive'
            });
        } finally {
            setIsUploading(false);
        }
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const clearFiles = () => {
        setFiles([]);
    };

    return {
        files,
        isUploading,
        uploadFiles,
        removeFile,
        clearFiles
    };
}
