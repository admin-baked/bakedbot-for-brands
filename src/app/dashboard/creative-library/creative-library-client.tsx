/**
 * Creative Library Client Component
 *
 * Browse and generate AI creative assets
 */

'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Camera,
  Users,
  GraduationCap,
  ShieldCheck,
  FileText,
  Video,
  Globe,
  Mail,
  Store,
  Flame,
  Hash,
  Target,
  Tv,
  Sparkles,
  Search,
  Filter,
  ChevronDown,
} from 'lucide-react';
import type { AssetCategory, AssetTemplate } from '@/types/creative-asset';
import { ASSET_TEMPLATES } from '@/types/creative-asset';

interface CreativeLibraryClientProps {
  brandId: string;
  userRole: string;
}

// Category metadata
const CATEGORY_META: Record<
  AssetCategory | 'popular',
  { icon: any; label: string; color: string }
> = {
  popular: { icon: Flame, label: 'Most Popular', color: 'text-orange-600' },
  menu_photography: { icon: Camera, label: 'Menu Photography', color: 'text-blue-600' },
  lifestyle_imagery: { icon: Users, label: 'Lifestyle Imagery', color: 'text-purple-600' },
  social_media: { icon: Hash, label: 'Social Media', color: 'text-pink-600' },
  education: { icon: GraduationCap, label: 'Education', color: 'text-green-600' },
  compliance: { icon: ShieldCheck, label: 'Compliance Ads', color: 'text-yellow-600' },
  print: { icon: FileText, label: 'Print & Sell Sheets', color: 'text-red-600' },
  video: { icon: Video, label: 'Video Content', color: 'text-indigo-600' },
  web: { icon: Globe, label: 'Web Graphics', color: 'text-cyan-600' },
  email: { icon: Mail, label: 'Email Marketing', color: 'text-teal-600' },
  in_store: { icon: Store, label: 'In-Store Displays', color: 'text-amber-600' },
};

