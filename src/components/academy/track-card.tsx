'use client';

/**
 * Agent Track Card
 *
 * Displays an agent track with character image, name, tagline, and episode count.
 * Features Framer Motion hover animations and agent-color theming.
 * Clicking filters the episode grid to show only episodes from this agent.
 */

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAgentAsset } from '@/lib/academy/agent-assets';
import type { AgentTrack, AgentTrackInfo } from '@/types/academy';

export interface TrackCardProps {
  track: AgentTrack;
  trackInfo: AgentTrackInfo;
  episodeCount: number;
  onSelect: (track: AgentTrack) => void;
  isSelected?: boolean;
}

export function TrackCard({
  track,
  trackInfo,
  episodeCount,
  onSelect,
  isSelected = false,
}: TrackCardProps) {
  const asset = getAgentAsset(track);

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card
        className={cn(
          'cursor-pointer transition-shadow overflow-hidden h-full',
          isSelected ? 'ring-2 shadow-lg' : 'hover:shadow-lg'
        )}
        style={isSelected ? { borderColor: trackInfo.color, boxShadow: `0 0 20px ${trackInfo.color}30` } : undefined}
        onClick={() => onSelect(track)}
      >
        {/* Agent Visual Header */}
        <div
          className="relative h-32 overflow-hidden flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${trackInfo.color}30, ${trackInfo.color}10)`,
          }}
        >
          {asset.hasImage && asset.imagePath ? (
            <Image
              src={asset.imagePath}
              alt={trackInfo.name}
              width={120}
              height={120}
              className="object-contain drop-shadow-lg"
            />
          ) : (
            <span className="text-6xl drop-shadow-lg">{asset.emoji}</span>
          )}
          {/* Color accent bar at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ backgroundColor: trackInfo.color }}
          />
        </div>

        <CardContent className="p-5">
          {/* Agent Name */}
          <h3 className="text-lg font-bold mb-1">{trackInfo.name}</h3>

          {/* Tagline */}
          <p className="text-muted-foreground text-sm mb-3">{trackInfo.tagline}</p>

          {/* Metadata */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">{episodeCount} episodes</Badge>
            {trackInfo.modules > 0 && (
              <Badge variant="outline">{trackInfo.modules} modules</Badge>
            )}
          </div>

          {/* CTA Button */}
          <Button
            variant={isSelected ? 'default' : 'outline'}
            className="w-full gap-2"
            style={isSelected ? { backgroundColor: trackInfo.color, borderColor: trackInfo.color } : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(track);
            }}
          >
            {isSelected ? 'Viewing Track' : 'Start Learning'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
