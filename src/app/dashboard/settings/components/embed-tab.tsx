'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, MessageSquare, MapPin, ShoppingBag, Globe, Code, ExternalLink, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';

type InstallMethod = 'embed' | 'shopify' | 'wordpress';

export default function EmbedGeneratorTab() {
    const { toast } = useToast();
    const { user } = useUserRole();

    // State for config
    const [installMethod, setInstallMethod] = useState<InstallMethod>('embed');
    const [embedType, setEmbedType] = useState('chatbot');
    const [brandId, setBrandId] = useState('green-valley');
    const [position, setPosition] = useState('bottom-right');
    const [primaryColor, setPrimaryColor] = useState('#10b981');
    const [copied, setCopied] = useState(false);

    const getScriptSrc = (type: string) => {
        const baseUrl = 'https://bakedbot.ai/embed';
        if (type === 'locator') return `${baseUrl}/locator.js`;
        return `${baseUrl}/chatbot.js`;
    };

    const generateCode = () => {
        const config = {
            brandId,
            primaryColor,
            position: embedType === 'chatbot' ? position : undefined,
            type: embedType
        };

        const scriptSrc = getScriptSrc(embedType);

        return `<!-- BakedBot Embed: ${embedType === 'chatbot' ? 'AI Agent' : 'Dispensary Locator'} -->
<script>
  window.BakedBotConfig = ${JSON.stringify(config, null, 2)};
</script>
<script src="${scriptSrc}" async></script>
${embedType === 'chatbot' ? `<link rel="stylesheet" href="${scriptSrc.replace('.js', '.css')}">` : ''}
${embedType === 'locator' ? '<div id="bakedbot-locator-container"></div>' : ''}
<!-- End BakedBot Embed -->`;
    };

    const code = generateCode();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            toast({ title: 'Copied to clipboard' });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Failed to copy' });
        }
    };

    return (
        <div className="space-y-6">
            {/* Install Method Selector */}
            <Card>
                <CardHeader>
                    <CardTitle>Install BakedBot</CardTitle>
                    <CardDescription>
                        Choose your installation method based on your platform.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Shopify App */}
                        <Card
                            className={`cursor-pointer transition-all hover:border-primary ${installMethod === 'shopify' ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => setInstallMethod('shopify')}
                        >
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-10 w-10 rounded-lg bg-[#96bf48] flex items-center justify-center">
                                        <ShoppingBag className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Shopify App</h3>
                                        <p className="text-xs text-muted-foreground">One-click install</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">Recommended</Badge>
                            </CardContent>
                        </Card>

                        {/* WordPress Plugin */}
                        <Card
                            className={`cursor-pointer transition-all hover:border-primary ${installMethod === 'wordpress' ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => setInstallMethod('wordpress')}
                        >
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-10 w-10 rounded-lg bg-[#21759b] flex items-center justify-center">
                                        <Globe className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">WordPress Plugin</h3>
                                        <p className="text-xs text-muted-foreground">WP & WooCommerce</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-xs">Gutenberg Ready</Badge>
                            </CardContent>
                        </Card>

                        {/* Embed Code */}
                        <Card
                            className={`cursor-pointer transition-all hover:border-primary ${installMethod === 'embed' ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => setInstallMethod('embed')}
                        >
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                                        <Code className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Embed Code</h3>
                                        <p className="text-xs text-muted-foreground">Any website</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-xs">Universal</Badge>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            {/* Shopify App Instructions */}
            {installMethod === 'shopify' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-[#96bf48]" />
                            Install Shopify App
                        </CardTitle>
                        <CardDescription>
                            Add BakedBot to your Shopify store in just a few clicks.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                                    <div>
                                        <h4 className="font-medium">Install from Shopify App Store</h4>
                                        <p className="text-sm text-muted-foreground">Click the button below to add BakedBot to your store.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                                    <div>
                                        <h4 className="font-medium">Approve Permissions</h4>
                                        <p className="text-sm text-muted-foreground">Grant access to read products, customers, and orders for AI recommendations.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                                    <div>
                                        <h4 className="font-medium">Add App Blocks to Theme</h4>
                                        <p className="text-sm text-muted-foreground">Use the theme editor to add the AI Chatbot or Locator widgets.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-6 space-y-4">
                                <h4 className="font-medium">BakedBot for Shopify</h4>
                                <ul className="text-sm space-y-2 text-muted-foreground">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        AI Chatbot for product recommendations
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Dispensary locator widget
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Order analytics sync
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Customer insights
                                    </li>
                                </ul>
                                <Button className="w-full gap-2">
                                    <ShoppingBag className="h-4 w-4" />
                                    Install on Shopify
                                    <ExternalLink className="h-3 w-3" />
                                </Button>
                                <p className="text-xs text-center text-muted-foreground">
                                    You'll be redirected to Shopify to complete installation
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* WordPress Plugin Instructions */}
            {installMethod === 'wordpress' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-[#21759b]" />
                            Install WordPress Plugin
                        </CardTitle>
                        <CardDescription>
                            Add BakedBot to your WordPress or WooCommerce site.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                                    <div>
                                        <h4 className="font-medium">Download the Plugin</h4>
                                        <p className="text-sm text-muted-foreground">Get the latest version of BakedBot for WordPress.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                                    <div>
                                        <h4 className="font-medium">Upload to WordPress</h4>
                                        <p className="text-sm text-muted-foreground">Go to Plugins → Add New → Upload Plugin</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                                    <div>
                                        <h4 className="font-medium">Enter Your API Key</h4>
                                        <p className="text-sm text-muted-foreground">Connect the plugin with your BakedBot account.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-6 space-y-4">
                                <h4 className="font-medium">BakedBot for WordPress</h4>
                                <ul className="text-sm space-y-2 text-muted-foreground">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Gutenberg blocks for easy embedding
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Shortcodes for legacy themes
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Widget areas support
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        WooCommerce integration
                                    </li>
                                </ul>
                                <Button className="w-full gap-2">
                                    <Download className="h-4 w-4" />
                                    Download Plugin (.zip)
                                </Button>

                                <div className="pt-4 border-t">
                                    <Label className="text-xs text-muted-foreground">Your API Key</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input value="bb_live_xxxx_xxxx_xxxx" readOnly className="font-mono text-sm" />
                                        <Button variant="outline" size="icon" onClick={() => toast({ title: 'API Key copied' })}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <Label className="text-xs text-muted-foreground mb-2 block">Shortcodes</Label>
                                    <div className="space-y-1 font-mono text-xs">
                                        <p>[bakedbot_chat]</p>
                                        <p>[bakedbot_locator]</p>
                                        <p>[bakedbot_menu brand="your-id"]</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Embed Code Generator */}
            {installMethod === 'embed' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Code className="h-5 w-5" />
                            Embed Code Generator
                        </CardTitle>
                        <CardDescription>
                            Generate the code to add BakedBot features to any website.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-[300px_1fr] gap-8">
                            {/* Configuration Side */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Embed Type</Label>
                                    <Tabs value={embedType} onValueChange={setEmbedType} className="w-full">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="chatbot">
                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                AI Agent
                                            </TabsTrigger>
                                            <TabsTrigger value="locator">
                                                <MapPin className="mr-2 h-4 w-4" />
                                                Locator
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {embedType === 'chatbot'
                                            ? 'Adds the floating AI Budtender to your site.'
                                            : 'Adds a full Dispensary Locator map widget.'}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="brand-id">Brand ID / CannMenus ID</Label>
                                    <Input
                                        id="brand-id"
                                        value={brandId}
                                        onChange={(e) => setBrandId(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Your unique identifier for loading products/locations.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="color">Primary Color</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            id="color"
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="w-12 p-1"
                                        />
                                        <Input
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {embedType === 'chatbot' && (
                                    <div className="space-y-2">
                                        <Label>Position</Label>
                                        <Select value={position} onValueChange={setPosition}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                                                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {/* Preview/Code Side */}
                            <div className="space-y-4">
                                <div>
                                    <Label className="mb-2 block">Generated Code</Label>
                                    <div className="relative">
                                        <Textarea
                                            readOnly
                                            value={code}
                                            className="font-mono text-xs min-h-[250px] resize-none"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute top-2 right-2 h-8"
                                            onClick={handleCopy}
                                        >
                                            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-muted p-4 rounded-md text-sm">
                                    <h4 className="font-medium mb-2">Installation:</h4>
                                    {embedType === 'chatbot' ? (
                                        <p className="text-muted-foreground">
                                            Paste this code just before the closing <code>&lt;/body&gt;</code> tag on your website.
                                            The chatbot will float on top of your content.
                                        </p>
                                    ) : (
                                        <p className="text-muted-foreground">
                                            Paste this code where you want the Locator to appear on your page.
                                            Make sure the container has enough width.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
