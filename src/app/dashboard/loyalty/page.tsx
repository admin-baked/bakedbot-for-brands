'use client';

import { Button } from '@/components/ui/button';
import { Settings, Loader2, Award } from 'lucide-react';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { useEffect, useState, useCallback } from 'react';
import { getLoyaltySettings } from '@/app/actions/loyalty';
import { LoyaltySettings } from '@/types/customers';
import { useToast } from '@/hooks/use-toast';
import { LoyaltySettingsForm } from '@/components/dashboard/loyalty/loyalty-settings-form';

export default function LoyaltyPage() {
    const { dispensaryId, loading: idLoading } = useDispensaryId();
    const [settings, setSettings] = useState<LoyaltySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchSettings = useCallback(async () => {
        if (!dispensaryId) return;
        const result = await getLoyaltySettings(dispensaryId);
        if (result.success && result.data) {
            setSettings(result.data);
        } else {
            toast({
                title: "Error",
                description: "Failed to load loyalty settings.",
                variant: "destructive"
            });
        }
        setLoading(false);
    }, [dispensaryId, toast]);

    useEffect(() => {
        if (!dispensaryId) {
            if (!idLoading) setLoading(false);
            return;
        }
        setLoading(true);
        fetchSettings();
    }, [dispensaryId, idLoading, fetchSettings]);

    if (idLoading || (loading && dispensaryId)) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Loyalty Program</h2>
                    <p className="text-sm text-muted-foreground">Configure points, rewards, and tiers.</p>
                </div>
                <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Advanced Config
                </Button>
            </div>

            {settings ? (
                <div className="grid gap-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-6 border rounded-lg bg-card">
                            <h3 className="font-semibold text-lg">Points Balance</h3>
                            <p className="text-3xl font-bold mt-2">--</p>
                            <p className="text-sm text-muted-foreground">Total outstanding points</p>
                        </div>
                        <div className="p-6 border rounded-lg bg-card">
                            <h3 className="font-semibold text-lg">Active Members</h3>
                            <p className="text-3xl font-bold mt-2">--</p>
                            <p className="text-sm text-muted-foreground">Enrolled customers</p>
                        </div>
                        <div className="p-6 border rounded-lg bg-card">
                            <h3 className="font-semibold text-lg">Redemption Rate</h3>
                            <p className="text-3xl font-bold mt-2">--%</p>
                            <p className="text-sm text-muted-foreground">Points used vs earned</p>
                        </div>
                    </div>

                    <div className="p-6 border rounded-lg bg-card">
                        <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            Program Rules
                        </h3>
                        {dispensaryId && (
                            <LoyaltySettingsForm
                                initialData={settings}
                                orgId={dispensaryId}
                            />
                        )}
                    </div>
                </div>
            ) : (
                <div className="p-12 border border-dashed rounded-lg text-center text-muted-foreground">
                    Unable to load settings.
                </div>
            )}
        </div>
    );
}
