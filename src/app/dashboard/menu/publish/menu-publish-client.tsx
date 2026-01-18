// src/app/dashboard/menu/publish/menu-publish-client.tsx
'use client';

/**
 * Menu Publish Client Component (Dispensary)
 * 
 * Provides interface for dispensaries to:
 * 1. Configure their menu URL
 * 2. Preview the dispensary menu
 * 3. Publish/launch the menu
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    MapPin,
    Clock,
    Phone,
} from 'lucide-react';
import Link from 'next/link';
import { PublishDialog } from './components/publish-dialog';

export function MenuPublishClient() {
    const { toast } = useToast();
    const { user } = useUser();
    const [isPublished, setIsPublished] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [locationSlug, setLocationSlug] = useState<string | null>(null);

    // Load current state on mount
    useEffect(() => {
        async function loadState() {
            if (!user) return;
            
            try {
                const profile = user as any;
                // Try to get location slug from user profile
                const locId = profile.locationId;
                if (locId) {
                    setLocationSlug(locId);
                    // TODO: Check if published from Firestore
                }
            } catch (error) {
                console.error('Failed to load state:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadState();
    }, [user]);

    const handlePublish = async () => {
        setIsPublished(true);
        setShowPublishDialog(false);
        toast({
            title: 'Menu Published!',
            description: 'Your dispensary menu is now live.',
        });
    };

    const publicUrl = locationSlug ? `https://bakedbot.ai/shop/${locationSlug}` : null;

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
                        Publish Headless Menu
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Launch your dispensary's public menu page
                    </p>
                </div>

                {publicUrl && isPublished && (
                    <Button asChild variant="outline" className="gap-2">
                        <Link href={publicUrl} target="_blank">
                            View Live Menu <ExternalLink className="h-4 w-4" />
                        </Link>
                    </Button>
                )}
            </div>

            {/* Status Banner */}
            {isPublished && locationSlug ? (
                <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="flex items-center justify-between">
                        <span className="text-green-800">
                            Your menu is <strong>live</strong> at{' '}
                            <a href={publicUrl!} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                                bakedbot.ai/shop/{locationSlug}
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
                        Your menu is not published yet. Review your settings and click "Publish Menu" to go live.
                    </AlertDescription>
                </Alert>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 border">
                    <TabsTrigger value="overview" className="gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Overview
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

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {/* URL Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5" />
                                Your Menu URL
                            </CardTitle>
                            <CardDescription>
                                Your public menu will be available at this address
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {locationSlug ? (
                                <div className="space-y-4">
                                    <div className="bg-muted rounded-lg p-4">
                                        <p className="text-lg font-mono font-medium text-primary">
                                            https://bakedbot.ai/shop/{locationSlug}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="gap-2"
                                            onClick={() => {
                                                navigator.clipboard.writeText(publicUrl!);
                                                toast({ title: 'Copied to clipboard!' });
                                            }}
                                        >
                                            Copy URL
                                        </Button>
                                        <Link href="/dashboard/settings?tab=domain">
                                            <Button variant="outline" className="gap-2">
                                                <Globe className="h-4 w-4" />
                                                Custom Domain
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-muted-foreground">
                                    <p>Your location hasn't been linked yet.</p>
                                    <Link href="/dashboard/settings/link">
                                        <Button variant="link" className="p-0 mt-2">
                                            Link your dispensary →
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded-lg">
                                        <MapPin className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Location</p>
                                        <p className="font-medium">Connected</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded-lg">
                                        <Clock className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Menu Sync</p>
                                        <p className="font-medium">Real-time</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded-lg">
                                        <Phone className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Smokey AI</p>
                                        <p className="font-medium">Active</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Publish Button */}
                    {locationSlug && !isPublished && (
                        <Card className="border-primary/50 bg-primary/5">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-lg">Ready to go live?</h3>
                                        <p className="text-muted-foreground text-sm">
                                            Your menu will be available to customers
                                        </p>
                                    </div>
                                    <Button
                                        size="lg"
                                        className="gap-2"
                                        onClick={() => setShowPublishDialog(true)}
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
                                        The live preview feature is being built. For now, you can view your page directly.
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
                                Customize your dispensary's public menu
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <Link href="/dashboard/menu">
                                    <Button variant="outline" className="w-full justify-start gap-2">
                                        <Settings className="h-4 w-4" />
                                        Manage Menu Products
                                    </Button>
                                </Link>
                                <Link href="/dashboard/settings?tab=brand">
                                    <Button variant="outline" className="w-full justify-start gap-2">
                                        <Settings className="h-4 w-4" />
                                        Store Branding (Logo, Colors)
                                    </Button>
                                </Link>
                                <Link href="/dashboard/promotions">
                                    <Button variant="outline" className="w-full justify-start gap-2">
                                        <Settings className="h-4 w-4" />
                                        Deals & Promotions
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

            {/* Publish Dialog */}
            <PublishDialog
                open={showPublishDialog}
                onOpenChange={setShowPublishDialog}
                locationSlug={locationSlug || ''}
                onPublish={handlePublish}
            />
        </div>
    );
}
