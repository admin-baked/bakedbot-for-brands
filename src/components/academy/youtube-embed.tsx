'use client';

/**
 * YouTube Embed Video Player
 *
 * Displays YouTube video with tracking, or placeholder if video not ready.
 * Tracks view events and completion milestones.
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Video,
  FileDown,
  ArrowRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import type { AcademyEpisode } from '@/types/academy';
import { trackVideoView } from '@/server/actions/academy';
import { trackVideoProgress } from '@/server/actions/video-progress';
import { getSessionId, getLeadId } from '@/lib/academy/usage-tracker';
import { SocialShareButtons } from './social-share-buttons';

export interface YouTubeEmbedProps {
  episode: AcademyEpisode;
  onComplete?: () => void;
  onResourceClick?: (resourceId: string) => void;
  relatedEpisodes?: AcademyEpisode[];
  onRelatedClick?: (episode: AcademyEpisode) => void;
}

export function YouTubeEmbed({
  episode,
  onComplete,
  onResourceClick,
  relatedEpisodes = [],
  onRelatedClick,
}: YouTubeEmbedProps) {
  const [tracked, setTracked] = useState(false);
  const [milestonesReached, setMilestonesReached] = useState<Set<25 | 50 | 75 | 100>>(new Set());
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlaceholder = episode.youtubeId === 'PLACEHOLDER';

  // Track view when component mounts (user opened video)
  useEffect(() => {
    if (!tracked && !isPlaceholder) {
      const sessionId = getSessionId();
      const leadId = getLeadId();

      trackVideoView({
        contentId: episode.id,
        sessionId,
        leadId,
      }).catch((error) => {
        console.error('Failed to track video view:', error);
      });

      setTracked(true);
    }
  }, [episode.id, tracked, isPlaceholder]);

  // Video progress tracking with YouTube Player API
  useEffect(() => {
    if (isPlaceholder) return;

    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

    // Initialize player when API is ready
    (window as any).onYouTubeIframeAPIReady = () => {
      playerRef.current = new (window as any).YT.Player(`youtube-player-${episode.id}`, {
        events: {
          onStateChange: handlePlayerStateChange,
        },
      });
    };

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [episode.id, isPlaceholder]);

  // Handle player state changes (play, pause, etc.)
  const handlePlayerStateChange = (event: any) => {
    const playerState = event.data;

    // Playing (1)
    if (playerState === 1) {
      startProgressTracking();
    }
    // Paused (2) or Ended (0)
    else if (playerState === 2 || playerState === 0) {
      stopProgressTracking();
    }
  };

  // Start tracking progress every 10 seconds
  const startProgressTracking = () => {
    if (progressIntervalRef.current) return; // Already tracking

    progressIntervalRef.current = setInterval(() => {
      trackCurrentProgress();
    }, 10000); // Every 10 seconds

    // Also track immediately
    trackCurrentProgress();
  };

  // Stop tracking progress
  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Track current video progress
  const trackCurrentProgress = async () => {
    if (!playerRef.current || !playerRef.current.getCurrentTime) return;

    try {
      const currentTime = playerRef.current.getCurrentTime();
      const duration = playerRef.current.getDuration();

      if (!duration || duration === 0) return;

      const completionPercentage = Math.round((currentTime / duration) * 100);

      // Determine milestone
      let milestone: 25 | 50 | 75 | 100 | undefined;
      if (completionPercentage >= 100 && !milestonesReached.has(100)) {
        milestone = 100;
      } else if (completionPercentage >= 75 && !milestonesReached.has(75)) {
        milestone = 75;
      } else if (completionPercentage >= 50 && !milestonesReached.has(50)) {
        milestone = 50;
      } else if (completionPercentage >= 25 && !milestonesReached.has(25)) {
        milestone = 25;
      }

      // Track progress
      await trackVideoProgress({
        episodeId: episode.id,
        watchedSeconds: Math.round(currentTime),
        totalSeconds: Math.round(duration),
        completionPercentage,
        milestone,
      });

      // Update milestones reached
      if (milestone) {
        setMilestonesReached((prev) => new Set([...prev, milestone]));

        // Call onComplete callback if 100%
        if (milestone === 100 && onComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error('Failed to track video progress:', error);
    }
  };

  if (isPlaceholder) {
    return (
      <div className="space-y-6">
        {/* Placeholder Alert */}
        <Alert>
          <Video className="h-4 w-4" />
          <AlertTitle>Video Coming Soon</AlertTitle>
          <AlertDescription>
            This episode is currently being recorded. We'll notify you when it's
            ready! In the meantime, check out the resources below or explore other
            episodes.
          </AlertDescription>
        </Alert>

        {/* Episode Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div
                className="w-24 h-24 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                }}
              >
                <Video className="h-12 w-12 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{episode.title}</h2>
                <p className="text-muted-foreground mb-4">{episode.description}</p>
                <Badge variant="secondary">
                  Episode {episode.episodeNumber}
                </Badge>
              </div>
            </div>

            {/* Learning Objectives */}
            {episode.learningObjectives.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">What You'll Learn:</h3>
                <ul className="space-y-2">
                  {episode.learningObjectives.map((objective, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resources Section (if available) */}
        {episode.resources.length > 0 && (
          <ResourcesSection
            resources={episode.resources}
            onResourceClick={onResourceClick}
          />
        )}

        {/* Related Episodes */}
        {relatedEpisodes.length > 0 && (
          <RelatedEpisodesSection
            episodes={relatedEpisodes}
            onEpisodeClick={onRelatedClick}
          />
        )}
      </div>
    );
  }

  // Real YouTube video
  return (
    <div className="space-y-6">
      {/* YouTube Embed */}
      <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
        <iframe
          id={`youtube-player-${episode.id}`}
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${episode.youtubeId}?rel=0&enablejsapi=1`}
          title={episode.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>

      {/* Episode Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">{episode.title}</h2>
              <p className="text-muted-foreground">{episode.description}</p>
            </div>
            <Badge variant="secondary">
              Episode {episode.episodeNumber}
            </Badge>
          </div>

          {/* Learning Objectives */}
          {episode.learningObjectives.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">What You'll Learn:</h3>
              <ul className="space-y-2">
                {episode.learningObjectives.map((objective, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Social Share */}
          <div className="mt-6 pt-6 border-t">
            <SocialShareButtons episode={episode} />
          </div>
        </CardContent>
      </Card>

      {/* Resources Section */}
      {episode.resources.length > 0 && (
        <ResourcesSection
          resources={episode.resources}
          onResourceClick={onResourceClick}
        />
      )}

      {/* Related Episodes */}
      {relatedEpisodes.length > 0 && (
        <RelatedEpisodesSection
          episodes={relatedEpisodes}
          onEpisodeClick={onRelatedClick}
        />
      )}
    </div>
  );
}

// Helper Components

function ResourcesSection({
  resources,
  onResourceClick,
}: {
  resources: AcademyEpisode['resources'];
  onResourceClick?: (resourceId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Episode Resources
        </h3>
        <div className="space-y-3">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div>
                <p className="font-medium">{resource.title}</p>
                <p className="text-sm text-muted-foreground">
                  {resource.description}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResourceClick?.(resource.id)}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Download
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RelatedEpisodesSection({
  episodes,
  onEpisodeClick,
}: {
  episodes: AcademyEpisode[];
  onEpisodeClick?: (episode: AcademyEpisode) => void;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold text-lg mb-4">Up Next</h3>
        <div className="space-y-3">
          {episodes.slice(0, 3).map((ep) => (
            <div
              key={ep.id}
              className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => onEpisodeClick?.(ep)}
            >
              <div
                className="w-16 h-16 rounded flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                }}
              >
                <Video className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium line-clamp-1">{ep.title}</p>
                <p className="text-sm text-muted-foreground">
                  Episode {ep.episodeNumber} • {Math.ceil(ep.duration / 60)} min
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
