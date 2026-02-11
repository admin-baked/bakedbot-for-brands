'use client';

/**
 * Vibe Template Marketplace
 *
 * Browse and download community-submitted templates.
 */

import { useState, useEffect } from 'react';
import {
  searchTemplates,
  downloadTemplate,
  favoriteTemplate,
  unfavoriteTemplate,
  getUserFavorites,
} from '../template-actions';
import type {
  VibeTemplate,
  TemplateCategory,
  TemplateFilter,
} from '@/types/vibe-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Download, Star, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateMarketplaceProps {
  userId?: string;
  onTemplateSelect?: (template: VibeTemplate) => void;
}

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'dispensary', label: 'Dispensary' },
  { value: 'menu', label: 'Product Menu' },
  { value: 'landing', label: 'Landing Page' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'blog', label: 'Blog' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'mobile', label: 'Mobile UI' },
  { value: 'other', label: 'Other' },
];

export function TemplateMarketplace({
  userId,
  onTemplateSelect,
}: TemplateMarketplaceProps) {
  const [templates, setTemplates] = useState<VibeTemplate[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TemplateFilter>({
    sortBy: 'popular',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<VibeTemplate | null>(null);

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, [filter]);

  // Load user favorites
  useEffect(() => {
    if (userId) {
      loadFavorites();
    }
  }, [userId]);

  async function loadTemplates() {
    setLoading(true);
    const result = await searchTemplates(filter);
    setTemplates(result.templates);
    setLoading(false);
  }

  async function loadFavorites() {
    if (!userId) return;
    const result = await getUserFavorites(userId);
    setFavorites(new Set(result.templateIds));
  }

  async function handleDownload(template: VibeTemplate) {
    if (!userId) {
      alert('Please sign in to download templates');
      return;
    }

    const result = await downloadTemplate(template.id, userId);
    if (result.success) {
      alert('Template downloaded! Creating new project...');
      if (onTemplateSelect) {
        onTemplateSelect(template);
      }
    } else {
      alert(result.error || 'Download failed');
    }
  }

  async function handleFavorite(templateId: string) {
    if (!userId) {
      alert('Please sign in to favorite templates');
      return;
    }

    const isFavorited = favorites.has(templateId);

    if (isFavorited) {
      await unfavoriteTemplate(templateId, userId);
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(templateId);
        return next;
      });
    } else {
      await favoriteTemplate(templateId, userId);
      setFavorites((prev) => new Set(prev).add(templateId));
    }

    // Reload templates to update count
    loadTemplates();
  }

  // Filter by search query
  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Template Marketplace</h2>
        <p className="text-muted-foreground">
          Browse community-submitted templates and start building faster
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />

        <Select
          value={filter.category || 'all'}
          onValueChange={(value) =>
            setFilter((prev) => ({
              ...prev,
              category: value === 'all' ? undefined : (value as TemplateCategory),
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filter.sortBy || 'popular'}
          onValueChange={(value) =>
            setFilter((prev) => ({
              ...prev,
              sortBy: value as any,
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="downloads">Most Downloaded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger
            value="official"
            onClick={() => setFilter((prev) => ({ ...prev, isOfficial: true }))}
          >
            Official
          </TabsTrigger>
          <TabsTrigger
            value="community"
            onClick={() => setFilter((prev) => ({ ...prev, isOfficial: false }))}
          >
            Community
          </TabsTrigger>
          {userId && (
            <TabsTrigger
              value="favorites"
              onClick={() => {
                const favoriteTemplates = templates.filter((t) =>
                  favorites.has(t.id)
                );
                setTemplates(favoriteTemplates);
              }}
            >
              Favorites
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <TemplateGrid
            templates={filteredTemplates}
            favorites={favorites}
            loading={loading}
            onDownload={handleDownload}
            onFavorite={handleFavorite}
            onPreview={setSelectedTemplate}
          />
        </TabsContent>
      </Tabs>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          isFavorited={favorites.has(selectedTemplate.id)}
          onClose={() => setSelectedTemplate(null)}
          onDownload={() => handleDownload(selectedTemplate)}
          onFavorite={() => handleFavorite(selectedTemplate.id)}
        />
      )}
    </div>
  );
}

interface TemplateGridProps {
  templates: VibeTemplate[];
  favorites: Set<string>;
  loading: boolean;
  onDownload: (template: VibeTemplate) => void;
  onFavorite: (templateId: string) => void;
  onPreview: (template: VibeTemplate) => void;
}

function TemplateGrid({
  templates,
  favorites,
  loading,
  onDownload,
  onFavorite,
  onPreview,
}: TemplateGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No templates found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => (
        <Card
          key={template.id}
          className="group hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onPreview(template)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {template.name}
                  {template.isOfficial && (
                    <Badge variant="secondary" className="text-xs">
                      <Check className="w-3 h-3 mr-1" />
                      Official
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="line-clamp-2 mt-2">
                  {template.description}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite(template.id);
                }}
              >
                <Heart
                  className={cn(
                    'w-4 h-4',
                    favorites.has(template.id) && 'fill-red-500 text-red-500'
                  )}
                />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Thumbnail */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {template.thumbnailUrl ? (
                <img
                  src={template.thumbnailUrl}
                  alt={template.name}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No preview
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mt-3">
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                {template.rating.toFixed(1)}
              </span>
              <span className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                {template.downloads}
              </span>
            </div>

            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(template);
              }}
            >
              Use Template
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

interface TemplatePreviewModalProps {
  template: VibeTemplate;
  isFavorited: boolean;
  onClose: () => void;
  onDownload: () => void;
  onFavorite: () => void;
}

function TemplatePreviewModal({
  template,
  isFavorited,
  onClose,
  onDownload,
  onFavorite,
}: TemplatePreviewModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{template.name}</CardTitle>
              <CardDescription className="mt-2">
                by {template.creatorName}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Preview Images */}
          <div className="space-y-4">
            {template.previewImages.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Preview ${i + 1}`}
                className="w-full rounded-lg"
              />
            ))}
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground">{template.description}</p>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-semibold mb-2">Features</h3>
            <div className="flex flex-wrap gap-2">
              {template.features.map((feature) => (
                <Badge key={feature} variant="secondary">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              {template.rating.toFixed(1)} ({template.ratingCount} reviews)
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              {template.downloads} downloads
            </span>
            <span className="flex items-center gap-1">
              <Heart
                className={cn(
                  'w-4 h-4',
                  isFavorited && 'fill-red-500 text-red-500'
                )}
              />
              {template.favorites} favorites
            </span>
          </div>

          {/* Live Preview Link */}
          {template.livePreviewUrl && (
            <Button variant="outline" asChild className="w-full">
              <a href={template.livePreviewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Live Preview
              </a>
            </Button>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button onClick={onFavorite} variant="outline" className="flex-1">
            <Heart
              className={cn(
                'w-4 h-4 mr-2',
                isFavorited && 'fill-red-500 text-red-500'
              )}
            />
            {isFavorited ? 'Unfavorite' : 'Favorite'}
          </Button>
          <Button onClick={onDownload} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Use Template
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
