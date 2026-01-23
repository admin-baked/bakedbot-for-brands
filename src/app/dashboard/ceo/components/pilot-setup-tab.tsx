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
import {
    setupPilotCustomer,
    addPilotProducts,
    importMenuFromUrl,
    createPilotTestCustomers,
    createPilotSampleOrders,
    createWelcomeEmailPlaybook,
    createWinbackEmailPlaybook,
    createVIPPlaybook,
    configurePilotPOS,
    flushPilotData,
    PILOT_CUSTOMER_SEGMENTS,
    THRIVE_SAMPLE_PRODUCTS,
    type BrandPilotConfig,
    type DispensaryPilotConfig,
    type ImportedMenuData,
    type PilotPOSConfig,
    type PilotEmailConfig,
} from '@/server/actions/pilot-setup';
import { Loader2, Rocket, Store, Building2, CheckCircle, Copy, ExternalLink, Plus, Trash2, Globe, Download, AlertCircle, Users, ShoppingCart, Mail, Database, RefreshCw, Crown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
        orgId?: string;
        menuUrl?: string;
        email?: string;
        password?: string;
    } | null>(null);

    // Advanced Setup State
    const [isGeneratingData, setIsGeneratingData] = useState(false);
    const [testDataStatus, setTestDataStatus] = useState<{
        customers?: { created: number; error?: string };
        orders?: { created: number; error?: string };
        playbooks?: { welcome?: string; winback?: string; vip?: string };
        pos?: { configured: boolean; error?: string };
    }>({});

    // POS Configuration
    const [posConfig, setPosConfig] = useState<PilotPOSConfig>({
        provider: 'alleaves',
        storeId: '',
        locationId: '',
        environment: 'production',
    });

    // Email Marketing Configuration
    const [emailConfig, setEmailConfig] = useState<PilotEmailConfig>({
        provider: 'mailjet',
        senderEmail: 'hello@bakedbot.ai',
        senderName: 'Mrs. Parker',
        enableWelcomePlaybook: true,
        enableWinbackPlaybook: true,
        enableVIPPlaybook: true,
    });

    // Resume Existing Pilot State
    const [resumeOrgId, setResumeOrgId] = useState('');

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

    // URL Import state
    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importedProducts, setImportedProducts] = useState<ImportedMenuData['products']>([]);
    const [importSource, setImportSource] = useState<'website' | 'weedmaps' | 'leafly' | null>(null);

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
                // Add imported products or sample products
                if (importedProducts.length > 0) {
                    const productsToAdd = importedProducts.map(p => ({
                        name: p.name,
                        description: p.description || '',
                        category: p.category,
                        price: p.price || 0,
                        brandName: p.brand || '',
                        thcPercent: p.thcPercent || undefined,
                        cbdPercent: p.cbdPercent || undefined,
                        weight: p.weight || '',
                        imageUrl: p.imageUrl || '',
                        featured: false,
                    }));
                    await addPilotProducts(result.data.brandId, productsToAdd);
                    toast({ title: 'Products Added', description: `Added ${productsToAdd.length} imported products` });
                } else if (addSampleProducts) {
                    await addPilotProducts(result.data.brandId, DEFAULT_BRAND_PRODUCTS);
                }

                setSetupResult({
                    success: true,
                    userId: result.data.userId,
                    brandId: result.data.brandId,
                    orgId: result.data.orgId,
                    menuUrl: result.data.menuUrl,
                    email: brandForm.email || generateEmail(brandForm.brandSlug),
                    password: brandForm.password,
                });

                // Clear import state and test data status
                clearImportedData();
                setTestDataStatus({});

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
                // Add imported products or sample products
                if (importedProducts.length > 0) {
                    const productsToAdd = importedProducts.map(p => ({
                        name: p.name,
                        description: p.description || '',
                        category: p.category,
                        price: p.price || 0,
                        brandName: p.brand || '',
                        thcPercent: p.thcPercent || undefined,
                        cbdPercent: p.cbdPercent || undefined,
                        weight: p.weight || '',
                        imageUrl: p.imageUrl || '',
                        featured: false,
                    }));
                    await addPilotProducts(result.data.brandId, productsToAdd);
                    toast({ title: 'Products Added', description: `Added ${productsToAdd.length} imported products` });
                } else if (addSampleProducts) {
                    await addPilotProducts(result.data.brandId, DEFAULT_DISPENSARY_PRODUCTS);
                }

                setSetupResult({
                    success: true,
                    userId: result.data.userId,
                    brandId: result.data.brandId,
                    orgId: result.data.orgId,
                    menuUrl: result.data.menuUrl,
                    email: dispensaryForm.email || generateEmail(dispensaryForm.dispensarySlug),
                    password: dispensaryForm.password,
                });

                // Clear import state and test data status
                clearImportedData();
                setTestDataStatus({});

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

    // Import menu from URL with fallback chain: website -> weedmaps -> leafly
    const handleImportMenu = async (type: 'dispensary' | 'brand') => {
        if (!importUrl) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a URL' });
            return;
        }

        setIsImporting(true);
        setImportError(null);
        setImportedProducts([]);

        // Detect URL type
        const isWeedmaps = importUrl.includes('weedmaps.com');
        const isLeafly = importUrl.includes('leafly.com');
        const isDutchie = importUrl.includes('dutchie.com');

        // Build fallback chain based on input URL
        const urlsToTry: { url: string; source: 'website' | 'weedmaps' | 'leafly' }[] = [];

        if (isWeedmaps || isLeafly || isDutchie) {
            // User provided a menu aggregator URL, use it directly
            urlsToTry.push({
                url: importUrl,
                source: isWeedmaps ? 'weedmaps' : isLeafly ? 'leafly' : 'website'
            });
        } else {
            // User provided a website URL, try it first then fallbacks
            urlsToTry.push({ url: importUrl, source: 'website' });

            // Extract domain/name for constructing fallback URLs
            const slug = type === 'dispensary' ? dispensaryForm.dispensarySlug : brandForm.brandSlug;
            if (slug) {
                urlsToTry.push({
                    url: `https://weedmaps.com/dispensaries/${slug}`,
                    source: 'weedmaps'
                });
                urlsToTry.push({
                    url: `https://www.leafly.com/dispensary-info/${slug}`,
                    source: 'leafly'
                });
            }
        }

        let lastError: string | null = null;

        for (const { url, source } of urlsToTry) {
            try {
                toast({
                    title: 'Importing...',
                    description: `Trying ${source === 'website' ? 'website' : source}...`
                });

                const result = await importMenuFromUrl(url);

                if (result.success && result.data) {
                    // Found products, populate form
                    const data = result.data;

                    // Update dispensary/brand info
                    if (type === 'dispensary') {
                        setDispensaryForm(prev => ({
                            ...prev,
                            dispensaryName: data.dispensary.name || prev.dispensaryName,
                            dispensarySlug: data.dispensary.name ? generateSlug(data.dispensary.name) : prev.dispensarySlug,
                            tagline: data.dispensary.tagline || prev.tagline,
                            description: data.dispensary.description || prev.description,
                            primaryColor: data.dispensary.primaryColor || prev.primaryColor,
                            secondaryColor: data.dispensary.secondaryColor || prev.secondaryColor,
                            phone: data.dispensary.phone || prev.phone,
                            address: data.dispensary.address || prev.address,
                            city: data.dispensary.city || prev.city,
                            state: data.dispensary.state || prev.state,
                        }));
                    } else {
                        setBrandForm(prev => ({
                            ...prev,
                            brandName: data.dispensary.name || prev.brandName,
                            brandSlug: data.dispensary.name ? generateSlug(data.dispensary.name) : prev.brandSlug,
                            tagline: data.dispensary.tagline || prev.tagline,
                            description: data.dispensary.description || prev.description,
                            primaryColor: data.dispensary.primaryColor || prev.primaryColor,
                            secondaryColor: data.dispensary.secondaryColor || prev.secondaryColor,
                            contactPhone: data.dispensary.phone || prev.contactPhone,
                        }));
                    }

                    // Store imported products
                    setImportedProducts(data.products);
                    setImportSource(source);
                    setAddSampleProducts(false); // Disable sample products since we have real ones

                    toast({
                        title: 'Import Successful!',
                        description: `Imported ${data.products.length} products from ${source}`
                    });
                    setIsImporting(false);
                    return; // Success, stop trying
                }

                lastError = result.error || 'No products found';
            } catch (error) {
                lastError = String(error);
            }
        }

        // All URLs failed
        setImportError(lastError || 'Failed to import menu from any source');
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: 'Could not extract products. Try adding them manually.'
        });
        setIsImporting(false);
    };

    // Clear imported data
    const clearImportedData = () => {
        setImportedProducts([]);
        setImportSource(null);
        setImportUrl('');
        setImportError(null);
    };

    // Resume an existing pilot to access advanced setup
    const handleResumePilot = () => {
        if (!resumeOrgId.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter an Org ID or Brand ID' });
            return;
        }

        const orgId = resumeOrgId.trim();

        // Set the setupResult to enable advanced options
        // We use the same ID for both orgId and brandId as they're typically the same for pilots
        setSetupResult({
            success: true,
            orgId: orgId,
            brandId: orgId,
            userId: 'resumed-pilot',
            menuUrl: `https://bakedbot.ai/shop/${orgId}`,
            email: '(existing pilot)',
            password: '(existing pilot)',
        });

        toast({
            title: 'Pilot Resumed',
            description: `Now managing pilot: ${orgId}. You can generate test data, configure POS, and set up email playbooks.`,
        });

        // Reset test data status for the new pilot
        setTestDataStatus({});
    };

    // Generate test customers and orders
    const handleGenerateTestData = async () => {
        if (!setupResult?.orgId || !setupResult?.brandId) return;

        setIsGeneratingData(true);
        const status: typeof testDataStatus = {};

        try {
            // Create test customers
            toast({ title: 'Creating test customers...' });
            const customersResult = await createPilotTestCustomers(setupResult.orgId, setupResult.brandId);
            status.customers = { created: customersResult.created, error: customersResult.error };

            if (customersResult.success) {
                // Create sample orders
                toast({ title: 'Creating sample orders...' });
                const ordersResult = await createPilotSampleOrders(setupResult.orgId, setupResult.brandId);
                status.orders = { created: ordersResult.created, error: ordersResult.error };
            }

            setTestDataStatus(prev => ({ ...prev, ...status }));
            toast({
                title: 'Test Data Generated!',
                description: `Created ${status.customers?.created || 0} customers and ${status.orders?.created || 0} orders`,
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: String(error) });
        } finally {
            setIsGeneratingData(false);
        }
    };

    // Setup email marketing playbooks
    const handleSetupEmailPlaybooks = async () => {
        if (!setupResult?.orgId || !setupResult?.brandId) return;

        setIsGeneratingData(true);
        const playbooks: typeof testDataStatus['playbooks'] = {};

        try {
            if (emailConfig.enableWelcomePlaybook) {
                toast({ title: 'Creating welcome playbook...' });
                const result = await createWelcomeEmailPlaybook(setupResult.orgId, setupResult.brandId, emailConfig);
                if (result.success) playbooks.welcome = result.playbookId;
            }

            if (emailConfig.enableWinbackPlaybook) {
                toast({ title: 'Creating win-back playbook...' });
                const result = await createWinbackEmailPlaybook(setupResult.orgId, setupResult.brandId, emailConfig);
                if (result.success) playbooks.winback = result.playbookId;
            }

            if (emailConfig.enableVIPPlaybook) {
                toast({ title: 'Creating VIP playbook...' });
                const result = await createVIPPlaybook(setupResult.orgId, setupResult.brandId, emailConfig);
                if (result.success) playbooks.vip = result.playbookId;
            }

            setTestDataStatus(prev => ({ ...prev, playbooks }));
            toast({
                title: 'Email Playbooks Created!',
                description: `Created ${Object.keys(playbooks).length} playbooks with Mrs. Parker`,
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: String(error) });
        } finally {
            setIsGeneratingData(false);
        }
    };

    // Configure POS
    const handleConfigurePOS = async () => {
        if (!setupResult?.orgId || !setupResult?.brandId) return;
        if (!posConfig.storeId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Store ID is required' });
            return;
        }

        setIsGeneratingData(true);
        try {
            toast({ title: 'Configuring POS...' });
            const result = await configurePilotPOS(setupResult.orgId, setupResult.brandId, posConfig);
            setTestDataStatus(prev => ({ ...prev, pos: { configured: result.success, error: result.error } }));

            if (result.success) {
                toast({ title: 'POS Configured!', description: `${posConfig.provider} connected successfully` });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to configure POS' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: String(error) });
        } finally {
            setIsGeneratingData(false);
        }
    };

    // Flush pilot data
    const handleFlushPilotData = async () => {
        if (!setupResult?.orgId || !setupResult?.brandId) return;

        if (!confirm('Are you sure you want to delete all pilot test data? This will remove test customers, orders, and playbooks.')) {
            return;
        }

        setIsGeneratingData(true);
        try {
            toast({ title: 'Flushing pilot data...' });
            const result = await flushPilotData(setupResult.orgId, setupResult.brandId, {
                deletePlaybooks: true,
                confirmPhrase: 'FLUSH PILOT DATA',
            });

            if (result.success) {
                setTestDataStatus({});
                toast({
                    title: 'Pilot Data Flushed!',
                    description: `Deleted ${result.deleted.customers} customers, ${result.deleted.orders} orders, ${result.deleted.playbooks} playbooks`,
                });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to flush data' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: String(error) });
        } finally {
            setIsGeneratingData(false);
        }
    };

    // Success view with advanced setup options
    if (setupResult?.success) {
        return (
            <div className="space-y-6">
                {/* Success Banner */}
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
                                <Badge variant="secondary">Org: {setupResult.orgId}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Test Data Generation */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Test Customer Data
                        </CardTitle>
                        <CardDescription>
                            Generate test customers for each segment with sample orders
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {PILOT_CUSTOMER_SEGMENTS.map((seg) => (
                                <div key={seg.segment} className="p-2 border rounded text-sm">
                                    <div className="font-medium">{seg.firstName} {seg.lastName}</div>
                                    <div className="text-xs text-muted-foreground">{seg.email}</div>
                                    <Badge variant="outline" className="mt-1 text-xs">{seg.segment}</Badge>
                                </div>
                            ))}
                        </div>

                        {testDataStatus.customers && (
                            <Alert className={testDataStatus.customers.error ? 'border-red-200' : 'border-green-200'}>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {testDataStatus.customers.error
                                        ? `Error: ${testDataStatus.customers.error}`
                                        : `Created ${testDataStatus.customers.created} test customers`}
                                    {testDataStatus.orders && ` and ${testDataStatus.orders.created} orders`}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={handleGenerateTestData}
                            disabled={isGeneratingData || !!testDataStatus.customers}
                            className="w-full"
                        >
                            {isGeneratingData ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <ShoppingCart className="h-4 w-4 mr-2" />
                            )}
                            {testDataStatus.customers ? 'Test Data Created' : 'Generate Test Customers & Orders'}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Email Marketing Playbooks */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Email Marketing (Mrs. Parker)
                        </CardTitle>
                        <CardDescription>
                            Create email playbooks for automated marketing via Mailjet
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Sender Email</Label>
                                <Input
                                    value={emailConfig.senderEmail}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, senderEmail: e.target.value })}
                                    placeholder="hello@bakedbot.ai"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Sender Name</Label>
                                <Input
                                    value={emailConfig.senderName}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, senderName: e.target.value })}
                                    placeholder="Mrs. Parker"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <div className="font-medium">Welcome Email Playbook</div>
                                    <div className="text-xs text-muted-foreground">Triggered when new customer is created</div>
                                </div>
                                <Switch
                                    checked={emailConfig.enableWelcomePlaybook}
                                    onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, enableWelcomePlaybook: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <div className="font-medium">Win-Back Campaign</div>
                                    <div className="text-xs text-muted-foreground">Weekly re-engagement for at-risk customers</div>
                                </div>
                                <Switch
                                    checked={emailConfig.enableWinbackPlaybook}
                                    onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, enableWinbackPlaybook: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Crown className="h-4 w-4 text-yellow-500" />
                                    <div>
                                        <div className="font-medium">VIP Appreciation</div>
                                        <div className="text-xs text-muted-foreground">Monthly exclusive offers for VIP customers</div>
                                    </div>
                                </div>
                                <Switch
                                    checked={emailConfig.enableVIPPlaybook}
                                    onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, enableVIPPlaybook: checked })}
                                />
                            </div>
                        </div>

                        {testDataStatus.playbooks && Object.keys(testDataStatus.playbooks).length > 0 && (
                            <Alert className="border-green-200">
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Created playbooks: {Object.keys(testDataStatus.playbooks).join(', ')}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={handleSetupEmailPlaybooks}
                            disabled={isGeneratingData || (testDataStatus.playbooks && Object.keys(testDataStatus.playbooks).length > 0)}
                            className="w-full"
                        >
                            {isGeneratingData ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Mail className="h-4 w-4 mr-2" />
                            )}
                            {testDataStatus.playbooks ? 'Playbooks Created' : 'Create Email Playbooks'}
                        </Button>
                    </CardFooter>
                </Card>

                {/* POS Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            POS Integration
                        </CardTitle>
                        <CardDescription>
                            Connect ALLeaves, Dutchie, or Jane POS for live menu sync
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>POS Provider</Label>
                                <Select
                                    value={posConfig.provider}
                                    onValueChange={(v: 'alleaves' | 'dutchie' | 'jane') => setPosConfig({ ...posConfig, provider: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="alleaves">ALLeaves</SelectItem>
                                        <SelectItem value="dutchie">Dutchie</SelectItem>
                                        <SelectItem value="jane">Jane</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Environment</Label>
                                <Select
                                    value={posConfig.environment}
                                    onValueChange={(v: 'sandbox' | 'production') => setPosConfig({ ...posConfig, environment: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sandbox">Sandbox</SelectItem>
                                        <SelectItem value="production">Production</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Store ID *</Label>
                                <Input
                                    value={posConfig.storeId}
                                    onChange={(e) => setPosConfig({ ...posConfig, storeId: e.target.value })}
                                    placeholder="Enter store/menu ID"
                                />
                            </div>
                            {posConfig.provider === 'alleaves' && (
                                <div className="space-y-2">
                                    <Label>Location ID</Label>
                                    <Input
                                        value={posConfig.locationId || ''}
                                        onChange={(e) => setPosConfig({ ...posConfig, locationId: e.target.value })}
                                        placeholder="ALLeaves location ID"
                                    />
                                </div>
                            )}
                        </div>

                        {testDataStatus.pos && (
                            <Alert className={testDataStatus.pos.error ? 'border-red-200' : 'border-green-200'}>
                                {testDataStatus.pos.configured ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                <AlertDescription>
                                    {testDataStatus.pos.error
                                        ? `Error: ${testDataStatus.pos.error}`
                                        : `${posConfig.provider} POS configured successfully`}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={handleConfigurePOS}
                            disabled={isGeneratingData || !posConfig.storeId || testDataStatus.pos?.configured}
                            className="w-full"
                        >
                            {isGeneratingData ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Database className="h-4 w-4 mr-2" />
                            )}
                            {testDataStatus.pos?.configured ? 'POS Configured' : 'Configure POS'}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Actions Footer */}
                <div className="flex gap-4">
                    <Button onClick={() => setSetupResult(null)} variant="outline" className="flex-1">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Another Pilot
                    </Button>
                    <Button
                        onClick={handleFlushPilotData}
                        variant="destructive"
                        className="flex-1"
                        disabled={isGeneratingData || (!testDataStatus.customers && !testDataStatus.playbooks)}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Flush Pilot Data
                    </Button>
                </div>
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

            {/* Resume Existing Pilot */}
            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Resume Existing Pilot
                    </CardTitle>
                    <CardDescription>
                        Already have a pilot set up? Enter the Org ID to access test data generation, email playbooks, and POS configuration.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="e.g., loc_thrive_syracuse or org_xxx"
                            value={resumeOrgId}
                            onChange={(e) => setResumeOrgId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleResumePilot()}
                            className="flex-1"
                        />
                        <Button onClick={handleResumePilot} variant="secondary">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resume
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Known pilots: <code className="bg-white px-1 rounded">loc_thrive_syracuse</code>
                    </p>
                </CardContent>
            </Card>

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

                            {/* URL Import Section */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-2">Import from Website</h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Automatically import products from the dispensary website, Weedmaps, or Leafly.
                                    We&apos;ll try the website first, then fallback to Weedmaps/Leafly.
                                </p>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="flex-1 relative">
                                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="https://dispensary-website.com or weedmaps.com/dispensaries/..."
                                            value={importUrl}
                                            onChange={(e) => setImportUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleImportMenu('dispensary')}
                                            className="pl-10"
                                            disabled={isImporting}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleImportMenu('dispensary')}
                                        disabled={isImporting || !importUrl}
                                    >
                                        {isImporting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4" />
                                        )}
                                        <span className="ml-2">{isImporting ? 'Importing...' : 'Import'}</span>
                                    </Button>
                                </div>

                                {importError && (
                                    <Alert variant="destructive" className="mb-4">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{importError}</AlertDescription>
                                    </Alert>
                                )}

                                {importedProducts.length > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                <span className="font-medium text-green-900">
                                                    {importedProducts.length} products imported from {importSource}
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearImportedData}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {importedProducts.slice(0, 5).map((p, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs">
                                                    {p.name}
                                                </Badge>
                                            ))}
                                            {importedProducts.length > 5 && (
                                                <Badge variant="secondary" className="text-xs">
                                                    +{importedProducts.length - 5} more
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )}
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
                                        <h4 className="font-medium">
                                            {importedProducts.length > 0 ? 'Products' : 'Add Sample Products'}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            {importedProducts.length > 0
                                                ? `${importedProducts.length} imported products will be added`
                                                : `Add ${DEFAULT_DISPENSARY_PRODUCTS.length} sample products to get started`
                                            }
                                        </p>
                                    </div>
                                    {importedProducts.length === 0 && (
                                        <Switch checked={addSampleProducts} onCheckedChange={setAddSampleProducts} />
                                    )}
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

                            {/* URL Import Section for Brands */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-2">Import from Website</h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Automatically import products from the brand website.
                                </p>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="flex-1 relative">
                                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="https://brand-website.com/shop"
                                            value={importUrl}
                                            onChange={(e) => setImportUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleImportMenu('brand')}
                                            className="pl-10"
                                            disabled={isImporting}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleImportMenu('brand')}
                                        disabled={isImporting || !importUrl}
                                    >
                                        {isImporting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4" />
                                        )}
                                        <span className="ml-2">{isImporting ? 'Importing...' : 'Import'}</span>
                                    </Button>
                                </div>

                                {importError && (
                                    <Alert variant="destructive" className="mb-4">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{importError}</AlertDescription>
                                    </Alert>
                                )}

                                {importedProducts.length > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                <span className="font-medium text-green-900">
                                                    {importedProducts.length} products imported from {importSource}
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearImportedData}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {importedProducts.slice(0, 5).map((p, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs">
                                                    {p.name}
                                                </Badge>
                                            ))}
                                            {importedProducts.length > 5 && (
                                                <Badge variant="secondary" className="text-xs">
                                                    +{importedProducts.length - 5} more
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )}
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
                                        <h4 className="font-medium">
                                            {importedProducts.length > 0 ? 'Products' : 'Add Sample Products'}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            {importedProducts.length > 0
                                                ? `${importedProducts.length} imported products will be added`
                                                : `Add ${DEFAULT_BRAND_PRODUCTS.length} sample products to get started`
                                            }
                                        </p>
                                    </div>
                                    {importedProducts.length === 0 && (
                                        <Switch checked={addSampleProducts} onCheckedChange={setAddSampleProducts} />
                                    )}
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
