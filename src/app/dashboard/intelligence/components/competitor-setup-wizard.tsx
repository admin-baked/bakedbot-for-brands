'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Store, Check, Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { searchLocalCompetitors, finalizeCompetitorSetup } from '../actions/setup';

export function CompetitorSetupWizard({ hasCompetitors }: { hasCompetitors: boolean }) {
    const [open, setOpen] = useState(!hasCompetitors); // Auto-open if no competitors
    const [step, setStep] = useState(1);
    const [zip, setZip] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const { toast } = useToast();

    const handleSearch = async () => {
        if (!zip) return;
        setLoading(true);
        try {
            const competitors = await searchLocalCompetitors(zip);
            setResults(competitors);
            setStep(2);
        } catch (error) {
            toast({
                title: "Search failed",
                description: "Could not find local dispensaries. Try a different ZIP.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (menuUrl: string) => {
        const next = new Set(selected);
        if (next.has(menuUrl)) {
            next.delete(menuUrl);
        } else {
            if (next.size >= 3) {
                toast({ title: "Limit Reached", description: "You can select up to 3 competitors for the pilot.", variant: "warning" });
                return;
            }
            next.add(menuUrl);
        }
        setSelected(next);
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            const selectedCompetitors = results.filter(r => selected.has(r.menuUrl));
            await finalizeCompetitorSetup(selectedCompetitors);
            toast({
                title: "Intelligence Activated",
                description: "Ezal is scanning these menus. Your first report will be ready shortly.",
            });
            setOpen(false);
        } catch (error) {
            toast({
                title: "Setup failed",
                description: "Could not save configuration.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (hasCompetitors && !open) return (
        <Button variant="outline" onClick={() => { setStep(1); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Competitors
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {!hasCompetitors && (
                    <Button variant="default" size="lg" className="animate-pulse shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 border-0">
                         <Search className="mr-2 h-4 w-4" /> Activate Competitor Intel
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Setup Competitive Intelligence</DialogTitle>
                    <DialogDescription>
                        {step === 1 ? "Enter your location to find nearby competitors." : "Select up to 3 main competitors to track."}
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="zip" className="text-right">ZIP Code</Label>
                            <Input 
                                id="zip" 
                                value={zip} 
                                onChange={(e) => setZip(e.target.value)} 
                                className="col-span-3" 
                                placeholder="e.g. 90210"
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="max-h-[300px] overflow-y-auto space-y-2 py-2">
                        {results.length === 0 ? (
                            <div className="text-center text-muted-foreground py-4">No results found.</div>
                        ) : (
                            results.map((comp, i) => (
                                <div 
                                    key={i} 
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selected.has(comp.menuUrl) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                                    onClick={() => toggleSelection(comp.menuUrl)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                            <Store className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{comp.name}</div>
                                            <div className="text-xs text-muted-foreground">{comp.address}</div>
                                        </div>
                                    </div>
                                    {selected.has(comp.menuUrl) && (
                                        <Check className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                <DialogFooter>
                    {step === 1 ? (
                        <Button onClick={handleSearch} disabled={!zip || loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Find Competitors
                        </Button>
                    ) : (
                        <div className="flex w-full justify-between">
                             <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                             <Button onClick={handleFinish} disabled={selected.size === 0 || loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Start Tracking ({selected.size})
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
