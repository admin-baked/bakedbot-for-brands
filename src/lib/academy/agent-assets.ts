/**
 * Agent Visual Assets
 *
 * Single source of truth for agent images, colors, gradients, and emojis.
 * Used by academy track cards, episode cards, slide renderer, and hero section.
 */

import type { AgentTrack } from '@/types/academy';

export interface AgentAsset {
  /** Path to agent character image in public/ directory */
  imagePath: string | null;
  /** Whether a real image exists (vs gradient+emoji fallback) */
  hasImage: boolean;
  /** Emoji representation for compact displays */
  emoji: string;
  /** Tailwind gradient classes for card backgrounds */
  gradient: string;
  /** Lighter gradient for card backgrounds at low opacity */
  bgGradient: string;
  /** Primary brand color (hex) */
  color: string;
  /** Darker variant for hover states */
  darkColor: string;
  /** Lucide icon name matching curriculum.ts */
  icon: string;
}

export const AGENT_ASSETS: Record<AgentTrack, AgentAsset> = {
  smokey: {
    imagePath: '/assets/agents/smokey-main.png',
    hasImage: true,
    emoji: '🌿',
    gradient: 'from-emerald-500 to-green-600',
    bgGradient: 'from-emerald-500/20 to-green-600/10',
    color: '#10b981',
    darkColor: '#059669',
    icon: 'leaf',
  },
  craig: {
    imagePath: null,
    hasImage: false,
    emoji: '📣',
    gradient: 'from-blue-500 to-indigo-600',
    bgGradient: 'from-blue-500/20 to-indigo-600/10',
    color: '#3b82f6',
    darkColor: '#2563eb',
    icon: 'megaphone',
  },
  pops: {
    imagePath: '/assets/agents/pops-main.png',
    hasImage: true,
    emoji: '📊',
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-500/20 to-purple-600/10',
    color: '#8b5cf6',
    darkColor: '#7c3aed',
    icon: 'chart-bar',
  },
  ezal: {
    imagePath: '/assets/agents/ezal-main.png',
    hasImage: true,
    emoji: '🔍',
    gradient: 'from-amber-500 to-yellow-600',
    bgGradient: 'from-amber-500/20 to-yellow-600/10',
    color: '#f59e0b',
    darkColor: '#d97706',
    icon: 'binoculars',
  },
  'money-mike': {
    imagePath: null,
    hasImage: false,
    emoji: '💰',
    gradient: 'from-emerald-400 to-teal-600',
    bgGradient: 'from-emerald-400/20 to-teal-600/10',
    color: '#10b981',
    darkColor: '#0d9488',
    icon: 'dollar-sign',
  },
  'mrs-parker': {
    imagePath: null,
    hasImage: false,
    emoji: '💝',
    gradient: 'from-pink-500 to-rose-600',
    bgGradient: 'from-pink-500/20 to-rose-600/10',
    color: '#ec4899',
    darkColor: '#db2777',
    icon: 'heart',
  },
  deebo: {
    imagePath: null,
    hasImage: false,
    emoji: '🛡️',
    gradient: 'from-red-500 to-rose-700',
    bgGradient: 'from-red-500/20 to-rose-700/10',
    color: '#ef4444',
    darkColor: '#dc2626',
    icon: 'shield',
  },
};

/**
 * Get agent asset for a given track. Returns smokey as default fallback.
 */
export function getAgentAsset(track: AgentTrack | 'general'): AgentAsset {
  if (track === 'general') return AGENT_ASSETS.smokey;
  return AGENT_ASSETS[track] ?? AGENT_ASSETS.smokey;
}

/**
 * General/BakedBot brand asset for episodes not tied to a specific agent
 */
export const BAKEDBOT_BRAND = {
  logoPath: '/bakedbot-logo-horizontal.png',
  gradient: 'from-green-500 to-emerald-600',
  bgGradient: 'from-green-500/20 to-emerald-600/10',
  color: '#10b981',
};
