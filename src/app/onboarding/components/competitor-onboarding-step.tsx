'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Store, Check, Plus, Search, MapPin, Building2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { searchLocalCompetitors, searchLeaflyCompetitors } from '@/app/dashboard/intelligence/actions/setup';
import { Spinner } from '@/components/ui/spinner';

interface CompetitorOnboardingStepProps {
    role: 'brand' | 'dispensary';
    marketState: string;
    selectedCompetitors: any[];
    onToggleCompetitor: (competitor: any) => void;
    onBack: () => void;
    onContinue: () => void;
}

export function CompetitorOnboardingStep({
    role,
    marketState,
    selectedCompetitors,
    onToggleCompetitor,
    onBack,
    onContinue
}: CompetitorOnboardingStepProps) {
    const [mode, setMode] = useState<'zip' | 'city'>('city');
    const [zip, setZip] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState(marketState);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const { toast } = useToast();

    const searchType = role === 'brand' ? 'brand' : 'dispensary';

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
        } catch (error) {
            toast({
                title: "Search failed",
                description: `Could not find ${searchType === 'brand' ? 'brands' : 'dispensaries'}. Please try again.`,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const isSelected = (id: string) => selectedCompetitors.some(c => c.id === id);

    return (
        <section className="space-y-6">
            <div className="text-center space-y-2">
                <h2 className="font-bold text-2xl">Competitive Intelligence</h2>
                <p className="text-muted-foreground">
                    Select up to 5 {searchType === 'brand' ? 'brands' : 'dispensaries'} to track in your market.
                </p>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border space-y-4">
                <Tabs defaultValue="city" onValueChange={(v) => setMode(v as 'city' | 'zip')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="city">BakedBot Discovery</TabsTrigger>
                        <TabsTrigger value="zip">ZIP Search</TabsTrigger>
                    </TabsList>
                    
                    <div className="pt-4 space-y-4">
                        {mode === 'city' ? (
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Input 
                                        value={city} 
                                        onChange={(e) => setCity(e.target.value)} 
                                        placeholder="City (e.g. Chicago)"
                                        data-testid="city-input"
                                    />
                                </div>
                                <div className="w-24">
                                    <Input 
                                        value={state} 
                                        onChange={(e) => setState(e.target.value.toUpperCase())} 
                                        placeholder="State"
                                        maxLength={2}
                                        data-testid="state-input"
                                    />
                                </div>
                                <Button onClick={handleSearch} disabled={loading} size="icon" aria-label="Search">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Input 
                                    value={zip} 
                                    onChange={(e) => setZip(e.target.value)} 
                                    placeholder="Enter ZIP Code"
                                    data-testid="zip-input"
                                />
                                <Button onClick={handleSearch} disabled={loading} size="icon" aria-label="Search">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </div>
                        )}
                    </div>
                </Tabs>

                {results.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {results.map((comp) => {
                            const selected = isSelected(comp.id);
                            return (
                                <button
                                    key={comp.id}
                                    onClick={() => onToggleCompetitor(comp)}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                                        selected 
                                            ? 'bg-primary/5 border-primary shadow-sm' 
                                            : 'bg-background hover:border-primary/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${selected ? 'bg-primary/20' : 'bg-muted'}`}>
                                            {searchType === 'brand' ? (
                                                <Package className={`h-4 w-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                                            ) : (
                                                <Store className={`h-4 w-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <div className="font-medium text-sm">{comp.name}</div>
                                            <div className="text-xs text-muted-foreground">{comp.city}, {comp.state}</div>
                                        </div>
                                    </div>
                                    {selected ? (
                                        <Check className="h-4 w-4 text-primary" />
                                    ) : (
                                        <Plus className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {loading && (
                    <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                        <Spinner size="lg" className="mb-4" />
                        <p className="text-sm">Scanning {marketState} market...</p>
                    </div>
                )}
            </div>

            {selectedCompetitors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedCompetitors.map(comp => (
                        <div key={comp.id} className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            {comp.name}
                            <button onClick={() => onToggleCompetitor(comp)} className="hover:text-primary/70">
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="ghost" onClick={onBack}>Back</Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onContinue}>
                        {selectedCompetitors.length === 0 ? 'Skip for now' : 'Continue'}
                    </Button>
                </div>
            </div>
        </section>
    );
}
