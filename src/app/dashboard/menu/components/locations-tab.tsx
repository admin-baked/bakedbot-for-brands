'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, ExternalLink, Plus } from 'lucide-react';
import Link from 'next/link';
import type { BrandPageType, LocationInfo } from '@/types/brand-pages';
import { PagePublishToggle } from './page-publish-toggle';

interface LocationsTabProps {
    orgId: string;
    brandSlug: string | null;
    locations: LocationInfo[];
    isPublished: boolean;
    updatedAt: string | null;
    onPublishToggle: (pageType: BrandPageType, isPublished: boolean) => void;
}

export function LocationsTab({ orgId, brandSlug, locations, isPublished, updatedAt, onPublishToggle }: LocationsTabProps) {
    return (
        <div className="space-y-4">
            {/* Publish status */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <PagePublishToggle
                    orgId={orgId}
                    pageType="locations"
                    isPublished={isPublished}
                    updatedAt={updatedAt}
                    onToggle={onPublishToggle}
                />
                {brandSlug && (
                    <a
                        href={`https://bakedbot.ai/${brandSlug}/locations`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Live Page
                    </a>
                )}
            </div>

            {/* Locations list */}
            {locations.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No locations added</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Add your store locations so customers can find you.
                        </p>
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/dashboard/settings?tab=locations">
                                <Plus className="h-4 w-4" />
                                Add Location
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {locations.map((loc) => (
                        <Card key={loc.id}>
                            <CardContent className="pt-6 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        {loc.name}
                                    </h3>
                                    {loc.isPrimary && (
                                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {loc.address}, {loc.city}, {loc.state} {loc.zip}
                                </p>
                                {loc.phone && (
                                    <p className="text-sm text-muted-foreground">{loc.phone}</p>
                                )}
                                {loc.features && loc.features.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {loc.features.map((f) => (
                                            <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Manage link */}
            {locations.length > 0 && (
                <div className="flex justify-center">
                    <Button asChild variant="outline" className="gap-2">
                        <Link href="/dashboard/settings?tab=locations">
                            <Plus className="h-4 w-4" />
                            Manage Locations
                        </Link>
                    </Button>
                </div>
            )}
        </div>
    );
}
