/**
 * Academy Slides Index
 *
 * Central export for all episode presentations.
 * All 12 episodes of Season 1 are included.
 */

import { EPISODE_1_PRESENTATION, EPISODE_1_SLIDES } from './episode-1';
import { EPISODE_2_PRESENTATION, EPISODE_2_SLIDES } from './episode-2';
import { EPISODE_3_PRESENTATION, EPISODE_3_SLIDES } from './episode-3';
import { EPISODE_4_PRESENTATION, EPISODE_4_SLIDES } from './episode-4';
import { EPISODE_5_PRESENTATION, EPISODE_5_SLIDES } from './episode-5';
import { EPISODE_6_PRESENTATION, EPISODE_6_SLIDES } from './episode-6';
import { EPISODE_7_PRESENTATION, EPISODE_7_SLIDES } from './episode-7';
import { EPISODE_8_PRESENTATION, EPISODE_8_SLIDES } from './episode-8';
import { EPISODE_9_PRESENTATION, EPISODE_9_SLIDES } from './episode-9';
import { EPISODE_10_PRESENTATION, EPISODE_10_SLIDES } from './episode-10';
import { EPISODE_11_PRESENTATION, EPISODE_11_SLIDES } from './episode-11';
import { EPISODE_12_PRESENTATION, EPISODE_12_SLIDES } from './episode-12';
import type { EpisodePresentation } from '@/types/slides';

// Export individual episodes
export { EPISODE_1_PRESENTATION, EPISODE_1_SLIDES };
export { EPISODE_2_PRESENTATION, EPISODE_2_SLIDES };
export { EPISODE_3_PRESENTATION, EPISODE_3_SLIDES };
export { EPISODE_4_PRESENTATION, EPISODE_4_SLIDES };
export { EPISODE_5_PRESENTATION, EPISODE_5_SLIDES };
export { EPISODE_6_PRESENTATION, EPISODE_6_SLIDES };
export { EPISODE_7_PRESENTATION, EPISODE_7_SLIDES };
export { EPISODE_8_PRESENTATION, EPISODE_8_SLIDES };
export { EPISODE_9_PRESENTATION, EPISODE_9_SLIDES };
export { EPISODE_10_PRESENTATION, EPISODE_10_SLIDES };
export { EPISODE_11_PRESENTATION, EPISODE_11_SLIDES };
export { EPISODE_12_PRESENTATION, EPISODE_12_SLIDES };

// All presentations map
export const ALL_PRESENTATIONS: Record<string, EpisodePresentation> = {
  'ep1-intro': EPISODE_1_PRESENTATION,
  'ep2-invisible-menu': EPISODE_2_PRESENTATION,
  'ep3-indica-sativa-lie': EPISODE_3_PRESENTATION,
  'ep4-compliance-moat': EPISODE_4_PRESENTATION,
  'ep5-smokey': EPISODE_5_PRESENTATION,
  'ep6-craig': EPISODE_6_PRESENTATION,
  'ep7-ezal': EPISODE_7_PRESENTATION,
  'ep8-pops': EPISODE_8_PRESENTATION,
  'ep9-money-mike': EPISODE_9_PRESENTATION,
  'ep10-mrs-parker': EPISODE_10_PRESENTATION,
  'ep11-deebo-advanced': EPISODE_11_PRESENTATION,
  'ep12-full-stack': EPISODE_12_PRESENTATION,
};

/**
 * Get presentation by episode ID
 */
export function getPresentation(episodeId: string): EpisodePresentation | undefined {
  return ALL_PRESENTATIONS[episodeId];
}

/**
 * Get all available presentations
 */
export function getAllPresentations(): EpisodePresentation[] {
  return Object.values(ALL_PRESENTATIONS);
}

/**
 * Check if a presentation exists for an episode
 */
export function hasPresentation(episodeId: string): boolean {
  return episodeId in ALL_PRESENTATIONS;
}

/**
 * Get total slide count across all presentations
 */
export function getTotalSlideCount(): number {
  return getAllPresentations().reduce((sum, p) => sum + p.slides.length, 0);
}

/**
 * Get total estimated duration across all presentations (in minutes)
 */
export function getTotalDuration(): number {
  return getAllPresentations().reduce((sum, p) => sum + p.estimatedDuration, 0);
}