export function CreativeLibraryClient({ brandId, userRole }: CreativeLibraryClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'popular'>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllAssets, setShowAllAssets] = useState(false);

  // Convert ASSET_TEMPLATES to array with IDs
  const allTemplates: AssetTemplate[] = useMemo(() => {
    return Object.entries(ASSET_TEMPLATES).map(([id, template]) => ({
      id,
      ...template,
    }));
  }, []);

  // Filter templates based on category and search
  const filteredTemplates = useMemo(() => {
    let filtered = allTemplates;

    // Category filter
    if (selectedCategory === 'popular') {
      filtered = filtered.filter((t) => t.conversionOptimized || t.popularityScore);
    } else {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Show limited results unless "Show All" is clicked
    if (!showAllAssets) {
      return filtered.slice(0, 8);
    }

    return filtered;
  }, [allTemplates, selectedCategory, searchQuery, showAllAssets]);

  const remainingCount = useMemo(() => {
    let total = allTemplates.length;
    if (selectedCategory !== 'popular') {
      total = allTemplates.filter((t) => t.category === selectedCategory).length;
    }
    return total - filteredTemplates.length;
  }, [allTemplates, selectedCategory, filteredTemplates]);

  const handleTemplateClick = (template: AssetTemplate) => {
    // TODO: Open generation dialog
    console.log('Generate asset:', template);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">
          AI Creative Selection
        </h1>
        <p className="text-gray-500 max-w-3xl">
          Select the type of asset you'd like to generate. All assets are optimized for
          cannabis compliance and retail conversion.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Button (Mobile) */}
        <Button variant="outline" className="lg:hidden">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-gray-200">
        {Object.entries(CATEGORY_META).map(([key, meta]) => {
          const isActive = selectedCategory === key;
          const Icon = meta.icon;

          return (
            <Button
              key={key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(key as any)}
              className={`
                ${isActive ? 'bg-baked-green hover:bg-baked-green/90 shadow-lg shadow-green-100' : 'hover:border-baked-green'}
                flex items-center gap-2
              `}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : meta.color}`} />
              <span className="font-bold text-sm">{meta.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTemplates.map((template) => (
          <AssetCard key={template.id} template={template} onClick={handleTemplateClick} />
        ))}
      </div>

      {/* Show All Button */}
      {!showAllAssets && remainingCount > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-200 flex justify-center">
          <Button
            variant="ghost"
            onClick={() => setShowAllAssets(true)}
            className="text-gray-400 font-bold hover:text-gray-600 transition uppercase tracking-widest text-xs"
          >
            Show All {remainingCount} More Assets
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">No assets found</h3>
          <p className="text-gray-500">
            Try adjusting your search or selecting a different category.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Asset Card Component
 */
interface AssetCardProps {
  template: AssetTemplate;
  onClick: (template: AssetTemplate) => void;
}

function AssetCard({ template, onClick }: AssetCardProps) {
  const categoryMeta = CATEGORY_META[template.category];
  const CategoryIcon = categoryMeta.icon;

  return (
    <Card
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-baked-green transition-all cursor-pointer shadow-sm hover:shadow-md"
      onClick={() => onClick(template)}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className={`w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center`}>
            <CategoryIcon className="w-5 h-5 text-baked-green" />
          </div>
          <div className="flex flex-col gap-1">
            {template.conversionOptimized && (
              <Badge
                variant="outline"
                className="text-[10px] font-black bg-orange-100 text-orange-600 border-orange-200"
              >
                HIGH CONVERSION
              </Badge>
            )}
            {template.isPremium && (
              <Badge
                variant="outline"
                className="text-[10px] font-black bg-purple-100 text-purple-600 border-purple-200"
              >
                PRO
              </Badge>
            )}
            {template.complianceLevel === 'educational' && (
              <Badge
                variant="outline"
                className="text-[10px] font-black bg-green-100 text-baked-green border-green-200"
              >
                EDUCATIONAL
              </Badge>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="font-bold text-gray-900 text-lg mb-1">{template.name}</h3>
        <p className="text-sm text-gray-500 leading-snug mb-4 line-clamp-2">
          {template.description}
        </p>

        {/* Preview / Visual */}
        <div className="relative mb-4">
          <AssetPreview template={template} />
        </div>

        {/* Features */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Format:</span>
            <span className="font-semibold text-gray-900 uppercase">{template.format}</span>
          </div>
          {template.aspectRatio && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Ratio:</span>
              <span className="font-semibold text-gray-900">{template.aspectRatio}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Generation:</span>
            <span className="font-semibold text-gray-900">~{template.generationTime}s</span>
          </div>
        </div>

        {/* CTA */}
        <Button
          size="sm"
          className="w-full bg-baked-green hover:bg-baked-green/90 text-white font-semibold"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Asset
        </Button>
      </div>
    </Card>
  );
}

/**
 * Asset Preview Component
 */
function AssetPreview({ template }: { template: AssetTemplate }) {
  // Different preview styles based on template type
  switch (template.id) {
    case 'menu_product_shot':
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-50">
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-100 opacity-50" />
          </div>
          <div className="aspect-square bg-white rounded-lg overflow-hidden border-2 border-baked-green shadow-inner">
            <div className="w-full h-full bg-gradient-to-br from-green-50 to-white" />
          </div>
        </div>
      );

    case 'lifestyle_imagery':
    case 'instagram_feed_post':
    case 'instagram_story':
      return (
        <div className="relative h-24 bg-gradient-to-br from-purple-100 via-pink-50 to-orange-50 rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      );

    case 'terpene_guide':
    case 'strain_lineage':
    case 'dosing_guide':
      return (
        <div className="flex gap-2 h-24">
          <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-2 flex flex-col justify-center items-center">
            <div className="w-6 h-6 bg-blue-500 rounded-full mb-1" />
            <div className="h-1 w-8 bg-blue-200 rounded" />
          </div>
          <div className="flex-1 bg-orange-50 border border-orange-100 rounded-lg p-2 flex flex-col justify-center items-center">
            <div className="w-6 h-6 bg-orange-500 rounded-full mb-1" />
            <div className="h-1 w-8 bg-orange-200 rounded" />
          </div>
        </div>
      );

    case 'digital_menu_board':
    case 'strain_story_video':
    case 'product_demo':
    case 'instagram_reel':
      return (
        <div className="h-24 bg-slate-900 rounded-lg border-2 border-slate-800 flex items-center justify-center">
          <Video className="w-8 h-8 text-white/20" />
        </div>
      );

    case 'weedmaps_banner':
    case 'leafly_featured':
    case 'email_header':
    case 'hero_banner':
      return (
        <div className="h-24 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex flex-col gap-2 p-3">
          <div className="h-2 w-full bg-gray-200 rounded" />
          <div className="h-2 w-3/4 bg-gray-200 rounded" />
          <div className="h-6 w-1/2 bg-baked-green/20 rounded mt-auto" />
        </div>
      );

    case 'shelf_talker':
    case 'window_cling':
    case 'product_card':
      return (
        <div className="aspect-[3/4] bg-white border-2 border-gray-200 rounded-lg p-3 flex flex-col">
          <div className="h-3 w-3/4 bg-gray-200 rounded mb-2" />
          <div className="flex-1 bg-gray-100 rounded" />
          <div className="h-2 w-full bg-gray-200 rounded mt-2" />
        </div>
      );

    default:
      return (
        <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-gray-300" />
        </div>
      );
  }
}
