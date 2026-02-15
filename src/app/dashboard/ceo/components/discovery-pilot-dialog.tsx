'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Rocket, MapPin, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runDispensaryPilotAction, runBrandPilotAction, runNationalSeedAction } from '../actions/pilot-actions';
import { Textarea } from '@/components/ui/textarea';

interface DiscoveryPilotDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function DiscoveryPilotDialog({
    open,
    onOpenChange,
    onSuccess
}: DiscoveryPilotDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [mode, setMode] = useState<'dispensary' | 'brand' | 'national'>('dispensary');
    const [city, setCity] = useState('Chicago');
    const [state, setState] = useState('IL');
    const [zipCodes, setZipCodes] = useState('');

    const handleRun = async () => {
        if (mode !== 'national' && (!city || !state)) {
            toast({ title: 'Validation Error', description: 'City and State are required.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);

        try {
            let result;
            if (mode === 'national') {
                result = await runNationalSeedAction();
            } else if (mode === 'dispensary') {
                const zips = zipCodes.split(',').map(z => z.trim()).filter(z => z.length === 5);
                result = await runDispensaryPilotAction(city, state, zips.length > 0 ? zips : undefined);
            } else {
                result = await runBrandPilotAction(city, state);
            }

            if (result.error) {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            } else {
                toast({ title: 'Discovery Started', description: `Check the tables shortly for results. ${result.message}` });
                onSuccess?.();
                onOpenChange(false);
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to start pilot.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Rocket className="h-5 w-5 text-indigo-500" />
                        Run Discovery Pilot
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'national'
                            ? 'Launch national seeding for Chicago + Detroit (Brands & Dispensaries).'
                            : `Launch a mass scraping job to discover ${mode === 'dispensary' ? 'dispensaries' : 'brands'}.`
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Mode Selection */}
                    <div className="space-y-3">
                        <Label>Discovery Type</Label>
                        <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="grid grid-cols-3 gap-3">
                            <div>
                                <RadioGroupItem value="dispensary" id="mode-disp" className="peer sr-only" />
                                <Label
                                    htmlFor="mode-disp"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:text-indigo-600 cursor-pointer text-xs"
                                >
                                    <MapPin className="mb-1 h-5 w-5" />
                                    Dispensaries
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="brand" id="mode-brand" className="peer sr-only" />
                                <Label
                                    htmlFor="mode-brand"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:text-indigo-600 cursor-pointer text-xs"
                                >
                                    <Rocket className="mb-1 h-5 w-5" />
                                    Brands
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="national" id="mode-national" className="peer sr-only" />
                                <Label
                                    htmlFor="mode-national"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:text-emerald-600 cursor-pointer text-xs"
                                >
                                    <Globe className="mb-1 h-5 w-5" />
                                    National Seed
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* National Seed Info */}
                    {mode === 'national' && (
                        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm">
                            <p className="font-medium text-emerald-700 dark:text-emerald-400">🌍 National Seed creates 3 page types:</p>
                            <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside space-y-1">
                                <li><strong>Dispensary Pages</strong> (via Firecrawl)</li>
                                <li><strong>Brand Pages</strong> (via Firecrawl)</li>
                                <li><strong>Location/ZIP Pages</strong> (via CannMenus)</li>
                            </ul>
                            <p className="mt-2 text-xs text-muted-foreground">Markets: Chicago, IL • Detroit, MI</p>
                        </div>
                    )}

                    {/* Location Inputs (Not for National) */}
                    {mode !== 'national' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Chicago" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input id="state" value={state} onChange={e => setState(e.target.value)} placeholder="IL" maxLength={2} />
                            </div>
                        </div>
                    )}

                    {/* Advanced / Optional ZIPs (Dispensary Only) */}
                    {mode === 'dispensary' && (
                        <div className="space-y-2">
                            <Label htmlFor="zips">Target ZIPs (Optional)</Label>
                            <Textarea
                                id="zips"
                                value={zipCodes}
                                onChange={e => setZipCodes(e.target.value)}
                                placeholder="60601, 60611 (Leave empty to search entire city)"
                                className="h-20"
                            />
                            <p className="text-xs text-muted-foreground">Comma-separated. If empty, discovers "Dispensaries in {city}, {state}".</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button
                        onClick={handleRun}
                        disabled={isSubmitting}
                        className={mode === 'national' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Launching...
                            </>
                        ) : (
                            <>
                                {mode === 'national' ? <Globe className="mr-2 h-4 w-4" /> : <Rocket className="mr-2 h-4 w-4" />}
                                {mode === 'national' ? 'Seed All Markets' : 'Start Engine'}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

