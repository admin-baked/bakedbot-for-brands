/**
 * Assets Tab
 *
 * Upload and manage brand assets (logos, images, videos, templates, documents, fonts).
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, Trash2, Download, Image as ImageIcon, Video, FileText, Type } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { uploadBrandAsset, deleteBrandAsset, listBrandAssets } from '@/server/actions/brand-assets';
import { useToast } from '@/hooks/use-toast';
import type { BrandGuide, BrandAsset } from '@/types/brand-guide';

interface AssetsTabProps {
  brandId: string;
  brandGuide: BrandGuide;
  onUpdate: (updates: Partial<BrandGuide>) => void;
}

export function AssetsTab({ brandId, brandGuide, onUpdate }: AssetsTabProps) {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<BrandAsset['type']>('logo');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAssets();
  }, [brandId]);

  const loadAssets = async (category?: BrandAsset['type']) => {
    setLoading(true);
    try {
      const result = await listBrandAssets(brandId, category);
      if (result.success && result.assets) {
        setAssets(result.assets);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', activeCategory);
      formData.append('makePublic', 'false');

      const result = await uploadBrandAsset(brandId, formData);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      toast({
        title: 'Asset Uploaded',
        description: `${file.name} has been uploaded successfully.`,
      });

      // Refresh assets list
      await loadAssets(activeCategory);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload asset',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (asset: BrandAsset) => {
    if (!confirm(`Are you sure you want to delete ${asset.name}?`)) {
      return;
    }

    try {
      const result = await deleteBrandAsset(brandId, asset.url);

      if (!result.success) {
        throw new Error(result.error || 'Delete failed');
      }

      toast({
        title: 'Asset Deleted',
        description: `${asset.name} has been deleted.`,
      });

      // Refresh assets list
      await loadAssets(activeCategory);
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete asset',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getAssetsByCategory = (category: BrandAsset['type']) => {
    return assets.filter((a) => a.type === category);
  };

  const getCategoryIcon = (category: BrandAsset['type']) => {
    switch (category) {
      case 'logo':
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'document':
      case 'template':
        return <FileText className="w-4 h-4" />;
      case 'font':
        return <Type className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getAcceptedFileTypes = (category: BrandAsset['type']): string => {
    switch (category) {
      case 'logo':
        return 'image/png,image/jpeg,image/svg+xml,image/webp';
      case 'image':
        return 'image/png,image/jpeg,image/webp,image/gif';
      case 'video':
        return 'video/mp4,video/webm,video/quicktime';
      case 'template':
        return 'application/pdf,image/png,image/jpeg';
      case 'document':
        return 'application/pdf,.doc,.docx';
      case 'font':
        return '.ttf,.otf,.woff,.woff2';
      default:
        return '*';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Assets</CardTitle>
          <CardDescription>Add new brand assets to your library</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Asset Category</Label>
              <Select
                value={activeCategory}
                onValueChange={(v) => setActiveCategory(v as BrandAsset['type'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logo">Logo</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="font">Font</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Upload File</Label>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept={getAcceptedFileTypes(activeCategory)}
                  disabled={uploading}
                  className="flex-1"
                />
                <Button disabled={uploading} size="icon" variant="outline">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Library */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Library</CardTitle>
          <CardDescription>Browse and manage your uploaded assets</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as BrandAsset['type'])}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="logo" className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Logos
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Images
              </TabsTrigger>
              <TabsTrigger value="video" className="flex items-center gap-1">
                <Video className="w-3 h-3" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="template" className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="document" className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Docs
              </TabsTrigger>
              <TabsTrigger value="font" className="flex items-center gap-1">
                <Type className="w-3 h-3" />
                Fonts
              </TabsTrigger>
            </TabsList>

            {(['logo', 'image', 'video', 'template', 'document', 'font'] as BrandAsset['type'][]).map(
              (category) => (
                <TabsContent key={category} value={category} className="mt-6">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : getAssetsByCategory(category).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <div className="mb-2">{getCategoryIcon(category)}</div>
                      <p>No {category}s uploaded yet.</p>
                      <p className="text-sm mt-1">Upload your first {category} to get started.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {getAssetsByCategory(category).map((asset) => (
                        <Card key={asset.id} className="overflow-hidden">
                          {/* Preview */}
                          {(asset.type === 'logo' || asset.type === 'image') && (
                            <div className="aspect-square bg-muted relative">
                              <img
                                src={asset.thumbnailUrl || asset.url}
                                alt={asset.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          {asset.type === 'video' && (
                            <div className="aspect-video bg-muted flex items-center justify-center">
                              <Video className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          {(asset.type === 'template' || asset.type === 'document' || asset.type === 'font') && (
                            <div className="aspect-square bg-muted flex items-center justify-center">
                              {getCategoryIcon(asset.type)}
                            </div>
                          )}

                          {/* Info */}
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <div>
                                <p className="text-sm font-medium truncate" title={asset.name}>
                                  {asset.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(asset.fileSize || 0)}
                                </p>
                              </div>

                              {asset.dimensions && (
                                <p className="text-xs text-muted-foreground">
                                  {asset.dimensions.width} × {asset.dimensions.height}
                                </p>
                              )}

                              {asset.tags && asset.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {asset.tags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex gap-1 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => window.open(asset.url, '_blank')}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleDelete(asset)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
