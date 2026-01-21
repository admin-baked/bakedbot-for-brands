'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { setupPilotCustomer, addPilotProducts, type BrandPilotConfig, type DispensaryPilotConfig } from '@/server/actions/pilot-setup';
import { Loader2, Rocket, Store, Building2, CheckCircle, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

// Default sample products for dispensaries
const DEFAULT_DISPENSARY_PRODUCTS = [
    { name: 'Blue Dream', category: 'Flower', price: 35, brandName: 'Local Grower', thcPercent: 22, weight: '3.5g' },
    { name: 'OG Kush', category: 'Flower', price: 40, brandName: 'Local Grower', thcPercent: 25, weight: '3.5g' },
    { name: 'Gorilla Glue', category: 'Flower', price: 45, brandName: 'Premium Farms', thcPercent: 28, weight: '3.5g' },
    { name: 'THC Gummies 10pk', category: 'Edibles', price: 25, brandName: 'Sweet Leaf', weight: '100mg' },
    { name: 'Live Resin Cart', category: 'Vaporizers', price: 50, brandName: 'Extract Co', thcPercent: 85, weight: '1g' },
    { name: 'Pre-Roll 5pk', category: 'Pre-Rolls', price: 30, brandName: 'Roll Masters', thcPercent: 20, weight: '3.5g' },
];

// Default sample products for brands (hemp/edibles)
const DEFAULT_BRAND_PRODUCTS = [
    { name: 'Premium Gummies', category: 'Edibles', price: 29.99, description: 'Delicious hemp gummies', weight: '10 pieces', featured: true },
    { name: 'CBD Tincture', category: 'Tinctures', price: 49.99, description: 'Full spectrum CBD oil', weight: '30ml' },
    { name: 'Delta-8 Vape', category: 'Vaporizers', price: 39.99, description: 'Smooth delta-8 cartridge', weight: '1g' },
];

export default function PilotSetupTab() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [setupResult, setSetupResult] = useState<{
        success: boolean;
        userId?: string;
        brandId?: string;
        menuUrl?: string;
        email?: string;
        password?: string;
    } | null>(null);

    // Brand form state
    const [brandForm, setBrandForm] = useState<BrandPilotConfig>({
        type: 'brand',
        email: '',
        password: 'Smokey123!!@@',
        brandName: '',
        brandSlug: '',
        tagline: '',
        description: '',
        website: '',
        primaryColor: '#16a34a',
        secondaryColor: '#000000',
        accentColor: '#FFFFFF',
        purchaseModel: 'online_only',
        shipsNationwide: true,
        shippingAddress: {
            street: '',
            city: '',
            state: '',
            zip: '',
        },
        contactEmail: '',
        contactPhone: '',
        chatbotEnabled: true,
        chatbotName: 'Smokey',
        chatbotWelcome: '',
    });

    // Dispensary form state
    const [dispensaryForm, setDispensaryForm] = useState<DispensaryPilotConfig>({
        type: 'dispensary',
        email: '',
        password: 'Smokey123!!@@',
        dispensaryName: '',
        dispensarySlug: '',
        tagline: '',
        description: '',
        website: '',
        primaryColor: '#16a34a',
        secondaryColor: '#000000',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        licenseNumber: '',
        chatbotEnabled: true,
        chatbotName: 'Smokey',
        chatbotWelcome: '',
        zipCodes: [],
    });

    const [addSampleProducts, setAddSampleProducts] = useState(true);
    const [zipInput, setZipInput] = useState('');

    // Auto-generate slug from name
    const generateSlug = (name: string) => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '').substring(0, 30);
    };

    // Auto-generate email from slug
    const generateEmail = (slug: string) => {
        return `${slug}@bakedbot.ai`;
    };

    const handleBrandSubmit = async () => {
        if (!brandForm.brandName || !brandForm.brandSlug) {
            toast({ variant: 'destructive', title: 'Error', description: 'Brand name and slug are required' });
            return;
        }

        setIsLoading(true);
        try {
            const result = await setupPilotCustomer({
                ...brandForm,
                email: brandForm.email || generateEmail(brandForm.brandSlug),
                chatbotWelcome: brandForm.chatbotWelcome || `Hey! I'm ${brandForm.chatbotName || 'Smokey'}. Looking for premium products? I can help you find exactly what you need!`,
            });

            if (result.success && result.data) {
                // Add sample products if enabled
                if (addSampleProducts) {
                    await addPilotProducts(result.data.brandId, DEFAULT_BRAND_PRODUCTS);
                }

                setSetupResult({
                    success: true,
                    userId: result.data.userId,
                    brandId: result.data.brandId,
                    menuUrl: result.data.menuUrl,
                    email: brandForm.email || generateEmail(brandForm.brandSlug),
                    password: brandForm.password,
                });

                toast({ title: 'Success!', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to create pilot' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: String(error) });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDispensarySubmit = async () => {
        if (!dispensaryForm.dispensaryName || !dispensaryForm.dispensarySlug) {
            toast({ variant: 'destructive', title: 'Error', description: 'Dispensary name and slug are required' });
            return;
        }

        setIsLoading(true);
        try {
            const result = await setupPilotCustomer({
                ...dispensaryForm,
                email: dispensaryForm.email || generateEmail(dispensaryForm.dispensarySlug),
                chatbotWelcome: dispensaryForm.chatbotWelcome || `Hey! I'm ${dispensaryForm.chatbotName || 'Smokey'}, your AI budtender. Looking for something specific? I can help you find the perfect product!`,
            });

            if (result.success && result.data) {
                // Add sample products if enabled
                if (addSampleProducts) {
                    await addPilotProducts(result.data.brandId, DEFAULT_DISPENSARY_PRODUCTS);
                }

                setSetupResult({
                    success: true,
                    userId: result.data.userId,
                    brandId: result.data.brandId,
                    menuUrl: result.data.menuUrl,
                    email: dispensaryForm.email || generateEmail(dispensaryForm.dispensarySlug),
                    password: dispensaryForm.password,
                });

                toast({ title: 'Success!', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to create pilot' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: String(error) });
        } finally {
            setIsLoading(false);
        }
    };

    const addZipCode = () => {
        if (zipInput && !dispensaryForm.zipCodes?.includes(zipInput)) {
            setDispensaryForm({
                ...dispensaryForm,
                zipCodes: [...(dispensaryForm.zipCodes || []), zipInput],
            });
            setZipInput('');
        }
    };

    const removeZipCode = (zip: string) => {
        setDispensaryForm({
            ...dispensaryForm,
            zipCodes: dispensaryForm.zipCodes?.filter(z => z !== zip) || [],
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied!', description: 'Copied to clipboard' });
    };

    // Success view
    if (setupResult?.success) {
        return (
            <div className="space-y-6">
                <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <CardTitle className="text-green-900">Pilot Customer Created!</CardTitle>
                                <CardDescription className="text-green-700">
                                    The pilot account is ready to use
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-green-700">Login Email</Label>
                                <div className="flex items-center gap-2">
                                    <Input value={setupResult.email} readOnly className="bg-white" />
                                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(setupResult.email || '')}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-green-700">Password</Label>
                                <div className="flex items-center gap-2">
                                    <Input value={setupResult.password} readOnly className="bg-white" />
                                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(setupResult.password || '')}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-green-700">Menu URL</Label>
                            <div className="flex items-center gap-2">
                                <Input value={setupResult.menuUrl} readOnly className="bg-white" />
                                <Button size="icon" variant="outline" onClick={() => copyToClipboard(setupResult.menuUrl || '')}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Link href={setupResult.menuUrl || ''} target="_blank">
                                    <Button size="icon" variant="outline">
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-green-200">
                            <p className="text-sm text-green-700 mb-2">IDs for reference:</p>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">User: {setupResult.userId}</Badge>
                                <Badge variant="secondary">Brand: {setupResult.brandId}</Badge>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => setSetupResult(null)} variant="outline" className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Another Pilot
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Pilot Setup</h2>
                    <p className="text-muted-foreground">
                        Quickly launch pilot customers for brands and dispensaries
                    </p>
                </div>
                <Badge variant="secondary" className="gap-1">
                    <Rocket className="h-3 w-3" />
                    Empire Plan (Free Pilot)
                </Badge>
            </div>

            <Tabs defaultValue="dispensary" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="dispensary" className="gap-2">
                        <Store className="h-4 w-4" />
                        Dispensary
                    </TabsTrigger>
                    <TabsTrigger value="brand" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Brand (Hemp/E-Commerce)
                    </TabsTrigger>
                </TabsList>

                {/* Dispensary Form */}
                <TabsContent value="dispensary" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>New Dispensary Pilot</CardTitle>
                            <CardDescription>
                                Set up a dispensary with local pickup, Smokey AI, and ZIP code SEO pages
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="dispName">Dispensary Name *</Label>
                                    <Input
                                        id="dispName"
                                        placeholder="e.g., Thrive Syracuse"
                                        value={dispensaryForm.dispensaryName}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            setDispensaryForm({
                                                ...dispensaryForm,
                                                dispensaryName: name,
                                                dispensarySlug: generateSlug(name),
                                            });
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dispSlug">URL Slug *</Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">bakedbot.ai/</span>
                                        <Input
                                            id="dispSlug"
                                            placeholder="thrivesyracuse"
                                            value={dispensaryForm.dispensarySlug}
                                            onChange={(e) => setDispensaryForm({ ...dispensaryForm, dispensarySlug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Location */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-4">Location</h4>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="dispAddress">Street Address</Label>
                                        <Input
                                            id="dispAddress"
                                            placeholder="123 Main St"
                                            value={dispensaryForm.address}
                                            onChange={(e) => setDispensaryForm({ ...dispensaryForm, address: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dispCity">City</Label>
                                        <Input
                                            id="dispCity"
                                            placeholder="Syracuse"
                                            value={dispensaryForm.city}
                                            onChange={(e) => setDispensaryForm({ ...dispensaryForm, city: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="dispState">State</Label>
                                            <Input
                                                id="dispState"
                                                placeholder="NY"
                                                value={dispensaryForm.state}
                                                onChange={(e) => setDispensaryForm({ ...dispensaryForm, state: e.target.value.toUpperCase() })}
                                                maxLength={2}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="dispZip">ZIP</Label>
                                            <Input
                                                id="dispZip"
                                                placeholder="13224"
                                                value={dispensaryForm.zip}
                                                onChange={(e) => setDispensaryForm({ ...dispensaryForm, zip: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dispPhone">Phone</Label>
                                        <Input
                                            id="dispPhone"
                                            placeholder="315-555-0100"
                                            value={dispensaryForm.phone}
                                            onChange={(e) => setDispensaryForm({ ...dispensaryForm, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dispLicense">License Number</Label>
                                        <Input
                                            id="dispLicense"
                                            placeholder="OCM-XXX-XXXX"
                                            value={dispensaryForm.licenseNumber}
                                            onChange={(e) => setDispensaryForm({ ...dispensaryForm, licenseNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Theme */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-4">Theme Colors</h4>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="dispPrimary">Primary Color</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                id="dispPrimary"
                                                value={dispensaryForm.primaryColor}
                                                onChange={(e) => setDispensaryForm({ ...dispensaryForm, primaryColor: e.target.value })}
                                                className="h-10 w-14 rounded border cursor-pointer"
                                            />
                                            <Input
                                                value={dispensaryForm.primaryColor}
                                                onChange={(e) => setDispensaryForm({ ...dispensaryForm, primaryColor: e.target.value })}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dispSecondary">Secondary Color</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                id="dispSecondary"
                                                value={dispensaryForm.secondaryColor}
                                                onChange={(e) => setDispensaryForm({ ...dispensaryForm, secondaryColor: e.target.value })}
                                                className="h-10 w-14 rounded border cursor-pointer"
                                            />
                                            <Input
                                                value={dispensaryForm.secondaryColor}
                                                onChange={(e) => setDispensaryForm({ ...dispensaryForm, secondaryColor: e.target.value })}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ZIP Code Pages */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-4">ZIP Code SEO Pages</h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Create SEO pages for nearby ZIP codes (Empire plan includes unlimited)
                                </p>
                                <div className="flex items-center gap-2 mb-4">
                                    <Input
                                        placeholder="Enter ZIP code"
                                        value={zipInput}
                                        onChange={(e) => setZipInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addZipCode()}
                                        maxLength={5}
                                        className="w-32"
                                    />
                                    <Button type="button" variant="outline" onClick={addZipCode}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {dispensaryForm.zipCodes?.map((zip) => (
                                        <Badge key={zip} variant="secondary" className="gap-1">
                                            {zip}
                                            <button onClick={() => removeZipCode(zip)} className="ml-1 hover:text-destructive">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                    {(!dispensaryForm.zipCodes || dispensaryForm.zipCodes.length === 0) && (
                                        <span className="text-sm text-muted-foreground">No ZIP codes added yet</span>
                                    )}
                                </div>
                            </div>

                            {/* Chatbot */}
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="font-medium">Smokey AI Chatbot</h4>
                                        <p className="text-sm text-muted-foreground">Enable AI budtender for this dispensary</p>
                                    </div>
                                    <Switch
                                        checked={dispensaryForm.chatbotEnabled}
                                        onCheckedChange={(checked) => setDispensaryForm({ ...dispensaryForm, chatbotEnabled: checked })}
                                    />
                                </div>
                                {dispensaryForm.chatbotEnabled && (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="dispBotName">Bot Name</Label>
                                            <Input
                                                id="dispBotName"
                                                placeholder="Smokey"
                                                value={dispensaryForm.chatbotName}
                                                onChange={(e) => setDispensaryForm({ ...dispensaryForm, chatbotName: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="dispBotWelcome">Welcome Message (optional)</Label>
                                            <Textarea
                                                id="dispBotWelcome"
                                                placeholder="Hey! I'm Smokey, your AI budtender..."
                                                value={dispensaryForm.chatbotWelcome}
                                                onChange={(e) => setDispensaryForm({ ...dispensaryForm, chatbotWelcome: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sample Products */}
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Add Sample Products</h4>
                                        <p className="text-sm text-muted-foreground">Add {DEFAULT_DISPENSARY_PRODUCTS.length} sample products to get started</p>
                                    </div>
                                    <Switch checked={addSampleProducts} onCheckedChange={setAddSampleProducts} />
                                </div>
                            </div>

                            {/* Credentials */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-4">Login Credentials</h4>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="dispEmail">Email</Label>
                                        <Input
                                            id="dispEmail"
                                            placeholder={dispensaryForm.dispensarySlug ? `${dispensaryForm.dispensarySlug}@bakedbot.ai` : 'auto-generated'}
                                            value={dispensaryForm.email}
                                            onChange={(e) => setDispensaryForm({ ...dispensaryForm, email: e.target.value })}
                                        />
                                        <p className="text-xs text-muted-foreground">Leave blank to auto-generate</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dispPassword">Password</Label>
                                        <Input
                                            id="dispPassword"
                                            value={dispensaryForm.password}
                                            onChange={(e) => setDispensaryForm({ ...dispensaryForm, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                onClick={handleDispensarySubmit}
                                disabled={isLoading || !dispensaryForm.dispensaryName}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Creating Pilot...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="h-4 w-4 mr-2" />
                                        Launch Dispensary Pilot
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* Brand Form */}
                <TabsContent value="brand" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>New Brand Pilot</CardTitle>
                            <CardDescription>
                                Set up a hemp/e-commerce brand with online ordering and nationwide shipping
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="brandName">Brand Name *</Label>
                                    <Input
                                        id="brandName"
                                        placeholder="e.g., Ecstatic Edibles"
                                        value={brandForm.brandName}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            setBrandForm({
                                                ...brandForm,
                                                brandName: name,
                                                brandSlug: generateSlug(name),
                                            });
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="brandSlug">URL Slug *</Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">bakedbot.ai/</span>
                                        <Input
                                            id="brandSlug"
                                            placeholder="ecstaticedibles"
                                            value={brandForm.brandSlug}
                                            onChange={(e) => setBrandForm({ ...brandForm, brandSlug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="brandTagline">Tagline</Label>
                                <Input
                                    id="brandTagline"
                                    placeholder="Experience Ecstasy"
                                    value={brandForm.tagline}
                                    onChange={(e) => setBrandForm({ ...brandForm, tagline: e.target.value })}
                                />
                            </div>

                            {/* Purchase Model */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-4">Purchase Model</h4>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="brandPurchaseModel">Model</Label>
                                        <Select
                                            value={brandForm.purchaseModel}
                                            onValueChange={(v: 'online_only' | 'local_pickup' | 'hybrid') => setBrandForm({ ...brandForm, purchaseModel: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="online_only">Online Only (Shipping)</SelectItem>
                                                <SelectItem value="local_pickup">Local Pickup</SelectItem>
                                                <SelectItem value="hybrid">Hybrid (Both)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <Label>Ships Nationwide</Label>
                                            <p className="text-xs text-muted-foreground">Enable shipping to all states</p>
                                        </div>
                                        <Switch
                                            checked={brandForm.shipsNationwide}
                                            onCheckedChange={(checked) => setBrandForm({ ...brandForm, shipsNationwide: checked })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Shipping Address */}
                            {brandForm.purchaseModel !== 'local_pickup' && (
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-4">Return/Shipping Address</h4>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Street Address</Label>
                                            <Input
                                                placeholder="123 Main St"
                                                value={brandForm.shippingAddress?.street}
                                                onChange={(e) => setBrandForm({
                                                    ...brandForm,
                                                    shippingAddress: { ...brandForm.shippingAddress!, street: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>City</Label>
                                            <Input
                                                placeholder="Harbor City"
                                                value={brandForm.shippingAddress?.city}
                                                onChange={(e) => setBrandForm({
                                                    ...brandForm,
                                                    shippingAddress: { ...brandForm.shippingAddress!, city: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-2">
                                                <Label>State</Label>
                                                <Input
                                                    placeholder="CA"
                                                    value={brandForm.shippingAddress?.state}
                                                    onChange={(e) => setBrandForm({
                                                        ...brandForm,
                                                        shippingAddress: { ...brandForm.shippingAddress!, state: e.target.value.toUpperCase() }
                                                    })}
                                                    maxLength={2}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>ZIP</Label>
                                                <Input
                                                    placeholder="90710"
                                                    value={brandForm.shippingAddress?.zip}
                                                    onChange={(e) => setBrandForm({
                                                        ...brandForm,
                                                        shippingAddress: { ...brandForm.shippingAddress!, zip: e.target.value }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Theme */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-4">Theme Colors</h4>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>Primary Color</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={brandForm.primaryColor}
                                                onChange={(e) => setBrandForm({ ...brandForm, primaryColor: e.target.value })}
                                                className="h-10 w-14 rounded border cursor-pointer"
                                            />
                                            <Input
                                                value={brandForm.primaryColor}
                                                onChange={(e) => setBrandForm({ ...brandForm, primaryColor: e.target.value })}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Secondary Color</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={brandForm.secondaryColor}
                                                onChange={(e) => setBrandForm({ ...brandForm, secondaryColor: e.target.value })}
                                                className="h-10 w-14 rounded border cursor-pointer"
                                            />
                                            <Input
                                                value={brandForm.secondaryColor}
                                                onChange={(e) => setBrandForm({ ...brandForm, secondaryColor: e.target.value })}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Accent Color</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={brandForm.accentColor || '#FFFFFF'}
                                                onChange={(e) => setBrandForm({ ...brandForm, accentColor: e.target.value })}
                                                className="h-10 w-14 rounded border cursor-pointer"
                                            />
                                            <Input
                                                value={brandForm.accentColor}
                                                onChange={(e) => setBrandForm({ ...brandForm, accentColor: e.target.value })}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chatbot */}
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="font-medium">AI Chatbot</h4>
                                        <p className="text-sm text-muted-foreground">Enable AI assistant for this brand</p>
                                    </div>
                                    <Switch
                                        checked={brandForm.chatbotEnabled}
                                        onCheckedChange={(checked) => setBrandForm({ ...brandForm, chatbotEnabled: checked })}
                                    />
                                </div>
                                {brandForm.chatbotEnabled && (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Bot Name</Label>
                                            <Input
                                                placeholder="Eddie"
                                                value={brandForm.chatbotName}
                                                onChange={(e) => setBrandForm({ ...brandForm, chatbotName: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Welcome Message (optional)</Label>
                                            <Textarea
                                                placeholder="Hey! I'm Eddie from Ecstatic Edibles..."
                                                value={brandForm.chatbotWelcome}
                                                onChange={(e) => setBrandForm({ ...brandForm, chatbotWelcome: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sample Products */}
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Add Sample Products</h4>
                                        <p className="text-sm text-muted-foreground">Add {DEFAULT_BRAND_PRODUCTS.length} sample products to get started</p>
                                    </div>
                                    <Switch checked={addSampleProducts} onCheckedChange={setAddSampleProducts} />
                                </div>
                            </div>

                            {/* Credentials */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-4">Login Credentials</h4>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input
                                            placeholder={brandForm.brandSlug ? `${brandForm.brandSlug}@bakedbot.ai` : 'auto-generated'}
                                            value={brandForm.email}
                                            onChange={(e) => setBrandForm({ ...brandForm, email: e.target.value })}
                                        />
                                        <p className="text-xs text-muted-foreground">Leave blank to auto-generate</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Password</Label>
                                        <Input
                                            value={brandForm.password}
                                            onChange={(e) => setBrandForm({ ...brandForm, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                onClick={handleBrandSubmit}
                                disabled={isLoading || !brandForm.brandName}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Creating Pilot...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="h-4 w-4 mr-2" />
                                        Launch Brand Pilot
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
