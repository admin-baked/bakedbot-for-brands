/**
 * Platform Selector Component
 *
 * Tab-based platform selector for creative canvas
 */

'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SocialPlatform } from '@/types/creative-content';

interface PlatformSelectorProps {
  selectedPlatform: SocialPlatform;
  onPlatformChange: (platform: SocialPlatform) => void;
  className?: string;
}

interface PlatformConfig {
  id: SocialPlatform;
  label: string;
  icon: string; // Font Awesome class or emoji
  shortLabel: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    shortLabel: 'Instagram',
    icon: 'fa-brands fa-instagram',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    shortLabel: 'TikTok',
    icon: 'fa-brands fa-tiktok',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    shortLabel: 'Facebook',
    icon: 'fa-brands fa-facebook',
  },
  {
    id: 'twitter',
    label: 'Twitter/X',
    shortLabel: 'Twitter',
    icon: 'fa-brands fa-twitter',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    shortLabel: 'LinkedIn',
    icon: 'fa-brands fa-linkedin',
  },
];

export function PlatformSelector({
  selectedPlatform,
  onPlatformChange,
  className,
}: PlatformSelectorProps) {
  return (
    <nav className={cn('flex bg-gray-100 p-1 rounded-xl gap-1', className)}>
      {PLATFORMS.map((platform) => {
        const isSelected = selectedPlatform === platform.id;

        return (
          <Button
            key={platform.id}
            onClick={() => onPlatformChange(platform.id)}
            variant={isSelected ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              isSelected
                ? 'bg-white text-baked-green shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            )}
          >
            <i className={cn(platform.icon, 'mr-2')} />
            <span className="hidden sm:inline">{platform.shortLabel}</span>
            <span className="sm:hidden">{platform.shortLabel.slice(0, 2)}</span>
          </Button>
        );
      })}
    </nav>
  );
}

/**
 * Platform Selector with Icons Only (Compact)
 */
export function PlatformSelectorCompact({
  selectedPlatform,
  onPlatformChange,
  className,
}: PlatformSelectorProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      {PLATFORMS.map((platform) => {
        const isSelected = selectedPlatform === platform.id;

        return (
          <Button
            key={platform.id}
            onClick={() => onPlatformChange(platform.id)}
            variant={isSelected ? 'default' : 'outline'}
            size="icon"
            className={cn(
              'h-10 w-10 rounded-lg transition-all',
              isSelected && 'bg-baked-green hover:bg-baked-green/90 text-white border-baked-green'
            )}
            title={platform.label}
          >
            <i className={platform.icon} />
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Platform Badge (Read-only display)
 */
export function PlatformBadge({ platform }: { platform: SocialPlatform }) {
  const config = PLATFORMS.find((p) => p.id === platform);

  if (!config) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
      <i className={config.icon} />
      <span className="font-medium text-gray-700">{config.label}</span>
    </div>
  );
}
