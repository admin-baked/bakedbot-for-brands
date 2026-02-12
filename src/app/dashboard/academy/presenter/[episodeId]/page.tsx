'use client';

/**
 * Episode Presenter Mode
 *
 * Full-screen slide presentation for screen recording.
 * Keyboard navigation: Arrow keys, Space, Escape, F for fullscreen, N for notes.
 */

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { getPresentation } from '@/lib/academy/slides';
import { SlideRenderer } from '@/components/academy/slides/slide-renderer';
import { AnimatedSlideWrapper } from '@/components/academy/slides/animated-slide-wrapper';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  FileText,
  X,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresenterPageProps {
  params: Promise<{ episodeId: string }>;
}

export default function PresenterPage({ params }: PresenterPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const presentation = getPresentation(resolvedParams.episodeId);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [backgrounds, setBackgrounds] = useState<Record<string, string>>({});
  const [agentIllustrations, setAgentIllustrations] = useState<Record<string, string>>({});

  // Fetch cached slide visuals on mount
  useEffect(() => {
    async function fetchVisuals() {
      try {
        const [bgRes, agentRes] = await Promise.all([
          fetch('/api/academy/slide-visuals?type=backgrounds'),
          fetch('/api/academy/slide-visuals?type=agents'),
        ]);
        if (bgRes.ok) {
          const data = await bgRes.json();
          if (data.backgrounds) setBackgrounds(data.backgrounds);
        }
        if (agentRes.ok) {
          const data = await agentRes.json();
          if (data.illustrations) setAgentIllustrations(data.illustrations);
        }
      } catch {
        // Visuals are optional — graceful fallback to CSS gradients
      }
    }
    fetchVisuals();
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!presentation) return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (currentSlide < presentation.slides.length - 1) {
            setCurrentSlide((prev) => prev + 1);
          }
          break;
        case 'ArrowLeft':
        case 'Backspace':
          e.preventDefault();
          if (currentSlide > 0) {
            setCurrentSlide((prev) => prev - 1);
          }
          break;
        case 'Home':
          e.preventDefault();
          setCurrentSlide(0);
          break;
        case 'End':
          e.preventDefault();
          setCurrentSlide(presentation.slides.length - 1);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          setShowNotes((prev) => !prev);
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          setShowControls((prev) => !prev);
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          break;
      }
    },
    [currentSlide, presentation]
  );

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Attach keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Navigate to slide on click
  const goToSlide = (index: number) => {
    if (presentation && index >= 0 && index < presentation.slides.length) {
      setCurrentSlide(index);
    }
  };

  if (!presentation) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Presentation Not Found</h1>
          <p className="text-muted-foreground mb-6">
            Slides for episode "{resolvedParams.episodeId}" have not been created yet.
          </p>
          <Button onClick={() => router.push('/dashboard/academy/presenter')}>
            Back to Presenter Mode
          </Button>
        </div>
      </div>
    );
  }

  const slide = presentation.slides[currentSlide];

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      {/* Slide Content */}
      <div className="flex-1 relative" onClick={() => setShowControls(!showControls)}>
        <AnimatedSlideWrapper slideKey={`slide-${currentSlide}`}>
          <SlideRenderer
            slide={slide}
            trackColor={presentation.trackColor}
            backgrounds={backgrounds}
            agentIllustrations={agentIllustrations}
          />
        </AnimatedSlideWrapper>

        {/* Speaker Notes Overlay */}
        {showNotes && slide.notes && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/90 text-white p-6 max-h-48 overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm mb-2 text-yellow-400">Speaker Notes</h4>
                <p className="text-sm leading-relaxed">{slide.notes}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotes(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      {showControls && (
        <div className="bg-muted/95 backdrop-blur border-t p-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Left: Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard/academy/presenter')}
                title="Back to episodes"
              >
                <Home className="h-5 w-5" />
              </Button>
              <div className="h-6 w-px bg-border mx-2" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToSlide(currentSlide - 1)}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="text-sm font-medium min-w-[80px] text-center">
                {currentSlide + 1} / {presentation.slides.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToSlide(currentSlide + 1)}
                disabled={currentSlide === presentation.slides.length - 1}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Center: Progress dots */}
            <div className="hidden md:flex items-center gap-1 flex-1 justify-center max-w-2xl px-4">
              {presentation.slides.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(index);
                  }}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    index === currentSlide
                      ? 'w-6 bg-primary'
                      : index < currentSlide
                        ? 'bg-primary/50'
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                  title={`Slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant={showNotes ? 'default' : 'ghost'}
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotes(!showNotes);
                }}
                title="Toggle notes (N)"
              >
                <FileText className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                title="Toggle fullscreen (F)"
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard hint (only on first load) */}
      {!isFullscreen && currentSlide === 0 && showControls && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded-lg">
          Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded mx-1">F</kbd> for fullscreen •{' '}
          <kbd className="px-1.5 py-0.5 bg-white/20 rounded mx-1">→</kbd> to advance •{' '}
          <kbd className="px-1.5 py-0.5 bg-white/20 rounded mx-1">C</kbd> to hide controls
        </div>
      )}
    </div>
  );
}
