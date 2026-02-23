// src/app/dashboard/brand-page/components/slug-config-panel.tsx
'use client';

/**
 * Slug Configuration Panel
 * 
 * Allows users to set their custom URL slug (bakedbot.ai/{slug})
 * with real-time availability checking.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import {
    Globe,
    CheckCircle2,
    XCircle,
    Loader2,
    Link as LinkIcon,
    Copy,
    Check,
} from 'lucide-react';
import { checkSlugAvailability, reserveSlug } from '@/server/actions/slug-management';
import { useDebounce } from '@/hooks/use-debounce';

interface SlugConfigPanelProps {
    currentSlug: string | null;
    brandId?: string | null;
    onSlugReserved: (slug: string) => void;
}

export function SlugConfigPanel({ currentSlug, brandId, onSlugReserved }: SlugConfigPanelProps) {
    const { toast } = useToast();
    const { user } = useUser();
    const [inputSlug, setInputSlug] = useState(currentSlug || '');
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [isReserving, setIsReserving] = useState(false);
    const [copied, setCopied] = useState(false);

    const debouncedSlug = useDebounce(inputSlug, 500);

    // Check availability when slug changes
    useEffect(() => {
        async function checkAvailability() {
            if (!debouncedSlug || debouncedSlug.length < 3) {
                setIsAvailable(null);
                setSuggestion(null);
                return;
            }

            // If it's the current slug, it's "available" (already ours)
            if (debouncedSlug === currentSlug) {
                setIsAvailable(true);
                setSuggestion(null);
                return;
            }

            setIsChecking(true);
            try {
                // Pass brandId so the server can confirm ownership and avoid false "taken" errors
                const result = await checkSlugAvailability(debouncedSlug, brandId ?? undefined);
                setIsAvailable(result.available);
                setSuggestion(result.suggestion || null);
            } catch (error) {
                console.error('Failed to check availability:', error);
                setIsAvailable(null);
            } finally {
                setIsChecking(false);
            }
        }

        checkAvailability();
    }, [debouncedSlug, currentSlug]);

    const handleReserve = async () => {
        if (!inputSlug || !isAvailable || !user) return;

        setIsReserving(true);
        try {
            // Use the resolved brandId from parent (covers dispensary users whose orgId !== uid)
            const profile = user as any;
            const resolvedBrandId = brandId || profile.currentOrgId || profile.orgId || profile.brandId || user.uid;
            const result = await reserveSlug(inputSlug, resolvedBrandId);

            if (result.success) {
                onSlugReserved(inputSlug);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Failed to reserve URL',
                    description: result.error || 'Please try again.',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to reserve URL. Please try again.',
            });
        } finally {
            setIsReserving(false);
        }
    };

    const handleCopyUrl = () => {
        const url = `https://bakedbot.ai/${currentSlug || inputSlug}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSlugChange = (value: string) => {
        // Normalize: lowercase, alphanumeric and hyphens only
        const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-');
        setInputSlug(normalized);
    };

    const slugIsReserved = currentSlug && inputSlug === currentSlug;
    const publicUrl = `bakedbot.ai/${inputSlug || 'your-brand'}`;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Your BakedBot URL
                </CardTitle>
                <CardDescription>
                    Choose a custom URL for your public menu page
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* URL Input */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center border rounded-md overflow-hidden bg-background">
                            <span className="px-3 py-2 bg-muted text-muted-foreground text-sm font-medium border-r">
                                bakedbot.ai/
                            </span>
                            <Input
                                value={inputSlug}
                                onChange={(e) => handleSlugChange(e.target.value)}
                                placeholder="your-brand"
                                className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                disabled={!!currentSlug}
                            />
                            <div className="px-3 flex items-center">
                                {isChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                {!isChecking && isAvailable === true && (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                                {!isChecking && isAvailable === false && (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Message */}
                    <div className="text-sm">
                        {slugIsReserved && (
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>This URL is reserved for you</span>
                            </div>
                        )}
                        {!slugIsReserved && isAvailable === true && inputSlug.length >= 3 && (
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>This URL is available!</span>
                            </div>
                        )}
                        {isAvailable === false && (
                            <div className="flex items-center gap-2 text-red-500">
                                <XCircle className="h-4 w-4" />
                                <span>
                                    This URL is taken.
                                    {suggestion && (
                                        <Button
                                            variant="link"
                                            className="h-auto p-0 ml-1 text-primary"
                                            onClick={() => setInputSlug(suggestion)}
                                        >
                                            Try "{suggestion}"?
                                        </Button>
                                    )}
                                </span>
                            </div>
                        )}
                        {inputSlug.length > 0 && inputSlug.length < 3 && (
                            <span className="text-muted-foreground">
                                URL must be at least 3 characters
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {!currentSlug && (
                        <Button
                            onClick={handleReserve}
                            disabled={!isAvailable || inputSlug.length < 3 || isReserving}
                            className="gap-2"
                        >
                            {isReserving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Reserving...
                                </>
                            ) : (
                                <>
                                    <Globe className="h-4 w-4" />
                                    Reserve This URL
                                </>
                            )}
                        </Button>
                    )}
                    {currentSlug && (
                        <Button variant="outline" onClick={handleCopyUrl} className="gap-2">
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4" />
                                    Copy URL
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* Preview URL */}
                <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                        Your public menu will be available at:
                    </p>
                    <p className="text-lg font-mono font-medium text-primary">
                        https://{publicUrl}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
