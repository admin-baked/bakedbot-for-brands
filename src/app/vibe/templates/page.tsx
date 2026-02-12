'use client';

/**
 * Vibe Template Marketplace
 *
 * Browse and install community-submitted templates
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  Loader2,
  Search,
  Star,
  Download,
  Heart,
  Eye,
  Filter,
  TrendingUp,
  Clock,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  browseTemplates,
  installTemplate,
} from '@/server/actions/template-marketplace';

interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  creatorName: string;
  isOfficial: boolean;
  isPremium: boolean;
  downloads: number;
  favorites: number;
  rating: number;
  ratingCount: number;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'dispensary', label: 'Dispensary' },
  { value: 'brand', label: 'Brand' },
  { value: 'delivery', label: 'Delivery Service' },
  { value: 'cultivation', label: 'Cultivation' },
  { value: 'accessories', label: 'Accessories' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'downloads', label: 'Most Downloaded' },
];

export default function TemplateMarketplacePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [filterOfficial, setFilterOfficial] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [category, sortBy, filterOfficial]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const fetchedTemplates = await browseTemplates({
        category: category === 'all' ? undefined : category,
        sortBy: sortBy as any,
        isOfficial: filterOfficial ? true : undefined,
      });
      setTemplates(fetchedTemplates as MarketplaceTemplate[]);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleInstall = async (templateId: string, templateName: string) => {
    if (!user) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in to use templates',
        variant: 'destructive',
      });
      router.push('/signup?redirect=/vibe/templates');
      return;
    }

    setInstallingId(templateId);
    try {
      const result = await installTemplate(templateId, user.uid);

      if (result.success && result.projectId) {
        toast({
          title: 'Template Installed!',
          description: `Created new project from ${templateName}`,
        });
        router.push(`/vibe/builder?projectId=${result.projectId}`);
      } else {
        throw new Error(result.error || 'Installation failed');
      }
    } catch (error) {
      toast({
        title: 'Installation Failed',
        description: 'Could not install template',
        variant: 'destructive',
      });
    } finally {
      setInstallingId(null);
    }
  };

  const handlePreview = (templateId: string) => {
    window.open(`/vibe/templates/preview/${templateId}`, '_blank');
  };

  // Filter templates by search
  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags.some((tag) =>
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Template Marketplace</h1>
            <p className="text-muted-foreground text-lg">
              Professional templates for cannabis websites
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={filterOfficial ? 'default' : 'outline'}
              onClick={() => setFilterOfficial(!filterOfficial)}
              className="gap-2"
            >
              <Award className="w-4 h-4" />
              Official Only
            </Button>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingTemplates ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Check back soon for new templates'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="flex flex-col group">
                <CardHeader className="p-0">
                  <div className="aspect-video bg-muted rounded-t-lg overflow-hidden relative">
                    {template.thumbnail ? (
                      <img
                        src={template.thumbnail}
                        alt={template.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No preview
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex gap-2">
                      {template.isOfficial && (
                        <Badge className="gap-1">
                          <Award className="w-3 h-3" />
                          Official
                        </Badge>
                      )}
                      {template.isPremium && (
                        <Badge variant="secondary">Premium</Badge>
                      )}
                    </div>

                    {/* Stats overlay */}
                    <div className="absolute bottom-2 right-2 flex gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Download className="w-3 h-3" />
                        {template.downloads}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {template.rating.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 p-4">
                  <div className="mb-2">
                    <h3 className="font-bold text-lg mb-1 line-clamp-1">
                      {template.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      by {template.creatorName}
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {template.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handlePreview(template.id)}
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleInstall(template.id, template.name)}
                    disabled={installingId === template.id}
                  >
                    {installingId === template.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Use Template
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
