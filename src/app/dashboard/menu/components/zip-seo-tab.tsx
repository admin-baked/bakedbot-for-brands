'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ExternalLink, MapPin, Plus, X } from 'lucide-react';
import type { BrandPageType, ZipSeoPageContent } from '@/types/brand-pages';
import { updateBrandPage } from '@/server/actions/brand-pages';
import { logger } from '@/lib/logger';
import { PagePublishToggle } from './page-publish-toggle';

const sanitizeZip = (v: string) => v.replace(/\D/g, '').slice(0, 5);

interface ZipSeoTabProps {
    orgId: string;
    brandSlug: string | null;
    zipSeoContent: ZipSeoPageContent | null;
    isPublished: boolean;
    updatedAt: string | null;
    onPublishToggle: (pageType: BrandPageType, isPublished: boolean) => void;
    onZipSeoUpdate: (content: ZipSeoPageContent) => void;
}

export function ZipSeoTab({ orgId, brandSlug, zipSeoContent, isPublished, updatedAt, onPublishToggle, onZipSeoUpdate }: ZipSeoTabProps) {
    const [enabledZips, setEnabledZips] = useState<string[]>(zipSeoContent?.enabledZipCodes ?? []);
    const [zipInput, setZipInput] = useState('');
    const [saving, setSaving] = useState(false);

    const addZip = async (zip: string) => {
        const clean = sanitizeZip(zip.trim());
        if (clean.length !== 5 || enabledZips.includes(clean)) return;
        await persistZips([...enabledZips, clean]);
    };

    const removeZip = async (zip: string) => {
        const updated = enabledZips.filter(z => z !== zip);
        await persistZips(updated);
    };

    const persistZips = async (zips: string[]) => {
        const prev = enabledZips;
        setEnabledZips(zips); // optimistic
        setSaving(true);
        try {
            const content: ZipSeoPageContent = {
                ...(zipSeoContent ?? { defaultRadius: 10, customIntro: '' }),
                enabledZipCodes: zips,
            };
            await updateBrandPage(orgId, 'zip_seo', { zipSeoContent: content });
            onZipSeoUpdate(content);
        } catch (err) {
            logger.error('[ZipSeoTab] persistZips failed', { error: String(err) });
            setEnabledZips(prev); // revert on failure
        } finally {
            setSaving(false);
        }
    };

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

            {/* Zip code manager */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Search className="h-4 w-4" />
                        Zip Code SEO Pages
                    </CardTitle>
                    <CardDescription>
                        Generate a local landing page for each zip code near your store.
                        These pages target &ldquo;dispensary near [zip]&rdquo; searches on Google.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add zip input */}
                    <div className="flex gap-2">
                        <Input
                            value={zipInput}
                            onChange={e => setZipInput(sanitizeZip(e.target.value))}
                            onKeyDown={e => { if (e.key === 'Enter') { addZip(zipInput); setZipInput(''); } }}
                            placeholder="Enter zip code (e.g. 13210)"
                            className="w-48 font-mono"
                            maxLength={5}
                        />
                        <Button
                            size="sm"
                            disabled={saving || zipInput.length !== 5}
                            onClick={() => { addZip(zipInput); setZipInput(''); }}
                            className="gap-1.5"
                        >
                            <Plus className="h-3.5 w-3.5" /> Add
                        </Button>
                    </div>

                    {/* Zip badges */}
                    {enabledZips.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <MapPin className="h-10 w-10 text-muted-foreground mb-3" />
                            <p className="text-sm font-medium mb-1">No zip codes configured</p>
                            <p className="text-xs text-muted-foreground max-w-sm">
                                Add zip codes near your store to generate local SEO landing pages.
                                Start with your store&apos;s zip and nearby neighborhoods.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {enabledZips.map((zip) => (
                                <div key={zip} className="group flex items-center">
                                    <Badge
                                        variant="outline"
                                        className="gap-1.5 pr-1 font-mono"
                                    >
                                        {brandSlug ? (
                                            <a
                                                href={`https://bakedbot.ai/${brandSlug}/near/${zip}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 hover:text-primary transition-colors"
                                            >
                                                {zip}
                                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        ) : zip}
                                        <button
                                            onClick={() => removeZip(zip)}
                                            disabled={saving}
                                            className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}

                    {enabledZips.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            {enabledZips.length} page{enabledZips.length !== 1 ? 's' : ''} live at{' '}
                            {brandSlug ? `bakedbot.ai/${brandSlug}/near/[zip]` : 'your brand URL/near/[zip]'}
                        </p>
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
                            <p className="text-sm font-medium">Add zip codes</p>
                            <p className="text-xs text-muted-foreground">
                                Enter zip codes near your store — your own zip plus surrounding neighborhoods.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">2</div>
                            <p className="text-sm font-medium">Google indexes them</p>
                            <p className="text-xs text-muted-foreground">
                                Each page gets Schema.org markup, FAQs, and location-specific keywords.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">3</div>
                            <p className="text-sm font-medium">Customers find you</p>
                            <p className="text-xs text-muted-foreground">
                                When someone searches &ldquo;dispensary near 13210&rdquo;, your page shows up.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
