'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { generateSEOAction, type SEOFormState } from '@/app/dashboard/content/actions';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Check, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types/domain';

const initialSEOState: SEOFormState = { message: '', data: null, error: false };

interface SeoOptimizerProps {
    products: Product[];
    areProductsLoading: boolean;
}

export default function SeoOptimizer({ products, areProductsLoading }: SeoOptimizerProps) {
    const [state, formAction] = useFormState(generateSEOAction, initialSEOState);
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [inputValue, setInputValue] = useState({ name: '', description: '' });
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleProductSelect = (id: string) => {
        setSelectedProduct(id);
        const product = products.find(p => p.id === id);
        if (product) {
            setInputValue({
                name: product.name,
                description: product.description || ''
            });
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied to clipboard' });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        Page Optimizer
                    </CardTitle>
                    <CardDescription>Generate high-ranking metadata for Google.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={(formData) => { setIsLoading(true); formAction(formData); }}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Product</Label>
                                <Select value={selectedProduct} onValueChange={handleProductSelect} disabled={areProductsLoading}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a product..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="productName">Product Name</Label>
                                <Input
                                    id="productName"
                                    name="productName"
                                    value={inputValue.name}
                                    onChange={e => setInputValue({ ...inputValue, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Product Details</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    value={inputValue.description}
                                    onChange={e => setInputValue({ ...inputValue, description: e.target.value })}
                                    required
                                    className="h-32"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="keywords">Target Keywords (Optional)</Label>
                                <Input id="keywords" name="keywords" placeholder="e.g. sleep, indica, organic" />
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Optimizing...
                                    </>
                                ) : (
                                    <>
                                        <Search className="mr-2 h-4 w-4" />
                                        Generate Metadata
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Results Review */}
            <div className="space-y-6">
                {state.data ? (
                    <div className="animate-in fade-in slide-in-from-bottom-5 duration-500 space-y-4">
                        <Card className="border-green-200 bg-green-50/20">
                            <CardHeader>
                                <CardTitle className="text-lg">Google Preview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="font-sans">
                                    <div className="text-sm text-[#202124] mb-1">bakedbrands.com › products › {inputValue.name.toLowerCase().replace(/ /g, '-')}</div>
                                    <div className="text-xl text-[#1a0dab] hover:underline cursor-pointer font-medium mb-1 truncate">
                                        {state.data.titleTag}
                                    </div>
                                    <div className="text-sm text-[#4d5156]">
                                        {state.data.metaDescription}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Optimization Results</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Title Tag ({state.data.titleTag.length}/60 chars)</Label>
                                        <Button variant="ghost" size="sm" onClick={() => handleCopy(state.data!.titleTag)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="p-3 bg-muted rounded-md text-sm">{state.data.titleTag}</div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Meta Description ({state.data.metaDescription.length}/160 chars)</Label>
                                        <Button variant="ghost" size="sm" onClick={() => handleCopy(state.data!.metaDescription)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="p-3 bg-muted rounded-md text-sm">{state.data.metaDescription}</div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Target Keywords</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {state.data.targetKeywords.map((k, i) => (
                                            <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>JSON-LD Schema</Label>
                                        <Button variant="ghost" size="sm" onClick={() => handleCopy(state.data!.jsonLd)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-40">
                                        {state.data.jsonLd}
                                    </pre>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground bg-muted/20">
                        <div>
                            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">Ready to Optimize</h3>
                            <p className="max-w-xs mx-auto">Select a product to generate SEO-ready titles and descriptions.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
