import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { setupBrandAndCompetitors } from '@/server/actions/brand-setup';
import { getBrandStatus } from '@/app/dashboard/products/actions';
import { checkSlugAvailability, getBrandSlug, reserveSlug } from '@/server/actions/slug-management';
import { Loader2, Store, Target, MapPin, CheckCircle2, Lock, Globe, AlertCircle, Check, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/use-user-role';
import { Switch } from '@/components/ui/switch';

export default function BrandSetupTab() {
    const { role, brandId, orgId } = useUserRole();
    // Use orgId which works for both brand and dispensary users
    // (brandId is null for dispensary_admin; orgId covers currentOrgId | brandId | locationId)
    const effectiveOrgId = orgId || brandId;
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [status, setStatus] = useState<any>(null);
    const { toast } = useToast();
    
    // Slug management state
    const [slug, setSlug] = useState('');
    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [slugSuggestion, setSlugSuggestion] = useState<string | null>(null);
    const [existingSlug, setExistingSlug] = useState<string | null>(null);
    
    // Vertically integrated state (brand owns dispensaries)
    const [isVerticallyIntegrated, setIsVerticallyIntegrated] = useState(false);

    useEffect(() => {
        getBrandStatus().then(setStatus);
        // Load existing slug if org has one (works for both brand and dispensary users)
        if (effectiveOrgId) {
            getBrandSlug(effectiveOrgId).then((s) => {
                if (s) {
                    setExistingSlug(s);
                    setSlug(s);
                    setSlugStatus('available');
                }
            });
        }
    }, [effectiveOrgId]);
    
    // Debounced slug availability check
    useEffect(() => {
        if (!slug || slug.length < 3 || slug === existingSlug) {
            setSlugStatus(slug === existingSlug ? 'available' : 'idle');
            return;
        }

        setSlugStatus('checking');
        const timeout = setTimeout(async () => {
            // Pass effectiveOrgId so the server can check ownership
            // (avoids "taken" false-positive for users re-confirming their own slug)
            const result = await checkSlugAvailability(slug, effectiveOrgId ?? undefined);
            setSlugStatus(result.available ? 'available' : 'taken');
            setSlugSuggestion(result.suggestion || null);
        }, 500);

        return () => clearTimeout(timeout);
    }, [slug, existingSlug, effectiveOrgId]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setResult(null);

        const formData = new FormData(e.currentTarget);

        try {
            // Reserve the slug if one is set and available
            if (slug && slug.length >= 3 && effectiveOrgId &&
                (slugStatus === 'available' || slug === existingSlug)) {
                await reserveSlug(slug, effectiveOrgId);
            }

            const response = await setupBrandAndCompetitors(formData);
            if (response.success) {
                setResult(response);
                toast({
                    title: `${role === 'dispensary' ? 'Dispensary' : 'Brand'} Setup Complete`,
                    description: `Added ${role === 'dispensary' ? 'dispensary' : 'brand'} and auto-discovered ${response.competitors?.length || 0} competitors.`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Setup Failed",
                    description: response.error || "An unknown error occurred.",
                });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Setup Failed",
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    }

    if (result) {
        return (
            <Card className="border-emerald-100 bg-emerald-50/10">
                <CardHeader>
                    <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <CardTitle>Setup Complete</CardTitle>
                    </div>
                    <CardDescription>
                        Your {role === 'dispensary' ? 'dispensary' : 'brand'} is now linked and competitive intel is populating.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-white border border-emerald-100 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{role === 'dispensary' ? 'Dispensary' : 'Brand'} ID:</span>
                            <Badge variant="outline" className="font-mono">{result.brandId}</Badge>
                        </div>
                        <div className="space-y-2">
                            <span className="text-sm font-medium">Auto-Discovered Competitors:</span>
                            <div className="grid grid-cols-1 gap-2">
                                {result.competitors.map((c: any) => (
                                    <div key={c.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                                        <div className="flex items-center gap-2">
                                            <Target className="h-3 w-3 text-blue-500" />
                                            <span>{c.name}</span>
                                        </div>
                                        <span className="text-muted-foreground">{c.city}, {c.state}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setResult(null)}>
                        Update Settings
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    <CardTitle>{role === 'dispensary' ? 'Dispensary' : 'Brand'} Identity & Intel</CardTitle>
                </div>
                <CardDescription>
                    Manually link your {role === 'dispensary' ? 'dispensary' : 'brand'} and automatically discover top competitors based on your primary market.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="brandName">{role === 'dispensary' ? 'Dispensary' : 'Brand'} Name</Label>
                                {status?.nameLocked && (
                                    <Badge variant="secondary" className="h-5 text-[10px] gap-1 bg-amber-50 text-amber-700 hover:bg-amber-50">
                                        <Lock className="h-3 w-3" />
                                        Locked
                                    </Badge>
                                )}
                            </div>
                            <Input
                                id="brandName"
                                name="brandName"
                                placeholder="e.g. Wyld, Kiva, Cresco"
                                required
                                disabled={status?.nameLocked}
                                defaultValue={status?.brandName}
                                data-testid="brand-name-input"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                {status?.nameLocked
                                    ? `${role === 'dispensary' ? 'Dispensary' : 'Brand'} name is locked because products have been linked. Contact Admin to change.`
                                    : `Use your official ${role === 'dispensary' ? 'dispensary' : 'brand'} name as it appears in retailer menus.`}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="zipCode" className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                Primary Market ZIP Code
                            </Label>
                            <Input
                                id="zipCode"
                                name="zipCode"
                                placeholder="60601"
                                pattern="[0-9]{5}"
                                required
                                data-testid="zip-code-input"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Used to find nearby retailers and competitive shelf share.
                            </p>
                        </div>
                    </div>
                    
                    {/* Custom Menu URL Section */}
                    <div className="space-y-2">
                        <Label htmlFor="slug" className="flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            Custom Menu URL
                        </Label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">bakedbot.ai/</span>
                            <div className="relative flex-1">
                                <Input
                                    id="slug"
                                    name="slug"
                                    placeholder="your-brand"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                    className={slugStatus === 'taken' ? 'border-red-300 pr-10' : slugStatus === 'available' ? 'border-green-300 pr-10' : 'pr-10'}
                                    data-testid="slug-input"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                    {slugStatus === 'available' && <Check className="h-4 w-4 text-green-600" />}
                                    {slugStatus === 'taken' && <AlertCircle className="h-4 w-4 text-red-500" />}
                                </div>
                            </div>
                        </div>
                        {slugStatus === 'taken' && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                This URL is taken.{slugSuggestion && <button type="button" className="underline" onClick={() => setSlug(slugSuggestion)}>Try {slugSuggestion}</button>}
                            </p>
                        )}
                        {slugStatus === 'available' && slug.length >= 3 && (
                            <p className="text-xs text-green-600 flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                bakedbot.ai/{slug} is available!
                            </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                            This is where your headless menu will live. Customers will find you at bakedbot.ai/{slug || 'your-brand'}
                        </p>
                    </div>
                    
                    {/* Vertically Integrated Toggle */}
                    {role === 'brand' && (
                        <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <Label htmlFor="vertically-integrated" className="text-sm font-medium">
                                        Vertically Integrated
                                    </Label>
                                </div>
                                <Switch
                                    id="vertically-integrated"
                                    checked={isVerticallyIntegrated}
                                    onCheckedChange={setIsVerticallyIntegrated}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Enable if your brand owns or operates retail dispensary locations.
                            </p>
                            {isVerticallyIntegrated && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mt-2">
                                    <p className="text-xs text-amber-800">
                                        <strong>POS Integration Available</strong>: As a vertically integrated operator, 
                                        you can connect your dispensary POS system for real-time inventory sync. 
                                        Configure this in Settings → Integrations.
                                    </p>
                                </div>
                            )}
                            <input type="hidden" name="isVerticallyIntegrated" value={isVerticallyIntegrated ? 'true' : 'false'} />
                        </div>
                    )}

                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg">
                        <h4 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Ezal Auto-Discovery
                        </h4>
                        <p className="text-xs text-blue-800/70">
                            {role === 'dispensary'
                                ? 'By clicking "Save & Discover", our AI will automatically find nearby dispensaries in your market and set up competitive pricing intelligence.'
                                : 'By clicking "Save & Discover", our AI will automatically pull in the top 3 competitors dominating your primary ZIP code and set up your performance tracking indexes.'}
                        </p>
                    </div>

                    <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyzing Market...
                            </>
                        ) : (
                            "Save & Discover Competitors"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
