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
    onImageChange: (url: string) => void;
    brandId?: string;
    productId?: string;
    fieldError?: string;
}

export function ProductImageUpload({
    currentImageUrl = '',
    onImageChange,
    brandId,
    productId,
    fieldError,
}: ProductImageUploadProps) {
    const [imageUrl, setImageUrl] = useState(currentImageUrl);
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
    const [activeTab, setActiveTab] = useState<string>(currentImageUrl ? 'url' : 'upload');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Handle URL input change
    const handleUrlChange = (url: string) => {
        setImageUrl(url);
        setPreviewUrl(url);
        onImageChange(url);
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

        // Create preview
        const reader = new FileReader();
        reader.onload = (event) => {
            setPreviewUrl(event.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to Firebase Storage
        setIsUploading(true);
        try {
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = brandId
                ? `products/${brandId}/${productId || 'new'}-${timestamp}-${safeName}`
                : `products/uploads/${timestamp}-${safeName}`;

            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            setImageUrl(downloadUrl);
            setPreviewUrl(downloadUrl);
            onImageChange(downloadUrl);

            toast({
                title: 'Image uploaded',
                description: 'Product image has been uploaded successfully.',
            });
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                variant: 'destructive',
                title: 'Upload failed',
                description: 'Failed to upload image. Please try again or use a URL.',
            });
            setPreviewUrl(currentImageUrl);
        } finally {
            setIsUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Clear image
    const handleClear = () => {
        setImageUrl('');
        setPreviewUrl('');
        onImageChange('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <Label>Product Image</Label>

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
                                        Click to upload or drag and drop
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
                    <Input
                        type="url"
                        placeholder="https://example.com/image.png"
                        value={imageUrl}
                        onChange={(e) => handleUrlChange(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Enter the full URL to your product image
                    </p>
                </TabsContent>
            </Tabs>

            {/* Hidden input for form submission */}
            <input type="hidden" name="imageUrl" value={imageUrl} />

            {/* Preview */}
            {previewUrl && (
                <div className="relative">
                    <div className="relative aspect-square w-32 rounded-lg overflow-hidden border bg-muted">
                        <Image
                            src={previewUrl}
                            alt="Product preview"
                            fill
                            className="object-cover"
                            onError={() => setPreviewUrl('')}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={handleClear}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {/* No image placeholder */}
            {!previewUrl && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    <span>No image selected</span>
                </div>
            )}

            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
        </div>
    );
}
