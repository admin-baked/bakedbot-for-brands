'use client';

/**
 * Dispensary Trust Module
 * Shows Google rating, open status, hours, directions
 * Requires Google attribution when displayed
 */

import { Star, Clock, MapPin, Phone, ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GoogleAttribution } from '@/components/places/google-attribution';
import type { PlaceSnapshot } from '@/types/places';

interface DispensaryTrustModuleProps {
    dispensaryName: string;
    snapshot?: PlaceSnapshot | null;
    googleRating?: number;
    googleReviewCount?: number;
    phone?: string;
    website?: string;
    address?: string;
    compact?: boolean;
}

export function DispensaryTrustModule({
    dispensaryName,
    snapshot,
    googleRating,
    googleReviewCount,
    phone,
    website,
    address,
    compact = false,
}: DispensaryTrustModuleProps) {
    // Use snapshot data if available, fallback to props
    const rating = snapshot?.rating || googleRating;
    const reviewCount = snapshot?.userRatingCount || googleReviewCount;
    const isOpen = snapshot?.currentOpeningHours?.openNow;
    const phoneNumber = snapshot?.nationalPhoneNumber || phone;
    const websiteUrl = snapshot?.websiteUri || website;
    const placeId = snapshot?.placeId;

    if (compact) {
        return (
            <div className="flex items-center gap-3 text-sm">
                {rating && (
                    <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-semibold">{rating.toFixed(1)}</span>
                        {reviewCount && (
                            <span className="text-slate-400">({reviewCount})</span>
                        )}
                    </div>
                )}
                {typeof isOpen === 'boolean' && (
                    <Badge variant={isOpen ? 'default' : 'secondary'} className={isOpen ? 'bg-green-500' : ''}>
                        {isOpen ? 'Open' : 'Closed'}
                    </Badge>
                )}
                <GoogleAttribution placeId={placeId} variant="inline" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            {/* Rating + Open Status Row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {rating && (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                                <span className="font-bold text-lg">{rating.toFixed(1)}</span>
                            </div>
                            {reviewCount && (
                                <span className="text-sm text-slate-500">
                                    {reviewCount.toLocaleString()} reviews
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {typeof isOpen === 'boolean' && (
                    <Badge
                        variant={isOpen ? 'default' : 'secondary'}
                        className={`text-sm py-1 px-3 ${isOpen ? 'bg-green-500 hover:bg-green-600' : ''}`}
                    >
                        <Clock className="w-4 h-4 mr-1" />
                        {isOpen ? 'Open Now' : 'Closed'}
                    </Badge>
                )}
            </div>

            {/* Hours (if available) */}
            {snapshot?.regularOpeningHours?.weekdayDescriptions && (
                <div className="text-sm text-slate-600">
                    <p className="font-medium mb-1">Today's Hours</p>
                    <p>{getTodayHours(snapshot.regularOpeningHours.weekdayDescriptions)}</p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
                {placeId && (
                    <Button variant="outline" size="sm" asChild>
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination_place_id=${placeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <MapPin className="w-4 h-4 mr-1" />
                            Directions
                        </a>
                    </Button>
                )}

                {phoneNumber && (
                    <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${phoneNumber}`}>
                            <Phone className="w-4 h-4 mr-1" />
                            Call
                        </a>
                    </Button>
                )}

                {websiteUrl && (
                    <Button variant="outline" size="sm" asChild>
                        <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Globe className="w-4 h-4 mr-1" />
                            Website
                        </a>
                    </Button>
                )}
            </div>

            {/* Google Attribution (required by TOS) */}
            <GoogleAttribution
                placeId={placeId}
                placeName={dispensaryName}
                variant="block"
            />
        </div>
    );
}

/**
 * Get today's hours from weekday descriptions
 */
function getTodayHours(weekdayDescriptions: string[]): string {
    const dayIndex = new Date().getDay();
    // Google returns Sunday=0, but weekdayDescriptions starts with Monday
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    return weekdayDescriptions[adjustedIndex] || 'Hours not available';
}

export default DispensaryTrustModule;
