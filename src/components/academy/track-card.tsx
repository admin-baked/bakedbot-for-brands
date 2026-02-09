'use client';

/**
 * Agent Track Card
 *
 * Displays an agent track with name, tagline, color, and module info.
 * Clicking filters the episode grid to show only episodes from this agent.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
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
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onSelect(track)}
    >
      <CardContent className="p-6">
        {/* Agent Icon/Color Bar */}
        <div
          className="w-full h-2 rounded-full mb-4"
          style={{ backgroundColor: trackInfo.color }}
        />

        {/* Agent Name */}
        <h3 className="text-xl font-bold mb-2">{trackInfo.name}</h3>

        {/* Tagline */}
        <p className="text-muted-foreground text-sm mb-4">{trackInfo.tagline}</p>

        {/* Description */}
        <p className="text-sm mb-4 line-clamp-3">{trackInfo.description}</p>

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
  );
}
