/**
 * Academy Curriculum - Stub
 *
 * This module was extracted to a separate app. This stub exists to prevent TypeScript errors.
 * For full academy curriculum, use the standalone academy app.
 */

export interface Episode {
    id: string;
    number: number;
    episodeNumber?: number;
    title: string;
    description: string;
    agent: string;
    track?: string;
    videoUrl: string;
    duration: string;
}

export const ACADEMY_CURRICULUM: Episode[] = [];
export const ACADEMY_EPISODES: Episode[] = [];
export const AGENT_TRACKS: any[] = [];

export function getEpisodeById(id: string): Episode | undefined {
    return ACADEMY_CURRICULUM.find(ep => ep.id === id);
}
