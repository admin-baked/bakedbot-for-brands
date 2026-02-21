'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Loader2, Eye, Power, Trash2, GripVertical } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import {
    getAllHeroSlides,
    createHeroSlide,
    updateHeroSlide,
    deleteHeroSlide,
    reorderHeroSlides,
} from '@/app/actions/hero-slides';
import { HeroSlide } from '@/types/hero-slides';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
import { HeroSlideForm } from '@/components/dashboard/menu/hero-slide-form';
import { HeroSlidePreview } from '@/components/dashboard/menu/hero-slide-preview';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function HeroCarouselPage() {
    const { user, isUserLoading: userLoading } = useUser();
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedSlide, setSelectedSlide] = useState<HeroSlide | undefined>(undefined);
    const [previewSlide, setPreviewSlide] = useState<HeroSlide | undefined>(undefined);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [slideToDelete, setSlideToDelete] = useState<HeroSlide | undefined>(undefined);

    const orgId = user ? ((user as any).currentOrgId || user.uid) : null;

    const fetchSlides = useCallback(async () => {
        if (!orgId) return;
        const result = await getAllHeroSlides(orgId);
        if (result.success && result.data) {
            setSlides(result.data);
        } else {
            toast({
                title: "Error",
                description: "Failed to load hero carousel slides.",
                variant: "destructive"
            });
        }
        setLoading(false);
    }, [orgId, toast]);

    useEffect(() => {
        if (!orgId) {
            if (!userLoading) setLoading(false);
            return;
        }
        setLoading(true);
        fetchSlides();
    }, [orgId, userLoading, fetchSlides]);

    const handleCreateOpen = () => {
        setSelectedSlide(undefined);
        setIsSheetOpen(true);
    };

    const handleEditOpen = (slide: HeroSlide) => {
        setSelectedSlide(slide);
        setIsSheetOpen(true);
    };

    const handlePreviewOpen = (slide: HeroSlide) => {
        setPreviewSlide(slide);
        setIsPreviewOpen(true);
    };

    const handleSuccess = () => {
        setIsSheetOpen(false);
        fetchSlides();
    };

    const handleToggleActive = async (slide: HeroSlide) => {
        const result = await updateHeroSlide(slide.id, { ...slide, active: !slide.active });
        if (result.success) {
            toast({
                title: slide.active ? "Slide Deactivated" : "Slide Activated",
                description: slide.active ? "Hero slide is no longer live." : "Hero slide is now live!",
            });
            fetchSlides();
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to update slide status.",
                variant: "destructive"
            });
        }
    };

    const handleDeleteClick = (slide: HeroSlide) => {
        setSlideToDelete(slide);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!slideToDelete) return;

        const result = await deleteHeroSlide(slideToDelete.id);
        if (result.success) {
            toast({
                title: "Slide Deleted",
                description: "Hero carousel slide has been removed.",
            });
            fetchSlides();
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to delete slide.",
                variant: "destructive"
            });
        }
        setDeleteDialogOpen(false);
        setSlideToDelete(undefined);
    };

    const handleReorder = async (newSlides: HeroSlide[]) => {
        const reorderData = newSlides.map((slide, index) => ({
            id: slide.id,
            displayOrder: index,
        }));
        const result = await reorderHeroSlides(reorderData);
        if (result.success) {
            setSlides(newSlides);
            toast({
                title: "Order Updated",
                description: "Hero slide order has been saved.",
            });
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to reorder slides.",
                variant: "destructive"
            });
        }
    };

    if (userLoading || (loading && orgId && slides.length === 0)) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Hero Carousel</h2>
                    <p className="text-sm text-muted-foreground">Manage promotional slides that appear on your public menu homepage.</p>
                </div>
                <Button onClick={handleCreateOpen}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Slide
                </Button>
            </div>

            <div className="space-y-4">
                {slides.length === 0 ? (
                    <div className="p-12 border border-dashed rounded-lg bg-card/50 text-center text-muted-foreground flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Eye className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">No hero slides yet</h3>
                        <p className="mb-4 max-w-sm">Create your first promotional slide to appear on your public menu homepage.</p>
                        <Button onClick={handleCreateOpen} variant="outline">Create Slide</Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {slides.map((slide, index) => (
                            <Card
                                key={slide.id}
                                className="p-4 hover:shadow-sm transition-shadow flex items-center gap-4 group"
                                draggable
                            >
                                {/* Drag handle */}
                                <div className="flex-shrink-0 opacity-50 group-hover:opacity-100">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>

                                {/* Order number */}
                                <div className="flex-shrink-0">
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-muted-foreground">{index + 1}</div>
                                        <div className="text-xs text-muted-foreground">of {slides.length}</div>
                                    </div>
                                </div>

                                {/* Preview thumbnail */}
                                <div
                                    className="h-20 w-32 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden cursor-pointer"
                                    style={{
                                        background: slide.imageUrl
                                            ? `url(${slide.imageUrl}) center / cover`
                                            : slide.backgroundColor || '#16a34a',
                                    }}
                                    onClick={() => handlePreviewOpen(slide)}
                                >
                                    {!slide.imageUrl && (
                                        <div className="relative z-10 text-white text-center px-2">
                                            <p className="text-xs font-semibold line-clamp-2">{slide.title}</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Eye className="h-5 w-5 text-white" />
                                    </div>
                                </div>

                                {/* Slide info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold truncate">{slide.title}</h3>
                                        <Badge
                                            variant={slide.active ? 'default' : 'outline'}
                                            className={slide.active ? 'bg-green-500 flex-shrink-0' : 'flex-shrink-0'}
                                        >
                                            {slide.active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">{slide.subtitle}</p>
                                    {slide.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{slide.description}</p>
                                    )}
                                </div>

                                {/* CTA info */}
                                <div className="flex-shrink-0 text-right">
                                    <Badge variant="outline" className="text-xs">
                                        {slide.ctaAction === 'scroll' ? '📍 Scroll' : '🔗 Link'}
                                    </Badge>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 flex-shrink-0">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleToggleActive(slide)}
                                        title={slide.active ? 'Deactivate' : 'Activate'}
                                    >
                                        <Power className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditOpen(slide)}
                                        title="Edit"
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDeleteClick(slide)}
                                        className="text-destructive"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit/Create Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{selectedSlide ? 'Edit Hero Slide' : 'Create New Hero Slide'}</SheetTitle>
                        <SheetDescription>
                            Create or modify a promotional slide for your public menu carousel.
                        </SheetDescription>
                    </SheetHeader>
                    {orgId && (
                        <div className="mt-8">
                            <HeroSlideForm
                                initialData={selectedSlide}
                                orgId={orgId}
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
                        <SheetTitle>Slide Preview</SheetTitle>
                        <SheetDescription>
                            See how your slide will look on the public menu homepage.
                        </SheetDescription>
                    </SheetHeader>
                    {previewSlide && (
                        <div className="mt-8">
                            <HeroSlidePreview slide={previewSlide} />
                            <div className="flex gap-2 mt-4">
                                <Button onClick={() => {
                                    setIsPreviewOpen(false);
                                    handleEditOpen(previewSlide);
                                }}>
                                    Edit This Slide
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
                        <AlertDialogTitle>Delete Hero Slide?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{slideToDelete?.title}&quot;? This action cannot be undone.
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
