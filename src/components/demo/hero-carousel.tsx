'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HeroSlide } from '@/types/hero-slides';

interface HeroCarouselProps {
  slides?: HeroSlide[];
  autoPlay?: boolean;
  interval?: number;
  primaryColor?: string;
}

const defaultSlides: HeroSlide[] = [
  {
    id: '1',
    orgId: 'default',
    title: '20% OFF ALL FLOWER',
    subtitle: 'Happy Hour Special',
    description: 'Every day from 8AM - 12PM. The best deals in town!',
    ctaText: 'Shop Flower',
    ctaAction: 'scroll',
    ctaTarget: 'products',
    backgroundColor: '#16a34a',
    textAlign: 'left',
    displayOrder: 0,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    orgId: 'default',
    title: 'BUY 2 VAPES, GET 1 FREE',
    subtitle: 'Limited Time Offer',
    description: 'Mix & match any cartridges or disposables.',
    ctaText: 'Shop Vapes',
    ctaAction: 'scroll',
    ctaTarget: 'products',
    backgroundColor: '#8b5cf6',
    textAlign: 'center',
    displayOrder: 1,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    orgId: 'default',
    title: 'NEW ARRIVALS',
    subtitle: 'Fresh Drop',
    description: 'Check out the latest from Cookies, Stiiizy & more.',
    ctaText: 'See What\'s New',
    ctaAction: 'scroll',
    ctaTarget: 'products',
    backgroundColor: '#1a1a2e',
    textAlign: 'right',
    displayOrder: 2,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    orgId: 'default',
    title: 'FIRST TIME CUSTOMERS',
    subtitle: '25% OFF Your First Order',
    description: 'Use code WELCOME25 at checkout.',
    ctaText: 'Start Shopping',
    ctaAction: 'scroll',
    ctaTarget: 'products',
    backgroundColor: '#dc2626',
    textAlign: 'center',
    displayOrder: 3,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function HeroCarousel({
  slides = defaultSlides,
  autoPlay = true,
  interval = 5000,
  primaryColor = '#16a34a',
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (!autoPlay || isHovered) return;

    const timer = setInterval(nextSlide, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, isHovered, nextSlide]);

  const currentSlide = slides[currentIndex];

  const alignmentClasses = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
  };

  const handleCtaClick = (slide: HeroSlide) => {
    if (slide.ctaAction === 'scroll' && slide.ctaTarget) {
      const element = document.getElementById(slide.ctaTarget);
      element?.scrollIntoView({ behavior: 'smooth' });
    } else if (slide.ctaAction === 'link' && slide.ctaTarget) {
      window.location.href = slide.ctaTarget;
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides Container */}
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="w-full shrink-0"
          >
            <div
              className="relative min-h-[300px] md:min-h-[400px] lg:min-h-[500px] flex items-center"
              style={{ backgroundColor: slide.backgroundColor || primaryColor }}
            >
              {/* Background Image */}
              {slide.imageUrl && (
                <Image
                  src={slide.imageUrl}
                  alt={slide.title}
                  fill
                  className="object-cover"
                  priority={slides.indexOf(slide) === 0}
                />
              )}

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

              {/* Decorative elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute -right-20 -top-20 w-80 h-80 border-8 border-white rounded-full" />
                <div className="absolute -left-10 -bottom-10 w-60 h-60 border-8 border-white rounded-full" />
                <div className="absolute right-1/4 bottom-10 w-40 h-40 border-4 border-white rounded-full" />
              </div>

              {/* Content */}
              <div className="container mx-auto px-4 relative z-10">
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
                  <h2
                    className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
                  >
                    {slide.title}
                  </h2>
                  {slide.description && (
                    <p className="text-white/90 text-base md:text-lg mb-6 max-w-lg">
                      {slide.description}
                    </p>
                  )}
                  {slide.ctaText && (slide.ctaAction !== 'none') && (
                    <Button
                      size="lg"
                      className="w-fit bg-white text-black hover:bg-white/90 font-bold gap-2 px-8"
                      onClick={() => handleCtaClick(slide)}
                    >
                      {slide.ctaText}
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm"
        onClick={prevSlide}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm"
        onClick={nextSlide}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            className={cn(
              'w-3 h-3 rounded-full transition-all',
              currentIndex === index
                ? 'bg-white w-8'
                : 'bg-white/50 hover:bg-white/75'
            )}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
