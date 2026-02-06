'use client';

/**
 * Heroes Management Page
 *
 * Dashboard for managing hero banners for brand and dispensary menu pages.
 */

import { Button } from '@/components/ui/button';
import { Plus, Loader2, Image as ImageIcon, Wand2, List, Copy, Eye, Power, Trash2 } from 'lucide-react';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { useEffect, useState, useCallback } from 'react';
import { getHeroes, toggleHeroActive, duplicateHero, deleteHero } from '@/app/actions/heroes';
import { Hero } from '@/types/heroes';
import { useToast } from '@/hooks/use-toast';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HeroForm } from '@/components/dashboard/heroes/hero-form';
import { HeroPreview } from '@/components/dashboard/heroes/hero-preview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { HeroGeneratorInline } from '@/components/inbox/hero-generator-inline';

export default function HeroesPage() {
    const { dispensaryId, loading: idLoading } = useDispensaryId();
    const [heroes, setHeroes] = useState<Hero[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedHero, setSelectedHero] = useState<Hero | undefined>(undefined);
    const [previewHero, setPreviewHero] = useState<Hero | undefined>(undefined);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [heroToDelete, setHeroToDelete] = useState<Hero | undefined>(undefined);

    const fetchHeroes = useCallback(async () => {
        if (!dispensaryId) return;
        const result = await getHeroes(dispensaryId);
        if (result.success && result.data) {
            setHeroes(result.data);
        } else {
            toast({
                title: "Error",
                description: "Failed to load hero banners.",
                variant: "destructive"
            });
        }
        setLoading(false);
    }, [dispensaryId, toast]);

    useEffect(() => {
        if (!dispensaryId) {
            if (!idLoading) setLoading(false);
            return;
        }
        setLoading(true);
        fetchHeroes();
    }, [dispensaryId, idLoading, fetchHeroes]);

    const handleCreateOpen = () => {
        setSelectedHero(undefined);
        setIsSheetOpen(true);
    };

    const handleEditOpen = (hero: Hero) => {
        setSelectedHero(hero);
        setIsSheetOpen(true);
    };

    const handlePreviewOpen = (hero: Hero) => {
        setPreviewHero(hero);
        setIsPreviewOpen(true);
    };

    const handleSuccess = () => {
        setIsSheetOpen(false);
        fetchHeroes();
    };

    const handleToggleActive = async (hero: Hero) => {
        const result = await toggleHeroActive(hero.id, !hero.active);
        if (result.success) {
            toast({
                title: hero.active ? "Hero Deactivated" : "Hero Activated",
                description: hero.active ? "Hero banner is no longer live." : "Hero banner is now live!",
            });
            fetchHeroes();
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to update hero status.",
                variant: "destructive"
            });
        }
    };

    const handleDuplicate = async (hero: Hero) => {
        const result = await duplicateHero(hero.id);
        if (result.success) {
            toast({
                title: "Hero Duplicated",
                description: "A copy has been created. You can edit it now.",
            });
            fetchHeroes();
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to duplicate hero.",
                variant: "destructive"
            });
        }
    };

    const handleDeleteClick = (hero: Hero) => {
        setHeroToDelete(hero);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!heroToDelete) return;

        const result = await deleteHero(heroToDelete.id);
        if (result.success) {
            toast({
                title: "Hero Deleted",
                description: "Hero banner has been removed.",
            });
            fetchHeroes();
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to delete hero.",
                variant: "destructive"
            });
        }
        setDeleteDialogOpen(false);
        setHeroToDelete(undefined);
    };

    if (idLoading || (loading && dispensaryId && heroes.length === 0)) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Hero Banners</h2>
                    <p className="text-sm text-muted-foreground">Create stunning hero banners for your menu pages with AI.</p>
                </div>
                <Button onClick={handleCreateOpen}>
                    <Plus className="h-4 w-4 mr-2" />
                    Manual Hero
                </Button>
            </div>

            <Tabs defaultValue="ai-builder" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="ai-builder" className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4" />
                        AI Builder
                    </TabsTrigger>
                    <TabsTrigger value="heroes" className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        Your Heroes ({heroes.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ai-builder" className="space-y-4">
                    {dispensaryId && (
                        <HeroGeneratorInline
                            onComplete={fetchHeroes}
                        />
                    )}
                </TabsContent>

                <TabsContent value="heroes" className="space-y-4">
                    <div className="grid gap-4">
                        {heroes.length === 0 ? (
                            <div className="p-12 border border-dashed rounded-lg bg-card/50 text-center text-muted-foreground flex flex-col items-center">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">No hero banners yet</h3>
                                <p className="mb-4 max-w-sm">Use the AI Builder to create your first hero banner, or create one manually.</p>
                                <Button onClick={handleCreateOpen} variant="outline">Create Manually</Button>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {heroes.map(hero => (
                                    <Card
                                        key={hero.id}
                                        className="p-4 hover:shadow-sm transition-shadow relative group overflow-hidden"
                                    >
                                        {/* Preview thumbnail */}
                                        <div
                                            className="h-32 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden cursor-pointer"
                                            style={{
                                                background: `linear-gradient(135deg, ${hero.primaryColor} 0%, ${hero.primaryColor}dd 50%, ${hero.primaryColor}aa 100%)`,
                                            }}
                                            onClick={() => handlePreviewOpen(hero)}
                                        >
                                            {hero.heroImage ? (
                                                <img
                                                    src={hero.heroImage}
                                                    alt={hero.brandName}
                                                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                                                />
                                            ) : null}
                                            <div className="relative z-10 text-white text-center px-4">
                                                <h3 className="font-bold text-xl mb-1">{hero.brandName}</h3>
                                                <p className="text-sm opacity-90">{hero.tagline}</p>
                                            </div>
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Eye className="h-8 w-8 text-white" />
                                            </div>
                                        </div>

                                        {/* Hero info */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Badge
                                                    variant={hero.active ? 'default' : 'outline'}
                                                    className={hero.active ? 'bg-green-500' : ''}
                                                >
                                                    {hero.active ? 'Active' : 'Draft'}
                                                </Badge>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Badge variant="outline" className="text-xs">
                                                        {hero.style}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {hero.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {hero.description}
                                                </p>
                                            )}

                                            {/* Actions */}
                                            <div className="flex gap-2 pt-2 border-t">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleToggleActive(hero)}
                                                    className="flex-1"
                                                >
                                                    <Power className="h-3 w-3 mr-1" />
                                                    {hero.active ? 'Deactivate' : 'Activate'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditOpen(hero)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDuplicate(hero)}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDeleteClick(hero)}
                                                    className="text-destructive"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Edit/Create Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{selectedHero ? 'Edit Hero Banner' : 'Create New Hero Banner'}</SheetTitle>
                        <SheetDescription>
                            Configure your hero banner appearance and content.
                        </SheetDescription>
                    </SheetHeader>
                    {dispensaryId && (
                        <div className="mt-8">
                            <HeroForm
                                initialData={selectedHero}
                                orgId={dispensaryId}
                                onSuccess={handleSuccess}
                                onCancel={() => setIsSheetOpen(false)}
                            />
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Preview Sheet */}
            <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <SheetContent className="sm:max-w-4xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Hero Preview</SheetTitle>
                        <SheetDescription>
                            See how your hero banner will look on the menu page.
                        </SheetDescription>
                    </SheetHeader>
                    {previewHero && (
                        <div className="mt-8">
                            <HeroPreview hero={previewHero} />
                            <div className="flex gap-2 mt-4">
                                <Button onClick={() => {
                                    setIsPreviewOpen(false);
                                    handleEditOpen(previewHero);
                                }}>
                                    Edit This Hero
                                </Button>
                                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Hero Banner?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{heroToDelete?.brandName}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
