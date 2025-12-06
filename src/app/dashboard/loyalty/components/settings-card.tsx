'use client';

import { useState } from 'react';
import { updateLoyaltySettings } from '../actions';
import { LoyaltySettings } from '@/types/customers';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export function LoyaltySettingsCard({ initialSettings }: { initialSettings: LoyaltySettings }) {
    const [settings, setSettings] = useState(initialSettings);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await updateLoyaltySettings(settings);
            toast({ title: 'Settings Saved', description: 'Loyalty program configuration updated.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Program Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="pointsRate">Points per $1 Spent</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="pointsRate"
                            type="number"
                            value={settings.pointsPerDollar}
                            onChange={(e) => setSettings({ ...settings, pointsPerDollar: parseFloat(e.target.value) })}
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">pts/$</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="equityBoost">Equity Applicant Boost</Label>
                        <Switch
                            id="equityBoost"
                            checked={settings.equityMultiplier > 1}
                            onCheckedChange={(checked) => setSettings({ ...settings, equityMultiplier: checked ? 1.5 : 1 })}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Give extra points to applicants from disproportionately impacted areas (social equity).
                    </p>
                    {settings.equityMultiplier > 1 && (
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                type="number"
                                value={settings.equityMultiplier}
                                onChange={(e) => setSettings({ ...settings, equityMultiplier: parseFloat(e.target.value) })}
                                step="0.1"
                                className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">multiplier (e.g. 1.5x)</span>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={handleSave} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Config
                </Button>
            </CardFooter>
        </Card>
    );
}
