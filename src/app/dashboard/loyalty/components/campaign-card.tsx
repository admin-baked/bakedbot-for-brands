'use client';

import { useState } from 'react';
import { toggleLoyaltyCampaign, triggerCampaignTest } from '../actions';
import { LoyaltyCampaign } from '@/types/customers';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Play, Loader2, PartyPopper, Calendar, Crown, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function LoyaltyCampaignCard({ campaign }: { campaign: LoyaltyCampaign }) {
    const [enabled, setEnabled] = useState(campaign.enabled);
    const [isLoading, setIsLoading] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const { toast } = useToast();

    const handleToggle = async (checked: boolean) => {
        setIsLoading(true);
        try {
            await toggleLoyaltyCampaign(campaign.id);
            setEnabled(checked);
            toast({
                title: checked ? 'Campaign Enabled' : 'Campaign Disabled',
                description: `${campaign.name} is now ${checked ? 'active' : 'inactive'}.`
            });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update campaign.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        try {
            await triggerCampaignTest(campaign.type);
            toast({
                title: 'Test Triggered',
                description: `Simulated sending ${campaign.name} to sample users.`,
                className: 'bg-green-50 border-green-200'
            });
        } catch (error) {
            toast({ title: 'Error', description: 'Simulation failed.', variant: 'destructive' });
        } finally {
            setIsTesting(false);
        }
    };

    let Icon = Store;
    if (campaign.type === 'birthday') Icon = Calendar;
    else if (campaign.type === 'vip_welcome') Icon = Crown;
    else if (campaign.type === 'winback') Icon = PartyPopper;

    return (
        <Card className={enabled ? 'border-primary/40' : 'opacity-80'}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">{campaign.name}</CardTitle>
                        </div>
                    </div>
                    <Switch checked={enabled} onCheckedChange={handleToggle} disabled={isLoading} />
                </div>
            </CardHeader>
            <CardContent className="pb-2">
                <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">{campaign.description}</p>
                <div className="flex gap-4 text-xs">
                    <div>
                        <span className="font-bold">{campaign.stats.sent}</span> Sent
                    </div>
                    <div>
                        <span className="font-bold">{campaign.stats.converted}</span> Converted
                    </div>
                </div>
            </CardContent>
            <CardFooter className="pt-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={handleTest}
                    disabled={isTesting}
                >
                    {isTesting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Play className="mr-2 h-3 w-3" />}
                    Simulate Trigger
                </Button>
            </CardFooter>
        </Card>
    );
}
