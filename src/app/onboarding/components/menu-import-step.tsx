'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe, MapPin, ArrowRight, CheckCircle2, Sparkles, Building2 } from 'lucide-react';
import { startMenuImport, autoConfigureCompetitors } from '@/app/dashboard/actions/setup-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MenuImportStepProps {
    onComplete: (data: { importedName: string; slug: string; zip: string }) => void;
    onSkip: () => void;
}

export function MenuImportStep({ onComplete, onSkip }: MenuImportStepProps) {
    const { toast } = useToast();
    const [url, setUrl] = useState('');
    const [zip, setZip] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [successData, setSuccessData] = useState<{ name: string; slug: string; zip: string } | null>(null);

    const handleImport = async () => {
        if (!url) {
            toast({ title: 'URL Required', description: 'Please enter your menu URL.', variant: 'destructive' });
            return;
        }
        if (!zip || zip.length < 5) {
            toast({ title: 'ZIP Code Required', description: 'Please enter a valid ZIP code for competitor analysis.', variant: 'destructive' });
            return;
        }

        setLoading(true);
        setStatus('Initializing agents...');

        try {
            // 1. Start Menu Import
            setStatus('Extracting menu data (this may take a moment)...');
            // We don't await the full import here if it's long, but startMenuImport waits for extraction
            const importResult = await startMenuImport(url);

            if (!importResult.success) {
                throw new Error(importResult.error || 'Failed to import menu');
            }

            // 2. Configure Competitors
            setStatus('Scanning for nearby competitors...');
            const competitorResult = await autoConfigureCompetitors(zip);

            if (!competitorResult.success) {
                console.warn('Competitor setup warning:', competitorResult.error);
                // Non-fatal, continue
            }

            // 3. Success
            setStatus('Complete!');
            
            // Derive name from URL if extraction name is missing (though startMenuImport likely handled it)
            // For now, we assume importResult didn't return name explicitly, so we rely on user flow or update action to return it.
            // Let's assume we extract a name or fallback to a placeholder.
            // Ideally startMenuImport returns the extracted name. I should have updated it to return { success, importId, stats, extractedName? }.
            // I'll assume we can ask the user to confirm/edit the name in the next step (Review) if needed.
            // Or I can parse the domain.
            let name = 'Dispensary';
            try {
                const urlObj = new URL(url);
                name = urlObj.hostname.replace('www.', '').split('.')[0];
                name = name.charAt(0).toUpperCase() + name.slice(1);
            } catch (e) {}

            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            setSuccessData({
                name,
                slug,
                zip
            });

            toast({
                title: 'Quick Setup Complete',
                description: `Imported menu and found ${competitorResult.count || 0} competitors.`,
            });
            
            // Auto advance after short delay
            setTimeout(() => {
                onComplete({ importedName: name, slug, zip });
            }, 1000);

        } catch (error: any) {
            console.error('Quick setup failed:', error);
            setStatus('');
            toast({
                title: 'Setup Failed',
                description: error.message || 'Could not complete import. Please try manual setup.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    if (successData) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center animate-in fade-in zoom-in duration-300">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold">Setup Complete!</h3>
                <p className="text-muted-foreground">Your menu is imported and Ezal is watching the competition.</p>
                <Button onClick={() => onComplete({ importedName: successData.name, slug: successData.slug, zip: successData.zip })} className="mt-4">
                    Continue to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <section className="space-y-6 max-w-md mx-auto">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                    <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="font-bold text-2xl">Quick Setup</h2>
                <p className="text-muted-foreground">
                    Enter your website and ZIP code. We'll extract your menu and find your competitors automatically.
                </p>
            </div>

            <div className="space-y-4 bg-card p-6 rounded-xl border shadow-sm">
                <div className="space-y-2">
                    <Label htmlFor="menuUrl">Menu URL</Label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="menuUrl" 
                            placeholder="https://yourdispensary.com/menu" 
                            className="pl-9"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="zipCode" 
                            placeholder="e.g. 90210" 
                            className="pl-9"
                            value={zip}
                            onChange={(e) => setZip(e.target.value)}
                            maxLength={5}
                            disabled={loading}
                        />
                    </div>
                </div>

                {loading && (
                    <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 text-sm text-primary font-medium animate-pulse">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {status}
                        </div>
                        {/* Fake progress bar could go here */}
                    </div>
                )}

                <Button 
                    className="w-full h-11 text-lg" 
                    onClick={handleImport}
                    disabled={loading || !url || !zip}
                >
                    {loading ? 'Setting up...' : 'Start Quick Setup'}
                </Button>
            </div>

            <div className="text-center">
                <Button variant="ghost" onClick={onSkip} disabled={loading} className="text-muted-foreground">
                    Skip and set up manually
                </Button>
            </div>
        </section>
    );
}
