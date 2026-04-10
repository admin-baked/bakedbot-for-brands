'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, MapPin } from 'lucide-react';
import type { BrandPageType, ZipSeoPageContent } from '@/types/brand-pages';
import { PagePublishToggle } from './page-publish-toggle';

interface ZipSeoTabProps {
    orgId: string;
    zipSeoContent: ZipSeoPageContent | null;
    isPublished: boolean;
    updatedAt: string | null;
    onPublishToggle: (pageType: BrandPageType, isPublished: boolean) => void;
}

export function ZipSeoTab({ orgId, zipSeoContent, isPublished, updatedAt, onPublishToggle }: ZipSeoTabProps) {
    const enabledZips = zipSeoContent?.enabledZipCodes ?? [];

    return (
        <div className="space-y-4">
            {/* Publish status */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <PagePublishToggle
                    orgId={orgId}
                    pageType="zip_seo"
                    isPublished={isPublished}
                    updatedAt={updatedAt}
                    onToggle={onPublishToggle}
                />
            </div>

            {/* Info card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Search className="h-4 w-4" />
                        Zip Code SEO Pages
                    </CardTitle>
                    <CardDescription>
                        Generate local landing pages for zip codes near your store. These pages help customers
                        find you when searching &ldquo;dispensary near [zip code]&rdquo; on Google.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {enabledZips.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <MapPin className="h-10 w-10 text-muted-foreground mb-3" />
                            <p className="text-sm font-medium mb-1">No zip codes configured</p>
                            <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                                Zip code SEO pages will be auto-generated based on your store location.
                                Add your location first to enable this feature.
                            </p>
                            <Button asChild variant="outline" size="sm">
                                <a href="/dashboard/settings?tab=locations">Configure Locations</a>
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{enabledZips.length}</span>
                                zip code page{enabledZips.length !== 1 ? 's' : ''} configured
                                {zipSeoContent?.defaultRadius && (
                                    <span>&#8226; {zipSeoContent.defaultRadius} mile radius</span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {enabledZips.map((zip) => (
                                    <a
                                        key={zip}
                                        href={`https://bakedbot.ai/cities/${zip}-dispensary`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group"
                                    >
                                        <Badge
                                            variant="outline"
                                            className="gap-1.5 hover:border-primary transition-colors cursor-pointer"
                                        >
                                            {zip}
                                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Badge>
                                    </a>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* How it works */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">How Zip Code SEO Works</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">1</div>
                            <p className="text-sm font-medium">We generate pages</p>
                            <p className="text-xs text-muted-foreground">
                                A unique landing page is created for each zip code near your store.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">2</div>
                            <p className="text-sm font-medium">Google indexes them</p>
                            <p className="text-xs text-muted-foreground">
                                SEO-optimized with Schema.org markup, FAQs, and local keywords.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">3</div>
                            <p className="text-sm font-medium">Customers find you</p>
                            <p className="text-xs text-muted-foreground">
                                When someone searches &ldquo;dispensary near 13210&rdquo;, your page appears.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
