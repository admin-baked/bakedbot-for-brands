'use client';

/**
 * CheckInSettingsPanel
 *
 * Settings for the Thrive check-in flow — Google Maps place ID (powers Day-3
 * review nudge), in-store offer copy, welcome headline, kill switches, and
 * tablet idle timeout.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Settings2, ExternalLink } from 'lucide-react';
import type { CheckinConfig } from '@/lib/checkin/checkin-management-shared';
import { saveCheckinConfig } from '@/server/actions/checkin-management';
import { useToast } from '@/hooks/use-toast';

interface Props {
    orgId: string;
    initial: CheckinConfig;
}

export function CheckInSettingsPanel({ orgId, initial }: Props) {
    const [config, setConfig] = useState<CheckinConfig>(initial);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const set = <K extends keyof CheckinConfig>(key: K, value: CheckinConfig[K]) =>
        setConfig(prev => ({ ...prev, [key]: value }));

    const applySavedState = (updates: Partial<CheckinConfig>) => {
        setConfig(prev => ({
            ...prev,
            ...updates,
            updatedAt: new Date().toISOString(),
        }));
    };

    const persistConfig = async (
        updates: Partial<CheckinConfig>,
        successDescription: string,
    ) => {
        setSaving(true);
        const result = await saveCheckinConfig(orgId, updates);
        setSaving(false);
        if (result.success) {
            applySavedState(updates);
            toast({ title: 'Settings saved', description: successDescription });
            return true;
        } else {
            toast({ title: 'Save failed', description: result.error, variant: 'destructive' });
            return false;
        }
    };

    const handleToggleChange = async (
        key: 'publicFlowEnabled' | 'checkInEnabled',
        value: boolean,
    ) => {
        const previousValue = config[key];
        set(key, value);

        const saved = await persistConfig(
            { [key]: value },
            'Flow switch updated.',
        );

        if (!saved) {
            set(key, previousValue);
        }
    };

    const handleSave = async () => {
        await persistConfig(config, 'Check-in config updated.');
    };

    const gmapsReviewUrl = config.gmapsPlaceId
        ? `https://search.google.com/local/writereview?placeid=${config.gmapsPlaceId}`
        : null;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-base">Check-In Settings</CardTitle>
                    <Badge variant="outline" className="text-xs ml-auto">Thrive Syracuse</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    Controls the public rewards page flow and in-store tablet.
                </p>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Kill switches */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                    <p className="text-sm font-medium">Flow switches</p>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium">Public check-in enabled</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Shows the check-in card on bakedbot.ai/thrivesyracuse/rewards
                            </p>
                        </div>
                        <Switch
                            checked={config.publicFlowEnabled}
                            onCheckedChange={v => handleToggleChange('publicFlowEnabled', v)}
                            disabled={saving}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-medium">Tablet flow enabled</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Enables the in-store /loyalty-tablet kiosk
                            </p>
                        </div>
                        <Switch
                            checked={config.checkInEnabled}
                            onCheckedChange={v => handleToggleChange('checkInEnabled', v)}
                            disabled={saving}
                        />
                    </div>
                </div>

                {/* Google Maps — unlocks review sequence */}
                <div className="space-y-2">
                    <Label htmlFor="gmapsPlaceId" className="text-sm font-medium">
                        Google Maps Place ID
                        <Badge variant="secondary" className="ml-2 text-xs font-normal">
                            Unlocks Day-3 review nudge
                        </Badge>
                    </Label>
                    <Input
                        id="gmapsPlaceId"
                        placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
                        value={config.gmapsPlaceId}
                        onChange={e => set('gmapsPlaceId', e.target.value)}
                    />
                    {gmapsReviewUrl ? (
                        <a
                            href={gmapsReviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                        >
                            <ExternalLink className="h-3 w-3" />
                            Preview review URL
                        </a>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Find your Place ID at{' '}
                            <a
                                href="https://developers.google.com/maps/documentation/javascript/place-id"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                            >
                                Google Place ID Finder
                            </a>
                            . Without this, Day-3 review emails will be skipped.
                        </p>
                    )}
                </div>

                {/* Welcome headline */}
                <div className="space-y-2">
                    <Label htmlFor="welcomeHeadline" className="text-sm font-medium">
                        Public page welcome headline
                    </Label>
                    <Input
                        id="welcomeHeadline"
                        placeholder="Check in faster. Give your budtender a better head start."
                        value={config.welcomeHeadline}
                        onChange={e => set('welcomeHeadline', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Shown as the H1 on the rewards page check-in view.
                    </p>
                </div>

                {/* In-store offer */}
                <div className="space-y-2">
                    <Label htmlFor="inStoreOffer" className="text-sm font-medium">
                        In-store offer copy
                    </Label>
                    <Input
                        id="inStoreOffer"
                        placeholder="1¢ pre-roll exchange — trade one detail for a staff-honored in-store offer"
                        value={config.inStoreOffer}
                        onChange={e => set('inStoreOffer', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Shown in the &ldquo;utility&rdquo; step of the check-in card.
                    </p>
                </div>

                {/* Tablet idle timeout */}
                <div className="space-y-2">
                    <Label htmlFor="tabletIdleTimeout" className="text-sm font-medium">
                        Tablet idle timeout (seconds)
                    </Label>
                    <Input
                        id="tabletIdleTimeout"
                        type="number"
                        min={5}
                        max={120}
                        value={config.tabletIdleTimeoutSec}
                        onChange={e => set('tabletIdleTimeoutSec', Number(e.target.value))}
                        className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                        The kiosk resets to the welcome screen after this many seconds of inactivity.
                        Default: 20s.
                    </p>
                </div>

                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Saving…' : 'Save settings'}
                </Button>

                {config.updatedAt && (
                    <p className="text-xs text-muted-foreground">
                        Last saved {new Date(config.updatedAt).toLocaleString()}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
