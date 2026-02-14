// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

/**
 * Presenter Mode - Episode Selection
 *
 * Landing page for presenter mode showing all available episodes with slides.
 * Navigate to /dashboard/academy/presenter/[episodeId] to start presenting.
 */

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Presentation, Clock, FileText, ArrowRight } from 'lucide-react';
import { getAllPresentations, hasPresentation } from '@/lib/academy/slides';
import { ACADEMY_EPISODES } from '@/lib/academy/curriculum';

export default function PresenterModePage() {
  const presentations = getAllPresentations();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Presentation className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Presenter Mode</h1>
            <p className="text-muted-foreground">
              Select an episode to start presenting. Optimized for 1920x1080 screen recording.
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <Card className="mb-8 bg-muted/50">
        <CardContent className="p-6">
          <h3 className="font-bold mb-3">Recording Tips</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Press <kbd className="px-2 py-0.5 bg-background rounded border">F</kbd> for fullscreen mode
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Use <kbd className="px-2 py-0.5 bg-background rounded border">→</kbd> or <kbd className="px-2 py-0.5 bg-background rounded border">Space</kbd> to advance slides
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Use <kbd className="px-2 py-0.5 bg-background rounded border">←</kbd> to go back
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Press <kbd className="px-2 py-0.5 bg-background rounded border">Esc</kbd> to exit fullscreen
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Press <kbd className="px-2 py-0.5 bg-background rounded border">N</kbd> to toggle speaker notes
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Available Presentations */}
      <h2 className="text-xl font-bold mb-4">Available Episodes</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {presentations.map((presentation) => (
          <Card key={presentation.episodeId} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <Badge
                  style={{
                    backgroundColor: `${presentation.trackColor}20`,
                    color: presentation.trackColor,
                  }}
                >
                  Episode {presentation.episodeNumber}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  ~{presentation.estimatedDuration} min
                </div>
              </div>
              <CardTitle className="text-lg leading-tight">{presentation.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {presentation.slides.length} slides
                </div>
                <span className="capitalize">{presentation.track} track</span>
              </div>
              <Button asChild className="w-full gap-2">
                <Link href={`/dashboard/academy/presenter/${presentation.episodeId}`}>
                  <Play className="h-4 w-4" />
                  Start Presenting
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon */}
      <h2 className="text-xl font-bold mb-4 text-muted-foreground">Coming Soon</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ACADEMY_EPISODES.filter((ep) => !hasPresentation(ep.id)).map((episode) => (
          <Card key={episode.id} className="opacity-60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">Episode {episode.episodeNumber}</Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  ~{Math.round(episode.duration / 60)} min
                </div>
              </div>
              <CardTitle className="text-lg leading-tight text-muted-foreground">
                {episode.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <span>Slides not yet created</span>
                <span className="capitalize">{episode.track} track</span>
              </div>
              <Button disabled className="w-full gap-2" variant="outline">
                <FileText className="h-4 w-4" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
