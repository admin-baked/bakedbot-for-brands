'use client';

/**
 * Episode Card
 *
 * Displays an Academy episode with agent-themed thumbnail, title, duration,
 * and learning objectives. Features Framer Motion entrance and hover animations.
 * Better visual treatment for PLACEHOLDER (unreleased) episodes.
 */

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Play, Clock, Video, CheckCircle2 } from 'lucide-react';
import { getAgentAsset, BAKEDBOT_BRAND } from '@/lib/academy/agent-assets';
import type { AcademyEpisode } from '@/types/academy';
import { AGENT_TRACKS } from '@/lib/academy/curriculum';

export interface EpisodeCardProps {
  episode: AcademyEpisode;
  onWatch: (episode: AcademyEpisode) => void;
  isLocked?: boolean;
  hasWatched?: boolean;
  thumbnailUrl?: string;
}

export function EpisodeCard({
  episode,
  onWatch,
  isLocked = false,
  hasWatched = false,
  thumbnailUrl,
}: EpisodeCardProps) {
  const isPlaceholder = episode.youtubeId === 'PLACEHOLDER';
  const trackInfo = episode.track !== 'general' ? AGENT_TRACKS[episode.track] : null;
  const trackColor = trackInfo?.color || BAKEDBOT_BRAND.color;
  const asset = getAgentAsset(episode.track);
  const durationMinutes = Math.ceil(episode.duration / 60);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4 }}
    >
      <Card
        className="cursor-pointer transition-shadow hover:shadow-xl overflow-hidden h-full"
        onClick={() => !isLocked && onWatch(episode)}
      >
        <CardContent className="p-0">
          {/* Thumbnail */}
          <div
            className="relative w-full aspect-video overflow-hidden flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${trackColor}cc, ${trackColor}66)`,
            }}
          >
            {/* Gemini-generated thumbnail or agent image */}
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={episode.title}
                fill
                className="object-cover"
              />
            ) : asset.hasImage && asset.imagePath ? (
              <Image
                src={asset.imagePath}
                alt={episode.track}
                width={100}
                height={100}
                className="object-contain opacity-60 drop-shadow-lg"
              />
            ) : episode.track === 'general' ? (
              <Image
                src={BAKEDBOT_BRAND.logoPath}
                alt="BakedBot"
                width={140}
                height={40}
                className="object-contain opacity-50"
              />
            ) : (
              <span className="text-5xl opacity-50">{asset.emoji}</span>
            )}

            {/* Episode Number Badge */}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-black/50 text-white border-0 text-xs">
                Ep {episode.episodeNumber}
              </Badge>
            </div>

            {/* Status Overlay */}
            {isPlaceholder ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <Video className="h-8 w-8 text-white/80 mb-1" />
                <span className="text-white/90 text-xs font-medium">Coming Soon</span>
              </div>
            ) : isLocked ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Lock className="h-10 w-10 text-white/80" />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="h-7 w-7 text-white ml-0.5" />
                </div>
              </div>
            )}

            {/* Watched Badge */}
            {hasWatched && !isLocked && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-green-600 text-white border-0 text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Watched
                </Badge>
              </div>
            )}

            {/* Duration */}
            <div className="absolute bottom-2 right-2">
              <Badge variant="secondary" className="bg-black/50 text-white border-0 gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {durationMinutes} min
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Track indicator */}
            {trackInfo && (
              <div className="flex items-center gap-1.5 mb-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: trackColor }}
                />
                <span className="text-xs text-muted-foreground font-medium">
                  {trackInfo.name}
                </span>
              </div>
            )}

            {/* Title */}
            <h3 className="font-semibold text-base mb-2 line-clamp-2">
              {episode.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {episode.description}
            </p>

            {/* Learning Objectives */}
            {episode.learningObjectives.length > 0 && (
              <div className="mb-3">
                <ul className="text-xs text-muted-foreground space-y-1">
                  {episode.learningObjectives.slice(0, 2).map((objective, idx) => (
                    <li key={idx} className="line-clamp-1 flex items-start gap-1">
                      <span style={{ color: trackColor }}>&#x2022;</span>
                      {objective}
                    </li>
                  ))}
                  {episode.learningObjectives.length > 2 && (
                    <li className="text-xs" style={{ color: trackColor }}>
                      + {episode.learningObjectives.length - 2} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Watch Button */}
            <Button
              variant={isLocked || isPlaceholder ? 'outline' : 'default'}
              size="sm"
              className="w-full gap-2"
              disabled={isPlaceholder}
              style={
                !isLocked && !isPlaceholder
                  ? { backgroundColor: trackColor, borderColor: trackColor }
                  : undefined
              }
              onClick={(e) => {
                e.stopPropagation();
                if (!isPlaceholder) onWatch(episode);
              }}
            >
              {isPlaceholder ? (
                <>
                  <Video className="h-4 w-4" />
                  Coming Soon
                </>
              ) : isLocked ? (
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
    </motion.div>
  );
}
