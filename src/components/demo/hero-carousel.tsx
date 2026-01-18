'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  ctaText?: string;
  ctaLink?: string;
  image?: string;
  backgroundColor?: string;
  textColor?: string;
  alignment?: 'left' | 'center' | 'right';
}

interface HeroCarouselProps {
  slides?: HeroSlide[];
  autoPlay?: boolean;
  interval?: number;
  primaryColor?: string;
}

const defaultSlides: HeroSlide[] = [
  {
    id: '1',
    title: '20% OFF ALL FLOWER',
    subtitle: 'Happy Hour Special',
    description: 'Every day from 8AM - 12PM. The best deals in town!',
    ctaText: 'Shop Flower',
    ctaLink: '#flower',
    backgroundColor: '#16a34a',
    alignment: 'left',
  },
  {
    id: '2',
    title: 'BUY 2 VAPES, GET 1 FREE',
    subtitle: 'Limited Time Offer',
    description: 'Mix & match any cartridges or disposables.',
    ctaText: 'Shop Vapes',
    ctaLink: '#vapes',
    backgroundColor: '#8b5cf6',
    alignment: 'center',
  },
  {
    id: '3',
    title: 'NEW ARRIVALS',
    subtitle: 'Fresh Drop',
    description: 'Check out the latest from Cookies, Stiiizy & more.',
    ctaText: 'See What\'s New',
    ctaLink: '#new',
    backgroundColor: '#1a1a2e',
    alignment: 'right',
  },
  {
    id: '4',
    title: 'FIRST TIME CUSTOMERS',
    subtitle: '25% OFF Your First Order',
    description: 'Use code WELCOME25 at checkout.',
    ctaText: 'Start Shopping',
    ctaLink: '#products',
    backgroundColor: '#dc2626',
    alignment: 'center',
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
              {slide.image && (
                <Image
                  src={slide.image}
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
                    alignmentClasses[slide.alignment || 'left']
                  )}
                >
                  {slide.subtitle && (
                    <span className="text-white/80 text-sm md:text-base font-medium uppercase tracking-wider mb-2">
                      {slide.subtitle}
                    </span>
                  )}
                  <h2
                    className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
                    style={{ color: slide.textColor || 'white' }}
                  >
                    {slide.title}
                  </h2>
                  {slide.description && (
                    <p className="text-white/90 text-base md:text-lg mb-6 max-w-lg">
                      {slide.description}
                    </p>
                  )}
                  {slide.ctaText && (
                    <Button
                      size="lg"
                      className="w-fit bg-white text-black hover:bg-white/90 font-bold gap-2 px-8"
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
