'use client';

import Image from 'next/image';
import { HeroSlide } from '@/types/hero-slides';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroSlidePreviewProps {
    slide: HeroSlide;
}

const alignmentClasses = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
};

export function HeroSlidePreview({ slide }: HeroSlidePreviewProps) {
    const handleCtaClick = () => {
        if (slide.ctaAction === 'scroll' && slide.ctaTarget) {
            const element = document.getElementById(slide.ctaTarget);
            element?.scrollIntoView({ behavior: 'smooth' });
        } else if (slide.ctaAction === 'link' && slide.ctaTarget) {
            window.open(slide.ctaTarget, '_blank');
        }
    };

    return (
        <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
                <p>Desktop Preview</p>
            </div>

            {/* Desktop Preview */}
            <div
                className="relative min-h-[400px] flex items-center rounded-lg overflow-hidden border"
                style={{ backgroundColor: slide.backgroundColor || '#16a34a' }}
            >
                {/* Background Image */}
                {slide.imageUrl && (
                    <Image
                        src={slide.imageUrl}
                        alt={slide.title}
                        fill
                        className="object-cover absolute inset-0"
                    />
                )}

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

                {/* Content */}
                <div className="container mx-auto px-4 relative z-10 w-full">
                    <div
                        className={cn(
                            'flex flex-col max-w-2xl mx-auto md:mx-0',
                            alignmentClasses[slide.textAlign || 'left']
                        )}
                    >
                        {slide.subtitle && (
                            <span className="text-white/80 text-sm md:text-base font-medium uppercase tracking-wider mb-2">
                                {slide.subtitle}
                            </span>
                        )}
                        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                            {slide.title}
                        </h2>
                        {slide.description && (
                            <p className="text-white/90 text-base md:text-lg mb-6 max-w-lg">
                                {slide.description}
                            </p>
                        )}
                        {slide.ctaText && slide.ctaAction !== 'none' && (
                            <Button
                                size="lg"
                                className="w-fit bg-white text-black hover:bg-white/90 font-bold gap-2 px-8"
                                onClick={handleCtaClick}
                            >
                                {slide.ctaText}
                                <ArrowRight className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Preview */}
            <div className="text-sm text-muted-foreground mt-8 mb-2">
                <p>Mobile Preview</p>
            </div>
            <div className="max-w-sm mx-auto border rounded-lg overflow-hidden bg-black/5">
                <div
                    className="relative min-h-[300px] flex items-center"
                    style={{ backgroundColor: slide.backgroundColor || '#16a34a' }}
                >
                    {/* Background Image */}
                    {slide.imageUrl && (
                        <Image
                            src={slide.imageUrl}
                            alt={slide.title}
                            fill
                            className="object-cover absolute inset-0"
                        />
                    )}

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

                    {/* Content */}
                    <div className="px-4 relative z-10 w-full">
                        <div
                            className={cn(
                                'flex flex-col',
                                alignmentClasses[slide.textAlign || 'left']
                            )}
                        >
                            {slide.subtitle && (
                                <span className="text-white/80 text-xs font-medium uppercase tracking-wider mb-1">
                                    {slide.subtitle}
                                </span>
                            )}
                            <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                                {slide.title}
                            </h2>
                            {slide.description && (
                                <p className="text-white/90 text-sm mb-3 line-clamp-2">
                                    {slide.description}
                                </p>
                            )}
                            {slide.ctaText && slide.ctaAction !== 'none' && (
                                <Button
                                    size="sm"
                                    className="w-fit bg-white text-black hover:bg-white/90 font-bold gap-2"
                                    onClick={handleCtaClick}
                                >
                                    {slide.ctaText}
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide Info */}
            <div className="border-t pt-4 mt-6 space-y-2 text-sm">
                <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2 font-medium">{slide.active ? '🟢 Active' : '⚪ Inactive'}</span>
                </div>
                <div>
                    <span className="text-muted-foreground">Action:</span>
                    <span className="ml-2 font-medium">
                        {slide.ctaAction === 'scroll' && `📍 Scroll to "${slide.ctaTarget}"`}
                        {slide.ctaAction === 'link' && `🔗 ${slide.ctaTarget}`}
                        {slide.ctaAction === 'none' && '❌ No action'}
                    </span>
                </div>
            </div>
        </div>
    );
}
