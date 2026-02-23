// src/app/dashboard/brand-page/brand-page-client.tsx
'use client';

/**
 * Brand Page Client Component
 * 
 * Provides interface for:
 * 1. Configuring the brand's slug/URL (bakedbot.ai/{slug})
 * 2. Previewing the brand menu
 * 3. Publishing/launching the menu
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import {
    Globe,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    Loader2,
    Sparkles,
    Settings,
    Eye,
    Rocket,
    Link as LinkIcon,
    Copy,
    Check,
} from 'lucide-react';
import Link from 'next/link';
import { checkSlugAvailability, reserveSlug, getBrandSlug } from '@/server/actions/slug-management';
import { SlugConfigPanel } from './components/slug-config-panel';
import { LaunchDialog } from './components/launch-dialog';

export function BrandPageClient() {
    const { toast } = useToast();
    const { user } = useUser();
    const [currentSlug, setCurrentSlug] = useState<string | null>(null);
    const [brandId, setBrandId] = useState<string | null>(null);
    const [isPublished, setIsPublished] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showLaunchDialog, setShowLaunchDialog] = useState(false);

    // Load current slug on mount
    useEffect(() => {
        async function loadSlug() {
            if (!user) return;

            try {
                const profile = user as any;
                // Resolve org ID correctly for both brand and dispensary users:
                // currentOrgId/orgId from custom claims covers dispensary_admin users (e.g., org_thrive_syracuse)
                const resolvedBrandId = profile.currentOrgId || profile.orgId || profile.brandId || user.uid;
                setBrandId(resolvedBrandId);
                const slug = await getBrandSlug(resolvedBrandId);
                setCurrentSlug(slug);
                // TODO: Check if published from Firestore
                setIsPublished(!!slug);
            } catch (error) {
                console.error('Failed to load slug:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadSlug();
    }, [user]);

    const handleSlugReserved = (slug: string) => {
        setCurrentSlug(slug);
        toast({
            title: 'URL Reserved!',
            description: `Your menu will be available at bakedbot.ai/${slug}`,
        });
    };

    const handlePublish = async () => {
        setIsPublished(true);
        setShowLaunchDialog(false);
        toast({
            title: 'Menu Published!',
            description: 'Your headless menu is now live.',
        });
    };

    const publicUrl = currentSlug ? `https://bakedbot.ai/${currentSlug}` : null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-primary" />
                        Your Headless Menu
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure and launch your brand's public menu page
                    </p>
                </div>

                {publicUrl && isPublished && (
                    <Button asChild variant="outline" className="gap-2">
                        <Link href={publicUrl} target="_blank">
                            View Live Page <ExternalLink className="h-4 w-4" />
                        </Link>
                    </Button>
                )}
            </div>

            {/* Status Banner */}
            {isPublished && currentSlug ? (
                <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="flex items-center justify-between">
                        <span className="text-green-800">
                            Your menu is <strong>live</strong> at{' '}
                            <a href={publicUrl!} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                                bakedbot.ai/{currentSlug}
                            </a>
                        </span>
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                            Published
                        </Badge>
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Your menu is not published yet. Configure your URL and click "Publish Menu" to go live.
                    </AlertDescription>
                </Alert>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="url" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 border">
                    <TabsTrigger value="url" className="gap-2">
                        <LinkIcon className="h-4 w-4" />
                        URL & Domain
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Preview
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                {/* URL Configuration Tab */}
                <TabsContent value="url" className="space-y-6">
                    <SlugConfigPanel
                        currentSlug={currentSlug}
                        brandId={brandId}
                        onSlugReserved={handleSlugReserved}
                    />

                    {/* Custom Domain Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5" />
                                Custom Domain
                            </CardTitle>
                            <CardDescription>
                                Use your own domain (e.g., shop.yourbrand.com) instead of bakedbot.ai
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/dashboard/settings?tab=domain">
                                <Button variant="outline" className="gap-2">
                                    Configure Custom Domain
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Publish Button */}
                    {currentSlug && !isPublished && (
                        <Card className="border-primary/50 bg-primary/5">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-lg">Ready to go live?</h3>
                                        <p className="text-muted-foreground text-sm">
                                            Your menu will be available at bakedbot.ai/{currentSlug}
                                        </p>
                                    </div>
                                    <Button
                                        size="lg"
                                        className="gap-2"
                                        onClick={() => setShowLaunchDialog(true)}
                                    >
                                        <Rocket className="h-5 w-5" />
                                        Publish Menu
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Preview Tab */}
                <TabsContent value="preview" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Menu Preview</CardTitle>
                            <CardDescription>
                                See how your menu will appear to customers
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg bg-muted/20 p-8 text-center">
                                <div className="max-w-md mx-auto space-y-4">
                                    <Eye className="h-12 w-12 mx-auto text-muted-foreground" />
                                    <h3 className="font-semibold text-lg">Preview Coming Soon</h3>
                                    <p className="text-muted-foreground text-sm">
                                        The live preview feature is being built. For now, you can view your public page directly.
                                    </p>
                                    {publicUrl && (
                                        <Button asChild variant="outline" className="gap-2">
                                            <Link href={publicUrl} target="_blank">
                                                Open Live Page <ExternalLink className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    )}
                                    {!publicUrl && (
                                        <Button asChild variant="outline">
                                            <Link href="/demo-shop">
                                                View Demo Menu
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Menu Settings</CardTitle>
                            <CardDescription>
                                Customize your brand's public menu appearance
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <Link href="/dashboard/settings?tab=brand">
                                    <Button variant="outline" className="w-full justify-start gap-2">
                                        <Settings className="h-4 w-4" />
                                        Brand Settings (Logo, Colors, Tagline)
                                    </Button>
                                </Link>
                                <Link href="/dashboard/products">
                                    <Button variant="outline" className="w-full justify-start gap-2">
                                        <Settings className="h-4 w-4" />
                                        Manage Products
                                    </Button>
                                </Link>
                                <Link href="/dashboard/dispensaries">
                                    <Button variant="outline" className="w-full justify-start gap-2">
                                        <Settings className="h-4 w-4" />
                                        "Where to Buy" Retailers
                                    </Button>
                                </Link>
                                <Link href="/dashboard/settings?tab=embeds">
                                    <Button variant="outline" className="w-full justify-start gap-2">
                                        <Settings className="h-4 w-4" />
                                        Embed Code for Your Website
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Launch Dialog */}
            <LaunchDialog
                open={showLaunchDialog}
                onOpenChange={setShowLaunchDialog}
                slug={currentSlug || ''}
                onPublish={handlePublish}
            />
        </div>
    );
}
