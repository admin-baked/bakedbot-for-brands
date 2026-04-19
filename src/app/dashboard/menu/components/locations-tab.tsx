'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, ExternalLink, Pencil, X, Check, Clock, Phone, Mail, Link2 } from 'lucide-react';
import type { BrandPageType, LocationInfo, LocationsPageContent } from '@/types/brand-pages';
import { updateBrandPage } from '@/server/actions/brand-pages';
import { logger } from '@/lib/logger';
import { PagePublishToggle } from './page-publish-toggle';

interface LocationsTabProps {
    orgId: string;
    brandSlug: string | null;
    locations: LocationInfo[];
    heroTitle: string;
    heroDescription: string;
    isPublished: boolean;
    updatedAt: string | null;
    onPublishToggle: (pageType: BrandPageType, isPublished: boolean) => void;
    onLocationsUpdate: (locations: LocationInfo[], heroTitle: string, heroDescription: string) => void;
}

interface EditState {
    heroTitle: string;
    heroDescription: string;
    locations: LocationInfo[];
}

export function LocationsTab({
    orgId,
    brandSlug,
    locations,
    heroTitle,
    heroDescription,
    isPublished,
    updatedAt,
    onPublishToggle,
    onLocationsUpdate,
}: LocationsTabProps) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editState, setEditState] = useState<EditState>({ heroTitle, heroDescription, locations });

    const startEdit = () => {
        setEditState({ heroTitle, heroDescription, locations: locations.map(l => ({ ...l })) });
        setEditing(true);
    };

    const cancelEdit = () => setEditing(false);

    const updateLoc = (idx: number, field: keyof LocationInfo, value: string | string[]) => {
        setEditState(prev => {
            const locs = prev.locations.map((l, i) => i === idx ? { ...l, [field]: value } : l);
            return { ...prev, locations: locs };
        });
    };

    const save = async () => {
        setSaving(true);
        try {
            const content: LocationsPageContent = {
                heroTitle: editState.heroTitle,
                heroDescription: editState.heroDescription,
                locations: editState.locations,
            };
            await updateBrandPage(orgId, 'locations', { locationsContent: content });
            onLocationsUpdate(editState.locations, editState.heroTitle, editState.heroDescription);
            setEditing(false);
        } catch (err) {
            logger.error('[LocationsTab] save failed', { error: String(err) });
        } finally {
            setSaving(false);
        }
    };

    const displayLocations = editing ? editState.locations : locations;

    return (
        <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <PagePublishToggle
                    orgId={orgId}
                    pageType="locations"
                    isPublished={isPublished}
                    updatedAt={updatedAt}
                    onToggle={onPublishToggle}
                />
                <div className="flex items-center gap-2">
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
                    {!editing && (
                        <Button variant="outline" size="sm" onClick={startEdit} className="gap-1.5">
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                        </Button>
                    )}
                </div>
            </div>

            {editing && (
                <Card>
                    <CardContent className="pt-5 space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Page Headline</Label>
                            <Input
                                value={editState.heroTitle}
                                onChange={e => setEditState(prev => ({ ...prev, heroTitle: e.target.value }))}
                                placeholder="Visit Us"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Subheading</Label>
                            <Input
                                value={editState.heroDescription}
                                onChange={e => setEditState(prev => ({ ...prev, heroDescription: e.target.value }))}
                                placeholder="Find us at our location below."
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {displayLocations.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No locations added</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Your location data comes from your brand settings.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {displayLocations.map((loc, idx) => (
                        <Card key={loc.id}>
                            <CardContent className="pt-6 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        {loc.name}
                                    </h3>
                                    {loc.isPrimary && (
                                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                                    )}
                                </div>

                                {/* Address (read-only — comes from brand settings) */}
                                <p className="text-sm text-muted-foreground">
                                    {loc.address}, {loc.city}, {loc.state} {loc.zip}
                                </p>

                                {/* Hours */}
                                {editing ? (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" /> Hours
                                        </Label>
                                        <Textarea
                                            value={loc.hours ?? ''}
                                            onChange={e => updateLoc(idx, 'hours', e.target.value)}
                                            placeholder={'Monday – Saturday: 10:00 AM – 9:00 PM\nSunday: 11:00 AM – 7:00 PM'}
                                            rows={3}
                                            className="text-xs"
                                        />
                                    </div>
                                ) : loc.hours ? (
                                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                                        <p className="whitespace-pre-line">{loc.hours}</p>
                                    </div>
                                ) : null}

                                {/* Phone */}
                                {loc.phone && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="h-4 w-4 shrink-0" />
                                        {loc.phone}
                                    </div>
                                )}

                                {/* Email */}
                                {editing ? (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs flex items-center gap-1.5">
                                            <Mail className="h-3.5 w-3.5" /> Email
                                        </Label>
                                        <Input
                                            value={loc.email ?? ''}
                                            onChange={e => updateLoc(idx, 'email', e.target.value)}
                                            placeholder="info@yourstore.com"
                                            type="email"
                                        />
                                    </div>
                                ) : loc.email ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="h-4 w-4 shrink-0" />
                                        {loc.email}
                                    </div>
                                ) : null}

                                {/* Map URL */}
                                {editing ? (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs flex items-center gap-1.5">
                                            <Link2 className="h-3.5 w-3.5" /> Google Maps Link
                                        </Label>
                                        <Input
                                            value={loc.mapUrl ?? ''}
                                            onChange={e => updateLoc(idx, 'mapUrl', e.target.value)}
                                            placeholder="https://maps.google.com/?q=..."
                                        />
                                    </div>
                                ) : loc.mapUrl ? (
                                    <a
                                        href={loc.mapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        View on Map
                                    </a>
                                ) : null}

                                {/* Features */}
                                {editing ? (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Services (comma-separated)</Label>
                                        <Input
                                            value={(loc.features ?? []).join(', ')}
                                            onChange={e => updateLoc(idx, 'features', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                            placeholder="Adult-Use, Medical, In-Store Pickup"
                                        />
                                    </div>
                                ) : loc.features && loc.features.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {loc.features.map((f) => (
                                            <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                                        ))}
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {editing && (
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving} className="gap-1.5">
                        <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                    <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                </div>
            )}
        </div>
    );
}
