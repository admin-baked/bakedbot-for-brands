'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight, CheckCircle, Star, Leaf, Truck, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandHeroProps {
  brandName: string;
  brandLogo?: string;
  tagline?: string;
  description?: string;
  heroImage?: string;
  primaryColor?: string;
  verified?: boolean;
  stats?: {
    products?: number;
    retailers?: number;
    rating?: number;
  };
  // E-commerce model support
  purchaseModel?: 'online_only' | 'local_pickup' | 'hybrid';
  shipsNationwide?: boolean;
  onFindNearMe?: () => void;
  onShopNow?: () => void;
}

export function BrandHero({
  brandName,
  brandLogo,
  tagline = 'Premium Cannabis Products',
  description,
  heroImage,
  primaryColor = '#16a34a',
  verified = true,
  stats,
  purchaseModel = 'local_pickup',
  shipsNationwide = false,
  onFindNearMe,
  onShopNow,
}: BrandHeroProps) {
  const isOnlineOnly = purchaseModel === 'online_only';

  const defaultDescription = isOnlineOnly
    ? `Discover ${brandName}'s collection of premium products. Shop online and get them shipped directly to your door.`
    : `Discover ${brandName}'s collection of premium cannabis products. Order online and pick up at a dispensary near you.`;

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient and pattern */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 50%, ${primaryColor}aa 100%)`,
        }}
      />

      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute -right-20 -top-20 w-96 h-96 border-[16px] border-white rounded-full" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 border-[12px] border-white rounded-full" />
        <div className="absolute right-1/3 bottom-0 w-64 h-64 border-[8px] border-white rounded-full" />
      </div>

      {/* Optional hero image as background */}
      {heroImage && (
        <>
          <Image
            src={heroImage}
            alt={brandName}
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        </>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Brand Info */}
          <div className="text-white space-y-6">
            {/* Brand Logo & Badge */}
            <div className="flex items-center gap-4">
              {brandLogo ? (
                <div className="relative h-20 w-20 bg-white rounded-2xl p-2 shadow-xl">
                  <Image
                    src={brandLogo}
                    alt={brandName}
                    fill
                    className="object-contain p-2"
                  />
                </div>
              ) : (
                <div className="h-20 w-20 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                  <Leaf className="h-10 w-10" style={{ color: primaryColor }} />
                </div>
              )}
              {verified && (
                <Badge className="bg-white/20 text-white border-0 gap-1 px-3 py-1">
                  <CheckCircle className="h-4 w-4" />
                  Verified Brand
                </Badge>
              )}
            </div>

            {/* Brand Name */}
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-2">
                {brandName}
              </h1>
              <p className="text-xl md:text-2xl text-white/80 font-medium">
                {tagline}
              </p>
            </div>

            {/* Description */}
            <p className="text-lg text-white/90 max-w-lg leading-relaxed">
              {description || defaultDescription}
            </p>

            {/* Stats */}
            {stats && (
              <div className="flex flex-wrap gap-8 py-4">
                {stats.products && (
                  <div className="text-center">
                    <div className="text-3xl font-bold">{stats.products}+</div>
                    <div className="text-sm text-white/70">Products</div>
                  </div>
                )}
                {stats.retailers && (
                  <div className="text-center">
                    <div className="text-3xl font-bold">{stats.retailers}+</div>
                    <div className="text-sm text-white/70">Retail Partners</div>
                  </div>
                )}
                {stats.rating && (
                  <div className="text-center">
                    <div className="text-3xl font-bold flex items-center gap-1">
                      <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                      {stats.rating}
                    </div>
                    <div className="text-sm text-white/70">Avg Rating</div>
                  </div>
                )}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-2">
              {!isOnlineOnly && (
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-white/90 font-bold gap-2 px-8 h-14 text-lg"
                  onClick={onFindNearMe}
                >
                  <MapPin className="h-5 w-5" />
                  Find Near Me
                </Button>
              )}
              <Button
                size="lg"
                variant={isOnlineOnly ? 'default' : 'outline'}
                className={cn(
                  'font-bold gap-2 px-8 h-14 text-lg',
                  isOnlineOnly
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'border-2 border-white text-white hover:bg-white/20'
                )}
                onClick={onShopNow}
              >
                {isOnlineOnly && <ShoppingCart className="h-5 w-5" />}
                Shop Products
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Brand Promise */}
            <div className="flex flex-wrap gap-6 pt-4 text-sm text-white/80">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Lab Tested
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Premium Quality
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {isOnlineOnly
                  ? (shipsNationwide ? 'Ships Nationwide' : 'Shop Online, Shipped Direct')
                  : 'Order Online, Pickup In Store'}
              </span>
            </div>
          </div>

          {/* Right: Visual Element */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative">
              {/* Animated rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-80 h-80 rounded-full border-4 border-white/20 animate-pulse" />
                <div className="absolute w-96 h-96 rounded-full border-2 border-white/10 animate-pulse delay-100" />
              </div>

              {/* Center content */}
              <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-center border border-white/20">
                <div className="space-y-4">
                  <div className="text-5xl font-bold">
                    {isOnlineOnly ? 'Shop Online' : 'Order Online'}
                  </div>
                  <div className="text-2xl text-white/80">
                    {isOnlineOnly ? 'Shipped Direct to You' : 'Pick Up at a Dispensary'}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-lg text-white/70">
                    {isOnlineOnly ? (
                      <>
                        <Truck className="h-5 w-5" />
                        {shipsNationwide ? 'Nationwide Delivery' : 'Fast Shipping'}
                      </>
                    ) : (
                      <>
                        <MapPin className="h-5 w-5" />
                        Near You
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  );
}
