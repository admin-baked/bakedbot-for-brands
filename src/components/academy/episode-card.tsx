'use client';

/**
 * Episode Card
 *
 * Displays an Academy episode with thumbnail, title, duration, and learning objectives.
 * Shows lock icon if email required and not yet captured.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Play, Clock } from 'lucide-react';
import type { AcademyEpisode } from '@/types/academy';
import { AGENT_TRACKS } from '@/lib/academy/curriculum';

export interface EpisodeCardProps {
  episode: AcademyEpisode;
  onWatch: (episode: AcademyEpisode) => void;
  isLocked?: boolean;
  hasWatched?: boolean;
}

export function EpisodeCard({
  episode,
  onWatch,
  isLocked = false,
  hasWatched = false,
}: EpisodeCardProps) {
  // Get track color for styling
  const trackInfo = episode.track !== 'general' ? AGENT_TRACKS[episode.track] : null;
  const trackColor = trackInfo?.color || '#10b981';

  // Format duration (seconds to minutes)
  const durationMinutes = Math.ceil(episode.duration / 60);

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isLocked ? 'opacity-75' : ''
      }`}
      onClick={() => !isLocked && onWatch(episode)}
    >
      <CardContent className="p-0">
        {/* Thumbnail */}
        <div
          className="relative w-full aspect-video rounded-t-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${trackColor}dd, ${trackColor}88)`,
          }}
        >
          {/* Episode Number */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-black/50 text-white">
              Episode {episode.episodeNumber}
            </Badge>
          </div>

          {/* Lock or Play Icon */}
          <div className="flex items-center justify-center">
            {isLocked ? (
              <Lock className="h-12 w-12 text-white/80" />
            ) : (
              <Play className="h-12 w-12 text-white/80" />
            )}
          </div>

          {/* Watched Badge */}
          {hasWatched && !isLocked && (
            <div className="absolute top-2 right-2">
              <Badge variant="default" className="bg-green-600">
                Watched
              </Badge>
            </div>
          )}

          {/* Duration */}
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="bg-black/50 text-white gap-1">
              <Clock className="h-3 w-3" />
              {durationMinutes} min
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {episode.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {episode.description}
          </p>

          {/* Learning Objectives */}
          {episode.learningObjectives.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground font-medium mb-1">
                You'll learn:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {episode.learningObjectives.slice(0, 2).map((objective, idx) => (
                  <li key={idx} className="line-clamp-1">
                    • {objective}
                  </li>
                ))}
                {episode.learningObjectives.length > 2 && (
                  <li className="text-primary">
                    + {episode.learningObjectives.length - 2} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Watch Button */}
          <Button
            variant={isLocked ? 'outline' : 'default'}
            className="w-full gap-2"
            onClick={(e) => {
              e.stopPropagation();
              onWatch(episode);
            }}
          >
            {isLocked ? (
              <>
                <Lock className="h-4 w-4" />
                Email Required
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Watch Now
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
