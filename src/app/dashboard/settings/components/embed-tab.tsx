'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check, MessageSquare, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';

export default function EmbedGeneratorTab() {
    const { toast } = useToast();
    const { user } = useUserRole(); // In a real scenario, we'd get brandId from here

    // State for config
    const [embedType, setEmbedType] = useState('chatbot');
    const [brandId, setBrandId] = useState('green-valley'); // Demo default
    const [position, setPosition] = useState('bottom-right');
    const [primaryColor, setPrimaryColor] = useState('#10b981');
    const [copied, setCopied] = useState(false);

    // Determine script source based on type
    const getScriptSrc = (type: string) => {
        // In production, these should point to dynamic endpoints or CDNs
        const baseUrl = 'https://bakedbot-for-brands--studio-567050101-bc6e8.us-east4.hosted.app/embed';
        if (type === 'locator') return `${baseUrl}/locator.js`;
        return `${baseUrl}/chatbot.js`;
    };

    const generateCode = () => {
        const config = {
            brandId,
            primaryColor,
            position: embedType === 'chatbot' ? position : undefined, // Position only relevant for chatbot
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
            <Card>
                <CardHeader>
                    <CardTitle>Embed Code Generator</CardTitle>
                    <CardDescription>
                        Generate the code to add BakedBot features to your existing website.
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
        </div>
    );
}
