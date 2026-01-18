'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Phone,
  Clock,
  Navigation,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  Heart,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Retailer } from '@/types/domain';
import { RetailerMap } from '@/components/maps/retailer-map';
import { useToast } from '@/hooks/use-toast';

interface SingleLocationBannerProps {
  retailer: Retailer;
  isOpen?: boolean;
  hours?: string;
  rating?: number;
  reviewCount?: number;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  className?: string;
  showMap?: boolean;
}

/**
 * Optimized single-location banner for dispensaries with only one location.
 * Provides a compact, action-oriented display instead of a full search interface.
 */
export function SingleLocationBanner({
  retailer,
  isOpen = true,
  hours = '9AM - 9PM',
  rating,
  reviewCount,
  isFavorite = false,
  onFavoriteToggle,
  className,
  showMap = false
}: SingleLocationBannerProps) {
  const [expanded, setExpanded] = useState(showMap);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const fullAddress = `${retailer.address}, ${retailer.city}, ${retailer.state} ${retailer.zip}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${retailer.name}, ${fullAddress}`)}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      toast({ title: 'Address copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to copy address' });
    }
  };

  const handleCall = () => {
    if (retailer.phone) {
      window.location.href = `tel:${retailer.phone}`;
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Main Banner - Always Visible */}
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-b border-green-200 dark:border-green-800">
          <div className="p-4">
            {/* Top Row: Name, Status, Rating */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg text-green-900 dark:text-green-100 truncate">
                    {retailer.name}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 truncate">
                    {retailer.city}, {retailer.state}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {rating && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{rating.toFixed(1)}</span>
                    {reviewCount && (
                      <span className="text-muted-foreground">({reviewCount})</span>
                    )}
                  </div>
                )}
                <Badge
                  variant={isOpen ? 'default' : 'secondary'}
                  className={cn(
                    isOpen
                      ? 'bg-green-600 hover:bg-green-600'
                      : 'bg-gray-500 hover:bg-gray-500'
                  )}
                >
                  {isOpen ? 'Open Now' : 'Closed'}
                </Badge>
              </div>
            </div>

            {/* Address Row */}
            <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200 mb-4">
              <span className="truncate">{fullAddress}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleCopyAddress}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => window.open(directionsUrl, '_blank')}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>

              {retailer.phone && (
                <Button size="sm" variant="outline" onClick={handleCall}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              )}

              <Button size="sm" variant="outline" className="gap-2">
                <Clock className="h-4 w-4" />
                {hours}
              </Button>

              {onFavoriteToggle && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onFavoriteToggle}
                  className={cn(isFavorite && 'text-red-500 border-red-200')}
                >
                  <Heart
                    className={cn('h-4 w-4', isFavorite && 'fill-red-500')}
                  />
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
                className="ml-auto"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    More Info
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Expandable Section */}
        {expanded && (
          <div className="border-t">
            {/* Map */}
            {retailer.lat && retailer.lon && (
              <div className="h-[250px] w-full">
                <RetailerMap
                  retailers={[
                    {
                      id: retailer.id,
                      name: retailer.name,
                      address: fullAddress,
                      lat: retailer.lat,
                      lng: retailer.lon
                    }
                  ]}
                  height="100%"
                />
              </div>
            )}

            {/* Additional Info */}
            <div className="p-4 bg-muted/30 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {retailer.phone && (
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    <a
                      href={`tel:${retailer.phone}`}
                      className="font-medium hover:underline"
                    >
                      {retailer.phone}
                    </a>
                  </div>
                )}
                {retailer.email && (
                  <div>
                    <span className="text-muted-foreground">Email:</span>{' '}
                    <a
                      href={`mailto:${retailer.email}`}
                      className="font-medium hover:underline"
                    >
                      {retailer.email}
                    </a>
                  </div>
                )}
                {retailer.website && (
                  <div>
                    <span className="text-muted-foreground">Website:</span>{' '}
                    <a
                      href={retailer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline inline-flex items-center gap-1"
                    >
                      Visit Site
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* View on Google Maps Link */}
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Google Maps
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
