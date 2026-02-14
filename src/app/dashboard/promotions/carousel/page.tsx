// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CarouselSlide {
    id: number;
    title: string;
    subtitle: string;
    description: string;
    cta: string;
    bgColor: string;
    textColor: string;
}

export default function CarouselSettingsPage() {
    const { toast } = useToast();
    const [slides, setSlides] = useState<CarouselSlide[]>([
        {
            id: 1,
            title: "20% OFF ANY TWO ITEMS",
            subtitle: "FROM 8AM - 12PM",
            description: "The Best Deal in San Jose is Back!",
            cta: "Shop Now",
            bgColor: "bg-black",
            textColor: "text-white"
        },
        {
            id: 2,
            title: "HAPPY HOUR",
            subtitle: "4PM - 6PM EVERY DAY",
            description: "Get 15% off your entire order!",
            cta: "View Details",
            bgColor: "bg-primary/20",
            textColor: "text-foreground"
        }
    ]);

    const handleAddSlide = () => {
        const newSlide: CarouselSlide = {
            id: Date.now(),
            title: "NEW PROMOTION",
            subtitle: "Subtitle Here",
            description: "Description of the deal",
            cta: "Action",
            bgColor: "bg-black",
            textColor: "text-white"
        };
        setSlides([...slides, newSlide]);
    };

    const handleRemoveSlide = (id: number) => {
        setSlides(slides.filter(s => s.id !== id));
    };

    const handleUpdateSlide = (id: number, field: keyof CarouselSlide, value: string) => {
        setSlides(slides.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleSave = () => {
        // In a real app, this would save to Firebase/Database
        toast({
            title: "Settings Saved",
            description: "Carousel slides have been updated successfully.",
        });
    };

    return (
        <div className="container mx-auto py-8 max-w-5xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Deals Carousel</h1>
                    <p className="text-muted-foreground">Manage the promotional slides displayed on your dispensary menu.</p>
                </div>
                <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </Button>
            </div>

            <div className="space-y-6">
                {slides.map((slide, index) => (
                    <Card key={slide.id}>
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Slide #{index + 1}</CardTitle>
                                <Button variant="destructive" size="sm" onClick={() => handleRemoveSlide(slide.id)}>
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={slide.title}
                                    onChange={(e) => handleUpdateSlide(slide.id, 'title', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Subtitle</Label>
                                <Input
                                    value={slide.subtitle}
                                    onChange={(e) => handleUpdateSlide(slide.id, 'subtitle', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={slide.description}
                                    onChange={(e) => handleUpdateSlide(slide.id, 'description', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>CTA Text</Label>
                                <Input
                                    value={slide.cta}
                                    onChange={(e) => handleUpdateSlide(slide.id, 'cta', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Background Color Class (Tailwind)</Label>
                                <Input
                                    value={slide.bgColor}
                                    onChange={(e) => handleUpdateSlide(slide.id, 'bgColor', e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}

                <Button variant="outline" className="w-full py-8 border-dashed" onClick={handleAddSlide}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Slide
                </Button>
            </div>
        </div>
    );
}
