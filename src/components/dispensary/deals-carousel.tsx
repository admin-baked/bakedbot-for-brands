'use client';

import * as React from "react"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import { Button } from "@/components/ui/button"

export interface CarouselSlide {
    id: string | number;
    title: string;
    subtitle?: string;
    description: string;
    cta: string;
    bgColor: string;
    textColor: string;
    image?: string;
}

interface DealsCarouselProps {
    slides: CarouselSlide[];
}

export function DealsCarousel({ slides }: DealsCarouselProps) {
    if (!slides || slides.length === 0) {
        return null; // Or return a fallback/skeleton
    }

    return (
        <div className="w-full bg-background">
            <Carousel
                className="w-full"
                plugins={[
                    Autoplay({
                        delay: 6000,
                    }),
                ]}
            >
                <CarouselContent>
                    {slides.map((slide) => (
                        <CarouselItem key={slide.id}>
                            <div className={`w-full h-[300px] md:h-[400px] ${slide.bgColor} ${slide.textColor} flex items-center justify-center relative overflow-hidden`}>
                                <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8 z-10">
                                    <div className="max-w-xl space-y-4 text-center md:text-left">
                                        <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight leading-none">
                                            {slide.title}
                                            <br />
                                            {slide.subtitle && (
                                                <span className="text-primary">{slide.subtitle}</span>
                                            )}
                                        </h2>
                                        <p className="text-lg md:text-xl opacity-90 font-medium">
                                            {slide.description}
                                        </p>
                                        <Button size="lg" className="rounded-full px-8 text-lg hover:scale-105 transition-transform">
                                            {slide.cta}
                                        </Button>
                                    </div>
                                    {/* Abstract shapes or images can go here */}
                                    <div className="hidden md:block w-64 h-64 bg-white/10 rounded-full blur-3xl absolute right-20 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
            </Carousel>
        </div>
    )
}
