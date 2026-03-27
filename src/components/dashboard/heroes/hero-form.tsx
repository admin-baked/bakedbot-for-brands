'use client';

/**
 * Hero Form Component
 *
 * Form for creating and editing hero banners.
 */

import React, { useRef, useState } from 'react';
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
import { Loader2, Image as ImageIcon, Palette, Upload } from 'lucide-react';
import { createHero, updateHero } from '@/app/actions/heroes';
import { mirrorBrandAssetFromUrl } from '@/server/actions/brand-assets';
import type {
  Hero,
  HeroChannel,
  HeroCtaAction,
  HeroPurchaseModel,
  HeroStyle,
  WeedmapsMobilePreset,
} from '@/types/heroes';

interface HeroFormProps {
  initialData?: Hero;
  orgId: string;
  defaultChannel?: HeroChannel;
  onSuccess: () => void;
  onCancel: () => void;
}

const DEFAULT_TAGLINE = 'Premium Cannabis Products';

function isStoredHeroAssetUrl(url: string, orgId: string): boolean {
  return url.includes(`/heroes/${orgId}/`) || url.includes(`/brands/${orgId}/assets/`);
}

export function HeroForm({
  initialData,
  orgId,
  defaultChannel = 'menu',
  onSuccess,
  onCancel,
}: HeroFormProps) {
  const { toast } = useToast();
  const brandLogoInputRef = useRef<HTMLInputElement>(null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);
  const weedmapsDesktopInputRef = useRef<HTMLInputElement>(null);
  const weedmapsMobileInputRef = useRef<HTMLInputElement>(null);
  const initialChannel = initialData?.channel ?? defaultChannel;
  const initialWeedmaps = initialData?.weedmaps;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingBrandLogo, setIsUploadingBrandLogo] = useState(false);
  const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);
  const [isUploadingDesktopImage, setIsUploadingDesktopImage] = useState(false);
  const [isUploadingMobileImage, setIsUploadingMobileImage] = useState(false);

  // Shared state
  const [channel, setChannel] = useState<HeroChannel>(initialChannel);
  const [brandName, setBrandName] = useState(initialData?.brandName || '');
  const [brandLogo, setBrandLogo] = useState(initialData?.brandLogo || '');
  const [tagline, setTagline] = useState(initialData?.tagline || DEFAULT_TAGLINE);
  const [description, setDescription] = useState(initialData?.description || '');
  const [heroImage, setHeroImage] = useState(initialData?.heroImage || initialWeedmaps?.desktopImage || '');
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
  const [primaryCtaLabel, setPrimaryCtaLabel] = useState(initialData?.primaryCta?.label || 'Find Near Me');
  const [primaryCtaAction, setPrimaryCtaAction] = useState<HeroCtaAction>(initialData?.primaryCta?.action || 'find_near_me');
  const [primaryCtaUrl, setPrimaryCtaUrl] = useState(initialData?.primaryCta?.url || '');

  // Secondary CTA
  const [showSecondaryCta, setShowSecondaryCta] = useState(!!initialData?.secondaryCta);
  const [secondaryCtaLabel, setSecondaryCtaLabel] = useState(initialData?.secondaryCta?.label || 'Shop Products');
  const [secondaryCtaAction, setSecondaryCtaAction] = useState<HeroCtaAction>(initialData?.secondaryCta?.action || 'shop_now');
  const [secondaryCtaUrl, setSecondaryCtaUrl] = useState(initialData?.secondaryCta?.url || '');

  // Weedmaps state
  const [weedmapsDesktopImage, setWeedmapsDesktopImage] = useState(initialWeedmaps?.desktopImage || initialData?.heroImage || '');
  const [weedmapsMobileImage, setWeedmapsMobileImage] = useState(initialWeedmaps?.mobileImage || '');
  const [weedmapsHeadline, setWeedmapsHeadline] = useState(initialWeedmaps?.headline || initialData?.tagline || '');
  const [weedmapsSubheadline, setWeedmapsSubheadline] = useState(initialWeedmaps?.subheadline || initialData?.description || '');
  const [weedmapsDealText, setWeedmapsDealText] = useState(initialWeedmaps?.dealText || '');
  const [weedmapsBundleText, setWeedmapsBundleText] = useState(initialWeedmaps?.bundleText || '');
  const [weedmapsCtaText, setWeedmapsCtaText] = useState(initialWeedmaps?.ctaText || initialData?.primaryCta?.label || 'Shop Now');
  const [weedmapsDisclaimerText, setWeedmapsDisclaimerText] = useState(initialWeedmaps?.disclaimerText || '');
  const [weedmapsLicenseText, setWeedmapsLicenseText] = useState(initialWeedmaps?.licenseText || '');
  const [weedmapsMobilePreset, setWeedmapsMobilePreset] = useState<WeedmapsMobilePreset>(
    initialWeedmaps?.mobilePreset || 'documented'
  );

  const isWeedmaps = channel === 'weedmaps';

  async function uploadImage(
    file: File,
    type: 'logo' | 'hero',
    onUploaded: (url: string) => void,
    setUploading: (value: boolean) => void
  ) {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('orgId', orgId);
      formData.append('type', type);

      const response = await fetch('/api/heroes/upload', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok || !payload.success || typeof payload.url !== 'string') {
        throw new Error(payload.error || 'Upload failed');
      }

      onUploaded(payload.url);
      toast({
        title: 'Upload Complete',
        description: `${file.name} is ready to use.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast({
        title: 'Upload Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'hero',
    onUploaded: (url: string) => void,
    setUploading: (value: boolean) => void
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    await uploadImage(file, type, onUploaded, setUploading);
  };

  const mirrorWeedmapsAsset = async (
    sourceUrl: string,
    options: {
      category: 'logo' | 'image';
      preferredName: string;
      label: string;
    }
  ): Promise<string> => {
    const trimmedSourceUrl = sourceUrl.trim();
    if (!trimmedSourceUrl || !trimmedSourceUrl.startsWith('http') || isStoredHeroAssetUrl(trimmedSourceUrl, orgId)) {
      return trimmedSourceUrl;
    }

    const mirrored = await mirrorBrandAssetFromUrl(orgId, {
      sourceUrl: trimmedSourceUrl,
      category: options.category,
      preferredName: options.preferredName,
    });

    if (!mirrored.success || !mirrored.assetUrl) {
      throw new Error(mirrored.error || `Unable to import ${options.label}. Please upload the image instead.`);
    }

    return mirrored.assetUrl;
  };

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
      const trimmedBrandName = brandName.trim();
      const trimmedBrandLogo = brandLogo.trim();
      const trimmedTagline = tagline.trim();
      const trimmedDescription = description.trim();
      const trimmedHeroImage = heroImage.trim();
      const trimmedDesktopImage = weedmapsDesktopImage.trim() || trimmedHeroImage;
      const trimmedMobileImage = weedmapsMobileImage.trim();
      const trimmedHeadline = weedmapsHeadline.trim();
      const trimmedSubheadline = weedmapsSubheadline.trim();
      const trimmedDealText = weedmapsDealText.trim();
      const trimmedBundleText = weedmapsBundleText.trim();
      const trimmedCtaText = weedmapsCtaText.trim();
      const trimmedDisclaimerText = weedmapsDisclaimerText.trim();
      const trimmedLicenseText = weedmapsLicenseText.trim();
      const [persistedBrandLogo, persistedDesktopImage, persistedMobileImage] = isWeedmaps
        ? await Promise.all([
            trimmedBrandLogo
              ? mirrorWeedmapsAsset(trimmedBrandLogo, {
                  category: 'logo',
                  preferredName: 'weedmaps-brand-logo',
                  label: 'brand logo',
                })
              : Promise.resolve(''),
            trimmedDesktopImage
              ? mirrorWeedmapsAsset(trimmedDesktopImage, {
                  category: 'image',
                  preferredName: 'weedmaps-desktop-banner',
                  label: 'desktop background image',
                })
              : Promise.resolve(''),
            trimmedMobileImage
              ? mirrorWeedmapsAsset(trimmedMobileImage, {
                  category: 'image',
                  preferredName: 'weedmaps-mobile-banner',
                  label: 'mobile background image',
                })
              : Promise.resolve(''),
          ])
        : [trimmedBrandLogo, '', ''];

      if (isWeedmaps) {
        if (persistedBrandLogo && persistedBrandLogo !== brandLogo) {
          setBrandLogo(persistedBrandLogo);
        }
        if (persistedDesktopImage && persistedDesktopImage !== weedmapsDesktopImage) {
          setWeedmapsDesktopImage(persistedDesktopImage);
          setHeroImage(persistedDesktopImage);
        }
        if (persistedMobileImage && persistedMobileImage !== weedmapsMobileImage) {
          setWeedmapsMobileImage(persistedMobileImage);
        }
      }

      const heroData: Partial<Hero> = {
        orgId,
        channel,
        brandName: trimmedBrandName,
        brandLogo: (isWeedmaps ? persistedBrandLogo : trimmedBrandLogo) || undefined,
        tagline: isWeedmaps
          ? trimmedHeadline || initialData?.tagline || 'Weedmaps Listing Banner'
          : trimmedTagline || DEFAULT_TAGLINE,
        description: isWeedmaps
          ? trimmedSubheadline || trimmedDealText || undefined
          : trimmedDescription || undefined,
        heroImage: isWeedmaps
          ? persistedDesktopImage || undefined
          : trimmedHeroImage || undefined,
        primaryColor,
        style,
        purchaseModel: isWeedmaps ? 'local_pickup' : purchaseModel,
        shipsNationwide: isWeedmaps ? undefined : shipsNationwide,
        verified: isWeedmaps ? undefined : verified,
        displayOrder,
        stats: isWeedmaps
          ? undefined
          : showStats
            ? {
                products: statsProducts || undefined,
                retailers: statsRetailers || undefined,
                rating: statsRating || undefined,
              }
            : undefined,
        primaryCta: isWeedmaps
          ? {
              label: trimmedCtaText || 'Shop Now',
              action: 'shop_now',
            }
          : {
              label: primaryCtaLabel,
              action: primaryCtaAction,
              url: primaryCtaAction === 'custom' ? primaryCtaUrl : undefined,
            },
        secondaryCta: isWeedmaps
          ? undefined
          : showSecondaryCta
            ? {
                label: secondaryCtaLabel,
                action: secondaryCtaAction,
                url: secondaryCtaAction === 'custom' ? secondaryCtaUrl : undefined,
              }
            : undefined,
        weedmaps: isWeedmaps
          ? {
              desktopImage: persistedDesktopImage || undefined,
              mobileImage: persistedMobileImage || undefined,
              headline: trimmedHeadline || undefined,
              subheadline: trimmedSubheadline || undefined,
              dealText: trimmedDealText || undefined,
              bundleText: trimmedBundleText || undefined,
              ctaText: trimmedCtaText || undefined,
              disclaimerText: trimmedDisclaimerText || undefined,
              licenseText: trimmedLicenseText || undefined,
              mobilePreset: weedmapsMobilePreset,
            }
          : undefined,
      };

      const result = initialData?.id
        ? await updateHero(initialData.id, heroData)
        : await createHero(heroData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save hero');
      }

      toast({
        title: initialData
          ? isWeedmaps ? 'Banner Updated!' : 'Hero Updated!'
          : isWeedmaps ? 'Banner Created!' : 'Hero Created!',
        description: isWeedmaps
          ? `${trimmedBrandName} Weedmaps banner has been saved.`
          : `${trimmedBrandName} hero banner has been saved.`,
      });
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save hero. Please try again.';
      toast({
        title: 'Save Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input
        ref={brandLogoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFileSelect(event, 'logo', setBrandLogo, setIsUploadingBrandLogo)}
      />
      <input
        ref={heroImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFileSelect(event, 'hero', setHeroImage, setIsUploadingHeroImage)}
      />
      <input
        ref={weedmapsDesktopInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFileSelect(event, 'hero', setWeedmapsDesktopImage, setIsUploadingDesktopImage)}
      />
      <input
        ref={weedmapsMobileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFileSelect(event, 'hero', setWeedmapsMobileImage, setIsUploadingMobileImage)}
      />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2">Basic Information</h3>

        <div className="space-y-2">
          <Label htmlFor="brandName">Brand Name *</Label>
          <Input
            id="brandName"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="e.g., Thrive Syracuse"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="channel">Destination</Label>
          <Select value={channel} onValueChange={(value) => setChannel(value as HeroChannel)}>
            <SelectTrigger id="channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="menu">Website / Menu Hero</SelectItem>
              <SelectItem value="weedmaps">Weedmaps Listing Banner</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isWeedmaps && (
          <>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline *</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder={DEFAULT_TAGLINE}
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
          </>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2 flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          {isWeedmaps ? 'Branding' : 'Images'}
        </h3>

        <div className="space-y-2">
          <Label htmlFor="brandLogo">Brand Logo URL</Label>
          <div className="flex gap-2">
            <Input
              id="brandLogo"
              value={brandLogo}
              onChange={(e) => setBrandLogo(e.target.value)}
              placeholder="https://..."
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => brandLogoInputRef.current?.click()}
              disabled={isUploadingBrandLogo}
            >
              {isUploadingBrandLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {!isWeedmaps && (
          <div className="space-y-2">
            <Label htmlFor="heroImage">Hero Background Image URL</Label>
            <div className="flex gap-2">
              <Input
                id="heroImage"
                value={heroImage}
                onChange={(e) => setHeroImage(e.target.value)}
                placeholder="https://..."
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => heroImageInputRef.current?.click()}
                disabled={isUploadingHeroImage}
              >
                {isUploadingHeroImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>

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
            <Select value={style} onValueChange={(value) => setStyle(value as HeroStyle)}>
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

      {!isWeedmaps && (
        <>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">E-commerce Settings</h3>

            <div className="space-y-2">
              <Label htmlFor="purchaseModel">Purchase Model</Label>
              <Select value={purchaseModel} onValueChange={(value) => setPurchaseModel(value as HeroPurchaseModel)}>
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
                    onChange={(e) => setStatsProducts(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statsRetailers">Retailers</Label>
                  <Input
                    id="statsRetailers"
                    type="number"
                    min="0"
                    value={statsRetailers}
                    onChange={(e) => setStatsRetailers(parseInt(e.target.value, 10) || 0)}
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
                <Select value={primaryCtaAction} onValueChange={(value) => setPrimaryCtaAction(value as HeroCtaAction)}>
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
                    <Select value={secondaryCtaAction} onValueChange={(value) => setSecondaryCtaAction(value as HeroCtaAction)}>
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
        </>
      )}

      {isWeedmaps && (
        <>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">Weedmaps Banner Copy</h3>

            <div className="space-y-2">
              <Label htmlFor="weedmapsHeadline">Headline</Label>
              <Input
                id="weedmapsHeadline"
                value={weedmapsHeadline}
                onChange={(e) => setWeedmapsHeadline(e.target.value)}
                placeholder="Desktop and mobile promo headline"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weedmapsSubheadline">Subheadline</Label>
              <Textarea
                id="weedmapsSubheadline"
                value={weedmapsSubheadline}
                onChange={(e) => setWeedmapsSubheadline(e.target.value)}
                placeholder="Short supporting copy"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weedmapsDealText">Deal Text</Label>
                <Input
                  id="weedmapsDealText"
                  value={weedmapsDealText}
                  onChange={(e) => setWeedmapsDealText(e.target.value)}
                  placeholder="20% Off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weedmapsBundleText">Bundle Text</Label>
                <Input
                  id="weedmapsBundleText"
                  value={weedmapsBundleText}
                  onChange={(e) => setWeedmapsBundleText(e.target.value)}
                  placeholder="2 eighths for $50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weedmapsCtaText">CTA Text</Label>
              <Input
                id="weedmapsCtaText"
                value={weedmapsCtaText}
                onChange={(e) => setWeedmapsCtaText(e.target.value)}
                placeholder="Shop Now"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weedmapsDisclaimerText">Disclaimer Text</Label>
              <Input
                id="weedmapsDisclaimerText"
                value={weedmapsDisclaimerText}
                onChange={(e) => setWeedmapsDisclaimerText(e.target.value)}
                placeholder="21+ only. Keep out of reach of children."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weedmapsLicenseText">License Text</Label>
              <Input
                id="weedmapsLicenseText"
                value={weedmapsLicenseText}
                onChange={(e) => setWeedmapsLicenseText(e.target.value)}
                placeholder="State license number"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">Weedmaps Banner Images</h3>
            <p className="text-xs text-muted-foreground">
              External image URLs are copied into BakedBot storage when you save so exports stay reliable.
            </p>

            <div className="space-y-2">
              <Label htmlFor="weedmapsDesktopImage">Desktop Background Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="weedmapsDesktopImage"
                  value={weedmapsDesktopImage}
                  onChange={(e) => setWeedmapsDesktopImage(e.target.value)}
                  placeholder="https://..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => weedmapsDesktopInputRef.current?.click()}
                  disabled={isUploadingDesktopImage}
                >
                  {isUploadingDesktopImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weedmapsMobileImage">Mobile Background Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="weedmapsMobileImage"
                  value={weedmapsMobileImage}
                  onChange={(e) => setWeedmapsMobileImage(e.target.value)}
                  placeholder="https://..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => weedmapsMobileInputRef.current?.click()}
                  disabled={isUploadingMobileImage}
                >
                  {isUploadingMobileImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weedmapsMobilePreset">Mobile Preset</Label>
              <Select
                value={weedmapsMobilePreset}
                onValueChange={(value) => setWeedmapsMobilePreset(value as WeedmapsMobilePreset)}
              >
                <SelectTrigger id="weedmapsMobilePreset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documented">Documented (840x540)</SelectItem>
                  <SelectItem value="legacy_square">Legacy Square (800x800)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="displayOrder">Display Order</Label>
        <Input
          id="displayOrder"
          type="number"
          min="0"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
        />
        <p className="text-xs text-muted-foreground">
          Lower numbers appear first in your dashboard list.
        </p>
      </div>

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
            <>{initialData ? 'Update' : 'Create'} {isWeedmaps ? 'Banner' : 'Hero'}</>
          )}
        </Button>
      </div>
    </form>
  );
}
