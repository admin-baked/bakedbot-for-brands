// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

import { Button } from '@/components/ui/button';
import { Plus, Loader2, Images, Wand2, List } from 'lucide-react';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { useEffect, useState, useCallback } from 'react';
import { getCarousels } from '@/app/actions/carousels';
import { Carousel } from '@/types/carousels';
import { useToast } from '@/hooks/use-toast';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { CarouselForm } from '@/components/dashboard/carousels/carousel-form';
import { CarouselRuleBuilder } from '@/components/dashboard/carousels/carousel-rule-builder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CarouselsPage() {
    const { dispensaryId, loading: idLoading } = useDispensaryId();
    const [carousels, setCarousels] = useState<Carousel[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedCarousel, setSelectedCarousel] = useState<Carousel | undefined>(undefined);

    const fetchCarousels = useCallback(async () => {
        if (!dispensaryId) return;
        const result = await getCarousels(dispensaryId);
        if (result.success && result.data) {
            setCarousels(result.data);
        } else {
            toast({
                title: "Error",
                description: "Failed to load carousels.",
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
        fetchCarousels();
    }, [dispensaryId, idLoading, fetchCarousels]);

    const handleCreateOpen = () => {
        setSelectedCarousel(undefined);
        setIsSheetOpen(true);
    };

    const handleEditOpen = (carousel: Carousel) => {
        setSelectedCarousel(carousel);
        setIsSheetOpen(true);
    };

    const handleSuccess = () => {
        setIsSheetOpen(false);
        fetchCarousels();
    };

    if (idLoading || (loading && dispensaryId && carousels.length === 0)) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Featured Carousels</h2>
                    <p className="text-sm text-muted-foreground">Create AI-powered product collections with competitive insights.</p>
                </div>
                <Button onClick={handleCreateOpen}>
                    <Plus className="h-4 w-4 mr-2" />
                    Manual Carousel
                </Button>
            </div>

            <Tabs defaultValue="ai-builder" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="ai-builder" className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4" />
                        AI Builder
                    </TabsTrigger>
                    <TabsTrigger value="carousels" className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        Your Carousels ({carousels.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ai-builder" className="space-y-4">
                    {dispensaryId && (
                        <CarouselRuleBuilder
                            orgId={dispensaryId}
                            onCarouselCreated={fetchCarousels}
                        />
                    )}
                </TabsContent>

                <TabsContent value="carousels" className="space-y-4">
                    <div className="grid gap-4">
                        {carousels.length === 0 ? (
                            <div className="p-12 border border-dashed rounded-lg bg-card/50 text-center text-muted-foreground flex flex-col items-center">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Images className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">No carousels yet</h3>
                                <p className="mb-4 max-w-sm">Use the AI Builder to create your first carousel, or create one manually.</p>
                                <Button onClick={handleCreateOpen} variant="outline">Create Manually</Button>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {carousels.map(carousel => (
                                    <div
                                        key={carousel.id}
                                        className="p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/50 relative group"
                                        onClick={() => handleEditOpen(carousel)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold truncate pr-2">{carousel.title}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">#{carousel.displayOrder}</span>
                                                <span className={`h-2 w-2 rounded-full ${carousel.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                                            {carousel.description || "No description."}
                                        </p>
                                        <div className="text-sm border-t pt-3 flex justify-between items-center text-muted-foreground">
                                            <span className="font-medium">{carousel.productIds.length} Products</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{selectedCarousel ? 'Edit Carousel' : 'Create New Carousel'}</SheetTitle>
                        <SheetDescription>
                            Configure carousel display and products.
                        </SheetDescription>
                    </SheetHeader>
                    {dispensaryId && (
                        <div className="mt-8">
                            <CarouselForm
                                initialData={selectedCarousel}
                                orgId={dispensaryId}
                                onSuccess={handleSuccess}
                                onCancel={() => setIsSheetOpen(false)}
                            />
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
