/**
 * Template Browser
 *
 * Full template gallery with category navigation and filtering
 */

'use client';

import { useState } from 'react';
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
  Hash,
  Sparkles,
  Search,
  TrendingUp,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTemplateLibrary } from '@/hooks/use-template-library';
import type { AssetTemplate, AssetCategory } from '@/types/creative-asset';

interface TemplateBrowserProps {
  onTemplateSelect: (template: AssetTemplate) => void;
  selectedTemplateId?: string;
  className?: string;
}

// Category metadata
const CATEGORY_META: Record<
  AssetCategory,
  { icon: any; label: string; color: string; description: string }
> = {
  menu_photography: {
    icon: Camera,
    label: 'Menu Photography',
    color: 'text-blue-600',
    description: 'Product shots and menu visuals',
  },
  lifestyle_imagery: {
    icon: Users,
    label: 'Lifestyle',
    color: 'text-purple-600',
    description: 'Lifestyle and brand storytelling',
  },
  social_media: {
    icon: Hash,
    label: 'Social Media',
    color: 'text-pink-600',
    description: 'Posts, stories, and reels',
  },
  education: {
    icon: GraduationCap,
    label: 'Education',
    color: 'text-green-600',
    description: 'Educational and informative content',
  },
  compliance: {
    icon: ShieldCheck,
    label: 'Compliance',
    color: 'text-yellow-600',
    description: 'Compliant advertising',
  },
  print: {
    icon: FileText,
    label: 'Print',
    color: 'text-red-600',
    description: 'Flyers, sell sheets, and print materials',
  },
  video: {
    icon: Video,
    label: 'Video',
    color: 'text-indigo-600',
    description: 'Video content and animations',
  },
  web: {
    icon: Globe,
    label: 'Web Graphics',
    color: 'text-cyan-600',
    description: 'Banners and web visuals',
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-teal-600',
    description: 'Email headers and campaigns',
  },
  in_store: {
    icon: Store,
    label: 'In-Store',
    color: 'text-amber-600',
    description: 'Signage and displays',
  },
};

export function TemplateBrowser({
  onTemplateSelect,
  selectedTemplateId,
  className,
}: TemplateBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { templates, categories } = useTemplateLibrary({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    search: searchQuery || undefined,
  });

  // Get high-conversion templates for "Popular" section
  const popularTemplates = templates
    .filter(t => t.conversionOptimized)
    .slice(0, 4);

  const displayTemplates = selectedCategory === 'all' && !searchQuery
    ? popularTemplates
    : templates;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">
          Choose a Template
        </h2>
        <p className="text-gray-600">
          Select from our library of proven, high-converting templates
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 h-12 text-base"
        />
      </div>

      {/* Category Navigation */}
      {!searchQuery && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">Categories</h3>
            {selectedCategory !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className="text-xs"
              >
                View All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Popular Category */}
            <CategoryCard
              icon={TrendingUp}
              label="Popular"
              description="High conversion"
              color="text-orange-600"
              count={popularTemplates.length}
              active={selectedCategory === 'all'}
              onClick={() => setSelectedCategory('all')}
            />

            {/* Other Categories */}
            {categories.map((category) => {
              const meta = CATEGORY_META[category];
              const count = templates.filter(t => t.category === category).length;

              return (
                <CategoryCard
                  key={category}
                  icon={meta.icon}
                  label={meta.label}
                  description={meta.description}
                  color={meta.color}
                  count={count}
                  active={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="space-y-4">
        {selectedCategory === 'all' && !searchQuery && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Most Popular Templates
            </h3>
          </div>
        )}

        {displayTemplates.length === 0 ? (
          // Empty State
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500">
              Try adjusting your search or selecting a different category
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedTemplateId === template.id}
                onClick={() => onTemplateSelect(template)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Category Card
 */
interface CategoryCardProps {
  icon: any;
  label: string;
  description: string;
  color: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function CategoryCard({
  icon: Icon,
  label,
  description,
  color,
  count,
  active,
  onClick,
}: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl border-2 transition text-left',
        active
          ? 'border-baked-green bg-green-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={cn('w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center', active && 'bg-white')}>
          <Icon className={cn('w-5 h-5', active ? 'text-baked-green' : color)} />
        </div>
        <Badge variant="outline" className="text-xs">
          {count}
        </Badge>
      </div>
      <div className="font-bold text-sm text-gray-900 mb-1">{label}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </button>
  );
}

/**
 * Template Card
 */
interface TemplateCardProps {
  template: AssetTemplate;
  selected: boolean;
  onClick: () => void;
}

function TemplateCard({ template, selected, onClick }: TemplateCardProps) {
  const categoryMeta = CATEGORY_META[template.category];
  const CategoryIcon = categoryMeta.icon;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-5 cursor-pointer transition hover:shadow-lg group',
        selected
          ? 'border-2 border-baked-green bg-green-50/50'
          : 'border border-gray-200 hover:border-baked-green'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
          <CategoryIcon className="w-5 h-5 text-baked-green" />
        </div>
        <div className="flex flex-col gap-1 items-end">
          {template.conversionOptimized && (
            <Badge
              variant="outline"
              className="text-[10px] font-black bg-orange-100 text-orange-600 border-orange-200"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
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
        </div>
      </div>

      {/* Content */}
      <h3 className="font-bold text-gray-900 mb-1">{template.name}</h3>
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {template.description}
      </p>

      {/* Features */}
      <div className="flex flex-wrap gap-1 mb-4">
        {template.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="uppercase font-semibold">{template.format}</span>
          <span>•</span>
          <span>~{template.generationTime}s</span>
        </div>
        <Button
          size="sm"
          variant={selected ? 'default' : 'ghost'}
          className={cn(
            'text-xs font-semibold',
            selected
              ? 'bg-baked-green hover:bg-baked-green/90'
              : 'group-hover:bg-green-50 group-hover:text-baked-green'
          )}
        >
          {selected ? (
            <>
              <Zap className="w-3 h-3 mr-1" />
              Selected
            </>
          ) : (
            <>
              Select
              <ChevronRight className="w-3 h-3 ml-1" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
