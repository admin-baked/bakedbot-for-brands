'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, Circle, ChevronRight, Store, MapPin, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export function SetupChecklist() {
    const { toast } = useToast();
    const [steps, setSteps] = useState([
        { id: 'pos', title: 'Connect Point of Sale', status: 'pending', icon: Store, desc: 'Sync inventory in real-time' },
        { id: 'competitors', title: 'Track Competitors', status: 'pending', icon: MapPin, desc: 'Monitor local pricing & menus' },
        { id: 'features', title: 'Enable AI Features', status: 'pending', icon: Zap, desc: 'Headless Menu & Budtender' }
    ]);
    const [activeStep, setActiveStep] = useState<string | null>(null);

    // POS State
    const [posConfig, setPosConfig] = useState<{ provider: 'dutchie' | 'jane' | 'none', apiKey: string, id: string }>({ provider: 'none', apiKey: '', id: '' });

    // Competitor State
    const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
    
    // Feature State
    const [features, setFeatures] = useState<{ headless: boolean; budtender: boolean }>({ headless: true, budtender: true });

    const handleComplete = (id: string) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, status: 'completed' } : s));
        setActiveStep(null);
        toast({ title: 'Step Completed', description: 'Your workspace is updating...' });
    };

    const renderPOSStep = () => (
        <div className="space-y-4 pt-4 border-t animate-in slide-in-from-top-2">
             <div className="grid gap-4 sm:grid-cols-3">
                <div
                  className={`p-4 border rounded-xl cursor-pointer text-center transition-all ${posConfig.provider === 'dutchie' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setPosConfig({ ...posConfig, provider: 'dutchie' })}
                >
                  <span className="font-bold block mb-1">Dutchie</span>
                  <span className="text-xs text-muted-foreground">API Key</span>
                </div>
                <div
                  className={`p-4 border rounded-xl cursor-pointer text-center transition-all ${posConfig.provider === 'jane' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setPosConfig({ ...posConfig, provider: 'jane' })}
                >
                  <span className="font-bold block mb-1">Jane</span>
                  <span className="text-xs text-muted-foreground">Shop ID</span>
                </div>
                <div
                  className={`p-4 border rounded-xl cursor-pointer text-center transition-all ${posConfig.provider === 'none' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setPosConfig({ ...posConfig, provider: 'none' })}
                >
                  <span className="font-bold block mb-1">Skip</span>
                </div>
              </div>

              {posConfig.provider === 'dutchie' && (
                <Input 
                    placeholder="Enter Dutchie API Key" 
                    type="password"
                    value={posConfig.apiKey} 
                    onChange={e => setPosConfig({ ...posConfig, apiKey: e.target.value })} 
                />
              )}
               {posConfig.provider === 'jane' && (
                <Input 
                    placeholder="Enter Jane Shop ID" 
                    value={posConfig.id} 
                    onChange={e => setPosConfig({ ...posConfig, id: e.target.value })} 
                />
              )}

              <Button onClick={() => handleComplete('pos')} className="w-full">Save Connection</Button>
        </div>
    );

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Setup Checklist</CardTitle>
                <CardDescription>Complete these steps to fully activate your agent.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
                {steps.map((step) => (
                    <div key={step.id} className="border rounded-lg p-3 overflow-hidden transition-all">
                        <div 
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                        >
                            {step.status === 'completed' ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className="flex-1">
                                <h4 className={`font-medium text-sm ${step.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{step.title}</h4>
                                <p className="text-xs text-muted-foreground">{step.desc}</p>
                            </div>
                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${activeStep === step.id ? 'rotate-90' : ''}`} />
                        </div>
                        
                        {activeStep === step.id && step.id === 'pos' && renderPOSStep()}
                        {activeStep === step.id && step.id === 'competitors' && (
                            <div className="pt-4 border-t mt-3">
                                <p className="text-sm text-muted-foreground mb-3">Adding competitors helps Ezal track pricing.</p>
                                <Button onClick={() => handleComplete('competitors')} variant="outline" className="w-full">Open Map Selector</Button>
                            </div>
                        )}
                        {activeStep === step.id && step.id === 'features' && (
                            <div className="pt-4 border-t mt-3">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm">Headless Menu</span>
                                    <Button size="sm" variant={features.headless ? 'default' : 'outline'} onClick={() => setFeatures(f => ({...f, headless: !f.headless}))}>
                                        {features.headless ? 'Enabled' : 'Enable'}
                                    </Button>
                                </div>
                                <Button onClick={() => handleComplete('features')} className="w-full">Save Features</Button>
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
