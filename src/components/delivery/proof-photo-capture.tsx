'use client';

/**
 * Proof of Delivery Photo Capture
 *
 * Camera/file upload component for proof of delivery
 * NY OCM Requirement: Photographic proof of delivery
 * Features:
 * - Camera capture on mobile devices
 * - File upload fallback for desktop
 * - Preview before confirm
 * - Firebase Storage upload
 */

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, CheckCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ProofPhotoCaptureProps {
    onPhoto: (photoUrl: string | null) => void;
    disabled?: boolean;
}

export function ProofPhotoCapture({ onPhoto, disabled = false }: ProofPhotoCaptureProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setPreview(dataUrl);
            setConfirmed(false);
            onPhoto(null); // Reset until confirmed
        };
        reader.readAsDataURL(file);
    };

    const handleConfirmPhoto = async () => {
        if (!preview) return;
        setUploading(true);

        try {
            // For now, pass the data URL directly
            // In production, this would upload to Firebase Storage and return the URL
            onPhoto(preview);
            setConfirmed(true);
        } finally {
            setUploading(false);
        }
    };

    const handleRemovePhoto = () => {
        setPreview(null);
        setConfirmed(false);
        onPhoto(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    };

    return (
        <div className="space-y-3">
            {/* Hidden file inputs */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelected}
                disabled={disabled}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelected}
                disabled={disabled}
            />

            {/* Preview */}
            {preview ? (
                <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden border border-border">
                        <img
                            src={preview}
                            alt="Proof of delivery"
                            className="w-full h-48 object-cover"
                        />
                        {!confirmed && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={handleRemovePhoto}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                        {confirmed && (
                            <div className="absolute bottom-2 right-2 bg-green-500 text-white rounded-full p-1">
                                <CheckCircle className="h-5 w-5" />
                            </div>
                        )}
                    </div>

                    {!confirmed && (
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={handleRemovePhoto}
                                disabled={uploading}
                            >
                                Retake
                            </Button>
                            <Button
                                type="button"
                                className="flex-1"
                                onClick={handleConfirmPhoto}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                )}
                                Use Photo
                            </Button>
                        </div>
                    )}

                    {confirmed && (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium text-center">
                            ✓ Proof of delivery photo confirmed
                        </p>
                    )}
                </div>
            ) : (
                /* Capture buttons */
                <div className="space-y-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={disabled}
                    >
                        <Camera className="mr-2 h-4 w-4" />
                        Take Photo
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-muted-foreground"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload from Gallery
                    </Button>
                </div>
            )}
        </div>
    );
}
