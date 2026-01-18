'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Store, Check, Plus, Search, MapPin, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { searchLocalCompetitors, searchLeaflyCompetitors, finalizeCompetitorSetup } from '../actions/setup';
import { useUserRole } from '@/hooks/use-user-role';

interface CompetitorSetupWizardProps {
    hasCompetitors: boolean;
    overrideRole?: 'brand' | 'dispensary'; // Explicit role override
}

export function CompetitorSetupWizard({ hasCompetitors, overrideRole }: CompetitorSetupWizardProps) {
    const { role: userRole } = useUserRole();
    const searchType = overrideRole || (userRole === 'brand' ? 'brand' : 'dispensary');
    const [open, setOpen] = useState(!hasCompetitors);
    const [step, setStep] = useState(1);
    
    // Search Inputs
    const [mode, setMode] = useState<'zip' | 'city'>('city');
    const [zip, setZip] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const { toast } = useToast();

    const handleSearch = async () => {
        if (mode === 'zip' && !zip) return;
        if (mode === 'city' && (!city || !state)) return;

        setLoading(true);
        setResults([]);
        try {
            let competitors = [];
            if (mode === 'zip') {
                competitors = await searchLocalCompetitors(zip);
            } else {
                competitors = await searchLeaflyCompetitors(city, state);
            }
            setResults(competitors);
            setStep(2);
        } catch (error) {
            toast({
                title: "Search failed",
                description: "Could not find local dispensaries. Please try again.",
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
            if (next.size >= 5) { // Bumped to 5
                toast({ title: "Limit Reached", description: "You can select up to 5 competitors." });
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
                description: `Ezal is now tracking ${selectedCompetitors.length} competitors.`,
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
                        {step === 1 
                            ? `Where are your ${searchType === 'brand' ? 'competing brands' : 'competitor dispensaries'} located?` 
                            : `Select ${searchType === 'brand' ? 'brands' : 'dispensaries'} to track.`}
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="py-4">
                        <Tabs defaultValue="city" onValueChange={(v) => setMode(v as 'city' | 'zip')}>
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="city">BakedBot Discovery</TabsTrigger>
                                <TabsTrigger value="zip">ZIP Search (Direct)</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="city" className="space-y-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">City</Label>
                                    <Input 
                                        value={city} 
                                        onChange={(e) => setCity(e.target.value)} 
                                        className="col-span-3" 
                                        placeholder="Chicago"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">State</Label>
                                    <Input 
                                        value={state} 
                                        onChange={(e) => setState(e.target.value.toUpperCase())} 
                                        className="col-span-3" 
                                        placeholder="IL"
                                        maxLength={2}
                                    />
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="zip" className="space-y-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">ZIP Code</Label>
                                    <Input 
                                        value={zip} 
                                        onChange={(e) => setZip(e.target.value)} 
                                        className="col-span-3" 
                                        placeholder="e.g. 60601"
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}

                {step === 2 && (
                    <div className="max-h-[300px] overflow-y-auto space-y-2 py-2">
                        {results.length === 0 ? (
                            <div className="text-center text-muted-foreground py-4">
                                No results found in this area.
                            </div>
                        ) : (
                            results.map((comp, i) => (
                                <div 
                                    key={i} 
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selected.has(comp.menuUrl) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                                    onClick={() => toggleSelection(comp.menuUrl)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                            <Store className="h-4 w-4" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="font-medium text-sm truncate">{comp.name}</div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {comp.address || `${comp.city}, ${comp.state}`}
                                            </div>
                                        </div>
                                    </div>
                                    {selected.has(comp.menuUrl) && (
                                        <Check className="h-4 w-4 text-primary shrink-0" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                <DialogFooter>
                    {step === 1 ? (
                        <Button onClick={handleSearch} disabled={loading || (mode === 'zip' ? !zip : (!city || !state))}>
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
