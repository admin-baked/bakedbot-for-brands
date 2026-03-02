'use client';

/**
 * Featured Image Upload Component
 *
 * Drag-drop + click upload for blog post featured images.
 * Uploads to Firebase Storage, returns URL.
 */

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Upload, X, Link as LinkIcon, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BlogMedia } from '@/types/blog';

interface FeaturedImageUploadProps {
    image: BlogMedia | null;
    onImageChange: (image: BlogMedia | null) => void;
    orgId: string;
    postId?: string;
}

export function FeaturedImageUpload({ image, onImageChange, orgId, postId }: FeaturedImageUploadProps) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [altText, setAltText] = useState(image?.alt || '');
    const [captionText, setCaptionText] = useState(image?.caption || '');

    const handleFileUpload = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast({ title: 'Invalid file', description: 'Please select an image file', variant: 'destructive' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({ title: 'File too large', description: 'Max file size is 5MB', variant: 'destructive' });
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('orgId', orgId);
            if (postId) formData.append('postId', postId);

            const res = await fetch('/api/upload/blog-image', { method: 'POST', body: formData });

            if (!res.ok) {
                throw new Error('Upload failed');
            }

            const data = await res.json();

            onImageChange({
                id: data.fileId || crypto.randomUUID(),
                url: data.url,
                alt: altText || file.name.replace(/\.[^.]+$/, ''),
                caption: captionText || undefined,
                mimeType: file.type,
                ...(data.width && { width: data.width }),
                ...(data.height && { height: data.height }),
            });

            toast({ title: 'Image uploaded' });
        } catch {
            toast({ title: 'Upload failed', description: 'Please try again', variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    }, [orgId, postId, altText, captionText, onImageChange, toast]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    }, [handleFileUpload]);

    const handleUrlSubmit = () => {
        if (!urlInput.trim()) return;

        onImageChange({
            id: crypto.randomUUID(),
            url: urlInput.trim(),
            alt: altText || 'Featured image',
            caption: captionText || undefined,
            mimeType: 'image/jpeg',
        });

        setUrlInput('');
        setShowUrlInput(false);
        toast({ title: 'Image added' });
    };

    const handleRemove = () => {
        onImageChange(null);
        setAltText('');
        setCaptionText('');
    };

    if (image) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="relative group">
                        <img
                            src={image.url}
                            alt={image.alt}
                            className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                            onClick={handleRemove}
                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="mt-3 space-y-2">
                        <div>
                            <Label htmlFor="alt-text" className="text-xs">Alt Text</Label>
                            <Input
                                id="alt-text"
                                value={altText}
                                onChange={(e) => {
                                    setAltText(e.target.value);
                                    onImageChange({ ...image, alt: e.target.value });
                                }}
                                placeholder="Describe the image for accessibility..."
                                className="h-8 text-sm"
                            />
                        </div>
                        <div>
                            <Label htmlFor="caption-text" className="text-xs">Caption (visible below image, used by Google News)</Label>
                            <Input
                                id="caption-text"
                                value={captionText}
                                onChange={(e) => {
                                    setCaptionText(e.target.value);
                                    onImageChange({ ...image, caption: e.target.value });
                                }}
                                placeholder="Photo credit or descriptive caption..."
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-4">
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                            <p className="text-sm text-muted-foreground">Uploading...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <Upload className="h-8 w-8 text-muted-foreground/50" />
                            <p className="text-sm font-medium">Drop image here or click to upload</p>
                            <p className="text-xs text-muted-foreground">JPG recommended for Google News indexing. Max 5MB.</p>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                        }}
                    />
                </div>

                <div className="flex gap-2 mt-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => { e.stopPropagation(); setShowUrlInput(!showUrlInput); }}
                    >
                        <LinkIcon className="w-3 h-3 mr-1" />
                        URL
                    </Button>
                </div>

                {showUrlInput && (
                    <div className="flex gap-2 mt-2">
                        <Input
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                            placeholder="https://..."
                            className="h-8 text-sm"
                        />
                        <Button size="sm" onClick={handleUrlSubmit} className="h-8">
                            Add
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
