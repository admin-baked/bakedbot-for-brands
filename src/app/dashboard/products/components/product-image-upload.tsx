'use client';

import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase/client';
import { Upload, Link as LinkIcon, Loader2, X, ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface ProductImageUploadProps {
    currentImageUrl?: string;
    currentImages?: string[]; // For multiple images
    onImageChange: (url: string) => void;
    onImagesChange?: (urls: string[]) => void; // For multiple images
    brandId?: string;
    productId?: string;
    fieldError?: string;
}

export function ProductImageUpload({
    currentImageUrl = '',
    currentImages = [],
    onImageChange,
    onImagesChange,
    brandId,
    productId,
    fieldError,
}: ProductImageUploadProps) {
    // Support both single and multiple images
    const isMultipleMode = !!onImagesChange;
    const initialImages = isMultipleMode && currentImages.length > 0
        ? currentImages
        : currentImageUrl
            ? [currentImageUrl]
            : [];

    const [images, setImages] = useState<string[]>(initialImages);
    const [imageUrl, setImageUrl] = useState(currentImageUrl);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<string>(initialImages.length > 0 ? 'url' : 'upload');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Handle URL input change
    const handleUrlChange = (url: string) => {
        if (!url.trim()) return;

        if (isMultipleMode) {
            // Add to images array if not already present
            if (!images.includes(url)) {
                const newImages = [...images, url];
                setImages(newImages);
                onImagesChange?.(newImages);
                setImageUrl(''); // Clear input after adding
                toast({
                    title: 'Image added',
                    description: 'Image URL has been added successfully.',
                });
            }
        } else {
            // Single image mode (backward compatible)
            setImageUrl(url);
            onImageChange(url);
        }
    };

    // Handle deleting an image
    const handleDeleteImage = (urlToDelete: string) => {
        const newImages = images.filter(url => url !== urlToDelete);
        setImages(newImages);
        if (isMultipleMode) {
            onImagesChange?.(newImages);
        } else if (newImages.length > 0) {
            onImageChange(newImages[0]);
        } else {
            onImageChange('');
        }
        toast({
            title: 'Image removed',
            description: 'Image has been removed successfully.',
        });
    };

    // Handle file selection and upload
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                variant: 'destructive',
                title: 'Invalid file type',
                description: 'Please select an image file (JPEG, PNG, WebP)',
            });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                variant: 'destructive',
                title: 'File too large',
                description: 'Image must be less than 5MB',
            });
            return;
        }

        // Upload to Firebase Storage
        setIsUploading(true);
        try {
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = brandId
                ? `products/${brandId}/${productId || 'new'}-${timestamp}-${safeName}`
                : `products/uploads/${timestamp}-${safeName}`;

            console.log('[ProductImageUpload] Starting upload to:', storagePath);

            const storageRef = ref(storage, storagePath);

            // Add timeout to prevent indefinite hanging
            const uploadPromise = uploadBytes(storageRef, file);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Upload timeout after 60 seconds')), 60000)
            );

            await Promise.race([uploadPromise, timeoutPromise]);
            console.log('[ProductImageUpload] Upload complete, getting download URL');

            const downloadUrl = await getDownloadURL(storageRef);
            console.log('[ProductImageUpload] Got download URL:', downloadUrl);

            if (isMultipleMode) {
                // Add to images array
                const newImages = [...images, downloadUrl];
                setImages(newImages);
                onImagesChange?.(newImages);
            } else {
                // Single image mode (backward compatible)
                setImageUrl(downloadUrl);
                onImageChange(downloadUrl);
            }

            toast({
                title: 'Image uploaded',
                description: 'Product image has been uploaded successfully.',
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[ProductImageUpload] Upload error:', errorMessage, error);
            toast({
                variant: 'destructive',
                title: 'Upload failed',
                description: `Failed to upload image: ${errorMessage}. Please try again or use a URL.`,
            });
        } finally {
            setIsUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Clear all images
    const handleClearAll = () => {
        setImages([]);
        setImageUrl('');
        if (isMultipleMode) {
            onImagesChange?.([]);
        } else {
            onImageChange('');
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label>{isMultipleMode ? 'Product Images' : 'Product Image'}</Label>
                {isMultipleMode && images.length > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        className="text-xs text-muted-foreground hover:text-destructive"
                    >
                        Clear All
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload
                    </TabsTrigger>
                    <TabsTrigger value="url" className="gap-2">
                        <LinkIcon className="h-4 w-4" />
                        URL
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="product-image-upload"
                            disabled={isUploading}
                        />
                        <label
                            htmlFor="product-image-upload"
                            className="cursor-pointer flex flex-col items-center gap-2"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        Click to upload{isMultipleMode ? ' to add more images' : ' or drag and drop'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        JPEG, PNG, WebP (max 5MB)
                                    </span>
                                </>
                            )}
                        </label>
                    </div>
                </TabsContent>

                <TabsContent value="url" className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            type="url"
                            placeholder="https://example.com/image.png"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleUrlChange(imageUrl);
                                }
                            }}
                        />
                        <Button
                            type="button"
                            onClick={() => handleUrlChange(imageUrl)}
                            disabled={!imageUrl.trim()}
                        >
                            {isMultipleMode ? 'Add' : 'Set'}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Enter the full URL to your product image{isMultipleMode ? ' and click Add' : ''}
                    </p>
                </TabsContent>
            </Tabs>

            {/* Hidden inputs for form submission */}
            {isMultipleMode ? (
                images.map((url, index) => (
                    <input
                        key={index}
                        type="hidden"
                        name={index === 0 ? 'imageUrl' : `images[${index}]`}
                        value={url}
                    />
                ))
            ) : (
                <input type="hidden" name="imageUrl" value={images[0] || imageUrl || ''} />
            )}

            {/* Image Gallery */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {images.map((url, index) => (
                        <div key={index} className="relative group">
                            <div className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                                <Image
                                    src={url}
                                    alt={`Product image ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    onError={() => handleDeleteImage(url)}
                                />
                                {index === 0 && (
                                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                                        Primary
                                    </div>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteImage(url)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* No image placeholder */}
            {images.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    <span>No {isMultipleMode ? 'images' : 'image'} selected</span>
                </div>
            )}

            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
        </div>
    );
}
