'use client';

/**
 * AI Blog Generator Dialog
 *
 * ChatGPT/Vibe Studio-style AI generation interface for blog posts
 */

import { useState } from 'react';
import { BlogCategory } from '@/types/blog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIGeneratorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerate: (data: BlogGeneratorInput) => Promise<void>;
    orgId: string;
}

export interface BlogGeneratorInput {
    topic: string;
    outline?: string;
    category: BlogCategory;
    targetAudience?: string;
    tone: 'professional' | 'casual' | 'educational' | 'playful';
    length: 'short' | 'medium' | 'long';
    seoKeywords: string[];
    productToFeature?: string;
    orgId: string;
}

const CATEGORY_LABELS: Record<BlogCategory, string> = {
    education: 'Education',
    product_spotlight: 'Product Spotlight',
    industry_news: 'Industry News',
    company_update: 'Company Update',
    strain_profile: 'Strain Profile',
    compliance: 'Compliance',
    cannabis_culture: 'Cannabis Culture',
    wellness: 'Wellness',
};

const LENGTH_LABELS = {
    short: '300 words (~2 min read)',
    medium: '700 words (~5 min read)',
    long: '1200 words (~8 min read)',
};

export function AIGeneratorDialog({
    open,
    onOpenChange,
    onGenerate,
    orgId,
}: AIGeneratorDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Form state
    const [topic, setTopic] = useState('');
    const [outline, setOutline] = useState('');
    const [category, setCategory] = useState<BlogCategory>('education');
    const [targetAudience, setTargetAudience] = useState('');
    const [tone, setTone] = useState<'professional' | 'casual' | 'educational' | 'playful'>('professional');
    const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
    const [keywordInput, setKeywordInput] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [productToFeature, setProductToFeature] = useState('');

    const handleAddKeyword = () => {
        if (keywordInput.trim() && keywords.length < 10) {
            setKeywords([...keywords, keywordInput.trim()]);
            setKeywordInput('');
        }
    };

    const handleRemoveKeyword = (index: number) => {
        setKeywords(keywords.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        // Validation
        if (!topic.trim()) {
            toast({
                title: 'Topic Required',
                description: 'Please enter a topic or outline for your blog post.',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);

        try {
            await onGenerate({
                topic: topic.trim(),
                outline: outline.trim() || undefined,
                category,
                targetAudience: targetAudience.trim() || undefined,
                tone,
                length,
                seoKeywords: keywords,
                productToFeature: productToFeature.trim() || undefined,
                orgId,
            });

            // Reset form
            setTopic('');
            setOutline('');
            setCategory('education');
            setTargetAudience('');
            setTone('professional');
            setLength('medium');
            setKeywords([]);
            setProductToFeature('');

            onOpenChange(false);

            toast({
                title: 'Blog Post Generated',
                description: 'Your AI-generated blog draft has been created. Review and edit as needed.',
            });
        } catch (error) {
            console.error('AI generation error:', error);
            toast({
                title: 'Generation Failed',
                description: error instanceof Error ? error.message : 'Failed to generate blog post. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        Generate Blog Post with AI
                    </DialogTitle>
                    <DialogDescription>
                        Tell us what you want to write about, and Craig will generate a draft using your brand voice.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Topic/Outline */}
                    <div className="space-y-2">
                        <Label htmlFor="topic">
                            Topic or Outline <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="topic"
                            placeholder="e.g., 'The benefits of CBG for sleep' or 'Our new limited-edition summer strain lineup'"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            rows={3}
                            disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                            Be as specific or general as you like. More details = better results.
                        </p>
                    </div>

                    {/* Optional Outline */}
                    <div className="space-y-2">
                        <Label htmlFor="outline">Additional Outline (Optional)</Label>
                        <Textarea
                            id="outline"
                            placeholder="Section 1: Introduction to CBG&#10;Section 2: Sleep research&#10;Section 3: Our CBG products"
                            value={outline}
                            onChange={(e) => setOutline(e.target.value)}
                            rows={3}
                            disabled={loading}
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label htmlFor="category">
                            Category <span className="text-destructive">*</span>
                        </Label>
                        <Select value={category} onValueChange={(val) => setCategory(val as BlogCategory)} disabled={loading}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Target Audience */}
                    <div className="space-y-2">
                        <Label htmlFor="audience">Target Audience (Optional)</Label>
                        <Input
                            id="audience"
                            placeholder="e.g., first-time users, medical patients, connoisseurs"
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    {/* Tone */}
                    <div className="space-y-2">
                        <Label>Tone</Label>
                        <RadioGroup value={tone} onValueChange={(val) => setTone(val as any)} disabled={loading}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="professional" id="tone-professional" />
                                <Label htmlFor="tone-professional" className="font-normal">
                                    Professional — Authoritative, expert, trustworthy
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="casual" id="tone-casual" />
                                <Label htmlFor="tone-casual" className="font-normal">
                                    Casual — Friendly, conversational, approachable
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="educational" id="tone-educational" />
                                <Label htmlFor="tone-educational" className="font-normal">
                                    Educational — Informative, clear, teaching-focused
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="playful" id="tone-playful" />
                                <Label htmlFor="tone-playful" className="font-normal">
                                    Playful — Fun, creative, engaging
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Length */}
                    <div className="space-y-2">
                        <Label>Length</Label>
                        <RadioGroup value={length} onValueChange={(val) => setLength(val as any)} disabled={loading}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="short" id="length-short" />
                                <Label htmlFor="length-short" className="font-normal">
                                    Short — {LENGTH_LABELS.short}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="medium" id="length-medium" />
                                <Label htmlFor="length-medium" className="font-normal">
                                    Medium — {LENGTH_LABELS.medium}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="long" id="length-long" />
                                <Label htmlFor="length-long" className="font-normal">
                                    Long — {LENGTH_LABELS.long}
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* SEO Keywords */}
                    <div className="space-y-2">
                        <Label htmlFor="keywords">SEO Keywords (Optional)</Label>
                        <div className="flex gap-2">
                            <Input
                                id="keywords"
                                placeholder="e.g., CBG, sleep aid, cannabis wellness"
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddKeyword();
                                    }
                                }}
                                disabled={loading || keywords.length >= 10}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddKeyword}
                                disabled={!keywordInput.trim() || keywords.length >= 10 || loading}
                            >
                                Add
                            </Button>
                        </div>
                        {keywords.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {keywords.map((keyword, index) => (
                                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                        {keyword}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveKeyword(index)}
                                            disabled={loading}
                                            className="ml-1 hover:text-destructive"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            {keywords.length}/10 keywords added
                        </p>
                    </div>

                    {/* Product to Feature */}
                    <div className="space-y-2">
                        <Label htmlFor="product">Product to Feature (Optional)</Label>
                        <Input
                            id="product"
                            placeholder="e.g., Blue Dream CBG Flower, 3.5g"
                            value={productToFeature}
                            onChange={(e) => setProductToFeature(e.target.value)}
                            disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                            If this post should spotlight a specific product, enter its name here.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleGenerate} disabled={loading || !topic.trim()}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Draft
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
