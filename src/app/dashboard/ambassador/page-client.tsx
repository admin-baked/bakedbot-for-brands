'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { QrCode, Copy, Share2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateAmbassadorLink, type AmbassadorProduct } from './actions';

interface AmbassadorPageProps {
    products: AmbassadorProduct[];
}

export default function AmbassadorDashboard({ products }: AmbassadorPageProps) {
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [generatedLink, setGeneratedLink] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleGenerate = async () => {
        if (!selectedProduct) return;
        setIsLoading(true);
        try {
            const link = await generateAmbassadorLink(selectedProduct);
            setGeneratedLink(link);
            toast({ title: 'Link Generated!', description: 'Ready to share.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate link.' });
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        toast({ title: 'Copied!' });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Ambassador Portal</h1>
                <p className="text-muted-foreground">Drive traffic to local retailers and earn rewards.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <QrCode className="h-5 w-5" />
                            Generate QR Asset
                        </CardTitle>
                        <CardDescription>Create a tracking link for a specific product.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select Product to Promote</Label>
                            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose product..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {generatedLink && (
                            <div className="p-4 bg-muted rounded-lg flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                                {/* Mock QR Code - using a public API for valid QR or CSS placeholder */}
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generatedLink)}`}
                                        alt="QR Code"
                                        className="w-32 h-32"
                                    />
                                </div>
                                <div className="w-full space-y-2">
                                    <Label className="text-xs">Tracking Link</Label>
                                    <div className="flex gap-2">
                                        <Input value={generatedLink} readOnly className="text-xs" />
                                        <Button size="icon" variant="outline" onClick={copyToClipboard}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        {!generatedLink ? (
                            <Button className="w-full" onClick={handleGenerate} disabled={!selectedProduct || isLoading}>
                                {isLoading ? 'Generating...' : 'Generate QR Code'}
                            </Button>
                        ) : (
                            <Button className="w-full" variant="secondary" onClick={() => setGeneratedLink('')}>
                                Create Another
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Share2 className="h-5 w-5" />
                                Quick Stats
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Scans (Week)</p>
                                <p className="text-2xl font-bold">0</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Store Visits</p>
                                <p className="text-2xl font-bold">0</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary" />
                                Mission: Find Consumers
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-foreground/80 mb-4">
                                Use your QR codes at events, stickers, or social media.
                                When users scan, we direct them to the nearest retailer stocking that product.
                            </p>
                            <Button variant="outline" className="w-full bg-background/50">View Leaderboard</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
