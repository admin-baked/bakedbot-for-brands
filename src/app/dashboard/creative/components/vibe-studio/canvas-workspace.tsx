/**
 * Canvas Workspace Component
 *
 * Live design canvas with dynamic aspect ratios for different platforms
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Download,
  Share2,
  Edit3,
  Trash2,
  Copy,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SocialPlatform } from '@/types/creative-content';
import type { CreativeAsset } from '@/types/creative-asset';
import type { BrandGuide } from '@/types/brand-guide';

interface CanvasWorkspaceProps {
  platform: SocialPlatform;
  brandGuide: BrandGuide | null;
  generatedAsset?: CreativeAsset | null;
  onGenerate?: () => void;
  onEdit?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

export function CanvasWorkspace({
  platform,
  brandGuide,
  generatedAsset,
  onGenerate,
  onEdit,
  onDownload,
  onShare,
  onDelete,
}: CanvasWorkspaceProps) {
  // Get canvas dimensions based on platform
  const canvasConfig = getCanvasConfig(platform);

  return (
    <div className="flex-1 bg-[#f0f2f5] p-12 overflow-auto flex relative">
      <div className="m-auto">
        {/* Canvas Container */}
        <div
          className={cn(
            'bg-white canvas-shadow rounded-sm overflow-hidden relative transition-all duration-500',
            canvasConfig.className
          )}
          style={{ width: canvasConfig.width, aspectRatio: canvasConfig.aspectRatio }}
        >
          {generatedAsset ? (
            // Show generated content
            <AssetPreview asset={generatedAsset} brandGuide={brandGuide} />
          ) : (
            // Empty canvas
            <EmptyCanvas onGenerate={onGenerate} platform={platform} />
          )}

          {/* Canvas Actions (Overlay) */}
          {generatedAsset && (
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white/90 hover:bg-white"
                onClick={onEdit}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white/90 hover:bg-white"
                onClick={onDownload}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white/90 hover:bg-white"
                onClick={onShare}
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white/90 hover:bg-white"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Canvas Info Bar */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{canvasConfig.dimensions}</span>
            <span className="text-gray-300">•</span>
            <span>{canvasConfig.aspectRatio}</span>
            <span className="text-gray-300">•</span>
            <span className="capitalize">{platform.replace('_', ' ')}</span>
          </div>

          {generatedAsset && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Generated {new Date(generatedAsset.generatedAt).toLocaleDateString()}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Get canvas configuration for platform
 */
function getCanvasConfig(platform: SocialPlatform) {
  const configs: Record<string, {
    className: string;
    width: string;
    aspectRatio: string;
    dimensions: string;
  }> = {
    instagram: {
      className: 'aspect-square',
      width: '450px',
      aspectRatio: '1 / 1',
      dimensions: '1080 × 1080',
    },
    facebook: {
      className: 'aspect-[4/5]',
      width: '400px',
      aspectRatio: '4 / 5',
      dimensions: '1080 × 1350',
    },
    twitter: {
      className: 'aspect-[16/9]',
      width: '500px',
      aspectRatio: '16 / 9',
      dimensions: '1200 × 675',
    },
    tiktok: {
      className: 'aspect-[9/16]',
      width: '300px',
      aspectRatio: '9 / 16',
      dimensions: '1080 × 1920',
    },
    linkedin: {
      className: 'aspect-square',
      width: '450px',
      aspectRatio: '1 / 1',
      dimensions: '1080 × 1080',
    },
  };

  return configs[platform] || configs.instagram;
}

/**
 * Empty Canvas Component
 */
interface EmptyCanvasProps {
  onGenerate?: () => void;
  platform: string;
}

function EmptyCanvas({ onGenerate, platform }: EmptyCanvasProps) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center px-8">
        <div className="w-16 h-16 rounded-full bg-baked-green/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-baked-green" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to Create</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          Click "Magic Generate" to create AI-powered content that matches your brand guide.
        </p>
        <Button
          onClick={onGenerate}
          className="bg-baked-green hover:bg-baked-green/90 text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Now
        </Button>
        <p className="text-xs text-gray-400 mt-3">
          Optimized for {platform.replace('_', ' ')}
        </p>
      </div>
    </div>
  );
}

/**
 * Asset Preview Component
 */
interface AssetPreviewProps {
  asset: CreativeAsset;
  brandGuide: BrandGuide | null;
}

function AssetPreview({ asset, brandGuide }: AssetPreviewProps) {
  if (asset.format === 'video') {
    return (
      <video
        src={asset.fileUrl}
        poster={asset.thumbnailUrl}
        controls
        className="w-full h-full object-cover"
      />
    );
  }

  if (asset.format === 'image') {
    return (
      <div className="relative w-full h-full bg-black">
        <img
          src={asset.fileUrl}
          alt={asset.name}
          className="w-full h-full object-cover"
        />

        {/* Compliance Badge (if applicable) */}
        {brandGuide?.compliance && (
          <div className="absolute top-6 right-6 w-12 h-12 opacity-80">
            <div className="bg-white rounded-full p-2 shadow-lg">
              <span className="text-xs font-bold text-gray-800">
                {brandGuide.compliance.primaryState}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback for other formats
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">Preview not available</p>
        <Button size="sm" variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download Asset
        </Button>
      </div>
    </div>
  );
}

/**
 * Add shadow styles to global CSS
 */
const styles = `
.canvas-shadow {
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
}
`;
