/**
 * Asset Library Rail
 *
 * Right sidebar showing recently generated and saved creative assets
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Image,
  Video,
  FileText,
  Download,
  Share2,
  MoreHorizontal,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeAsset } from '@/types/creative-asset';
import type { SocialPlatform } from '@/types/creative-content';

interface AssetLibraryRailProps {
  brandId: string;
  assets?: CreativeAsset[];
  onAssetClick?: (asset: CreativeAsset) => void;
  onAssetDownload?: (asset: CreativeAsset) => void;
  className?: string;
}

type FilterType = 'all' | 'images' | 'videos' | 'approved' | 'recent';

export function AssetLibraryRail({
  brandId,
  assets = [],
  onAssetClick,
  onAssetDownload,
  className,
}: AssetLibraryRailProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    // Filter by type
    if (filter === 'images' && asset.format !== 'image') return false;
    if (filter === 'videos' && asset.format !== 'video') return false;
    if (filter === 'approved' && asset.complianceStatus !== 'approved') return false;
    if (filter === 'recent') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (new Date(asset.generatedAt).getTime() < weekAgo) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.prompt?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  return (
    <div className={cn('w-80 border-l border-gray-200 bg-white flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-baked-green" />
          Asset Library
        </h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="All"
          />
          <FilterButton
            active={filter === 'images'}
            onClick={() => setFilter('images')}
            label="Images"
          />
          <FilterButton
            active={filter === 'videos'}
            onClick={() => setFilter('videos')}
            label="Videos"
          />
        </div>
      </div>

      {/* Asset Grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredAssets.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Image className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1">No assets yet</h4>
            <p className="text-sm text-gray-500">
              {searchQuery
                ? 'No assets match your search'
                : 'Generated assets will appear here'}
            </p>
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onClick={() => onAssetClick?.(asset)}
              onDownload={() => onAssetDownload?.(asset)}
            />
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-gray-500">Total Assets</div>
            <div className="text-lg font-bold text-gray-900">{assets.length}</div>
          </div>
          <div>
            <div className="text-gray-500">This Week</div>
            <div className="text-lg font-bold text-baked-green">
              {assets.filter(a => {
                const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                return new Date(a.generatedAt).getTime() > weekAgo;
              }).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Filter Button
 */
interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function FilterButton({ active, onClick, label }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 px-2 py-1.5 rounded text-xs font-medium transition',
        active
          ? 'bg-white text-baked-green shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
      )}
    >
      {label}
    </button>
  );
}

/**
 * Asset Card
 */
interface AssetCardProps {
  asset: CreativeAsset;
  onClick: () => void;
  onDownload: () => void;
}

function AssetCard({ asset, onClick, onDownload }: AssetCardProps) {
  const statusConfig = getStatusConfig(asset.status);
  const formatIcon = getFormatIcon(asset.format);

  return (
    <Card
      onClick={onClick}
      className="p-3 hover:border-baked-green transition cursor-pointer group"
    >
      {/* Preview */}
      <div className="relative mb-3 rounded-lg overflow-hidden bg-gray-100">
        {asset.format === 'image' && asset.fileUrl ? (
          <img
            src={asset.fileUrl}
            alt={asset.name}
            className="w-full aspect-square object-cover"
          />
        ) : asset.format === 'video' && asset.thumbnailUrl ? (
          <div className="relative">
            <img
              src={asset.thumbnailUrl}
              alt={asset.name}
              className="w-full aspect-square object-cover"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <Video className="w-8 h-8 text-white" />
            </div>
          </div>
        ) : (
          <div className="w-full aspect-square flex items-center justify-center">
            {formatIcon}
          </div>
        )}

        {/* Hover Actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7 bg-white/90 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
            {asset.name}
          </h4>
          <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
            {asset.category.replace('_', ' ')}
          </Badge>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            {statusConfig.icon}
            <span className={statusConfig.color}>{statusConfig.label}</span>
          </div>
          <span>•</span>
          <span>{new Date(asset.generatedAt).toLocaleDateString()}</span>
        </div>

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {asset.tags.length > 2 && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                +{asset.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Get status configuration
 */
function getStatusConfig(status?: string) {
  switch (status) {
    case 'approved':
      return {
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Approved',
        color: 'text-green-600',
      };
    case 'pending':
      return {
        icon: <Clock className="w-3 h-3" />,
        label: 'Pending',
        color: 'text-yellow-600',
      };
    case 'revision':
      return {
        icon: <AlertCircle className="w-3 h-3" />,
        label: 'Needs Revision',
        color: 'text-orange-600',
      };
    default:
      return {
        icon: <Clock className="w-3 h-3" />,
        label: 'Draft',
        color: 'text-gray-500',
      };
  }
}

/**
 * Get format icon
 */
function getFormatIcon(format: string) {
  switch (format) {
    case 'image':
      return <Image className="w-8 h-8 text-gray-400" />;
    case 'video':
      return <Video className="w-8 h-8 text-gray-400" />;
    default:
      return <FileText className="w-8 h-8 text-gray-400" />;
  }
}
