'use client';

/**
 * Hero Form Component
 *
 * Form for creating and editing hero banners.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Image as ImageIcon, Palette } from 'lucide-react';
import { createHero, updateHero } from '@/app/actions/heroes';
import type { Hero, HeroStyle, HeroPurchaseModel, HeroCtaAction } from '@/types/heroes';

interface HeroFormProps {
  initialData?: Hero;
  orgId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function HeroForm({ initialData, orgId, onSuccess, onCancel }: HeroFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [brandName, setBrandName] = useState(initialData?.brandName || '');
  const [brandLogo, setBrandLogo] = useState(initialData?.brandLogo || '');
  const [tagline, setTagline] = useState(initialData?.tagline || 'Premium Cannabis Products');
  const [description, setDescription] = useState(initialData?.description || '');
  const [heroImage, setHeroImage] = useState(initialData?.heroImage || '');
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor || '#16a34a');
  const [style, setStyle] = useState<HeroStyle>(initialData?.style || 'default');
  const [purchaseModel, setPurchaseModel] = useState<HeroPurchaseModel>(initialData?.purchaseModel || 'local_pickup');
  const [shipsNationwide, setShipsNationwide] = useState(initialData?.shipsNationwide || false);
  const [verified, setVerified] = useState(initialData?.verified !== false);
  const [displayOrder, setDisplayOrder] = useState(initialData?.displayOrder || 0);

  // Stats
  const [showStats, setShowStats] = useState(!!initialData?.stats);
  const [statsProducts, setStatsProducts] = useState(initialData?.stats?.products || 0);
  const [statsRetailers, setStatsRetailers] = useState(initialData?.stats?.retailers || 0);
  const [statsRating, setStatsRating] = useState(initialData?.stats?.rating || 0);

  // Primary CTA
  const [primaryCtaLabel, setPrimaryCtaLabel] = useState(initialData?.primaryCta.label || 'Find Near Me');
  const [primaryCtaAction, setPrimaryCtaAction] = useState<HeroCtaAction>(initialData?.primaryCta.action || 'find_near_me');
  const [primaryCtaUrl, setPrimaryCtaUrl] = useState(initialData?.primaryCta.url || '');

  // Secondary CTA
  const [showSecondaryCta, setShowSecondaryCta] = useState(!!initialData?.secondaryCta);
  const [secondaryCtaLabel, setSecondaryCtaLabel] = useState(initialData?.secondaryCta?.label || 'Shop Products');
  const [secondaryCtaAction, setSecondaryCtaAction] = useState<HeroCtaAction>(initialData?.secondaryCta?.action || 'shop_now');
  const [secondaryCtaUrl, setSecondaryCtaUrl] = useState(initialData?.secondaryCta?.url || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!brandName.trim()) {
      toast({
        title: 'Brand Name Required',
        description: 'Please enter a brand name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const heroData: Partial<Hero> = {
        orgId,
        brandName,
        brandLogo: brandLogo || undefined,
        tagline,
        description: description || undefined,
        heroImage: heroImage || undefined,
        primaryColor,
        style,
        purchaseModel,
        shipsNationwide,
        verified,
        displayOrder,
        stats: showStats
          ? {
              products: statsProducts || undefined,
              retailers: statsRetailers || undefined,
              rating: statsRating || undefined,
            }
          : undefined,
        primaryCta: {
          label: primaryCtaLabel,
          action: primaryCtaAction,
          url: primaryCtaAction === 'custom' ? primaryCtaUrl : undefined,
        },
        secondaryCta: showSecondaryCta
          ? {
              label: secondaryCtaLabel,
              action: secondaryCtaAction,
              url: secondaryCtaAction === 'custom' ? secondaryCtaUrl : undefined,
            }
          : undefined,
      };

      let result;
      if (initialData?.id) {
        result = await updateHero(initialData.id, heroData);
      } else {
        result = await createHero(heroData);
      }

      if (result.success) {
        toast({
          title: initialData ? 'Hero Updated!' : 'Hero Created!',
          description: `${brandName} hero banner has been saved.`,
        });
        onSuccess();
      } else {
        throw new Error(result.error || 'Failed to save hero');
      }
    } catch (error: any) {
      console.error('Error saving hero:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save hero. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2">Basic Information</h3>

        <div className="space-y-2">
          <Label htmlFor="brandName">Brand Name *</Label>
          <Input
            id="brandName"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="e.g., Premium Flower Co"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline *</Label>
          <Input
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g., Premium Cannabis Products"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of your brand..."
            rows={3}
          />
        </div>
      </div>

      {/* Images */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2 flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Images
        </h3>

        <div className="space-y-2">
          <Label htmlFor="brandLogo">Brand Logo URL</Label>
          <Input
            id="brandLogo"
            value={brandLogo}
            onChange={(e) => setBrandLogo(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="heroImage">Hero Background Image URL</Label>
          <Input
            id="heroImage"
            value={heroImage}
            onChange={(e) => setHeroImage(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Style */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2 flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Style
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#16a34a"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">Style</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as HeroStyle)}>
              <SelectTrigger id="style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* E-commerce Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2">E-commerce Settings</h3>

        <div className="space-y-2">
          <Label htmlFor="purchaseModel">Purchase Model</Label>
          <Select value={purchaseModel} onValueChange={(v) => setPurchaseModel(v as HeroPurchaseModel)}>
            <SelectTrigger id="purchaseModel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local_pickup">Local Pickup</SelectItem>
              <SelectItem value="online_only">Online Only</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {purchaseModel === 'online_only' && (
          <div className="flex items-center space-x-2">
            <Switch
              id="shipsNationwide"
              checked={shipsNationwide}
              onCheckedChange={setShipsNationwide}
            />
            <Label htmlFor="shipsNationwide">Ships Nationwide</Label>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Switch id="verified" checked={verified} onCheckedChange={setVerified} />
          <Label htmlFor="verified">Show Verified Badge</Label>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Stats</h3>
          <Switch checked={showStats} onCheckedChange={setShowStats} />
        </div>

        {showStats && (
          <div className="grid grid-cols-3 gap-4 pl-4 border-l-2">
            <div className="space-y-2">
              <Label htmlFor="statsProducts">Products</Label>
              <Input
                id="statsProducts"
                type="number"
                min="0"
                value={statsProducts}
                onChange={(e) => setStatsProducts(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="statsRetailers">Retailers</Label>
              <Input
                id="statsRetailers"
                type="number"
                min="0"
                value={statsRetailers}
                onChange={(e) => setStatsRetailers(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="statsRating">Rating</Label>
              <Input
                id="statsRating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={statsRating}
                onChange={(e) => setStatsRating(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Primary CTA */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2">Primary Call-to-Action</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryCtaLabel">Button Label</Label>
            <Input
              id="primaryCtaLabel"
              value={primaryCtaLabel}
              onChange={(e) => setPrimaryCtaLabel(e.target.value)}
              placeholder="Find Near Me"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryCtaAction">Action</Label>
            <Select value={primaryCtaAction} onValueChange={(v) => setPrimaryCtaAction(v as HeroCtaAction)}>
              <SelectTrigger id="primaryCtaAction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="find_near_me">Find Near Me</SelectItem>
                <SelectItem value="shop_now">Shop Now</SelectItem>
                <SelectItem value="custom">Custom URL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {primaryCtaAction === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="primaryCtaUrl">Custom URL</Label>
            <Input
              id="primaryCtaUrl"
              value={primaryCtaUrl}
              onChange={(e) => setPrimaryCtaUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        )}
      </div>

      {/* Secondary CTA */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Secondary Call-to-Action</h3>
          <Switch checked={showSecondaryCta} onCheckedChange={setShowSecondaryCta} />
        </div>

        {showSecondaryCta && (
          <div className="space-y-4 pl-4 border-l-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="secondaryCtaLabel">Button Label</Label>
                <Input
                  id="secondaryCtaLabel"
                  value={secondaryCtaLabel}
                  onChange={(e) => setSecondaryCtaLabel(e.target.value)}
                  placeholder="Shop Products"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryCtaAction">Action</Label>
                <Select value={secondaryCtaAction} onValueChange={(v) => setSecondaryCtaAction(v as HeroCtaAction)}>
                  <SelectTrigger id="secondaryCtaAction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="find_near_me">Find Near Me</SelectItem>
                    <SelectItem value="shop_now">Shop Now</SelectItem>
                    <SelectItem value="custom">Custom URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {secondaryCtaAction === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="secondaryCtaUrl">Custom URL</Label>
                <Input
                  id="secondaryCtaUrl"
                  value={secondaryCtaUrl}
                  onChange={(e) => setSecondaryCtaUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Display Order */}
      <div className="space-y-2">
        <Label htmlFor="displayOrder">Display Order</Label>
        <Input
          id="displayOrder"
          type="number"
          min="0"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
        />
        <p className="text-xs text-muted-foreground">
          Lower numbers appear first (only matters if you have multiple heroes)
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>{initialData ? 'Update' : 'Create'} Hero</>
          )}
        </Button>
      </div>
    </form>
  );
}
